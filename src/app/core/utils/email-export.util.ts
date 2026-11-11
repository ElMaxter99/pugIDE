/**
 * Exportar para correo (P-23): utilidades puras para pasar el CSS a atributos `style` y avisar de lo que los clientes
 * de correo no admiten. La parte que recorre el DOM recibe un `Document` (en la app, de `DOMParser`); el resto no usa DOM.
 */

/** Gmail recorta («Ver mensaje completo») los mensajes cuyo HTML pasa de este tamaño. */
export const GMAIL_CLIP_BYTES = 102 * 1024;

export interface CssDeclaration { prop: string; value: string; important: boolean; }
export interface CssRule { selector: string; declarations: CssDeclaration[]; specificity: number; order: number; }
export interface ParsedCss {
  /** Reglas normales, una por selector (las listas `a, b` se separan). */
  rules: CssRule[];
  /** Bloques que no se pueden poner en línea y se conservan tal cual (`@media`, `@supports`…). */
  kept: string[];
  /** Familias declaradas con `@font-face` (los clientes de correo no las cargan). */
  fontFaces: string[];
}

export interface EmailOptions {
  inlineCss: boolean;
  removeScripts: boolean;
  keepMedia: boolean;
  preheader: string;
}
export const DEFAULT_EMAIL_OPTIONS: EmailOptions = { inlineCss: true, removeScripts: true, keepMedia: true, preheader: '' };

export interface EmailWarning { level: 'error' | 'warning'; title: string; detail: string; }
export interface EmailResult { html: string; bytes: number; warnings: EmailWarning[]; inlinedRules: number; removedScripts: number; }

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Parte por `sep` solo en el nivel superior (fuera de paréntesis, corchetes y comillas). */
export function splitTopLevel(text: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0, quote = '', cur = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) { cur += ch; if (ch === '\\') { cur += text[++i] ?? ''; } else if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

export function parseDeclarations(block: string): CssDeclaration[] {
  const out: CssDeclaration[] = [];
  for (const part of splitTopLevel(block, ';')) {
    const i = part.indexOf(':');
    if (i <= 0) continue;
    const prop = part.slice(0, i).trim().toLowerCase();
    let value = part.slice(i + 1).trim();
    const important = /!\s*important\s*$/i.test(value);
    if (important) value = value.replace(/!\s*important\s*$/i, '').trim();
    if (prop && value && /^(--)?[a-z-][\w-]*$/i.test(prop)) out.push({ prop, value, important });
  }
  return out;
}

/** Especificidad como un número comparable: ids·10000 + clases/atributos/pseudoclases·100 + elementos/pseudoelementos. */
export function specificity(selector: string): number {
  let s = selector.replace(/:where\([^)]*\)/g, '').replace(/:(not|is|has|matches)\(/g, ' ').replace(/\)/g, ' ').replace(/(["'])(?:\\.|(?!\1).)*\1/g, '');
  const count = (re: RegExp): number => { const m = s.match(re); s = s.replace(re, ' '); return m ? m.length : 0; };
  const attrs = count(/\[[^\]]*\]/g);
  const ids = count(/#[\w-]+/g);
  const classes = count(/\.[\w-]+/g);
  const pseudoEls = count(/::[\w-]+/g);
  const pseudoClasses = count(/:[\w-]+(\([^)]*\))?/g);
  const elements = count(/(^|[\s>+~])[a-zA-Z][\w-]*/g);
  return ids * 10000 + (classes + attrs + pseudoClasses) * 100 + elements + pseudoEls;
}

/** Selectores que dependen del estado o de un pseudoelemento: no existen como atributo `style`. */
export function isDynamicSelector(selector: string): boolean {
  return /::|:(hover|focus|focus-visible|focus-within|active|visited|link|target|checked|disabled|enabled|before|after|first-letter|first-line|placeholder|selection|root)\b/i.test(selector);
}

export function parseCss(css: string): ParsedCss {
  const text = stripComments(css);
  const rules: CssRule[] = [];
  const kept: string[] = [];
  const fontFaces: string[] = [];
  let i = 0, order = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    const semi = text.indexOf(';', i);
    if (open === -1) break;
    // `@import …;` y `@charset …;` van sin bloque
    if (semi !== -1 && semi < open && text.slice(i, semi).trim().startsWith('@')) { i = semi + 1; continue; }
    let depth = 1, j = open + 1, quote = '';
    for (; j < text.length && depth > 0; j++) {
      const ch = text[j];
      if (quote) { if (ch === '\\') j++; else if (ch === quote) quote = ''; continue; }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    const prelude = text.slice(i, open).trim();
    const body = text.slice(open + 1, j - 1);
    if (prelude.startsWith('@')) {
      if (/^@font-face/i.test(prelude)) {
        const fam = /font-family\s*:\s*([^;]+)/i.exec(body);
        if (fam) fontFaces.push(fam[1].trim().replace(/^["']|["']$/g, ''));
      } else if (!/^@(page|import|charset)/i.test(prelude)) {
        kept.push(`${prelude} {${body}}`);
      }
    } else if (prelude) {
      const declarations = parseDeclarations(body);
      for (const selector of splitTopLevel(prelude, ',')) {
        if (isDynamicSelector(selector)) kept.push(`${selector} {${body.trim()}}`);
        else if (declarations.length) rules.push({ selector, declarations, specificity: specificity(selector), order: order++ });
      }
    }
    i = j;
  }
  return { rules, kept, fontFaces };
}

/** Une declaraciones respetando la cascada: gana `!important`, luego la especificidad, luego el orden; el `style` propio gana a lo no importante. */
export function mergeDeclarations(matched: { declarations: CssDeclaration[]; specificity: number; order: number }[], own: CssDeclaration[]): string {
  const win = new Map<string, { value: string; rank: number[] }>();
  const put = (d: CssDeclaration, rank: number[]): void => {
    const cur = win.get(d.prop);
    const better = !cur || rank[0] > cur.rank[0] || (rank[0] === cur.rank[0] && (rank[1] > cur.rank[1] || (rank[1] === cur.rank[1] && rank[2] >= cur.rank[2])));
    if (better) { win.delete(d.prop); win.set(d.prop, { value: d.value, rank }); }
  };
  for (const m of matched) for (const d of m.declarations) put(d, [d.important ? 2 : 0, m.specificity, m.order]);
  for (const d of own) put(d, [d.important ? 3 : 1, 0, 0]);
  return [...win].map(([prop, v]) => `${prop}: ${v.value}`).join('; ');
}

const utf8Bytes = (text: string): number => new TextEncoder().encode(text).length;

export function emailKb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Avisos que se ven en el CSS (antes de ponerlo en línea). */
export function cssWarnings(parsed: ParsedCss): EmailWarning[] {
  const out: EmailWarning[] = [];
  const where = (test: (d: CssDeclaration) => boolean): string[] => [...new Set(parsed.rules.filter((r) => r.declarations.some(test)).map((r) => r.selector))];
  const list = (s: string[]): string => s.slice(0, 4).map((x) => `«${x}»`).join(', ') + (s.length > 4 ? ` y ${s.length - 4} más` : '');
  const flex = where((d) => d.prop === 'display' && /\b(inline-)?(flex|grid)\b/.test(d.value));
  if (flex.length) out.push({ level: 'warning', title: 'Flexbox o grid', detail: `Outlook de escritorio los ignora: usa tablas para maquetar. En ${list(flex)}.` });
  const pos = where((d) => d.prop === 'position' && /\b(absolute|fixed|sticky)\b/.test(d.value));
  if (pos.length) out.push({ level: 'warning', title: 'Posición absoluta, fija o pegada', detail: `Gmail y Outlook quitan «position». En ${list(pos)}.` });
  if (parsed.fontFaces.length) out.push({ level: 'warning', title: `Fuente web ${parsed.fontFaces.map((f) => `«${f}»`).join(', ')}`, detail: 'Casi ningún cliente de correo carga fuentes web: se verá la siguiente de la lista (pon una del sistema como Arial o Georgia).' });
  return out;
}

/**
 * Convierte un documento en HTML para correo. Modifica `doc` (pásale uno propio, de `DOMParser`).
 * `serialize` devuelve el HTML final del documento (en el navegador, `'<!doctype html>' + doc.documentElement.outerHTML`).
 */
export function toEmailHtml(doc: Document, options: EmailOptions, serialize: (d: Document) => string): EmailResult {
  const warnings: EmailWarning[] = [];
  let removedScripts = 0;
  if (options.removeScripts) {
    for (const el of Array.from(doc.querySelectorAll('script'))) { el.remove(); removedScripts++; }
    for (const el of Array.from(doc.querySelectorAll('*'))) {
      for (const attr of Array.from(el.attributes)) if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    }
  }
  const styles = Array.from(doc.querySelectorAll('style'));
  const parsed = parseCss(styles.map((s) => s.textContent ?? '').join('\n'));
  warnings.push(...cssWarnings(parsed));
  let inlinedRules = 0;
  if (options.inlineCss) {
    const matched = new Map<Element, CssRule[]>();
    for (const rule of parsed.rules) {
      let els: Element[] = [];
      try { els = Array.from(doc.querySelectorAll(rule.selector)); } catch { continue; } // selector que el navegador no entiende
      if (els.length) inlinedRules++;
      for (const el of els) { const list = matched.get(el); if (list) list.push(rule); else matched.set(el, [rule]); }
    }
    for (const [el, rules] of matched) {
      if (/^(html|head|style|script|meta|title|link)$/i.test(el.tagName)) continue;
      const style = mergeDeclarations(rules, parseDeclarations(el.getAttribute('style') ?? ''));
      if (style) el.setAttribute('style', style);
    }
    for (const s of styles) s.remove();
    const rest = options.keepMedia ? parsed.kept.join('\n') : '';
    if (rest.trim()) {
      const style = doc.createElement('style');
      style.textContent = rest;
      (doc.head ?? doc.documentElement).appendChild(style);
    }
  }
  const noAlt = Array.from(doc.querySelectorAll('img')).filter((img) => !img.hasAttribute('alt'));
  if (noAlt.length) warnings.push({ level: 'error', title: `${noAlt.length} ${noAlt.length === 1 ? 'imagen sin' : 'imágenes sin'} texto alternativo`, detail: 'Muchos clientes bloquean las imágenes: sin «alt» no se entiende el mensaje.' });
  const unsupported = ['form', 'video', 'audio', 'iframe', 'svg'].filter((t) => doc.querySelector(t));
  if (unsupported.length) warnings.push({ level: 'warning', title: `Etiquetas que el correo no admite: ${unsupported.map((t) => `<${t}>`).join(', ')}`, detail: 'Gmail y Outlook las quitan o no las muestran. Usa una imagen con enlace.' });
  const preheader = options.preheader.trim();
  if (preheader && doc.body) {
    const div = doc.createElement('div');
    div.setAttribute('style', 'display: none; max-height: 0; overflow: hidden; mso-hide: all');
    div.textContent = preheader;
    doc.body.insertBefore(div, doc.body.firstChild);
  }
  const html = serialize(doc);
  const bytes = utf8Bytes(html);
  if (bytes > GMAIL_CLIP_BYTES) warnings.unshift({ level: 'error', title: `Pesa ${emailKb(bytes)}: Gmail lo recortará`, detail: 'Gmail corta los mensajes de más de 102 KB y enseña «Ver mensaje completo». Quita imágenes incrustadas o CSS que no se use.' });
  return { html, bytes, warnings, inlinedRules, removedScripts };
}
