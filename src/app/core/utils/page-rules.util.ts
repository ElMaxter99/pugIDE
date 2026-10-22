/**
 * Lectura de las reglas `@page` del HTML renderizado para emular en pantalla lo que el navegador
 * hace al imprimir: márgenes de página y cajas de margen (`@top-center { content: ... }`, etc.).
 */
export type MarginBoxName = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export const MARGIN_BOX_NAMES: readonly MarginBoxName[] = [
  'top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right',
];

export type ContentPart = { kind: 'text'; value: string } | { kind: 'page' } | { kind: 'pages' };

export interface MarginBox {
  /** `null`: `content: none` (no se muestra); `undefined`: la regla no declara `content`. */
  content?: ContentPart[] | null;
  /** Declaraciones de estilo permitidas (propiedad → valor), ya filtradas. */
  style: Record<string, string>;
}

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageRules {
  /** Márgenes de página en px CSS (96 dpi). */
  margin: PageMargins;
  /** Estilo heredado por las cajas de margen (declaraciones de `@page`). */
  baseStyle: Record<string, string>;
  boxes: Partial<Record<MarginBoxName, MarginBox>>;
  /** Cambios que aplica `@page :first` sobre las cajas de la primera página. */
  firstBoxes: Partial<Record<MarginBoxName, MarginBox>>;
}

export function emptyPageRules(): PageRules {
  return { margin: { top: 0, right: 0, bottom: 0, left: 0 }, baseStyle: {}, boxes: {}, firstBoxes: {} };
}

/** True si las reglas no cambian nada respecto a imprimir sin `@page` de márgenes ni cajas. */
export function hasPageChrome(rules: PageRules): boolean {
  const m = rules.margin;
  return m.top + m.right + m.bottom + m.left > 0 || Object.keys(rules.boxes).length > 0 || Object.keys(rules.firstBoxes).length > 0;
}

const PX_PER_UNIT: Record<string, number> = { px: 1, pt: 96 / 72, pc: 16, in: 96, mm: 96 / 25.4, cm: 96 / 2.54, q: 96 / 101.6 };

/** `20mm` → px; `0` → 0; cualquier otra cosa (auto, %, var()…) → null. */
export function parseLength(token: string): number | null {
  const t = token.trim().toLowerCase();
  if (/^0*\.?0+$/.test(t)) return 0;
  const m = /^(-?\d*\.?\d+)(px|pt|pc|in|mm|cm|q)$/.exec(t);
  return m ? parseFloat(m[1]) * PX_PER_UNIT[m[2]] : null;
}

/** Propiedades que se copian a las cajas de margen (nada con red ni con efectos de maquetación global). */
const ALLOWED_STYLE = /^(font(-[a-z-]+)?|color|text-align|text-transform|text-decoration|letter-spacing|word-spacing|line-height|white-space|opacity|vertical-align|padding(-[a-z]+)?|border(-[a-z-]+)?|background-color)$/;

function cleanStyleValue(value: string): string | null {
  const v = value.trim();
  if (!v || /url\s*\(|expression\s*\(|[<>]|@import/i.test(v)) return null;
  return v;
}

/** Quita comentarios CSS conservando las cadenas. */
function stripComments(css: string): string {
  let out = '';
  let quote = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      out += c;
      if (c === '\\') out += css[++i] ?? '';
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") {
      quote = c;
      out += c;
    } else if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 1;
    } else out += c;
  }
  return out;
}

/** Índice de la `}` que cierra la `{` de `open` (respeta cadenas y anidamiento), o -1. */
function matchBrace(css: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

/** Divide por `;` de primer nivel (respeta cadenas y paréntesis). */
function splitDeclarations(body: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let quote = '';
  let paren = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      cur += c;
      if (c === '\\') cur += body[++i] ?? '';
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") {
      quote = c;
      cur += c;
    } else if (c === '(') { paren++; cur += c; }
    else if (c === ')') { paren--; cur += c; }
    else if (c === ';' && paren <= 0) { parts.push(cur); cur = ''; }
    else cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function decodeCssString(raw: string): string {
  return raw.replace(/\\([0-9a-fA-F]{1,6})\s?|\\(.)/g, (_m, hex: string | undefined, ch: string | undefined) => {
    if (hex) {
      const cp = parseInt(hex, 16);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
    }
    return ch ?? '';
  });
}

/** `"Página " counter(page) " de " counter(pages)` → partes. `none` / `normal` → null. */
export function parseContent(value: string): ContentPart[] | null {
  const v = value.trim();
  if (/^(none|normal)$/i.test(v)) return null;
  const parts: ContentPart[] = [];
  const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|counter\(\s*(page|pages)\s*(?:,[^)]*)?\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(v))) {
    if (m[3]) parts.push({ kind: m[3].toLowerCase() === 'pages' ? 'pages' : 'page' });
    else parts.push({ kind: 'text', value: decodeCssString(m[1] ?? m[2] ?? '') });
  }
  return parts;
}

/** Aplica `margin` / `margin-*` a `margin`. */
function applyMargin(margin: PageMargins, prop: string, value: string): void {
  if (prop === 'margin') {
    const lens = value.trim().split(/\s+/).map((t) => parseLength(t) ?? 0);
    if (lens.length === 0 || lens.length > 4) return;
    const [a, b = a, c = a, d = b] = lens;
    margin.top = a; margin.right = b; margin.bottom = c; margin.left = d;
    return;
  }
  const side = /^margin-(top|right|bottom|left)$/.exec(prop)?.[1] as keyof PageMargins | undefined;
  if (side) margin[side] = parseLength(value) ?? 0;
}

function collectStyle(target: Record<string, string>, prop: string, value: string): void {
  if (!ALLOWED_STYLE.test(prop)) return;
  const v = cleanStyleValue(value);
  if (v) target[prop] = v;
}

/** Fusiona `box` en `into[name]`: `content` y cada propiedad de estilo se sobrescriben solo si se declaran. */
function mergeBox(into: Partial<Record<MarginBoxName, MarginBox>>, name: MarginBoxName, box: MarginBox): void {
  const cur = into[name];
  into[name] = {
    content: box.content !== undefined ? box.content : cur?.content,
    style: { ...(cur?.style ?? {}), ...box.style },
  };
}

function parseBoxBody(body: string): MarginBox {
  const box: MarginBox = { style: {} };
  for (const decl of splitDeclarations(body)) {
    const i = decl.indexOf(':');
    if (i === -1) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const value = decl.slice(i + 1).replace(/!important\s*$/i, '');
    if (prop === 'content') {
      box.content = parseContent(value);
    } else collectStyle(box.style, prop, value);
  }
  return box;
}

/**
 * Reúne todas las reglas `@page` de las hojas `<style>` del HTML (también las dentro de
 * `@media print`). Los márgenes y el estilo base salen de `@page` / `@page :left|:right`; las cajas
 * de `@page :first` solo afectan a la primera página. Se ignoran `:blank`, `:left` y `:right`
 * para las cajas (se aplica el `@page` general).
 */
export function parsePageRules(html: string): PageRules {
  const rules = emptyPageRules();
  const sheets = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  for (const sheet of sheets) {
    const css = stripComments(sheet);
    const re = /@page\b([^{;]*)\{/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css))) {
      const open = m.index + m[0].length - 1;
      const close = matchBrace(css, open);
      if (close === -1) break;
      const selector = m[1].trim().toLowerCase();
      const body = css.slice(open + 1, close);
      re.lastIndex = close + 1;
      if (selector === ':blank') continue;
      const isFirst = selector === ':first';
      const target = isFirst ? rules.firstBoxes : rules.boxes;

      // Separa los bloques anidados `@top-center { ... }` de las declaraciones directas.
      let direct = '';
      let pos = 0;
      const nested = /@([a-z-]+)\s*\{/gi;
      let n: RegExpExecArray | null;
      while ((n = nested.exec(body))) {
        const nOpen = n.index + n[0].length - 1;
        const nClose = matchBrace(body, nOpen);
        if (nClose === -1) break;
        direct += body.slice(pos, n.index);
        pos = nClose + 1;
        nested.lastIndex = pos;
        const name = n[1].toLowerCase() as MarginBoxName;
        if ((MARGIN_BOX_NAMES as readonly string[]).includes(name)) mergeBox(target, name, parseBoxBody(body.slice(nOpen + 1, nClose)));
      }
      direct += body.slice(pos);

      for (const decl of splitDeclarations(direct)) {
        const i = decl.indexOf(':');
        if (i === -1) continue;
        const prop = decl.slice(0, i).trim().toLowerCase();
        const value = decl.slice(i + 1).replace(/!important\s*$/i, '');
        if (!isFirst && /^margin(-(top|right|bottom|left))?$/.test(prop)) applyMargin(rules.margin, prop, value);
        else if (!isFirst) collectStyle(rules.baseStyle, prop, value);
      }
    }
  }
  return rules;
}

/** Cajas que se muestran en la página `pageIndex` (0 = primera): las generales con los cambios de `:first`. */
export function boxesForPage(rules: PageRules, pageIndex: number): Partial<Record<MarginBoxName, MarginBox>> {
  const out: Partial<Record<MarginBoxName, MarginBox>> = {};
  for (const name of MARGIN_BOX_NAMES) {
    const base = rules.boxes[name];
    const first = pageIndex === 0 ? rules.firstBoxes[name] : undefined;
    if (!base && !first) continue;
    const content = first?.content !== undefined ? first.content : base?.content;
    if (content && content.length > 0) out[name] = { content, style: { ...(base?.style ?? {}), ...(first?.style ?? {}) } };
  }
  return out;
}

/** Texto de una caja para la página `page` (1 = primera) de `pages`. */
export function renderContent(content: ContentPart[], page: number, pages: number): string {
  return content.map((p) => (p.kind === 'text' ? p.value : p.kind === 'page' ? String(page) : String(pages))).join('');
}
