// Marco común de las mesas de propuesta: cabecera, tarjetas de hallazgo, métricas y etiquetas ANTES / DESPUÉS.
import { C, FONT, MONO, h, div, span, row, col, p, raw, icon, svg, Kbd, Badge, PanelLabel, Tag } from './lib.mjs';

const escT = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** **negrita** y `código` dentro de un texto. */
export const rich = (s) => raw(s.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part) => part.startsWith('**') ? `<strong style="color:${C.text};font-weight:600">${escT(part.slice(2, -2))}</strong>` : part.startsWith('`') ? `<code style="font-family:${MONO};font-size:12px;background:${C.low};padding:0 4px;border-radius:3px;color:${C.text}">${escT(part.slice(1, -1))}</code>` : escT(part)).join(''));
export const abs = (x, y, w, hh, ...k) => div({ position: 'absolute', left: x, top: y, width: w, height: hh }, ...k);

export const Head = (code, title, sub) => div({ padding: '24px 40px 0' },
  row({ gap: 14, justifyContent: 'space-between' },
    row({ gap: 14 }, span({ fontFamily: MONO, fontSize: 13, fontWeight: 700, padding: '2px 10px', borderRadius: 4, background: C.accent, color: C.onAccent }, code), h('h2', { s: { margin: 0, fontSize: 26, fontWeight: 600, lineHeight: '32px', color: C.text } }, title)),
    PanelLabel('Propuesta 0.7 · pendiente de aprobar')),
  p({ color: C.text2, fontSize: 13, lineHeight: '19px', maxWidth: 1180, marginTop: 6 }, rich(sub)));

export const Card = ({ n, title, tag, lines }) => div({ border: `1px solid ${C.border}`, borderRadius: 8, background: C.surf, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  row({ gap: 10 }, div({ width: 24, height: 24, borderRadius: 12, background: C.warn, color: C.bg, fontFamily: MONO, fontSize: 12, fontWeight: 700, lineHeight: '24px', textAlign: 'center', flexShrink: 0 }, String(n)),
    span({ fontSize: 15, fontWeight: 600, color: C.text, flexGrow: 1, lineHeight: '20px' }, title), tag),
  ...lines.map((l) => p({ fontSize: 13, color: C.text2, lineHeight: '19px' }, rich(l))));

export const Legend = () => row({ gap: 16, flexWrap: 'wrap', fontSize: 12, color: C.text2 },
  row({ gap: 6 }, Tag(null, 'yes'), 'la medida respalda la hipótesis'), row({ gap: 6 }, Tag(null, 'part'), 'cierta solo en parte'), row({ gap: 6 }, Tag(null, 'no'), 'la app ya lo hace bien'), row({ gap: 6 }, Tag(null, 'new'), 'no estaba en las hipótesis'));

/** Etiqueta de comparación. */
export const Side = (kind, text) => span({ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.55px', textTransform: 'uppercase', padding: '2px 10px', borderRadius: 4, display: 'inline-block',
  border: `1px solid ${kind === 'after' ? C.accent : C.text3}`, color: kind === 'after' ? C.accent : C.text2, background: kind === 'after' ? C.active : 'transparent' }, text);

/** Métrica esperada: antes → después. */
export const Metric = ({ label, before, after, note, w }) => div({ border: `1px solid ${C.border}`, borderRadius: 8, background: C.surf, padding: '12px 16px', width: w, display: 'flex', flexDirection: 'column', gap: 4 },
  PanelLabel(label),
  row({ gap: 10, flexWrap: 'wrap' }, span({ fontFamily: MONO, fontSize: 16, color: C.text3, textDecoration: 'line-through' }, before), span({ color: C.text3 }, '→'), span({ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.accent, lineHeight: '28px' }, after)),
  note ? p({ fontSize: 12, color: C.text2, lineHeight: '17px' }, rich(note)) : '');

/** Nota de decisión (el porqué). */
export const Why = ({ title = 'Por qué', text, w }) => div({ width: w, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', background: C.low },
  PanelLabel(title, C.sec), p({ fontSize: 13, color: C.text2, lineHeight: '19px', marginTop: 4 }, rich(text)));

/** Tabla sencilla: cabeceras y filas de texto. */
export const Table = ({ cols, rows, w, size = 13 }) => h('table', { s: { width: w, borderCollapse: 'collapse', fontSize: size, lineHeight: '19px' } },
  h('thead', {}, h('tr', {}, ...cols.map((c) => h('th', { scope: 'col', s: { textAlign: 'left', padding: '6px 10px', fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.55px', textTransform: 'uppercase', color: C.text3, borderBottom: `1px solid ${C.border}` } }, c)))),
  h('tbody', {}, ...rows.map((r) => h('tr', {}, ...r.map((c, i) => h('td', { s: { padding: '6px 10px', verticalAlign: 'top', color: i === 0 ? C.text2 : C.text, borderBottom: `1px solid ${C.borderSub}` } }, typeof c === 'string' ? rich(c) : c))))));
