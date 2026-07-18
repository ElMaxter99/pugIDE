import { Injectable } from '@angular/core';
import {
  PugAstNode,
  PugVariable,
  PugMixin,
  ParseResult,
  ParseError,
} from '../core/models/index';

@Injectable({ providedIn: 'root' })
export class PugParserService {
  private lexerModule: any = null;
  private parserModule: any = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      this.lexerModule = await import('pug-lexer');
      this.parserModule = await import('pug-parser');
      this.initialized = true;
    } catch {
      console.warn('pug-lexer/parser not available, using built-in fallback');
      this.initialized = true;
    }
  }

  async parse(code: string, filename = 'input.pug'): Promise<ParseResult> {
    const start = performance.now();
    const errors: ParseError[] = [];
    let ast: PugAstNode | null = null;

    try {
      await this.initialize();

      if (this.lexerModule && this.parserModule) {
        const tokens = this.lexerModule.default(code, { filename });
        ast = this.parserModule.default(tokens, { filename });
      } else {
        ast = this.fallbackParse(code);
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

    const variables = ast ? this.extractVariables(ast, code) : [];
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

  private fallbackParse(code: string): PugAstNode {
    const lines = code.split('\n');
    const root: PugAstNode = { type: 'Block', body: [], line: 1, column: 1 };
    let stack: PugAstNode[] = [root];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim() || line.trimStart().startsWith('//')) continue;

      const indent = line.length - line.trimStart().length;
      const trimmed = line.trim();

      while (stack.length > 1) {
        const parent = stack[stack.length - 1];
        const parentIndent = (parent as any).__indent ?? 0;
        if (indent > parentIndent) break;
        stack.pop();
      }

      const parent = stack[stack.length - 1];
      if (!parent.body) parent.body = [];

      if (trimmed.startsWith('each ')) {
        const match = trimmed.match(/each\s+(\w+)\s+in\s+(\w+)/);
        if (match) {
          const eachNode: PugAstNode = {
            type: 'Each',
            args: match[1],
            name: match[2],
            line: i + 1,
            column: 1,
            body: [],
          };
          (eachNode as any).__indent = indent;
          parent.body.push(eachNode);
          stack.push(eachNode);
        }
      } else if (trimmed.startsWith('if ')) {
        const ifNode: PugAstNode = {
          type: 'Conditional',
          expr: trimmed.slice(3),
          line: i + 1,
          column: 1,
          body: [],
        };
        (ifNode as any).__indent = indent;
        parent.body.push(ifNode);
        stack.push(ifNode);
      } else if (trimmed.startsWith('mixin ')) {
        const match = trimmed.match(/mixin\s+(\w+)\s*\(([^)]*)\)/);
        if (match) {
          const mixinNode: PugAstNode = {
            type: 'Mixin',
            name: match[1],
            args: match[2],
            line: i + 1,
            column: 1,
            body: [],
          };
          (mixinNode as any).__indent = indent;
          parent.body.push(mixinNode);
          stack.push(mixinNode);
        }
      } else if (trimmed.startsWith('+')) {
        const match = trimmed.match(/\+(\w+)\s*\(([^)]*)\)/);
        if (match) {
          const callNode: PugAstNode = {
            type: 'Call',
            call: match[1],
            args: match[2],
            line: i + 1,
            column: 1,
          };
          parent.body.push(callNode);
        }
      } else if (trimmed.startsWith('include ')) {
        const includeNode: PugAstNode = {
          type: 'Include',
          file: trimmed.slice(8).trim(),
          line: i + 1,
          column: 1,
        };
        parent.body.push(includeNode);
      } else if (trimmed.startsWith('extends ')) {
        const extendNode: PugAstNode = {
          type: 'Extends',
          file: trimmed.slice(8).trim(),
          line: i + 1,
          column: 1,
        };
        parent.body.push(extendNode);
      } else {
        const tagMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9-]*)(.*)$/);
        if (tagMatch) {
          const tagNode: PugAstNode = {
            type: 'Tag',
            name: tagMatch[1],
            line: i + 1,
            column: 1,
            attrs: this.parseAttributes(tagMatch[2]),
            block: { nodes: [] },
          };
          (tagNode as any).__indent = indent;
          parent.body.push(tagNode);
          stack.push(tagNode);
        } else if (trimmed.includes('=')) {
          const eqMatch = trimmed.match(/^(\w[\w.]*)\s*=\s*(.+)$/);
          if (eqMatch) {
            const varNode: PugAstNode = {
              type: 'Code',
              val: eqMatch[2],
              name: eqMatch[1],
              line: i + 1,
              column: 1,
            };
            parent.body.push(varNode);
          }
        } else if (trimmed.startsWith('- ')) {
          const codeNode: PugAstNode = {
            type: 'Code',
            val: trimmed.slice(2),
            line: i + 1,
            column: 1,
          };
          parent.body.push(codeNode);
        } else {
          const textNode: PugAstNode = {
            type: 'Text',
            val: trimmed,
            line: i + 1,
            column: 1,
          };
          parent.body.push(textNode);
        }
      }
    }

    return root;
  }

  private parseAttributes(attrStr: string): Array<{ name: string; val: string }> {
    const attrs: Array<{ name: string; val: string }> = [];
    const regex = /(\w[\w-]*)="([^"]*)"/g;
    let match;
    while ((match = regex.exec(attrStr)) !== null) {
      attrs.push({ name: match[1], val: match[2] });
    }
    return attrs;
  }

  private extractVariables(node: PugAstNode, code: string): PugVariable[] {
    const vars: PugVariable[] = [];
    const seen = new Set<string>();
    const eachVars = new Map<string, string>();

    this.walkAst(node, (n: PugAstNode) => {
      if (n.type === 'Each' && n.args && n.name) {
        eachVars.set(n.name, n.args);
      }
    });

    this.walkAst(node, (n: PugAstNode) => {
      if (n.type === 'Tag' && n.attrs) {
        for (const attr of n.attrs) {
          if (typeof attr.val === 'string') {
            const matches = attr.val.matchAll(/\b([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\b/g);
            for (const m of matches) {
              const varName = m[1];
              if (this.looksLikeVariable(varName, code) && !seen.has(varName)) {
                seen.add(varName);
                vars.push(this.createVariable(varName));
              }
            }
          }
        }
      }

      if ((n.type === 'Code' || n.type === 'InterpolatedTag') && typeof n.val === 'string') {
        const matches = n.val.matchAll(/\b([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\b/g);
        const keywords = new Set([
          'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
          'console', 'window', 'document', 'Math', 'Number', 'String',
          'Boolean', 'Array', 'Object', 'Date', 'JSON', 'parseInt',
          'parseFloat', 'isNaN', 'undefined', 'typeof', 'instanceof',
        ]);
        for (const m of matches) {
          const varName = m[1];
          if (
            keywords.has(varName) ||
            seen.has(varName) ||
            eachVars.has(varName)
          ) {
            continue;
          }
          if (this.looksLikeVariable(varName, code)) {
            seen.add(varName);
            vars.push(this.createVariable(varName));
          }
        }
      }

      if (n.type === 'Conditional' && typeof n.expr === 'string') {
        const matches = n.expr.matchAll(/\b([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\b/g);
        const keywords = new Set(['true', 'false', 'null', 'undefined']);
        for (const m of matches) {
          const varName = m[1];
          if (!keywords.has(varName) && !seen.has(varName) && !eachVars.has(varName)) {
            seen.add(varName);
            vars.push(this.createVariable(varName));
          }
        }
      }
    });

    return vars.sort((a, b) => a.path.localeCompare(b.path));
  }

  private createVariable(path: string): PugVariable {
    const parts = path.split('.');
    const name = parts[parts.length - 1];
    const type = this.inferType(name);
    return {
      name,
      path,
      type,
      defaultValue: this.defaultValue(type),
      parentPath: parts.length > 1 ? parts.slice(0, -1).join('.') : undefined,
      isLeaf: true,
    };
  }

  private inferType(name: string): 'string' | 'number' | 'boolean' | 'date' | 'url' | 'color' | 'array' | 'object' {
    const lower = name.toLowerCase();
    if (/^(is|has|show|hide|enable|disable|open|close|visible|hidden|active|checked)$/.test(lower)) return 'boolean';
    if (/^(count|total|sum|amount|price|quantity|size|length|width|height|age|year|month|day|hour|min|sec|num|id|index)$/.test(lower)) return 'number';
    if (/^(date|time|created|updated|timestamp|born| expires|deadline)$/.test(lower)) return 'date';
    if (/^(url|link|href|src|image|img|avatar|icon|website|website|path)$/.test(lower)) return 'url';
    if (/^(color|bg|background|foreground|border|shadow|opacity)$/.test(lower)) return 'color';
    if (/^(items|list|products|tags|categories|options|results|entries|rows|data|list|elements|children|users|names)$/.test(lower)) return 'array';
    return 'string';
  }

  private defaultValue(type: string): unknown {
    switch (type) {
      case 'boolean': return false;
      case 'number': return 0;
      case 'date': return new Date().toISOString().split('T')[0];
      case 'url': return 'https://';
      case 'color': return '#000000';
      case 'array': return [];
      default: return '';
    }
  }

  private looksLikeVariable(name: string, code: string): boolean {
    const keywords = new Set([
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
      'if', 'else', 'each', 'while', 'case', 'when', 'default',
      'each', 'in', 'unless', 'block', 'extends', 'include', 'mixin',
      'append', 'prepend', 'doctype', 'html', 'head', 'body', 'div',
      'span', 'p', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form',
      'input', 'button', 'select', 'option', 'textarea', 'img',
      'script', 'style', 'link', 'meta', 'title', 'template',
    ]);
    return !keywords.has(name) && /^[a-zA-Z_]/.test(name);
  }

  private extractMixins(node: PugAstNode): PugMixin[] {
    const mixins: PugMixin[] = [];

    this.walkAst(node, (n: PugAstNode) => {
      if (n.type === 'Mixin' && n.name) {
        const argsStr = typeof n.args === 'string' ? n.args : '';
        const args = argsStr
          ? argsStr.split(',').map((a: string) => a.trim().split('=')[0].trim())
          : [];
        mixins.push({
          name: n.name,
          args,
          body: (this.getBodyNodes(n) as any),
          line: n.line ?? 0,
          callCount: 0,
        });
      }
    });

    let callCount = 0;
    this.walkAst(node, (n: PugAstNode) => {
      if (n.type === 'Call' && n.call) {
        const mixin = mixins.find((m) => m.name === n.call);
        if (mixin) mixin.callCount = ++callCount;
      }
    });

    return mixins;
  }

  private extractIncludes(node: PugAstNode): string[] {
    const includes: string[] = [];
    this.walkAst(node, (n: PugAstNode) => {
      if ((n.type === 'Include' || n.type === 'RawInclude') && typeof (n as any).file === 'string') {
        includes.push((n as any).file);
      }
    });
    return includes;
  }

  private extractExtends(node: PugAstNode): string | undefined {
    let extendsPath: string | undefined;
    this.walkAst(node, (n: PugAstNode) => {
      if (n.type === 'Extends' && typeof (n as any).file === 'string') {
        extendsPath = (n as any).file;
      }
    });
    return extendsPath;
  }

  private getBodyNodes(node: PugAstNode): PugAstNode[] {
    if (!node.body) return [];
    if (Array.isArray(node.body)) return node.body;
    if ('nodes' in node.body) return (node.body as PugBlock).nodes;
    return [];
  }

  private walkAst(node: PugAstNode, callback: (node: PugAstNode) => void): void {
    callback(node);

    if (node.block?.nodes) {
      for (const child of node.block.nodes) {
        this.walkAst(child, callback);
      }
    }
    if (node.body) {
      if (Array.isArray(node.body)) {
        for (const child of node.body) {
          this.walkAst(child, callback);
        }
      } else {
        const bodyAsBlock = node.body as unknown as PugBlock;
        if (bodyAsBlock.nodes) {
          for (const child of bodyAsBlock.nodes) {
            this.walkAst(child, callback);
          }
        }
      }
    }
    if (node.nodes) {
      for (const child of node.nodes) {
        this.walkAst(child, callback);
      }
    }
  }
}

interface PugBlock {
  nodes: PugAstNode[];
}
