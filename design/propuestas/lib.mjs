// Piezas para dibujar a mano las mesas P-NN de la propuesta 0.7: mismos tokens (src/styles.scss, tema oscuro) y
// mismas medidas que las mesas fieles V-01 y V-02 (botones de 36 px, pestañas de 36 px, estado de 32 px…).
// No hay colores ni tipografías inventados: todo sale de la tabla C (variables de styles.scss).
import { readFileSync } from 'node:fs';
import { parseDocument } from 'htmlparser2';

export const C = {
  bg: '#16111b', surf: '#231e27', low: '#1f1a23', high: '#2e2832', highest: '#39323d', lowest: '#110c15',
  text: '#eadfed', text2: '#cfc2d6', text3: '#988d9f', border: '#4d4354', borderSub: 'rgba(77, 67, 84, 0.5)',
  accent: '#ddb7ff', onAccent: '#490080', accentC: '#b76dff', onAccentC: '#400071', sec: '#4cd7f6',
  err: '#ffb4ab', errC: '#93000a', warn: '#fabc4e', ok: '#a6e3a1',
  hover: 'rgba(255, 255, 255, 0.05)', active: 'rgba(221, 183, 255, 0.1)',
  editor: '#0a0a0a', status: '#1a1523', white: '#ffffff',
  // sintaxis del editor (las de la mesa V-01)
  kw: '#c586c0', tag: '#9cdcfe', paren: '#ffd700', str: '#ce9178', cls: '#569cd6', fn: '#dcdcaa', code: '#d4d4d4',
};
export const FONT = "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
export const MONO = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";
export const ICON_FONT_URL = '/_blob/a1e6a2e0ce9eea97aa55042333c97737';

const UNITLESS = new Set(['flex', 'flexGrow', 'flexShrink', 'opacity', 'fontWeight', 'lineHeight', 'zIndex', 'order']);
const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
/** { display:'flex', gap:8 } -> "display:flex;gap:8px" */
export const st = (o = {}) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => `${kebab(k)}:${typeof v === 'number' && !UNITLESS.has(k) && v !== 0 ? v + 'px' : v}`).join(';');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const VOID = new Set(['input', 'br', 'hr', 'img']);
/** h('div', { s:{...}, 'aria-label':'x' }, ...hijos). Los strings hijos se escapan; para HTML ya hecho, usar raw(). */
export class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(s);
export const h = (tag, props = {}, ...kids) => {
  const { s, ...attrs } = props ?? {};
  const a = Object.entries(attrs).filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escA(v)}"`)).join('');
  const style = s ? ` style="${st(s)}"` : '';
  if (VOID.has(tag)) return `<${tag}${a}${style}>`;
  const body = kids.flat(Infinity).filter((k) => k !== undefined && k !== null && k !== false)
    .map((k) => (k instanceof Raw ? k.s : typeof k === 'string' && k.startsWith('<') && k.endsWith('>') && /<\/?[a-z]/.test(k) ? k : esc(k))).join('');
  return `<${tag}${a}${style}>${body}</${tag}>`;
};
export const div = (s, ...k) => h('div', { s }, ...k);
export const span = (s, ...k) => h('span', { s }, ...k);
export const row = (s, ...k) => h('div', { s: { display: 'flex', alignItems: 'center', ...s } }, ...k);
export const col = (s, ...k) => h('div', { s: { display: 'flex', flexDirection: 'column', ...s } }, ...k);
export const p = (s, ...k) => h('p', { s: { margin: 0, ...s } }, ...k);

// ---------------------------------------------------------------- iconos
/** Icono de la fuente Material Symbols del proyecto (solo los del subconjunto). */
export const icon = (name, size = 16, color) => h('span', {
  'aria-hidden': 'true',
  s: { fontFamily: "'Material Symbols Outlined'", fontSize: size, fontVariationSettings: "'FILL' 0, 'GRAD' 0, 'opsz' 24, 'wght' 400", fontFeatureSettings: "'liga'", lineHeight: size + 'px', whiteSpace: 'nowrap', display: 'block', flexShrink: 0, verticalAlign: 'middle', color },
}, name);
const PATHS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  tune: 'M4 7h9M17 7h3M4 17h3M11 17h9M13 5v4M7 15v4',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  chevR: 'M9 6l6 6-6 6',
  chevD: 'M6 9l6 6 6-6',
  rocket: 'M5 19l3-1 8-8a6 6 0 0 0 3-6 6 6 0 0 0-6 3l-8 8-1 3zM9 15l-3 3',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  drag: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  enter: 'M20 5v7a3 3 0 0 1-3 3H5M9 11l-4 4 4 4',
};
/** Icono de trazo en línea para los glifos que aún no están en el subconjunto de la fuente (se añadirán con npm run fonts:icons). */
export const svg = (name, size = 16, color = 'currentColor', stroke = 1.8) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0"><path d="${PATHS[name]}"></path></svg>`;

// ---------------------------------------------------------------- piezas
export const Kbd = (t, extra = {}) => h('kbd', { s: { fontFamily: MONO, fontSize: 11, lineHeight: '16px', padding: '1px 6px', border: `1px solid ${C.border}`, borderRadius: 4, background: C.low, color: C.text2, whiteSpace: 'nowrap', ...extra } }, t);

/** Botón de la barra superior / de acciones: texto con icono opcional. kind: ghost | primary | active | outline */
export function Btn({ label, ic, sv, kind = 'ghost', h: height = 36, px = 12, size = 14, aria, title, href, caret = false, s: extra = {}, kbd }) {
  const base = { display: 'flex', alignItems: 'center', gap: 8, padding: `0 ${px}px`, height, fontSize: size, borderRadius: 3.5, border: 'none', whiteSpace: 'nowrap', textDecoration: 'none', lineHeight: 'normal', fontFamily: FONT };
  const kinds = {
    ghost: { color: C.text2, background: 'transparent' },
    primary: { color: C.onAccent, background: C.accent, fontWeight: 700, boxShadow: '0 4px 12px 0 rgba(221, 183, 255, 0.3)' },
    active: { color: C.onAccentC, background: C.accentC },
    outline: { color: C.text, background: 'transparent', border: `1px solid ${C.border}` },
    tonal: { color: C.text2, background: C.highest },
    danger: { color: C.err, background: 'transparent', border: `1px solid ${C.err}` },
  };
  const inner = [ic ? icon(ic, 20) : '', sv ? svg(sv, 18) : '', label, kbd ? Kbd(kbd) : '', caret ? icon('keyboard_arrow_down', 18) : ''];
  const props = { s: { ...base, ...kinds[kind], ...extra }, title, 'aria-label': aria };
  return href ? h('a', { ...props, href }, ...inner) : h('button', { ...props, type: 'button' }, ...inner);
}
export function IconBtn({ ic, sv, aria, size = 28, is = 16, color = C.text3, s: extra = {}, href, bg }) {
  const props = { title: aria, 'aria-label': aria, s: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, padding: 0, border: 'none', borderRadius: 3.5, background: bg ?? 'transparent', color, textDecoration: 'none', flexShrink: 0, ...extra } };
  const inner = ic ? icon(ic, is) : svg(sv, is);
  return href ? h('a', { ...props, href }, inner) : h('button', { ...props, type: 'button' }, inner);
}
export const Divider = (hgt = 24) => div({ width: 1, height: hgt, background: C.border, margin: '0 4px', flexShrink: 0 });
/** Etiqueta de panel: mono, 11 px, mayúsculas (token del proyecto para títulos de panel). */
export const PanelLabel = (t, color = C.text3) => h('span', { s: { fontFamily: MONO, fontSize: 11, fontWeight: 600, lineHeight: '16.5px', letterSpacing: '0.55px', textTransform: 'uppercase', color, display: 'block' } }, t);
export const Badge = (t, color = C.text2, bg = C.highest) => span({ fontFamily: MONO, fontSize: 11, lineHeight: '16px', padding: '0 6px', borderRadius: 8, background: bg, color, display: 'inline-block' }, t);
export const Select = ({ aria, text, w, height = 28, size = 13, mono = false, s: extra = {} }) => h('select', { 'aria-label': aria, title: aria, s: { colorScheme: 'dark', color: C.text, fontFamily: mono ? MONO : FONT, fontSize: size, padding: '0 8px', border: `1px solid ${C.border}`, borderRadius: 3.5, background: C.highest, width: w, height, display: 'block', ...extra } }, h('option', { selected: true }, text));

/** Control segmentado: opciones [{label, ic, active}] */
export function Segmented(opts, { h: height = 28, size = 13, aria, bg = C.low, px = 10 } = {}) {
  return h('div', { role: 'group', 'aria-label': aria, s: { display: 'flex', padding: 2, gap: 2, border: `1px solid ${C.border}`, borderRadius: 6, background: bg } },
    opts.map((o) => h(o.href ? 'a' : 'button', { type: o.href ? undefined : 'button', href: o.href, 'aria-pressed': o.active ? 'true' : 'false', title: o.title, s: { display: 'flex', alignItems: 'center', gap: 6, height: Math.max(24, height - 6), padding: `0 ${px}px`, border: 'none', borderRadius: 4, fontSize: size, fontFamily: FONT, textDecoration: 'none', whiteSpace: 'nowrap', background: o.active ? C.active : 'transparent', color: o.active ? C.accent : C.text2, fontWeight: o.active ? 600 : 400, boxShadow: o.active ? `inset 0 0 0 1px ${C.accent}` : undefined } }, o.ic ? icon(o.ic, 16) : '', o.label)));
}

/** Menú desplegable. items: {label, kbd, ic, sep, head, dis, on} */
export function Menu(items, { w = 280, s: extra = {}, aria = 'Menú' } = {}) {
  return h('div', { role: 'menu', 'aria-label': aria, s: { width: w, padding: 6, background: C.highest, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: 1, fontFamily: FONT, ...extra } },
    items.map((i) => {
      if (i.sep) return div({ height: 1, background: C.border, margin: '4px 2px' });
      if (i.head) return div({ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.55px', textTransform: 'uppercase', color: C.text2, padding: '6px 10px 2px' }, i.head);
      return h('button', { type: 'button', role: i.check ? 'menuitemradio' : 'menuitem', 'aria-checked': i.check ? String(!!i.on) : undefined, 'aria-disabled': i.dis ? 'true' : undefined, s: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 32, padding: '0 10px', border: 'none', borderRadius: 4, fontSize: 13, textAlign: 'left', background: i.hl ? C.hover : 'transparent', color: i.dis ? C.text3 : C.text, fontFamily: FONT, outline: i.hl ? `1px solid ${C.accent}` : undefined } },
        i.ic ? icon(i.ic, 18, C.text2) : i.sv ? svg(i.sv, 18, C.text2) : i.check ? div({ width: 18, height: 18, flexShrink: 0, color: C.accent }, i.on ? raw(svg('check', 18, C.accent, 2.2)) : '') : div({ width: 18, flexShrink: 0 }),
        span({ flexGrow: 1, flexBasis: 0 }, i.label),
        i.kbd ? Kbd(i.kbd, { background: 'transparent' }) : '', i.arrow ? raw(svg('chevR', 16, C.text3)) : '');
    }));
}

// ---------------------------------------------------------------- anotaciones (solo en las mesas de diagnóstico y de comparación)
export const Pin = (n, s = {}) => div({ position: 'absolute', width: 24, height: 24, borderRadius: 12, background: C.warn, color: C.bg, fontFamily: MONO, fontSize: 12, fontWeight: 700, lineHeight: '24px', textAlign: 'center', boxShadow: `0 0 0 2px ${C.bg}`, zIndex: 20, ...s }, String(n));
export const Zone = (x, y, w, hh) => div({ position: 'absolute', left: x, top: y, width: w, height: hh, border: `2px dashed ${C.warn}`, borderRadius: 4, background: 'rgba(250, 188, 78, 0.08)', zIndex: 250, pointerEvents: 'none' });
export const Tag = (t, kind) => {
  const k = { yes: [C.warn, 'Confirmada'], part: [C.sec, 'Matizada'], no: [C.ok, 'Refutada'], new: [C.accent, 'Nuevo hallazgo'] }[kind];
  return span({ fontFamily: MONO, fontSize: 11, lineHeight: '16px', padding: '1px 8px', borderRadius: 8, border: `1px solid ${k[0]}`, color: k[0], whiteSpace: 'nowrap', letterSpacing: '0.3px' }, t ?? k[1]);
};

// ---------------------------------------------------------------- documento .dc.html
export function board({ title, w = 1440, hgt = 900, body, lang = 'es' }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap" rel="stylesheet">
<style>
@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:100 700;font-display:block;src:url(${ICON_FONT_URL}) format('woff2')}
body{margin:0}
*,*::before,*::after{box-sizing:border-box}
a:hover,button:hover{filter:brightness(1.12)}
</style>
</helmet>
${body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${hgt}}}'>
class Component extends DCLogic {
  renderVals() {
    return {};
  }
}
</script>
</body>
</html>
`;
}
/** Raíz fija de una mesa. */
export const root = (w, hgt, ...k) => h('div', { s: { width: w, height: hgt, overflow: 'hidden', position: 'relative', background: C.bg, color: C.text, fontFamily: FONT, fontSize: 14, lineHeight: '21px' } }, ...k);

// ---------------------------------------------------------------- contenido real reutilizado
const serialize = (n) => {
  if (n.type === 'text') return esc(n.data);
  if (n.type !== 'tag') return '';
  const a = Object.entries(n.attribs).map(([k, v]) => (v === '' && /^(disabled|selected|checked)$/.test(k) ? ` ${k}` : ` ${k}="${escA(v)}"`)).join('');
  if (VOID.has(n.name)) return `<${n.name}${a}>`;
  return `<${n.name}${a}>${n.children.map(serialize).join('')}</${n.name}>`;
};
export function loadBoard(file) {
  const doc = parseDocument(readFileSync(file, 'utf8'));
  const find = (n, pred) => { if (pred(n)) return n; for (const c of n.children ?? []) { const r = find(c, pred); if (r) return r; } return null; };
  const xdc = find(doc, (n) => n.name === 'x-dc');
  const rootEl = xdc.children.find((c) => c.type === 'tag' && c.name !== 'helmet');
  return { doc, xdc, rootEl, find: (pred) => find(rootEl, pred), serialize, tagKids: (n) => n.children.filter((c) => c.type === 'tag') };
}
/** Contenido real del preview (la hoja «Informe trimestral» a 1440×900), reducido a la escala dada. */
export function reportPage(file, scale) {
  const b = loadBoard(file);
  const frame = b.find((n) => n.attribs?.title === 'Vista previa de la plantilla');
  const inner = b.tagKids(frame)[0];
  const w = Math.round(1440 * scale), hh = Math.round(900 * scale);
  return `<div title="Vista previa de la plantilla" style="position:relative;flex-shrink:0;width:${w}px;height:${hh}px;border-radius:7px;background-color:#ffffff;box-shadow:rgba(0, 0, 0, 0.5) 0px 25px 50px -12px;overflow:hidden"><div style="position:absolute;left:0;top:0;width:1440px;height:900px;transform:scale(${scale});transform-origin:0 0">${serialize(inner)}</div></div>`;
}
/** Fragmento real de una mesa fiel por camino de hijos de etiqueta («0.0.0…»), sin tocar su marcado. */
export function fragment(file, path) {
  const b = loadBoard(file);
  let n = b.rootEl;
  for (const i of path.split('.').slice(1)) n = b.tagKids(n)[+i];
  return serialize(n);
}
