import { Injectable, inject } from '@angular/core';
import {
  PugAstNode,
  PugVariable,
  PugMixin,
  PugBlock,
  ParseResult,
  ParseError,
  DataType,
} from '../core/models/index';
import { createPugFilePlugin, normalizeIncludes } from '../core/utils/pug-vfs.util';
import { TerminalState } from '../core/state/terminal.state';

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

/** JS reserved words that can show up in `- code` and inline function expressions; never data. */
const JS_KEYWORDS = new Set([
  'function', 'return', 'var', 'let', 'const', 'new', 'typeof', 'instanceof', 'void', 'delete',
  'this', 'of', 'for', 'do', 'switch', 'break', 'continue', 'throw', 'try', 'catch', 'finally',
  'class', 'async', 'await', 'yield',
]);

const ARRAY_METHODS = new Set([
  'slice', 'map', 'filter', 'forEach', 'join', 'some', 'every', 'find', 'findIndex', 'reduce',
  'concat', 'sort', 'reverse', 'push', 'flatMap', 'flat',
]);
const NUMBER_METHODS = new Set(['toFixed', 'toLocaleString', 'toPrecision']);
const DATE_METHODS = new Set(['toISOString', 'toLocaleDateString', 'getFullYear', 'getTime', 'getMonth', 'getDate']);

/** A data reference found in an expression, with a type hint taken from how it is used (`rows.length` → array). */
interface ExprRef { id: string; hint?: DataType }

const IDENTIFIER_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const IDENTIFIER_CHAIN_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/;

type LexerFn = (str: string, options?: { filename?: string }) => unknown;
type LoadFn = (src: string, options: Record<string, unknown>) => PugAstNode;
type LinkFn = (ast: PugAstNode) => PugAstNode;
type ParserFn = (tokens: unknown[], options?: { filename?: string }) => PugAstNode;

@Injectable({ providedIn: 'root' })
export class PugParserService {
  private terminalState = inject(TerminalState);

  private lexerFn: LexerFn | null = null;
  private parserFn: ParserFn | null = null;
  private loadFn: LoadFn | null = null;
  private linkFn: LinkFn | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /** `- var x = ...` names seen in the project (JS `var` is function-wide, so includes and mixins see them) → data path they alias, or null for plain locals. */
  private declared = new Map<string, string | null>();
  /** Free functions called by expressions of the last extraction (`t('KEY')`). */
  private calledFns = new Set<string>();

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    const bundle = (self as any).parserBundle;
    if (!bundle?.lexer) {
      try {
        await loadScript('assets/parser-browser.js');
      } catch (err) {
        this.terminalState.addEntry(
          'error',
          'Parser',
          `Failed to load parser bundle: ${(err as Error).message ?? err}`
        );
      }
    }
    const loaded = (self as any).parserBundle;
    if (loaded?.lexer) {
      this.lexerFn = loaded.lexer as LexerFn;
      this.parserFn = loaded.parse as unknown as ParserFn;
      this.loadFn = (loaded.load?.string as LoadFn) ?? null;
      this.linkFn = (loaded.link as LinkFn) ?? null;
    } else {
      this.terminalState.addEntry(
        'error',
        'Parser',
        'Pug parser is unavailable — variable, mixin and include detection will not work.'
      );
    }
    this.initialized = true;
  }

  /** Variables the whole project reads, starting from its entry template (includes/extends followed natively). */
  async parseProject(files: Map<string, string>, entryPath: string | null): Promise<PugVariable[]> {
    await this.initialize();
    if (!entryPath || !this.lexerFn || !this.parserFn) return [];
    try {
      const ast = this.buildLinkedAst(files.get(entryPath) ?? '', entryPath, files);
      return this.extractVariables(ast);
    } catch (err) {
      this.terminalState.addEntry('warning', 'Parser', `Skipped ${entryPath}: ${(err as Error).message ?? 'parse error'}`);
      return [];
    }
  }

  /** Lex+parse then (when a project is given) load and link include/extends natively, like the compiler does. */
  private buildLinkedAst(code: string, filename: string, files?: Map<string, string>): PugAstNode {
    if (files && this.loadFn && this.linkFn && this.lexerFn && this.parserFn) {
      const plugin = createPugFilePlugin(files);
      const loaded = this.loadFn(normalizeIncludes(code, filename, files), {
        filename,
        basedir: '/',
        lex: this.lexerFn,
        parse: this.parserFn,
        resolve: (name: string, source: string | undefined) => plugin.resolve(name, source),
        read: (name: string) => plugin.read(name),
      });
      return this.linkFn(loaded);
    }
    const tokens = this.lexerFn!(code, { filename }) as unknown[];
    return this.parserFn!(tokens, { filename });
  }

  async parse(code: string, filename = 'input.pug', files?: Map<string, string>): Promise<ParseResult> {
    const start = performance.now();
    const errors: ParseError[] = [];
    let ast: PugAstNode | null = null;

    try {
      await this.initialize();

      if (this.lexerFn && this.parserFn) {
        ast = this.buildLinkedAst(code, filename, files);
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
    const calledFunctions = ast ? [...this.calledFns] : [];
    const mixins = ast ? this.extractMixins(ast) : [];
    const includes = ast ? this.extractIncludes(ast) : [];
    const extendsPath = ast ? this.extractExtends(ast) : undefined;

    return {
      ast,
      variables,
      mixins,
      includes,
      extendsPath,
      calledFunctions,
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

  /**
   * Walks the (linked) AST collecting every data path the template reads.
   * Mixin bodies are expanded at each call site with their parameters aliased
   * to the argument expressions, so `+card(user)` over `mixin card(u) h2= u.name`
   * yields `user.name` (and `+item(it)` inside `each it in items` yields `items[].…`).
   */
  private extractVariables(ast: PugAstNode): PugVariable[] {
    const collected = new Map<string, PugVariable>();
    const mixinDefs = new Map<string, { params: string[]; body: PugAstNode[] }>();
    this.declared = new Map();
    this.calledFns = new Set();

    this.walkAst(ast, (node) => {
      if (node.type === 'Mixin' && node.call !== true && node.name) {
        mixinDefs.set(node.name, { params: this.mixinParams(node.args), body: node.block?.nodes ?? [] });
      }
      // Locals declared anywhere are not data, even when a mixin body reads them before the declaration is visited.
      if (node.type === 'Code' && node.buffer !== true && typeof node.val === 'string') {
        for (const { name } of this.parseDeclarations(node.val)) this.declared.set(name, null);
      }
    });

    this.collectNodes(ast.nodes ?? [], new Map(), collected, mixinDefs, 0);
    return Array.from(collected.values()).sort((a, b) => a.path.localeCompare(b.path));
  }

  private mixinParams(args: unknown): string[] {
    if (typeof args !== 'string' || !args.trim()) return [];
    return this.splitArgs(args)
      .map((a) => a.trim().replace(/^\.\.\./, '').split('=')[0].trim())
      .filter((a) => IDENTIFIER_RE.test(a));
  }

  /** Splits a call/definition argument list on top-level commas (ignores commas in strings and brackets). */
  private splitArgs(args: string, separator = ','): string[] {
    const out: string[] = [];
    let depth = 0;
    let quote = '';
    let cur = '';
    for (let i = 0; i < args.length; i++) {
      const ch = args[i];
      if (quote) {
        cur += ch;
        if (ch === '\\') cur += args[++i] ?? '';
        else if (ch === quote) quote = '';
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { quote = ch; cur += ch; continue; }
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth--;
      if (ch === separator && depth === 0) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur);
    return out;
  }

  /** Maps an identifier chain through the local aliases / project locals; null when it's not (derived from) project data. */
  private resolveId(id: string, aliases: Map<string, string | null>): string | null {
    const parts = id.split('.');
    const first = parts[0];
    const map = aliases.has(first) ? aliases : this.declared.has(first) ? this.declared : null;
    if (map) {
      const base = map.get(first);
      if (!base) return null;
      return parts.length === 1 ? base : base + '.' + parts.slice(1).join('.');
    }
    if (BUILTINS.has(first) || PUG_KEYWORDS.has(first)) return null;
    return id;
  }

  private collectExpr(expr: string, aliases: Map<string, string | null>, collected: Map<string, PugVariable>): void {
    const { refs, calls } = this.scanExpr(expr);
    for (const fn of calls) {
      if (!aliases.has(fn) && !this.declared.has(fn)) this.calledFns.add(fn);
    }
    for (const { id, hint } of refs) {
      const path = this.resolveId(id, aliases);
      if (!path) continue;
      const name = path.split('.').pop()!.replace('[]', '');
      // A usage hint only decides the type when the name itself doesn't say anything.
      this.addVariable(collected, path, hint && this.inferType(name) === 'string' ? hint : undefined);
    }
  }

  /**
   * Splits `- var a = 1, b = x.y; foo(b)` style code into declarators (top-level `var/let/const`
   * only; declarations inside function bodies are locals of that function) and other statements.
   */
  private parseDeclarations(code: string): { name: string; init: string }[] {
    const out: { name: string; init: string }[] = [];
    for (const stmt of this.splitArgs(code, ';')) {
      const m = stmt.match(/^\s*(?:var|let|const)\s+([\s\S]*)$/);
      if (!m) continue;
      for (const decl of this.splitArgs(m[1])) {
        const eq = decl.indexOf('=');
        const name = (eq < 0 ? decl : decl.slice(0, eq)).trim();
        if (IDENTIFIER_RE.test(name)) out.push({ name, init: eq < 0 ? '' : decl.slice(eq + 1).trim() });
      }
    }
    return out;
  }

  /** Unbuffered code (`- ...`): declarations register locals (aliasing data when initialised from it); everything else is read. */
  private collectStatements(code: string, scope: Map<string, string | null>, collected: Map<string, PugVariable>): void {
    for (const stmt of this.splitArgs(code, ';')) {
      const m = stmt.match(/^\s*(?:var|let|const)\s+([\s\S]*)$/);
      if (!m) {
        if (stmt.trim()) this.collectExpr(stmt, scope, collected);
        continue;
      }
      for (const { name, init } of this.parseDeclarations(stmt)) {
        let alias: string | null = null;
        if (init && IDENTIFIER_CHAIN_RE.test(init)) {
          alias = this.resolveId(init, scope);
          if (alias) this.addVariable(collected, alias);
        } else if (init) {
          this.collectExpr(init, scope, collected);
        }
        this.declared.set(name, alias);
      }
    }
  }

  private collectNodes(
    nodes: PugAstNode[],
    aliases: Map<string, string | null>,
    collected: Map<string, PugVariable>,
    mixinDefs: Map<string, { params: string[]; body: PugAstNode[] }>,
    depth: number,
  ): void {
    // `- var x = ...` declares a local for the rest of this block.
    const scope = new Map(aliases);
    for (const node of nodes) this.collectNode(node as any, scope, collected, mixinDefs, depth);
  }

  private collectNode(
    node: any,
    scope: Map<string, string | null>,
    collected: Map<string, PugVariable>,
    mixinDefs: Map<string, { params: string[]; body: PugAstNode[] }>,
    depth: number,
  ): void {
    if (!node || typeof node !== 'object') return;
    const recurse = (child: any) => {
      if (!child) return;
      if (Array.isArray(child.nodes)) this.collectNodes(child.nodes, scope, collected, mixinDefs, depth);
      else if (child.type) this.collectNode(child, scope, collected, mixinDefs, depth);
    };

    switch (node.type) {
      case 'Tag':
      case 'InterpolatedTag':
        for (const attr of node.attrs ?? []) {
          if (typeof attr.val !== 'string') continue;
          this.collectExpr(attr.val, scope, collected);
        }
        for (const ab of node.attributeBlocks ?? []) {
          if (typeof ab === 'string') this.collectExpr(ab, scope, collected);
        }
        recurse(node.block);
        return;

      case 'Code':
        if (typeof node.val === 'string') {
          if (node.buffer) {
            this.collectExpr(node.val, scope, collected);
          } else {
            this.collectStatements(node.val, scope, collected);
          }
        }
        recurse(node.block);
        return;

      case 'Text':
        if (typeof node.val === 'string') {
          for (const expr of this.extractInterpolationExpressions(node.val)) this.collectExpr(expr, scope, collected);
        }
        return;

      case 'Conditional':
        if (typeof node.test === 'string') {
          const bare = node.test.trim().replace(/^!\s*/, '');
          const barePath = IDENTIFIER_CHAIN_RE.test(bare) ? this.resolveId(bare, scope) : null;
          if (barePath) this.addVariable(collected, barePath, this.inferType(barePath.split('.').pop()!.replace('[]', ''), true));
          else this.collectExpr(node.test, scope, collected);
        }
        recurse(node.consequent);
        recurse(node.alternate);
        return;

      case 'Case':
        if (typeof node.expr === 'string') this.collectExpr(node.expr, scope, collected);
        recurse(node.block);
        return;

      case 'When':
        if (typeof node.expr === 'string' && node.expr !== 'default') this.collectExpr(node.expr, scope, collected);
        recurse(node.block);
        return;

      case 'While':
        if (typeof node.test === 'string') this.collectExpr(node.test, scope, collected);
        recurse(node.block);
        return;

      case 'Each':
      case 'EachOf': {
        const objExpr = typeof node.obj === 'string' ? node.obj.trim() : '';
        // `each x in rows` and `each x in rows.slice(a, b)` (also filter/sort/…) both iterate the data array `rows`.
        const source = IDENTIFIER_CHAIN_RE.test(objExpr)
          ? objExpr
          : objExpr.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.(?:slice|filter|sort|reverse|concat)\s*\(/)?.[1] ?? null;
        const objPath = source ? this.resolveId(source, scope) : null;
        if (objPath) this.addVariable(collected, objPath, 'array');
        if (objExpr && source !== objExpr) this.collectExpr(objExpr, scope, collected);
        const inner = new Map(scope);
        if (node.val) inner.set(node.val, objPath ? objPath + '[]' : null);
        if (node.key) inner.set(node.key, null);
        if (node.block?.nodes) this.collectNodes(node.block.nodes, inner, collected, mixinDefs, depth);
        recurse(node.alternate);
        return;
      }

      case 'Mixin': {
        if (node.call !== true) return; // definitions are expanded where they're called
        const args = typeof node.args === 'string' ? this.splitArgs(node.args) : [];
        const resolved: (string | null)[] = args.map((arg) => {
          const trimmed = arg.trim();
          if (IDENTIFIER_CHAIN_RE.test(trimmed)) return this.resolveId(trimmed, scope);
          this.collectExpr(trimmed, scope, collected);
          return null;
        });
        const def = mixinDefs.get(node.name ?? '');
        if (def && depth < 12) {
          const inner = new Map<string, string | null>();
          def.params.forEach((param, i) => inner.set(param, resolved[i] ?? null));
          this.collectNodes(def.body, inner, collected, mixinDefs, depth + 1);
        }
        // Added after the body so members found there (`user.name`) make it an object, not a string.
        for (const path of resolved) if (path) this.addVariable(collected, path);
        recurse(node.block);
        return;
      }

      default:
        recurse(node.block);
        if (Array.isArray(node.nodes)) this.collectNodes(node.nodes, scope, collected, mixinDefs, depth);
    }
  }

  private extractInterpolationExpressions(text: string): string[] {
    const expressions: string[] = [];
    let i = 0;

    while (i < text.length) {
      if ((text[i] === '#' || text[i] === '!') && text[i + 1] === '{') {
        let depth = 1;
        let j = i + 2;
        const start = j;
        while (j < text.length && depth > 0) {
          if (text[j] === '{') depth++;
          else if (text[j] === '}') depth--;
          if (depth > 0) j++;
        }
        expressions.push(text.slice(start, j));
        i = j + 1;
      } else {
        i++;
      }
    }

    return expressions;
  }

  private addVariable(collected: Map<string, PugVariable>, path: string, typeOverride?: DataType): void {
    const existing = collected.get(path);
    if (existing) {
      // First sighting was a plain read; a later usage (`.length`, `each`) tells what it really is.
      if (typeOverride && typeOverride !== 'string' && existing.isLeaf && existing.type === 'string') {
        existing.type = typeOverride;
        existing.defaultValue = this.defaultValue(typeOverride);
      }
      return;
    }

    const rawParts = path.split('.');
    const lastRaw = rawParts[rawParts.length - 1];
    const name = lastRaw.replace('[]', '');

    if (BUILTINS.has(name)) return;
    if (PUG_KEYWORDS.has(name)) return;
    if (!IDENTIFIER_RE.test(name)) return;

    const type: DataType = typeOverride ?? this.inferType(name);
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
        const existingParent = collected.get(parentPath);
        if (existingParent) {
          // Something was read as a plain value, but its members are read too: it's a container.
          if (existingParent.isLeaf) {
            existingParent.isLeaf = false;
            if (existingParent.type !== 'array') {
              existingParent.type = 'object';
              existingParent.defaultValue = {};
            }
          }
        } else {
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

  /**
   * Finds the data references of a JS expression: identifier chains that are neither strings,
   * object-literal keys, property accesses after `)`/`]`, function parameters, keywords nor
   * builtins. Method calls (`rows.slice(…)`) yield the object (`rows`) with a type hint; calls
   * to free functions (`t('KEY')`) are reported separately.
   */
  private scanExpr(expr: string): { refs: ExprRef[]; calls: string[] } {
    const refs: ExprRef[] = [];
    const calls: string[] = [];
    const locals = this.expressionLocals(expr);
    const prevSig = (idx: number): string => {
      let k = idx - 1;
      while (k >= 0 && /\s/.test(expr[k])) k--;
      return k >= 0 ? expr[k] : '';
    };
    const nextSigIdx = (idx: number): number => {
      let k = idx;
      while (k < expr.length && /\s/.test(expr[k])) k++;
      return k;
    };
    let i = 0;

    while (i < expr.length) {
      const ch = expr[i];

      if (ch === '"' || ch === "'") {
        i = this.skipString(expr, i, ch);
        continue;
      }

      if (ch === '`') {
        i = this.scanTemplate(expr, i, refs, calls);
        continue;
      }

      if (ch === '/' && expr[i + 1] === '/') break;

      if (ch === '/' && expr[i + 1] === '*') {
        i = this.skipBlockComment(expr, i);
        continue;
      }

      if (ch === '/' && (prevSig(i) === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prevSig(i)))) {
        i = this.skipRegex(expr, i);
        continue;
      }

      if (/\d/.test(ch)) {
        i = this.skipNumber(expr, i);
        continue;
      }

      if (/[a-zA-Z_$]/.test(ch)) {
        const start = i;
        while (i < expr.length && /[a-zA-Z0-9_$]/.test(expr[i])) i++;
        // `obj.method(…).other` — what follows a dot is a property, not data.
        if (prevSig(start) === '.') continue;

        while (i < expr.length && (expr[i] === '.' || (expr[i] === '?' && expr[i + 1] === '.'))) {
          const dot = expr[i] === '.' ? i : i + 1;
          if (/[a-zA-Z_$]/.test(expr[dot + 1] ?? '')) {
            i = dot + 1;
            while (i < expr.length && /[a-zA-Z0-9_$]/.test(expr[i])) i++;
          } else {
            break;
          }
        }

        const parts = expr.slice(start, i).replace(/\?/g, '').split('.');
        const first = parts[0];

        if (first === 'function') {
          // `function name(` — the name is not data (parameters are filtered through `locals`).
          const k = nextSigIdx(i);
          if (/[a-zA-Z_$]/.test(expr[k] ?? '')) {
            i = k;
            while (i < expr.length && /[a-zA-Z0-9_$]/.test(expr[i])) i++;
          }
          continue;
        }
        if (JS_KEYWORDS.has(first) || PUG_KEYWORDS.has(first) || BUILTINS.has(first) || locals.has(first)) continue;

        const p = prevSig(start);
        const nextIdx = nextSigIdx(i);
        // `{ length: n }` — an object-literal key.
        if (parts.length === 1 && (p === '{' || p === ',') && expr[nextIdx] === ':') continue;

        if (expr[nextIdx] === '(') {
          if (parts.length === 1) {
            calls.push(first);
          } else {
            const method = parts.pop()!;
            const hint: DataType | undefined = ARRAY_METHODS.has(method) ? 'array'
              : NUMBER_METHODS.has(method) ? 'number'
              : DATE_METHODS.has(method) ? 'date'
              : undefined;
            refs.push({ id: parts.join('.'), hint });
          }
        } else if (parts.length > 1 && parts[parts.length - 1] === 'length') {
          refs.push({ id: parts.slice(0, -1).join('.'), hint: 'array' });
        } else {
          refs.push({ id: parts.join('.') });
        }
        continue;
      }

      i++;
    }

    return { refs, calls };
  }

  /** Names bound inside the expression itself: function / arrow parameters and `var|let|const` declarations. */
  private expressionLocals(expr: string): Set<string> {
    const locals = new Set<string>();
    const addParams = (list: string) => {
      for (const raw of list.split(',')) {
        const name = raw.trim().replace(/^\.\.\./, '').split('=')[0].trim();
        if (IDENTIFIER_RE.test(name)) locals.add(name);
      }
    };
    for (const m of expr.matchAll(/function\s*[\w$]*\s*\(([^)]*)\)/g)) addParams(m[1]);
    for (const m of expr.matchAll(/\(([^()]*)\)\s*=>/g)) addParams(m[1]);
    for (const m of expr.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) locals.add(m[1]);
    for (const m of expr.matchAll(/\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)/g)) locals.add(m[1]);
    return locals;
  }

  /** Template literal: skips the text, scans each `${…}` as an expression. Returns the index after the closing backtick. */
  private scanTemplate(expr: string, start: number, refs: ExprRef[], calls: string[]): number {
    let i = start + 1;
    while (i < expr.length) {
      if (expr[i] === '\\') { i += 2; continue; }
      if (expr[i] === '`') return i + 1;
      if (expr[i] === '$' && expr[i + 1] === '{') {
        let depth = 1;
        let j = i + 2;
        while (j < expr.length && depth > 0) {
          if (expr[j] === '{') depth++;
          else if (expr[j] === '}') depth--;
          if (depth > 0) j++;
        }
        const inner = this.scanExpr(expr.slice(i + 2, j));
        refs.push(...inner.refs);
        calls.push(...inner.calls);
        i = j + 1;
        continue;
      }
      i++;
    }
    return i;
  }

  private skipRegex(expr: string, start: number): number {
    let i = start + 1;
    let inClass = false;
    while (i < expr.length) {
      const c = expr[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) { i++; break; }
      i++;
    }
    while (i < expr.length && /[a-z]/i.test(expr[i])) i++;
    return i;
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

  /** `asCondition`: the value is only tested for truthiness, so default to boolean unless the name says otherwise. */
  private inferType(name: string, asCondition = false): DataType {
    const lower = name.toLowerCase();
    if (/^(is|has|can|should|will|did|was|es|tiene|esta|puede)[A-Z_0-9]/.test(name)) return 'boolean';
    if (/^(is|has|show|hide|enable|disable|open|close|visible|hidden|active|checked|can|should|will|did|was|activo|activa|visible|oculto|habilitado|deshabilitado|destacado|publicado|disponible|verificado|premium|admin|enabled|disabled|selected|seleccionado|completado|done|featured|published|available|verified)$/.test(lower)) return 'boolean';
    if (/^(count|total|sum|amount|price|quantity|size|length|width|height|age|year|month|day|hour|min|sec|num|id|index|page|limit|offset|ratio|percent|rate|edad|precio|cantidad|importe|anio|año|mes|dia|hora|stock|puntos|valoracion|nota|numero|tamano|ancho|alto|descuento)$/.test(lower)) return 'number';
    if (/^(date|time|created|updated|timestamp|born|expires|deadline|start|end|fecha|nacimiento|creado|actualizado|caducidad|inicio|fin)$/.test(lower)) return 'date';
    if (/^(url|link|href|src|image|img|avatar|icon|website|path|enlace|imagen|foto|web|sitio|icono)$/.test(lower)) return 'url';
    if (/^(color|bg|background|foreground|border|shadow|opacity|gradient|fondo)$/.test(lower)) return 'color';
    if (/^(items|list|products|tags|categories|options|results|entries|rows|data|elements|children|users|names|values|keys|records|lista|productos|etiquetas|categorias|opciones|resultados|filas|elementos|usuarios|nombres|valores)$/.test(lower)) return 'array';
    return asCondition ? 'boolean' : 'string';
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
      // Pug parses extension-less includes (`include ./foo`) as RawInclude; we treat them as .pug partials.
      if (node.type !== 'Include' && node.type !== 'RawInclude') return;
      const raw: unknown = node.file;
      const path = raw != null && typeof raw === 'object' && 'path' in raw
        ? (raw as FileReference).path
        : typeof raw === 'string' ? raw : null;
      if (!path) return;
      if (node.type === 'RawInclude' && /\.[a-z0-9]+$/i.test(path)) return;
      includes.push(path);
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
