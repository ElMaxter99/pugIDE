/**
 * Pure helpers for editor features (no Angular / Monaco dependencies so they
 * can be tested with plain Node): mixin discovery, go-to-definition,
 * project-wide search and a lightweight Pug formatter.
 */

export interface MixinDef {
  name: string;
  args: string;
  path: string;
  line: number; // 1-based
}

export interface DefinitionTarget {
  path: string;
  line: number; // 1-based
  column: number; // 1-based
  /** True when the include/extends target file does not exist. */
  missing?: boolean;
  /** [start, end) columns (1-based) of the token resolved on the source line. */
  range: [number, number];
}

export interface SearchMatch {
  path: string;
  line: number; // 1-based
  column: number; // 1-based
  text: string;
  length: number;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  regex?: boolean;
  wholeWord?: boolean;
  maxResults?: number;
}

const MIXIN_DEF_RE = /^\s*mixin\s+([\w-]+)\s*(?:\(([^)]*)\))?/;
const INCLUDE_RE = /^(\s*)(include|extends)\s+(?::[\w-]+\s+)?['"]?([^'"\s]+)['"]?/;
const MIXIN_CALL_RE = /(?:^|[\s:])\+([\w-]+)/g;
const HAS_EXT_RE = /\.[a-z0-9]+$/i;

export function isPugPath(path: string): boolean {
  return /\.(pug|jade)$/i.test(path);
}

function dirParts(path: string): string[] {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts;
}

/** Resolves an include/extends reference to a project path (leading slash = project root). */
export function resolveIncludePath(
  raw: string,
  fromPath: string,
  files: ReadonlyMap<string, string>,
): { path: string; exists: boolean } {
  const ref = raw.trim();
  const parts = ref.startsWith('/') ? [] : dirParts(fromPath);
  for (const seg of ref.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  const base = '/' + parts.join('/');
  const candidates = HAS_EXT_RE.test(base) ? [base] : [base + '.pug', base + '.jade', base, base + '/index.pug'];
  // Legacy fallback used by the include resolver: path relative to project root.
  candidates.push('/' + ref.replace(/^\/+/, ''));
  for (const c of candidates) if (files.has(c)) return { path: c, exists: true };
  return { path: candidates[0], exists: false };
}

export function collectMixins(files: ReadonlyMap<string, string>): MixinDef[] {
  const out: MixinDef[] = [];
  for (const [path, content] of files) {
    if (!isPugPath(path)) continue;
    content.split('\n').forEach((text, i) => {
      const m = text.match(MIXIN_DEF_RE);
      if (m) out.push({ name: m[1], args: (m[2] ?? '').trim(), path, line: i + 1 });
    });
  }
  return out;
}

/** Resolves an include/extends path or a `+mixin` call under `column` (1-based). */
export function findDefinition(
  files: ReadonlyMap<string, string>,
  currentPath: string,
  lineText: string,
  column: number,
): DefinitionTarget | null {
  const inc = lineText.match(INCLUDE_RE);
  if (inc) {
    const start = lineText.indexOf(inc[3], inc[1].length + inc[2].length);
    const end = start + inc[3].length;
    if (column - 1 < start || column - 1 > end) return null;
    const r = resolveIncludePath(inc[3], currentPath, files);
    return { path: r.path, line: 1, column: 1, missing: !r.exists, range: [start + 1, end + 1] };
  }

  const re = new RegExp(MIXIN_CALL_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(lineText))) {
    const plus = m.index + m[0].indexOf('+');
    const start = plus + 1;
    const end = start + m[1].length;
    if (column - 1 < plus || column - 1 > end) continue;
    const defs = collectMixins(files).filter((d) => d.name === m![1]);
    if (!defs.length) return null;
    const def = defs.find((d) => d.path === currentPath) ?? defs[0];
    const defText = (files.get(def.path) ?? '').split('\n')[def.line - 1] ?? '';
    const col = defText.indexOf(def.name) + 1;
    return { path: def.path, line: def.line, column: col > 0 ? col : 1, range: [start + 1, end + 1] };
  }
  return null;
}

export function searchProject(
  files: ReadonlyMap<string, string>,
  query: string,
  opts: SearchOptions = {},
): SearchMatch[] {
  if (!query) return [];
  const max = opts.maxResults ?? 500;
  let re: RegExp;
  try {
    let src = opts.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (opts.wholeWord) src = `\\b(?:${src})\\b`;
    re = new RegExp(src, opts.caseSensitive ? 'g' : 'gi');
  } catch {
    return [];
  }
  const out: SearchMatch[] = [];
  for (const path of [...files.keys()].sort()) {
    const lines = (files.get(path) ?? '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(lines[i]))) {
        if (m[0].length === 0) {
          re.lastIndex++;
          continue;
        }
        out.push({ path, line: i + 1, column: m.index + 1, text: lines[i], length: m[0].length });
        if (out.length >= max) return out;
      }
    }
  }
  return out;
}

/** Ancho a partir del cual una etiqueta con varios atributos se reparte en varias líneas. */
const PRINT_WIDTH = 100;

/** Palabras reservadas que pueden ir seguidas de `(` sin ser una etiqueta con atributos. */
const NON_TAG_KEYWORDS = new Set([
  'if', 'else', 'unless', 'while', 'case', 'when', 'each', 'for', 'mixin', 'block', 'extends',
  'include', 'append', 'prepend', 'yield', 'default', 'doctype',
]);

const TAG_HEAD_RE = /^(?:[A-Za-z][\w:-]*|(?=[.#][\w-]))(?:[.#][\w-]+)*/;

/** Índice del `)` que cierra el `(` de `open` (respeta comillas), o -1 si no se cierra en `text`. */
function findClosingParen(text: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return -1;
}

const ATTR_NAME_RE = /^[A-Za-z_:@[*#][^\s=,'"()!]*/;
const ATTR_STRING_RE = /^(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/;
const ATTR_BARE_RE = /^(?:-?\d+(?:\.\d+)?|[A-Za-z_$][\w$.]*)/;

/**
 * Atributos "simples" (`nombre`, `nombre=valor` con valor entre comillas, número o identificador)
 * normalizados con comillas simples y un espacio de separación. Devuelve null si hay algo más
 * complejo (concatenaciones, objetos, llamadas...): entonces no se toca.
 */
function parseSimpleAttrs(inner: string): string[] | null {
  const attrs: string[] = [];
  let rest = inner.trim();
  while (rest) {
    const name = ATTR_NAME_RE.exec(rest)?.[0];
    if (!name) return null;
    rest = rest.slice(name.length);
    const eq = /^\s*(!?=)\s*/.exec(rest);
    let attr = name;
    if (eq) {
      rest = rest.slice(eq[0].length);
      const str = ATTR_STRING_RE.exec(rest)?.[0];
      const value = str ?? ATTR_BARE_RE.exec(rest)?.[0];
      if (!value) return null;
      rest = rest.slice(value.length);
      let out = value;
      if (str && str[0] === '"' && !str.includes("'") && !str.includes('\\')) out = `'${str.slice(1, -1)}'`;
      attr += eq[1] + out;
    }
    const sep = /^(?:\s*,\s*|\s+|$)/.exec(rest);
    if (!sep) return null;
    rest = rest.slice(sep[0].length);
    attrs.push(attr);
  }
  return attrs;
}

/** Cabecera de etiqueta con atributos al inicio de `body` (`a.btn(href="x")`), o null si no aplica. */
function splitTagAttrs(body: string): { head: string; open: number; close: number } | null {
  const head = TAG_HEAD_RE.exec(body)?.[0];
  if (!head || NON_TAG_KEYWORDS.has(head) || body[head.length] !== '(') return null;
  return { head, open: head.length, close: findClosingParen(body, head.length) };
}

/**
 * Simple Pug formatter. Prettier has no built-in Pug support and the community
 * plugin (@prettier/plugin-pug) is not bundled, so this is a conservative,
 * hand-written formatter:
 *  - re-indents every line to a consistent unit (`indent`) following the
 *    nesting implied by the original relative indentation,
 *  - converts tabs to spaces, strips trailing whitespace, collapses runs of
 *    blank lines into one, and ensures one trailing newline,
 *  - normalises simple tag attributes (`a(href = "x",  title="y")` ->
 *    `a(href='x' title='y')`) and breaks long attribute lists over several lines.
 * Attributes with expressions (concatenations, objects, calls...) are left as
 * written, as are mixin calls and the inside of raw text blocks (`script.`,
 * `| ` blocks, `//` comment blocks): their lines keep their relative
 * indentation. It never reorders attributes.
 */
export function formatPug(source: string, indent = '  '): string {
  const lines = source.replace(/\r\n?/g, '\n').replace(/\t/g, '  ').split('\n');
  const out: string[] = [];
  const stack: number[] = []; // original indent widths of open ancestors
  let block: { base: number; depth: number; first: number | null } | null = null;
  let pendingBlank = false;

  for (let li = 0; li < lines.length; li++) {
    const text = lines[li].replace(/\s+$/, '');
    if (!text) {
      pendingBlank = true;
      continue;
    }
    const width = text.length - text.trimStart().length;
    let body = text.trimStart();

    if (block) {
      if (width > block.base) {
        if (block.first === null) block.first = width;
        if (pendingBlank && out.length) out.push('');
        pendingBlank = false;
        out.push(indent.repeat(block.depth + 1) + ' '.repeat(Math.max(0, width - block.first)) + body);
        continue;
      }
      block = null;
    }

    while (stack.length && stack[stack.length - 1] >= width) stack.pop();
    const depth = stack.length;
    stack.push(width);
    if (pendingBlank && out.length) out.push('');
    pendingBlank = false;

    // Atributos que siguen en las líneas siguientes (paréntesis sin cerrar): se juntan.
    const tag = splitTagAttrs(body);
    const continuation: { width: number; text: string }[] = [];
    if (tag && tag.close === -1) {
      let joined = body;
      let next = li + 1;
      while (next < lines.length) {
        const t = lines[next].replace(/\s+$/, '');
        continuation.push({ width: t.length - t.trimStart().length, text: t.trimStart() });
        joined += '\n' + t.trimStart();
        next++;
        if (findClosingParen(joined, tag.open) !== -1) break;
      }
      if (findClosingParen(joined, tag.open) === -1) {
        continuation.length = 0; // nunca se cierra: se deja como está
      } else {
        li = next - 1;
        body = joined;
      }
    }

    const formatted = formatTagLine(body, indent.repeat(depth), indent);
    if (formatted) {
      out.push(...formatted.lines);
      if (formatted.opensRawBlock) block = { base: width, depth, first: null };
      continue;
    }

    // Línea con atributos complejos en varias líneas: se conservan con su sangría relativa.
    if (continuation.length && body.includes('\n')) {
      const [first, ...restLines] = body.split('\n');
      out.push(indent.repeat(depth) + first);
      const inner = continuation.filter((c) => !c.text.startsWith(')'));
      const base = inner.length ? Math.min(...inner.map((c) => c.width)) : 0;
      restLines.forEach((l, k) => {
        if (l.startsWith(')')) out.push(indent.repeat(depth) + l);
        else out.push(indent.repeat(depth + 1) + ' '.repeat(Math.max(0, continuation[k].width - base)) + l);
      });
      continue;
    }

    out.push(indent.repeat(depth) + body);

    const opensRawBlock =
      /^\/\/-?\s*$/.test(body) || // bare comment block
      /^[\w#.:-][^\s]*(?:\([^)]*\))?\.$/.test(body) || // tag(attrs).
      /^\|\s*$/.test(body);
    if (opensRawBlock) block = { base: width, depth, first: null };
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.length ? out.join('\n') + '\n' : '';
}

/**
 * Formatea una línea `etiqueta(atributos) resto` cuando todos sus atributos son simples.
 * Devuelve null si no es una etiqueta con atributos o hay atributos complejos.
 */
function formatTagLine(body: string, pad: string, indent: string): { lines: string[]; opensRawBlock: boolean } | null {
  const tag = splitTagAttrs(body);
  if (!tag) return null;
  const close = findClosingParen(body, tag.open);
  if (close === -1) return null;
  const attrs = parseSimpleAttrs(body.slice(tag.open + 1, close).replace(/\s*\n\s*/g, ' '));
  if (!attrs) return null;
  const rest = body.slice(close + 1);
  const opensRawBlock = rest === '.';
  const oneLine = `${tag.head}(${attrs.join(' ')})${rest}`;
  if (attrs.length < 2 || pad.length + oneLine.length <= PRINT_WIDTH) return { lines: [pad + oneLine], opensRawBlock };
  return {
    lines: [`${pad}${tag.head}(`, ...attrs.map((a) => pad + indent + a), `${pad})${rest}`],
    opensRawBlock,
  };
}
