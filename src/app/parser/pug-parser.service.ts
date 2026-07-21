import { Injectable } from '@angular/core';
import {
  PugAstNode,
  PugVariable,
  PugMixin,
  PugBlock,
  ParseResult,
  ParseError,
  DataType,
} from '../core/models/index';

interface FileReference {
  type: string;
  path: string;
  filename?: string;
  line?: number;
  column?: number;
}

const BUILTINS = new Set([
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
  'console', 'window', 'document', 'Math', 'Number', 'String',
  'Boolean', 'Array', 'Object', 'Date', 'JSON', 'RegExp',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI',
  'decodeURI', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'fetch', 'Promise', 'Error', 'TypeError',
  'RangeError', 'SyntaxError', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Symbol', 'Proxy', 'Reflect',
]);

const PUG_KEYWORDS = new Set([
  'if', 'else', 'each', 'while', 'until', 'case', 'when', 'default',
  'in', 'unless', 'block', 'extends', 'include', 'mixin',
  'append', 'prepend', 'doctype', 'xml',
]);

const HTML_TAGS = new Set([
  'html', 'head', 'body', 'div', 'span', 'p', 'a', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
  'form', 'input', 'button', 'select', 'option', 'textarea', 'img',
  'script', 'style', 'link', 'meta', 'title', 'template', 'header',
  'footer', 'nav', 'main', 'section', 'article', 'aside', 'details',
  'summary', 'figure', 'figcaption', 'video', 'audio', 'source',
  'canvas', 'svg', 'path', 'br', 'hr', 'pre', 'code', 'em', 'strong',
  'small', 's', 'sub', 'sup', 'u', 'i', 'b', 'mark', 'del', 'ins',
]);

const IDENTIFIER_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

type LexerFn = (str: string, options?: { filename?: string }) => unknown;
type ParserFn = (tokens: unknown[], options?: { filename?: string }) => PugAstNode;

@Injectable({ providedIn: 'root' })
export class PugParserService {
  private lexerFn: LexerFn | null = null;
  private parserFn: ParserFn | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const bundle = (self as any).parserBundle;
    if (!bundle?.lexer) {
      try {
        await loadScript('assets/parser-browser.js');
      } catch {
        // parser bundle not available
      }
    }
    const loaded = (self as any).parserBundle;
    if (loaded?.lexer) {
      this.lexerFn = loaded.lexer as LexerFn;
      this.parserFn = loaded.parse as unknown as ParserFn;
    }
    this.initialized = true;
  }

  async parse(code: string, filename = 'input.pug'): Promise<ParseResult> {
    const start = performance.now();
    const errors: ParseError[] = [];
    let ast: PugAstNode | null = null;

    try {
      await this.initialize();

      if (this.lexerFn && this.parserFn) {
        const tokens = this.lexerFn(code, { filename }) as unknown[];
        ast = this.parserFn(tokens, { filename });
      }
    } catch (err: unknown) {
      const error = err as { message?: string; line?: number; column?: number };
      errors.push({
        message: error.message ?? 'Parse error',
        line: error.line ?? 0,
        column: error.column ?? 0,
        filename,
        severity: 'error',
      });
    }

    const variables = ast ? this.extractVariables(ast) : [];
    const mixins = ast ? this.extractMixins(ast) : [];
    const includes = ast ? this.extractIncludes(ast) : [];
    const extendsPath = ast ? this.extractExtends(ast) : undefined;

    return {
      ast,
      variables,
      mixins,
      includes,
      extendsPath,
      errors,
      compilationTime: performance.now() - start,
    };
  }

  // --- AST Walker ---

  private walkAst(node: PugAstNode, callback: (node: PugAstNode) => void): void {
    callback(node);

    if (node.block) {
      this.walkBlock(node.block, callback);
    }

    if (node.type === 'Conditional') {
      const consequent = (node as PugAstNode & { consequent?: PugBlock | null }).consequent;
      const alternate = (node as PugAstNode & { alternate?: PugBlock | null }).alternate;
      if (consequent && typeof consequent === 'object' && 'nodes' in consequent) {
        this.walkBlock(consequent as PugBlock, callback);
      }
      if (alternate && typeof alternate === 'object' && 'nodes' in alternate) {
        this.walkBlock(alternate as PugBlock, callback);
      }
    }

    if (node.type === 'Each') {
      const eachBody = (node as PugAstNode & { block?: PugBlock | null }).block;
      if (eachBody) {
        this.walkBlock(eachBody, callback);
      }
    }

    if (node.nodes) {
      for (const child of node.nodes) {
        this.walkAst(child, callback);
      }
    }
  }

  private walkBlock(block: PugBlock, callback: (node: PugAstNode) => void): void {
    if (block && block.nodes) {
      for (const child of block.nodes) {
        this.walkAst(child, callback);
      }
    }
  }

  // --- Variable Extraction ---

  private extractVariables(ast: PugAstNode): PugVariable[] {
    const collected = new Map<string, PugVariable>();
    const localVars = new Set<string>();
    const eachVarMap = new Map<string, string>();

    this.walkAst(ast, (node) => {
      if (node.type === 'Each') {
        const val = (node as PugAstNode & { val?: string }).val;
        const obj = (node as PugAstNode & { obj?: string }).obj;
        if (val) {
          localVars.add(val);
          if (typeof obj === 'string') {
            eachVarMap.set(val, obj);
          }
        }
      }
    });

    this.walkAst(ast, (node) => {
      switch (node.type) {
        case 'Tag':
          this.extractFromAttrs(node, collected, localVars, eachVarMap);
          this.extractFromBlock(node, collected, localVars, eachVarMap);
          break;

        case 'Code':
          this.extractFromCode(node, collected, localVars, eachVarMap);
          break;

        case 'Conditional':
          this.extractFromConditional(node, collected, localVars, eachVarMap);
          break;

        case 'Each':
          this.extractFromEach(node, collected, localVars);
          break;

        case 'Mixin': {
          const isCall = (node as PugAstNode & { call?: boolean }).call === true;
          if (isCall) {
            this.extractFromMixinCallArgs(node, collected, localVars, eachVarMap);
          } else {
            this.extractFromMixinDef(node, collected, localVars);
          }
          break;
        }
      }
    });

    return Array.from(collected.values()).sort((a, b) => a.path.localeCompare(b.path));
  }

  private extractFromAttrs(node: PugAstNode, collected: Map<string, PugVariable>, localVars: Set<string>, eachVarMap: Map<string, string>): void {
    if (!node.attrs) return;
    for (const attr of node.attrs) {
      if (typeof attr.val !== 'string') continue;
      if (attr.val.startsWith('"') || attr.val.startsWith("'")) continue;
      if (/^\d/.test(attr.val)) continue;

      const identifiers = this.extractIdentifiers(attr.val);
      for (const id of identifiers) {
        const remapped = this.remapIdentifier(id, localVars, eachVarMap);
        if (remapped) this.addVariable(collected, remapped);
      }
    }
  }

  private extractFromBlock(node: PugAstNode, collected: Map<string, PugVariable>, localVars: Set<string>, eachVarMap: Map<string, string>): void {
    if (!node.block?.nodes) return;
    for (const child of node.block.nodes) {
      if (child.type === 'Code' && child.buffer && typeof child.val === 'string') {
        const identifiers = this.extractIdentifiers(child.val);
        for (const id of identifiers) {
          const remapped = this.remapIdentifier(id, localVars, eachVarMap);
          if (remapped) this.addVariable(collected, remapped);
        }
      }
    }
  }

  private extractFromCode(node: PugAstNode, collected: Map<string, PugVariable>, localVars: Set<string>, eachVarMap: Map<string, string>): void {
    if (typeof node.val !== 'string') return;

    if (node.buffer) {
      const identifiers = this.extractIdentifiers(node.val);
      for (const id of identifiers) {
        const remapped = this.remapIdentifier(id, localVars, eachVarMap);
        if (remapped) this.addVariable(collected, remapped);
      }
    } else {
      const varDeclMatch = node.val.match(/(?:var|let|const)\s+(\w+)/);
      if (varDeclMatch) {
        localVars.add(varDeclMatch[1]);
      }
    }
  }

  private extractFromConditional(node: PugAstNode, collected: Map<string, PugVariable>, localVars: Set<string>, eachVarMap: Map<string, string>): void {
    const test = (node as PugAstNode & { test?: string }).test;
    if (typeof test !== 'string') return;
    const identifiers = this.extractIdentifiers(test);
    for (const id of identifiers) {
      const remapped = this.remapIdentifier(id, localVars, eachVarMap);
      if (remapped) this.addVariable(collected, remapped);
    }
  }

  private remapIdentifier(id: string, localVars: Set<string>, eachVarMap: Map<string, string>): string | null {
    const parts = id.split('.');
    const firstName = parts[0];

    if (!localVars.has(firstName)) {
      if (BUILTINS.has(firstName) || PUG_KEYWORDS.has(firstName) || HTML_TAGS.has(firstName)) {
        return null;
      }
      return id;
    }

    const arrayPath = eachVarMap.get(firstName);
    if (!arrayPath) return null;

    if (parts.length === 1) {
      return arrayPath + '[]';
    }

    return arrayPath + '[]' + '.' + parts.slice(1).join('.');
  }

  private extractFromEach(node: PugAstNode, collected: Map<string, PugVariable>, _localVars: Set<string>): void {
    const obj = (node as PugAstNode & { obj?: string }).obj;
    if (typeof obj === 'string') {
      this.addVariable(collected, obj);
    }
  }

  private extractFromMixinDef(node: PugAstNode, collected: Map<string, PugVariable>, localVars: Set<string>): void {
    if (typeof node.args === 'string' && node.args.trim()) {
      const args = node.args.split(',');
      for (const arg of args) {
        const name = arg.trim().split('=')[0].trim();
        if (name && IDENTIFIER_RE.test(name)) {
          localVars.add(name);
        }
      }
    }
  }

  private extractFromMixinCallArgs(node: PugAstNode, collected: Map<string, PugVariable>, localVars: Set<string>, eachVarMap: Map<string, string>): void {
    if (typeof node.args !== 'string' || !node.args.trim()) return;
    const identifiers = this.extractIdentifiers(node.args);
    for (const id of identifiers) {
      const remapped = this.remapIdentifier(id, localVars, eachVarMap);
      if (remapped) this.addVariable(collected, remapped);
    }
  }

  private addVariable(collected: Map<string, PugVariable>, path: string): void {
    if (collected.has(path)) return;

    const rawParts = path.split('.');
    const lastRaw = rawParts[rawParts.length - 1];
    const name = lastRaw.replace('[]', '');

    if (BUILTINS.has(name)) return;
    if (PUG_KEYWORDS.has(name)) return;
    if (HTML_TAGS.has(name)) return;
    if (!IDENTIFIER_RE.test(name)) return;

    const isArrayItem = path.includes('[]');
    const type: DataType = isArrayItem ? 'array' : this.inferType(name);
    const variable: PugVariable = {
      name,
      path,
      type,
      defaultValue: this.defaultValue(type),
      parentPath: rawParts.length > 1 ? rawParts.slice(0, -1).join('.') : undefined,
      isLeaf: true,
    };

    collected.set(path, variable);

    if (rawParts.length > 1) {
      for (let i = 1; i < rawParts.length; i++) {
        const parentPath = rawParts.slice(0, i).join('.');
        if (!collected.has(parentPath)) {
          const rawParent = rawParts[i - 1];
          const parentName = rawParent.replace('[]', '');
          const parentIsArray = rawParent.includes('[]');
          const parentType: DataType = parentIsArray ? 'array' : (i < rawParts.length - 1 ? 'object' : this.inferType(parentName));
          collected.set(parentPath, {
            name: parentName,
            path: parentPath,
            type: parentType,
            defaultValue: this.defaultValue(parentType),
            parentPath: i > 1 ? rawParts.slice(0, i - 1).join('.') : undefined,
            isLeaf: false,
          });
        }
      }
    }
  }

  // --- Expression Identifier Extraction ---

  private extractIdentifiers(expr: string): string[] {
    const identifiers: string[] = [];
    let i = 0;

    while (i < expr.length) {
      const ch = expr[i];

      if (ch === '"' || ch === "'" || ch === '`') {
        i = this.skipString(expr, i, ch);
        continue;
      }

      if (ch === '/' && i + 1 < expr.length && expr[i + 1] === '/') {
        break;
      }

      if (ch === '/' && i + 1 < expr.length && expr[i + 1] === '*') {
        i = this.skipBlockComment(expr, i);
        continue;
      }

      if (/\d/.test(ch)) {
        i = this.skipNumber(expr, i);
        continue;
      }

      if (/[a-zA-Z_$]/.test(ch)) {
        const start = i;
        while (i < expr.length && /[a-zA-Z0-9_$]/.test(expr[i])) {
          i++;
        }
        const word = expr.slice(start, i);

        while (i < expr.length && expr[i] === '.') {
          i++;
          if (i < expr.length && /[a-zA-Z_$]/.test(expr[i])) {
            while (i < expr.length && /[a-zA-Z0-9_$]/.test(expr[i])) {
              i++;
            }
          } else {
            break;
          }
        }

        const fullIdent = expr.slice(start, i);
        const parts = fullIdent.split('.');
        const firstName = parts[0];

        if (!BUILTINS.has(firstName) && !PUG_KEYWORDS.has(firstName) && !HTML_TAGS.has(firstName)) {
          identifiers.push(fullIdent);
        }
        continue;
      }

      i++;
    }

    return identifiers;
  }

  private skipString(expr: string, start: number, quote: string): number {
    let i = start + 1;
    while (i < expr.length) {
      if (expr[i] === '\\') {
        i += 2;
        continue;
      }
      if (expr[i] === quote) {
        return i + 1;
      }
      i++;
    }
    return i;
  }

  private skipBlockComment(expr: string, start: number): number {
    let i = start + 2;
    while (i < expr.length - 1) {
      if (expr[i] === '*' && expr[i + 1] === '/') {
        return i + 2;
      }
      i++;
    }
    return i;
  }

  private skipNumber(expr: string, start: number): number {
    let i = start;
    if (i < expr.length && expr[i] === '0' && (expr[i + 1] === 'x' || expr[i + 1] === 'X')) {
      i += 2;
      while (i < expr.length && /[0-9a-fA-F]/.test(expr[i])) i++;
    } else {
      while (i < expr.length && /[\d.]/.test(expr[i])) i++;
    }
    if (i < expr.length && (expr[i] === 'e' || expr[i] === 'E')) {
      i++;
      if (i < expr.length && (expr[i] === '+' || expr[i] === '-')) i++;
      while (i < expr.length && /\d/.test(expr[i])) i++;
    }
    return i;
  }

  // --- Type Inference ---

  private inferType(name: string): DataType {
    const lower = name.toLowerCase();
    if (/^(is|has|show|hide|enable|disable|open|close|visible|hidden|active|checked|can|should|will|did|was)$/.test(lower)) return 'boolean';
    if (/^(count|total|sum|amount|price|quantity|size|length|width|height|age|year|month|day|hour|min|sec|num|id|index|page|limit|offset|ratio|percent|rate)$/.test(lower)) return 'number';
    if (/^(date|time|created|updated|timestamp|born|expires|deadline|start|end)$/.test(lower)) return 'date';
    if (/^(url|link|href|src|image|img|avatar|icon|website|path)$/.test(lower)) return 'url';
    if (/^(color|bg|background|foreground|border|shadow|opacity|gradient)$/.test(lower)) return 'color';
    if (/^(items|list|products|tags|categories|options|results|entries|rows|data|elements|children|users|names|values|keys|records)$/.test(lower)) return 'array';
    return 'string';
  }

  private defaultValue(type: DataType): unknown {
    switch (type) {
      case 'boolean': return false;
      case 'number': return 0;
      case 'date': return new Date().toISOString().split('T')[0];
      case 'url': return 'https://';
      case 'color': return '#000000';
      case 'array': return [];
      case 'object': return {};
      case 'null': return null;
      default: return '';
    }
  }

  // --- Mixin Extraction ---

  private extractMixins(ast: PugAstNode): PugMixin[] {
    const mixins: PugMixin[] = [];
    const callCounts = new Map<string, number>();

    this.walkAst(ast, (node) => {
      if (node.type !== 'Mixin') return;

      const isCall = (node as PugAstNode & { call?: boolean }).call === true;

      if (isCall) {
        const callName = node.name;
        if (callName) {
          callCounts.set(callName, (callCounts.get(callName) ?? 0) + 1);
        }
        return;
      }

      const argsStr = typeof node.args === 'string' ? node.args : '';
      const args = argsStr.trim()
        ? argsStr.split(',').map((a: string) => {
            const raw = a.trim().split('=')[0].trim();
            return raw;
          }).filter((a: string) => a.length > 0)
        : [];

      mixins.push({
        name: node.name ?? '',
        args,
        body: this.getBodyNodes(node),
        line: node.line ?? 0,
        callCount: 0,
      });
    });

    for (const mixin of mixins) {
      mixin.callCount = callCounts.get(mixin.name) ?? 0;
    }

    return mixins;
  }

  // --- Include / Extend Extraction ---

  private extractIncludes(ast: PugAstNode): string[] {
    const includes: string[] = [];
    this.walkAst(ast, (node) => {
      if (node.type !== 'Include') return;
      const raw: unknown = node.file;
      if (raw != null && typeof raw === 'object' && 'path' in raw) {
        includes.push((raw as FileReference).path);
      } else if (typeof raw === 'string') {
        includes.push(raw);
      }
    });
    return includes;
  }

  private extractExtends(ast: PugAstNode): string | undefined {
    let extendsPath: string | undefined;
    this.walkAst(ast, (node) => {
      if (node.type !== 'Extends') return;
      const raw: unknown = node.file;
      if (raw != null && typeof raw === 'object' && 'path' in raw) {
        extendsPath = (raw as FileReference).path;
      } else if (typeof raw === 'string') {
        extendsPath = raw;
      }
    });
    return extendsPath;
  }

  // --- Helpers ---

  private getBodyNodes(node: PugAstNode): PugAstNode[] {
    if (!node.block) return [];
    if (node.block && Array.isArray(node.block.nodes)) return node.block.nodes;
    return [];
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}
