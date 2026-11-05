// Armazón del IDE propuesto (barra superior, panel lateral, editor, preview, panel inferior y estado) dibujado con las
// medidas reales de la app: barra 64 px, pestañas 36 px, estado 32 px, árbol de 13 px con filas de 4 px de relleno.
import { C, FONT, MONO, h, div, span, row, col, p, raw, icon, svg, st, Kbd, Btn, IconBtn, Divider, PanelLabel, Badge, Select, Segmented, Menu, reportPage } from './lib.mjs';

// ------------------------------------------------------------------ editor: código real del proyecto de ejemplo
export const MAIN_PUG = `include mixins
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    title= titulo
    link(rel="stylesheet", href="/styles/informe.scss")
  body
    include partials/cabecera
    main
      section.resumen
        h2= t('INFORME.RESUMEN')
        p= resumen
      section.kpis
        each kpi in kpis
          +tarjeta(kpi.nombre, kpi.valor, kpi.variacion)
          +resumenPie(resumen)
      section.ventas
        h2= t('INFORME.VENTAS')
        table
          thead
            tr
              th= t('TABLA.REGION')
              th= t('TABLA.INGRESOS')
              th= t('TABLA.VARIACION')
          tbody
            each fila in ventas
              tr
                td= fila.region
                td.num= fila.ingresos
                td.num= fila.variacion
      img.logo(src="/images/logo.svg", alt="Logotipo de Norte Analytics")
    footer
      p= t('INFORME.PIE')
`;
const span2 = (color, t) => `<span style="color:${color}">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`;
const plain = (t) => `<span>${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`;
/** Coloreado mínimo de Pug con los mismos colores que el editor real (V-01). */
function pugLine(src) {
  const m = src.match(/^(\s*)(.*)$/);
  let rest = m[2];
  let out = plain(m[1]);
  const kw = rest.match(/^(include|extends|mixin|block|each|if|else|doctype)\b/);
  if (kw) { out += span2(C.kw, kw[1]); rest = rest.slice(kw[1].length); return out + colorExpr(rest); }
  const mix = rest.match(/^(\+)([\w-]+)/);
  if (mix) { out += span2(C.fn, mix[1] + mix[2]); rest = rest.slice(mix[0].length); return out + colorExpr(rest); }
  const tag = rest.match(/^([a-z][\w-]*)((?:[.#][\w-]+)*)/);
  if (tag) { out += span2(C.tag, tag[1]); if (tag[2]) out += span2(C.cls, tag[2]); rest = rest.slice(tag[0].length); }
  return out + colorExpr(rest);
}
function colorExpr(rest) {
  let out = '';
  const re = /("[^"]*"|'[^']*')|([()])|([\w.]+)(?==)|(\bt)(?=\()|(\w+)/g;
  let last = 0, m;
  while ((m = re.exec(rest))) {
    out += plain(rest.slice(last, m.index));
    if (m[1]) out += span2(C.str, m[1]); else if (m[2]) out += span2(C.paren, m[2]); else if (m[3]) out += span2(C.tag, m[3]); else if (m[4]) out += span2(C.fn, m[4]); else out += plain(m[5]);
    last = re.lastIndex;
  }
  return out + plain(rest.slice(last));
}

export function editorBody({ w, hgt, errorLine = null, active = 1 }) {
  const src = MAIN_PUG.trimEnd().split('\n').filter((l) => errorLine || !/resumenPie/.test(l));
  const cols = Math.floor((w - 56 - 24) / 7.8);
  // filas visuales: se parte por el último espacio (como el ajuste de línea de Monaco); la continuación sangra 2 más
  const vis = [];
  src.forEach((l, i) => {
    let rest = l, first = true, extra = '';
    while (rest.length > cols) {
      let cut = rest.lastIndexOf(' ', cols); if (cut < 8) cut = cols;
      vis.push({ n: first ? i + 1 : '', text: extra + rest.slice(0, cut), cont: !first, err: errorLine === i + 1 }); rest = rest.slice(cut).trimStart(); first = false; extra = '  ' + l.match(/^\s*/)[0];
    }
    vis.push({ n: first ? i + 1 : '', text: extra + rest, cont: !first, err: errorLine === i + 1 });
  });
  const n = Math.floor((hgt - 8) / 20);
  const rows = vis.slice(0, n).map((v) => {
    const isAct = v.n === active;
    const m = v.text.match(/^(\s*)(.*)$/);
    const code = v.err ? plain(m[1]) + `<span style="text-decoration:underline wavy #f14c4c;text-underline-offset:3px">${pugLine(m[2])}</span>` : pugLine(v.text);
    return div({ display: 'flex', height: 20, lineHeight: '20px', background: isAct ? '#111111' : undefined },
      div({ width: 56, flexShrink: 0, textAlign: 'right', paddingRight: 18, color: isAct ? '#c6c6c6' : '#858585', position: 'relative' }, v.err ? raw(div({ position: 'absolute', left: 8, top: 6, width: 8, height: 8, borderRadius: 4, background: C.err }, '')) : '', String(v.n)),
      div({ flexGrow: 1, whiteSpace: 'pre', overflow: 'hidden' }, raw(code)));
  });
  return div({ width: w, height: hgt, overflow: 'hidden', background: C.editor, fontFamily: MONO, fontSize: 13, color: C.code, paddingTop: 8 }, ...rows);
}
export const tabBar = (tabs, w) => div({ display: 'flex', flexShrink: 0, height: 36, borderBottom: `1px solid ${C.border}`, background: C.low, overflow: 'hidden', width: w },
  ...tabs.map((t) => div({ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 0 16px', borderRight: `1px solid ${C.border}`, background: t.active ? C.bg : undefined, color: t.active ? C.accent : C.text2, fontSize: 12, lineHeight: '18px', whiteSpace: 'nowrap', flexShrink: 0, height: 36 },
    h('button', { type: 'button', 'aria-current': t.active ? 'true' : undefined, title: t.path, s: { display: 'flex', alignItems: 'center', gap: 8, padding: 0, border: 'none', background: 'transparent', color: 'inherit', fontSize: 12, height: 36, fontFamily: FONT } }, icon(t.ic ?? 'code', 14), span({ fontFamily: MONO }, t.name)),
    IconBtn({ ic: 'close', aria: 'Cerrar pestaña ' + t.name, size: 24, is: 14, s: { borderRadius: 3 } }))));

// ------------------------------------------------------------------ panel lateral
const TREE = [
  { d: 0, ic: 'code', t: 'main.pug', sel: true }, { d: 0, ic: 'code', t: 'mixins.pug' },
  { d: 0, ic: 'folder_open', t: 'partials', dir: true }, { d: 1, ic: 'code', t: 'cabecera.pug' },
  { d: 0, ic: 'folder_open', t: 'styles', dir: true }, { d: 1, ic: 'palette', t: 'informe.scss' },
  { d: 0, ic: 'folder_open', t: 'locales', dir: true }, { d: 1, ic: 'folder_open', t: 'es', dir: true }, { d: 2, ic: 'data_object', t: 'translations.json' },
  { d: 1, ic: 'folder_open', t: 'en', dir: true }, { d: 2, ic: 'data_object', t: 'translations.json' },
  { d: 0, ic: 'folder_open', t: 'images', dir: true }, { d: 1, ic: 'image', t: 'logo.svg' },
];
export const fileTree = () => div({ flexGrow: 1, overflow: 'hidden', paddingTop: 8 }, ...TREE.map((r) => div({ display: 'flex', alignItems: 'center', gap: 8, padding: `4px 16px 4px ${16 + r.d * 16}px`, fontSize: 13, lineHeight: '19.5px', color: r.sel ? C.accent : C.text2, background: r.sel ? C.active : undefined, borderRight: r.sel ? `2px solid ${C.accent}` : undefined },
  r.dir ? icon('keyboard_arrow_down', 16, C.text3) : '', icon(r.ic, 16, r.dir ? C.warn : undefined), span({ whiteSpace: 'nowrap' }, r.t))));

export const leftTabs = (active, w) => div({ display: 'flex', flexShrink: 0, height: 36, borderBottom: `1px solid ${C.border}`, background: C.low, width: w },
  ...[['Archivos', 'archivos'], ['Datos', 'datos']].map(([t, k]) => h('button', { type: 'button', 'aria-pressed': k === active ? 'true' : 'false', s: { height: 36, padding: '0 16px', border: 'none', borderRight: `1px solid ${C.border}`, background: k === active ? C.bg : 'transparent', color: k === active ? C.accent : C.text2, fontSize: 13, fontWeight: k === active ? 600 : 400, fontFamily: FONT, boxShadow: k === active ? `inset 0 -2px 0 ${C.accent}` : undefined } }, t)),
  div({ flexGrow: 1 }),
  IconBtn({ ic: 'left_panel_close', aria: 'Ocultar el panel lateral (Ctrl+B)', size: 36, is: 18, s: { borderRadius: 0 } }));

/** Pestaña «Datos» con la barra simplificada de P-05. */
export function dataPanel({ w, hgt, menuOpen = false }) {
  const kpisRow = (k, v) => div({ display: 'flex', gap: 8, padding: '3px 16px', fontFamily: MONO, fontSize: 12, lineHeight: '18px', whiteSpace: 'nowrap' }, span({ color: C.tag }, k), span({ color: C.text3 }, ':'), span({ color: C.str }, v));
  const exp = (k, v) => div({ display: 'flex', gap: 8, padding: '3px 16px 3px 6px', fontFamily: MONO, fontSize: 12, lineHeight: '18px' }, icon('chevron_right', 16, C.text3), span({ color: C.tag }, k), span({ color: C.text3 }, ':'), span({ color: C.text3 }, v));
  return div({ width: w, height: hgt, display: 'flex', flexDirection: 'column', background: C.surf, position: 'relative' },
    // fila 1: modo + deshacer/rehacer
    div({ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 4px' },
      Segmented([{ label: 'Árbol', active: true }, { label: 'JSON' }], { aria: 'Modo del editor de datos', h: 28 }),
      div({ flexGrow: 1 }),
      IconBtn({ ic: 'undo', aria: 'Deshacer (Ctrl+Z)', size: 28 }), IconBtn({ ic: 'redo', aria: 'Rehacer (Ctrl+Shift+Z)', size: 28 })),
    // fila 2: juego, regenerar y más
    div({ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px 8px', borderBottom: `1px solid ${C.border}` },
      div({ flexGrow: 1, minWidth: 0, display: 'flex' }, Select({ aria: 'Juego de datos activo', text: 'Por defecto', w: '100%', height: 28 })),
      Btn({ label: 'Regenerar', ic: 'casino', kind: 'tonal', h: 28, px: 10, size: 13, aria: 'Regenerar datos de ejemplo (se puede deshacer)' }),
      IconBtn({ sv: 'more', aria: 'Más acciones de datos', size: 28, is: 18, bg: menuOpen ? C.highest : undefined, color: C.text2 })),
    kpisRow('titulo', '"Informe trimestral"'), kpisRow('periodo', '"T3 2026 · julio a septiembre"'), kpisRow('resumen', '"Los ingresos crecieron un 8,2 %…"'),
    exp('kpis', '[ 3 items ]'), exp('ventas', '[ 4 items ]'));
}

export function sidePanel({ tab = 'archivos', w = 280, hgt }) {
  const head = leftTabs(tab, w);
  if (tab === 'datos') return div({ width: w, flexShrink: 0, height: hgt, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}`, background: C.bg }, head, dataPanel({ w: w - 1, hgt: hgt - 36 }));
  return div({ width: w, flexShrink: 0, height: hgt, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}`, background: C.bg }, head,
    div({ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px 6px 12px' },
      Btn({ label: 'Nuevo archivo', ic: 'add', h: 28, px: 8, size: 13, aria: 'Nuevo archivo' }), div({ flexGrow: 1 }), IconBtn({ sv: 'more', aria: 'Más acciones de archivos: importar, exportar, subir recursos', size: 28, is: 18, color: C.text2 })),
    div({ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 16px 8px', paddingBottom: 12, borderBottom: `1px solid ${C.borderSub}` },
      div({ width: 32, height: 32, borderRadius: 6, background: C.accentC, color: C.onAccentC, fontWeight: 700, textAlign: 'center', lineHeight: '32px' }, 'I'),
      div({}, p({ fontSize: 14, fontWeight: 600, lineHeight: '20px' }, 'Informe trimestral'), p({ fontSize: 11, color: C.text2, lineHeight: '16px' }, 'v0.5.1 · guardado'))),
    fileTree());
}
export const rail = (hgt, items = ['folder_open', 'data_object']) => div({ width: 48, flexShrink: 0, height: hgt, borderRight: `1px solid ${C.border}`, background: C.low, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 8 },
  ...items.map((ic, i) => IconBtn({ ic, aria: i === 0 ? 'Mostrar el panel de archivos (Ctrl+B)' : 'Mostrar el panel de datos', size: 36, is: 20, color: i === 0 ? C.accent : C.text2, bg: i === 0 ? C.active : undefined })));

// ------------------------------------------------------------------ barra superior propuesta (P-02, P-11)
export function topbar({ open = null, href = {} } = {}) {
  const logo = h('h1', { s: { margin: 0, fontSize: 32, fontWeight: 600, lineHeight: '40px', letterSpacing: '-0.64px', color: C.accent } }, h('a', { href: href.logo ?? '#', title: 'Volver al inicio', s: { color: C.accent, textDecoration: 'none' } }, 'PugIDE'));
  return h('header', { s: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 50, flexShrink: 0, padding: '0 24px', borderBottom: `1px solid ${C.border}`, background: C.bg, height: 64 } },
    row({ gap: 16, flex: '1 1 0', minWidth: 0 }, logo, row({ gap: 4 },
      Btn({ label: 'Proyecto', ic: 'folder_open', caret: true, aria: 'Menú Proyecto', href: href.proyecto, s: open === 'proyecto' ? { background: C.highest, color: C.text } : {} }),
      Btn({ label: 'Exportar', ic: 'download', caret: true, aria: 'Menú Exportar', href: href.exportar, s: open === 'exportar' ? { background: C.highest, color: C.text } : {} }))),
    h(href.search ? 'a' : 'button', { type: href.search ? undefined : 'button', href: href.search, title: 'Paleta de comandos (Ctrl+K)', s: { display: 'flex', alignItems: 'center', gap: 10, width: 400, height: 36, padding: '0 8px 0 12px', border: `1px solid ${C.border}`, borderRadius: 3.5, background: C.lowest, color: C.text3, fontSize: 14, textDecoration: 'none', fontFamily: FONT, flexShrink: 0 } },
      icon('search', 20), span({ flexGrow: 1, textAlign: 'left' }, 'Buscar comandos y archivos…'), Kbd('Ctrl K')),
    row({ gap: 12, flex: '1 1 0', justifyContent: 'flex-end', minWidth: 0 },
      IconBtn({ ic: 'contrast', aria: 'Cambiar tema claro u oscuro', size: 36, is: 24, color: C.text2 }), Divider(),
      Btn({ label: 'Guardar', kind: 'primary', px: 16, kbd: undefined, aria: 'Guardar (Ctrl+S)' })));
}

// ------------------------------------------------------------------ preview propuesto (P-04)
export const DEVICE_SEG = (active, href) => Segmented([
  { label: 'Escritorio', ic: 'desktop_windows', active: active === 'desktop' }, { label: 'Tablet', ic: 'tablet_mac', active: active === 'tablet' },
  { label: 'Móvil', ic: 'smartphone', active: active === 'mobile' }, { label: 'PDF', ic: 'picture_as_pdf', active: active === 'pdf' },
], { aria: 'Dispositivo de la vista previa', h: 30, px: 7 });
export function previewBar({ w, mode = 'desktop', vista = false, zoom = 'Ajustar 41 %', inspector = false }) {
  return div({ width: w, flexShrink: 0, borderBottom: `1px solid ${C.border}`, background: C.surf },
    div({ display: 'flex', alignItems: 'center', gap: 4, height: 44, padding: '0 8px' },
      DEVICE_SEG(mode),
      div({ flexGrow: 1 }),
      Select({ aria: 'Zoom de la vista previa', text: zoom, w: 112, height: 30 }),
      Btn({ label: 'Inspector', ic: 'ads_click', kind: inspector ? 'active' : 'tonal', h: 30, px: 8, size: 13, aria: 'Inspeccionar un elemento del preview' }),
      Btn({ label: 'Vista', sv: 'tune', caret: true, kind: 'tonal', h: 30, px: 8, size: 13, aria: 'Menú Vista: idioma, color, captura y más', s: vista ? { background: C.highest, outline: `1px solid ${C.accent}` } : {} })));
}
export const VISTA_MENU = (w = 300) => Menu([
  { head: 'Dispositivo' }, { label: 'iPhone 14 · 390×844', check: true, on: false }, { label: 'iPad Air · 820×1180', check: true }, { label: 'Otros dispositivos…', ic: 'keyboard_arrow_down' },
  { head: 'Idioma y color' }, { label: 'Idioma del preview: es', ic: 'translate' }, { label: 'Modo de color: automático', ic: 'contrast' },
  { head: 'Herramientas' }, { label: 'Auditoría de accesibilidad', ic: 'accessibility_new' }, { label: 'Captura PNG', ic: 'photo_camera' }, { label: 'Recargar', ic: 'refresh', kbd: 'Ctrl+Mayús+R' }, { label: 'Abrir en una pestaña nueva', ic: 'open_in_new' },
], { w, aria: 'Menú Vista' });

export function previewPanel({ w, hgt, mode = 'desktop', scale, banner = null, vista = false, stale = false, zoom, baseFile }) {
  const barH = 45;
  const stageH = hgt - barH;
  const pageH = 900 * scale;
  return div({ width: w, flexShrink: 0, height: hgt, display: 'flex', flexDirection: 'column', background: C.bg, borderLeft: `1px solid ${C.border}`, position: 'relative' },
    previewBar({ w: w - 1, mode, vista, zoom }),
    banner ? div({ display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 12px', flexShrink: 0, background: 'rgba(147, 0, 10, 0.35)', borderBottom: `1px solid ${C.err}`, color: C.err, fontSize: 13 },
      icon('error', 18), span({ fontWeight: 600 }, banner.text), h('a', { href: banner.href ?? '#', s: { display: 'inline-flex', alignItems: 'center', minHeight: 24, padding: '0 6px', color: C.text, textDecoration: 'underline', textUnderlineOffset: 3, fontWeight: 600 } }, 'Ver'), div({ flexGrow: 1 }), span({ color: C.text2, fontSize: 12 }, 'Última vista correcta · hace 12 s')) : '',
    div({ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: 32 },
      div({ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#eadfed 1px, rgba(0, 0, 0, 0) 0px)', backgroundSize: '24px 24px', opacity: 0.03 }),
      div({ position: 'relative', zIndex: 1, opacity: stale ? 0.55 : 1 }, raw(reportPage(baseFile, scale)))));
}

// ------------------------------------------------------------------ panel inferior (P-03, P-09)
export const bottomTabs = (active, counts = {}, extra = '') => div({ display: 'flex', alignItems: 'center', height: 36, flexShrink: 0, background: C.low, borderBottom: `1px solid ${C.border}`, paddingLeft: 8 },
  ...['Problemas', 'Registro'].map((t) => h('button', { type: 'button', 'aria-pressed': t === active ? 'true' : 'false', s: { display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', border: 'none', background: 'transparent', color: t === active ? C.text : C.text2, fontSize: 13, fontWeight: t === active ? 600 : 400, fontFamily: FONT, boxShadow: t === active ? `inset 0 -2px 0 ${C.accent}` : undefined } }, t, counts[t] ? Badge(String(counts[t]), t === 'Problemas' ? C.err : C.text2, t === 'Problemas' ? 'rgba(255, 180, 171, 0.12)' : C.highest) : '')),
  div({ flexGrow: 1 }), extra,
  IconBtn({ ic: 'close_fullscreen', aria: 'Maximizar el panel inferior', size: 28 }), IconBtn({ ic: 'close', aria: 'Cerrar el panel inferior (Ctrl+J)', size: 28, s: { marginRight: 8 } }));

// ------------------------------------------------------------------ barra de estado propuesta
export function statusBar({ errors = 0, warnings = 0, compile = 'Compilado en 15 ms', href = {}, layout = 'Editor + vista previa', auto = true }) {
  const chip = (ic, t, color, hr) => h(hr ? 'a' : 'button', { type: hr ? undefined : 'button', href: hr, title: 'Mostrar el panel de problemas', s: { display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 8px', border: 'none', background: 'transparent', color, fontFamily: MONO, fontSize: 11, letterSpacing: '0.55px', textDecoration: 'none' } }, icon(ic, 14), t);
  return h('footer', { s: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, height: 32, padding: '0 8px 0 8px', borderTop: '1px solid rgba(221, 183, 255, 0.2)', background: C.status, fontFamily: MONO, fontSize: 11, lineHeight: '16px', letterSpacing: '0.55px', color: C.text3, zIndex: 60 } },
    row({ gap: 8 },
      chip('cancel', `${errors} ${errors === 1 ? 'error' : 'errores'}`, errors ? C.err : C.text3, href.problems), chip('warning', `${warnings} ${warnings === 1 ? 'aviso' : 'avisos'}`, warnings ? C.warn : C.text3, href.problems),
      row({ gap: 6, padding: '0 8px', color: errors ? C.err : C.sec }, icon(errors ? 'error' : 'info', 14), compile)),
    row({ gap: 8 },
      h('button', { type: 'button', 'aria-pressed': auto ? 'true' : 'false', title: 'Autocompilación: recompila al escribir', s: { display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 8px', border: 'none', background: 'transparent', color: C.text2, fontFamily: MONO, fontSize: 11, letterSpacing: '0.55px' } },
        span({ width: 6, height: 6, borderRadius: 3, background: auto ? C.accent : C.text3, boxShadow: auto ? `0 0 6px ${C.accent}` : undefined, display: 'block' }), auto ? 'Autocompilar: sí' : 'Autocompilar: no'),
      h(href.layout ? 'a' : 'button', { type: href.layout ? undefined : 'button', href: href.layout, title: 'Cambiar la disposición de paneles', s: { display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 8px', border: 'none', background: 'transparent', color: C.text2, fontFamily: MONO, fontSize: 11, letterSpacing: '0.55px', textDecoration: 'none' } }, icon('web', 14), `Disposición: ${layout}`, icon('keyboard_arrow_down', 14)),
      span({ padding: '0 8px' }, 'UTF-8'), span({ padding: '0 8px' }, 'Pug/Sass'), row({ gap: 6, padding: '0 8px' }, icon('cloud_done', 14), 'Guardado')));
}

/** El IDE propuesto completo, 1440×900. */
export function ide(o = {}) {
  const { baseFile, tab = 'archivos', leftW = 280, previewW = 660, bottom = null, bottomH = 300, banner = null, errorLine = null, vista = false, mode = 'desktop',
    overlay = '', dim = false, errors = 0, warnings = 0, compile, href = {}, menu = null, layoutName = 'Editor + vista previa', railOnly = false, stale = false, editorTabs } = o;
  const bodyH = 900 - 64 - 32;
  const paneH = bodyH - (bottom ? bottomH : 0);
  const lw = railOnly ? 48 : leftW;
  const editorW = 1440 - lw - previewW - 1;
  const scale = +(Math.max(0.1, (previewW - 1 - 64) / 1440)).toFixed(4);
  const zoom = `Ajustar ${Math.round(scale * 100)} %`;
  const tabs = editorTabs ?? [{ name: 'main.pug', path: '/main.pug', active: true }, { name: 'mixins.pug', path: '/mixins.pug' }, { name: 'informe.scss', path: '/styles/informe.scss', ic: 'palette' }];
  return root900(
    topbar({ open: menu, href }),
    div({ display: 'flex', flexDirection: 'column', height: bodyH, position: 'relative' },
      div({ display: 'flex', height: paneH, minHeight: 0 },
        railOnly ? rail(paneH) : sidePanel({ tab, w: lw, hgt: paneH }),
        div({ width: editorW, flexShrink: 0, display: 'flex', flexDirection: 'column', height: paneH, background: C.editor },
          tabBar(tabs, editorW), editorBody({ w: editorW, hgt: paneH - 36, errorLine, active: errorLine ?? 1 })),
        previewPanel({ w: previewW + 1, hgt: paneH, mode, scale, banner, vista, stale, zoom, baseFile })),
      bottom ? div({ height: bottomH, flexShrink: 0, borderTop: `1px solid ${C.border}`, background: C.surf, display: 'flex', flexDirection: 'column' }, bottom) : ''),
    statusBar({ errors, warnings, compile, href, layout: layoutName }),
    dim ? div({ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.55)', zIndex: 100 }) : '',
    overlay);
}
export const root900 = (...k) => h('div', { s: { width: 1440, height: 900, overflow: 'hidden', position: 'relative', background: C.bg, color: C.text, fontFamily: FONT, fontSize: 14, lineHeight: '21px', display: 'flex', flexDirection: 'column' } }, ...k);
