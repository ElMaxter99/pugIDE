// P-02 a P-09, P-11 y P-12: las mesas de la propuesta, dibujadas a mano con los tokens y las medidas de la app.
import { join } from 'node:path';
import { C, FONT, MONO, h, div, span, row, col, p, raw, icon, svg, Kbd, Btn, IconBtn, Divider, Badge, PanelLabel, Select, Segmented, Menu, Tag, root, fragment, reportPage } from './lib.mjs';
import { ide, sidePanel, dataPanel, previewBar, VISTA_MENU, bottomTabs, rail, topbar, statusBar, tabBar, editorBody, DEVICE_SEG } from './ide.mjs';
import { Head, rich, abs, Side, Metric, Why, Table } from './chrome.mjs';

const W = 1440;
const L = { proyecto: 'P-11-Menus.dc.html', exportar: 'P-11-Menus.dc.html', search: 'P-07-Paleta.dc.html', layout: 'P-08-Disposicion.dc.html', problems: 'P-03-Problemas.dc.html' };
const f = (dir, name) => join(dir, name);

// ============================================================================ P-02
export function p02(base) {
  const b = f(base, 'V-01-IDE.dc.html');
  return { w: W, h: 900, interactive: true, body: ide({ baseFile: b, href: L, errors: 0, warnings: 0, compile: 'Compilado en 15 ms' }) };
}

// ============================================================================ P-03
function problemRow({ sev = 'err', title, sub, loc, selected }) {
  return div({ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '8px 16px', borderBottom: `1px solid ${C.borderSub}`, background: selected ? C.active : undefined, boxShadow: selected ? `inset 2px 0 0 ${C.accent}` : undefined },
    icon(sev === 'err' ? 'error' : 'warning', 20, sev === 'err' ? C.err : C.warn),
    col({ flexGrow: 1, minWidth: 0, gap: 1 }, span({ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: '19px' }, title), span({ fontSize: 12, color: C.text2, lineHeight: '17px' }, sub)),
    h('a', { href: '#', s: { display: 'inline-flex', alignItems: 'center', minHeight: 24, fontFamily: MONO, fontSize: 12, color: C.accent, textDecoration: 'underline', textUnderlineOffset: 3, whiteSpace: 'nowrap' } }, loc));
}
export function problemsPanel({ w = W }) {
  const filters = Segmented([{ label: 'Todos · 2', active: true }, { label: 'Errores · 2' }, { label: 'Avisos · 0' }], { aria: 'Filtrar problemas por gravedad', h: 28 });
  const search = div({ position: 'relative', display: 'flex', alignItems: 'center' }, h('input', { type: 'text', 'aria-label': 'Filtrar problemas por texto o archivo', placeholder: 'Filtrar por texto o archivo', s: { width: 240, height: 28, padding: '0 8px 0 30px', border: `1px solid ${C.border}`, borderRadius: 3.5, background: C.lowest, color: C.text, fontSize: 13, fontFamily: FONT } }), div({ position: 'absolute', left: 6, top: 6, color: C.text3 }, icon('search', 16)));
  const check = h('label', { s: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.text2 } }, h('input', { type: 'checkbox', s: { width: 16, height: 16, accentColor: C.accent, margin: 0 } }), 'Solo el archivo abierto');
  const nav = row({ gap: 6 }, span({ fontFamily: MONO, fontSize: 12, color: C.text2 }, '1 de 2'), Btn({ label: 'Anterior', kbd: 'Mayús+F8', kind: 'tonal', h: 28, px: 8, size: 13 }), Btn({ label: 'Siguiente', kbd: 'F8', kind: 'tonal', h: 28, px: 8, size: 13 }));
  const code = (n, t, bad) => div({ display: 'flex', fontFamily: MONO, fontSize: 12, lineHeight: '18px', background: bad ? 'rgba(255, 180, 171, 0.12)' : undefined, boxShadow: bad ? `inset 2px 0 0 ${C.err}` : undefined }, div({ width: 36, textAlign: 'right', paddingRight: 10, color: '#a0a0a0' }, String(n)), span({ whiteSpace: 'pre', color: C.code }, t));
  const detail = col({ flexGrow: 1, minWidth: 0, padding: '14px 20px', gap: 10, borderLeft: `1px solid ${C.border}` },
    span({ fontSize: 16, fontWeight: 600, color: C.text, lineHeight: '22px' }, 'Falta definir la mixin resumenPie'),
    p({ fontSize: 13, color: C.text2, lineHeight: '20px', maxWidth: 620 }, rich('Se llama a `+resumenPie`, pero ningún archivo define `mixin resumenPie(…)`. Mixins definidos en el proyecto: `+tarjeta`. Defínela (por ejemplo en mixins.pug) y añade el `include`.')),
    div({ border: `1px solid ${C.border}`, borderRadius: 4, background: C.editor, padding: '6px 0', maxWidth: 520 }, code(15, '    each kpi in kpis'), code(16, '      +tarjeta(kpi.nombre, kpi.valor, kpi.variacion)'), code(17, '      +resumenPie(resumen)', true), code(18, '  section.ventas')),
    row({ gap: 8 }, Btn({ label: 'Crear mixin resumenPie en mixins.pug', kind: 'primary', h: 32, px: 12, size: 13 }), Btn({ label: 'Ir al error · main.pug:17', kind: 'outline', h: 32, px: 12, size: 13 }), Btn({ label: 'Copiar mensaje', kind: 'ghost', h: 32, px: 8, size: 13 })));
  return div({ display: 'flex', flexDirection: 'column', height: '100%' },
    bottomTabs('Problemas', { Problemas: 2 }),
    row({ gap: 12, height: 44, padding: '0 16px', flexShrink: 0, borderBottom: `1px solid ${C.borderSub}` }, filters, search, check, div({ flexGrow: 1 }), nav),
    div({ display: 'flex', flexGrow: 1, minHeight: 0 },
      col({ width: 600, flexShrink: 0 }, problemRow({ title: 'Falta definir la mixin resumenPie', sub: 'Se llama a +resumenPie, pero ningún archivo la define.', loc: 'main.pug:17', selected: true }),
        problemRow({ title: 'El JSON de traducciones no es válido', sub: 'Falta un nombre de propiedad entre comillas dobles (línea 4, columna 1).', loc: 'locales/es/translations.json:4' })),
      detail));
}
export function p03(base) {
  const b = f(base, 'V-01-IDE.dc.html');
  return { w: W, h: 900, interactive: true, body: ide({ baseFile: b, href: L, errors: 2, warnings: 0, compile: 'Error de compilación', bottom: problemsPanel({}), bottomH: 340, errorLine: 17, stale: true,
    banner: { text: '2 problemas ·', href: '#' } }) };
}

// ============================================================================ P-04
const stage = (w, hgt, base, scale) => div({ width: w, height: hgt, overflow: 'hidden', position: 'relative', background: C.bg, display: 'flex', justifyContent: 'center', paddingTop: 16 },
  div({ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#eadfed 1px, rgba(0, 0, 0, 0) 0px)', backgroundSize: '24px 24px', opacity: 0.03 }), div({ position: 'relative' }, raw(reportPage(base, scale))));
const pdfRow = (w) => div({ display: 'flex', alignItems: 'center', gap: 10, height: 40, padding: '0 12px', borderTop: `1px solid ${C.borderSub}`, width: w, background: C.surf },
  span({ fontFamily: MONO, fontSize: 12, color: C.text2 }, 'A4 · 210×297 mm · 794×1123 px'), Segmented([{ label: 'Vertical', active: true }, { label: 'Horizontal' }], { aria: 'Orientación de la hoja', h: 28 }), Badge('2 páginas', C.text2), div({ flexGrow: 1 }), Btn({ label: 'Imprimir', ic: 'print', kind: 'tonal', h: 28, px: 10, size: 13 }));
export function p04(base) {
  const b = f(base, 'V-01-IDE.dc.html');
  const before = fragment(b, '0.0.0.0.1.0.2.0.3.0.0');
  const pw = 660;
  // un bloque: etiqueta ANTES / DESPUÉS, descripción y el contenido con marco
  const block = (x, y, label, side, inner, wd, hgt) => abs(x, y, wd, hgt + 60, col({ gap: 8 }, row({ gap: 10 }, Side(side, side === 'before' ? 'Antes' : 'Después'), span({ fontSize: 13, color: C.text2 }, label)), div({ border: `1px solid ${C.border}`, borderRadius: 4, width: wd, height: hgt, position: 'relative', overflow: 'hidden' }, inner)));
  const bar = (opts) => previewBar({ w: pw, zoom: 'Ajustar 41 %', ...opts });
  return { w: W, h: 1220, body: root(W, 1220,
    abs(0, 0, W, 112, Head('P-04', 'Barra del preview: una fila, etiquetas visibles y un menú «Vista»', 'La barra actual reparte 13 controles en 3 filas (107 px) y 10 son solo icono. La propuesta deja a la vista lo que se usa en cada cambio (dispositivo, zoom e inspector) y agrupa lo ocasional en un menú con texto. Por debajo de 560 px de ancho, el segmentado y el inspector pasan a solo icono con su nombre accesible.')),
    block(40, 124, 'App 0.5.1 · 389 px de ancho · 13 controles, 3 filas', 'before', div({ width: 389 }, raw(before), stage(389, 90, b, 0.22)), 391, 250),
    block(472, 124, 'Propuesta · 660 px de ancho · 7 controles, 1 fila', 'after', div({}, bar({}), stage(pw, 160, b, 0.4132)), pw + 2, 250),
    block(40, 480, 'Menú «Vista» abierto: lo ocasional, con texto', 'after', div({ height: 470 }, bar({ vista: true }), div({ position: 'absolute', right: 10, top: 48, zIndex: 5 }, raw(VISTA_MENU(300)))), pw + 2, 470),
    block(740, 480, 'Modo PDF: una segunda fila solo cuando hace falta', 'after', div({}, bar({ mode: 'pdf', zoom: 'Ajustar 67 %' }), pdfRow(pw), stage(pw, 200, b, 0.3)), pw + 2, 470),
    abs(1150, 124, 250, 330, col({ gap: 10 },
      Metric({ label: 'Filas de controles', before: '3', after: '1', w: 250 }),
      Metric({ label: 'Controles a la vista', before: '13', after: '7', w: 250, note: 'El resto, en «Vista»: idioma, color, accesibilidad, captura, recargar, pestaña nueva.' }),
      Metric({ label: 'Altura de la barra', before: '107 px', after: '45 px', w: 250 }))),
    abs(40, 1070, 300, 130, Metric({ label: 'Controles solo con icono', before: '10', after: '0', w: 300, note: 'Todos con texto visible; el único icono suelto del IDE es el de tema.' })),
    abs(360, 1070, 500, 130, Why({ w: 500, title: 'Un solo estado', text: 'Con Escritorio activo, el selector de dispositivo de hoy dice «Mobile (390x844)». Aquí el segmentado y la lista de dispositivos comparten un único estado, y se corrige de paso.' })),
    abs(880, 1070, 520, 130, Why({ w: 520, title: 'Decisiones', text: '**Idioma del preview**: dentro de «Vista»; si el proyecto tiene 2 o más idiomas, aparece también junto al zoom. **Recargar** baja a «Vista»: con autocompilación casi no se usa. **Inspector** se queda fuera porque es un modo que se activa y desactiva.' }))) };
}

// ============================================================================ P-05
export function p05(base) {
  const b = f(base, 'V-01-IDE.dc.html');
  const before = fragment(b, '0.0.0.0.1.0.2.0.2');
  const cell = (x, label, side, w, inner, hgt = 624, extra) => abs(x, 124, w + 2, hgt + 60, col({ gap: 6 }, div({ alignSelf: 'flex-start' }, Side(side, side === 'before' ? 'Antes' : 'Después')), div({ fontSize: 12.5, color: C.text2, lineHeight: '17px', height: 34 }, label), div({ width: w + 2, height: hgt, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden', position: 'relative', background: C.surf }, inner, extra ?? '')));
  const menu = div({ position: 'absolute', left: 16, top: 112, zIndex: 5 }, raw(Menu([
    { head: 'Juego de datos' }, { label: 'Nuevo juego de datos', ic: 'add', arrow: true }, { label: 'Renombrar…', ic: 'edit' }, { label: 'Duplicar', ic: 'file_copy' }, { label: 'Borrar…', ic: 'delete_forever' },
    { sep: true }, { head: 'Datos de ejemplo' }, { label: 'Idioma: es', check: true, on: true }, { label: 'Idioma: en', check: true },
    { sep: true }, { head: 'Entrada y salida' }, { label: 'Importar JSON, Schema u OpenAPI…', ic: 'upload_file' }, { label: 'Copiar JSON', ic: 'content_copy' }, { label: 'Dejar objeto vacío…', ic: 'delete' },
  ], { w: 268, aria: 'Más acciones de datos' })));
  const rows = [
    ['Colapsar Data', 'Disposición (P-08): raíl lateral y Ctrl+B'], ['ÁRBOL', 'Control «Árbol | JSON» con texto visible'], ['Deshacer · Rehacer', 'Se mantienen: 2 iconos con nombre accesible'], ['Copiar JSON', '«⋯» ▸ Copiar JSON'],
    ['DEJAR OBJETO VACÍO', '«⋯» ▸ Dejar objeto vacío… (se puede deshacer)'], ['Juego de datos activo', 'Selector, ocupa el ancho libre'], ['+ Nuevo…', '«⋯» ▸ Nuevo juego de datos'], ['Renombrar · Duplicar · Borrar', '«⋯» ▸ las tres acciones, con texto'],
    ['Idioma de los datos «es»', '«⋯» ▸ Idioma (ya no se confunde con el del preview)'], ['REGENERAR', 'Botón «Regenerar» (tonal, 13 px)'], ['IMPORTAR', '«⋯» ▸ Importar JSON, Schema u OpenAPI…'],
  ];
  return { w: W, h: 1300, body: root(W, 1300,
    abs(0, 0, W, 112, Head('P-05', 'Panel de datos simplificado', 'La barra de datos de hoy pone 14 controles en 5 filas (183 px) y mezcla tres estilos de etiqueta. Se queda con lo que se toca a cada rato (modo, deshacer, juego y regenerar) y manda lo ocasional a un menú «⋯» con frases normales en vez de mayúsculas de 10 px.')),
    cell(40, 'App 0.5.1 · 325 px · 14 controles, 5 filas, 183 px', 'before', 325, div({ display: 'flex', flexDirection: 'column', height: 624 }, raw(before))),
    cell(412, 'Propuesta · pestaña «Datos» del panel lateral · 7 controles, 2 filas, 81 px', 'after', 300, raw(sidePanel({ tab: 'datos', w: 300, hgt: 622 }))),
    cell(744, 'Propuesta · menú «⋯» abierto', 'after', 300, raw(sidePanel({ tab: 'datos', w: 300, hgt: 622 })), 624, raw(menu)),
    abs(1096, 124, 304, 700, col({ gap: 10 },
      Metric({ label: 'Controles a la vista', before: '14', after: '7', w: 304 }),
      Metric({ label: 'Filas de la barra', before: '5', after: '2', w: 304 }),
      Metric({ label: 'Alto antes del primer dato', before: '183 px', after: '81 px', w: 304, note: '**−56 %**: caben unas 5 filas de datos más sin desplazar.' }),
      Why({ w: 304, text: 'Etiquetas en mono mayúsculas solo para títulos de panel; las acciones, en Geist 13 px con frase normal (sin 10 px).' }))),
    abs(40, 850, 1360, 360, col({ gap: 6 }, PanelLabel('Dónde queda cada control de hoy'), Table({ w: 1360, size: 13, cols: ['Hoy en la barra de datos', 'En la propuesta'], rows })))) };
}

// ============================================================================ P-06
const thumb = (kind) => {
  const page = (inner) => div({ width: 132, height: 112, background: '#ffffff', borderRadius: 4, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)', overflow: 'hidden', position: 'relative' }, inner);
  const ln = (w, c = '#dddddd', hgt = 5, mt = 5) => div({ width: w, height: hgt, background: c, borderRadius: 2, marginTop: mt });
  if (kind === 'report') return page(col({}, div({ height: 26, background: '#5b3fd0' }), div({ padding: '8px 10px' }, ln(70, '#1f2430', 6, 0), ln(104), ln(96), div({ display: 'flex', gap: 5, marginTop: 8 }, div({ flex: 1, height: 24, background: '#f3f1fa', borderRadius: 3 }), div({ flex: 1, height: 24, background: '#f3f1fa', borderRadius: 3 }), div({ flex: 1, height: 24, background: '#f3f1fa', borderRadius: 3 })), ln(104, '#dddddd', 4), ln(104, '#dddddd', 4))));
  if (kind === 'invoice') return page(div({ padding: '10px' }, row({ justifyContent: 'space-between' }, ln(40, '#1f2430', 8, 0), ln(30, '#5b3fd0', 8, 0)), ln(60, '#dddddd'), div({ marginTop: 10 }, ...[0, 1, 2, 3].map(() => row({ gap: 6, marginTop: 4 }, div({ flex: 3, height: 5, background: '#dddddd' }), div({ flex: 1, height: 5, background: '#dddddd' })))), row({ justifyContent: 'flex-end', marginTop: 10 }, ln(44, '#5b3fd0', 8, 0))));
  if (kind === 'email') return div({ width: 132, height: 112, background: '#e9e6f2', borderRadius: 4, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)', display: 'flex', justifyContent: 'center', paddingTop: 10 }, div({ width: 92, height: 92, background: '#ffffff', borderRadius: 3, padding: 8 }, ln(50, '#1f2430', 6, 0), ln(76), ln(70), div({ marginTop: 10, width: 44, height: 14, background: '#5b3fd0', borderRadius: 3 })));
  return div({ width: 132, height: 112, border: `2px dashed ${C.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text3 }, icon('add', 36));
};
export function p06(base) {
  const b = f(base, 'V-01-IDE.dc.html');
  const tpl = (kind, name, desc, chip, href = 'P-02-IDE-propuesto.dc.html') => h('a', { href, s: { display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minWidth: 0, padding: 12, border: `1px solid ${C.border}`, borderRadius: 8, background: C.low, textDecoration: 'none', color: C.text } },
    div({ display: 'flex', justifyContent: 'center', padding: '4px 0' }, raw(thumb(kind))), span({ fontSize: 15, fontWeight: 600, lineHeight: '20px' }, name), span({ fontSize: 12.5, color: C.text2, lineHeight: '18px', minHeight: 54 }, desc), div({ alignSelf: 'flex-start' }, Badge(chip, C.text2)));
  const dialog = div({ position: 'absolute', left: 250, top: 96, width: 940, zIndex: 200 }, h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bienvenida a PugIDE', s: { background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)', padding: '28px 32px 20px', display: 'flex', flexDirection: 'column', gap: 18 } },
    row({ justifyContent: 'space-between', alignItems: 'flex-start' }, col({ gap: 6, maxWidth: 760 }, PanelLabel('Bienvenida', C.accent), h('h2', { s: { margin: 0, fontSize: 26, fontWeight: 600, lineHeight: '32px', color: C.text } }, 'Te damos la bienvenida a PugIDE'),
      p({ fontSize: 14, color: C.text2, lineHeight: '21px' }, 'Escribe Pug, rellena datos de ejemplo y mira el resultado al instante. Todo ocurre en tu navegador: tu código y tus datos no salen de tu equipo.')), IconBtn({ ic: 'close', aria: 'Cerrar la bienvenida', size: 32, is: 20, color: C.text2 })),
    col({ gap: 10 }, span({ fontSize: 13, fontWeight: 600, color: C.text }, 'Empieza con una plantilla'),
      row({ gap: 16, alignItems: 'stretch' }, tpl('report', 'Informe', 'Informe A4 con portada, capítulos con salto de página y tablas de métricas.', 'A4 · 3 archivos'), tpl('invoice', 'Factura', 'Factura A4 con líneas, totales con IVA y traducciones.', 'A4 · 3 archivos'), tpl('email', 'Correo electrónico', 'Correo transaccional basado en tablas, con botón como mixin.', 'Correo · 3 archivos'), tpl('blank', 'Proyecto vacío', 'Una página en blanco con un solo archivo main.pug para empezar desde cero.', '1 archivo'))),
    row({ gap: 8, paddingTop: 12, borderTop: `1px solid ${C.border}` }, Btn({ label: 'Abrir un proyecto guardado…', ic: 'folder_open', kind: 'ghost', h: 32, px: 10, size: 13 }), Btn({ label: 'Importar carpeta o .zip…', ic: 'upload', kind: 'ghost', h: 32, px: 10, size: 13 }), Btn({ label: 'Ver el recorrido · 1 minuto', ic: 'arrow_forward', kind: 'outline', h: 32, px: 10, size: 13, href: 'P-12-Recorrido.dc.html' }), div({ flexGrow: 1 }),
      h('label', { s: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text2 } }, h('input', { type: 'checkbox', s: { width: 16, height: 16, accentColor: C.accent, margin: 0 } }), 'No volver a mostrar')),
    row({ gap: 8, fontSize: 12, color: C.text3 }, raw(svg('bulb', 16, C.warn)), span({ color: C.text2 }, 'Consejo:'), Kbd('Ctrl+K'), span({ color: C.text2 }, 'busca cualquier comando o archivo ·'), Kbd('Ctrl+S'), span({ color: C.text2 }, 'guarda ·'), Kbd('Ctrl+Enter'), span({ color: C.text2 }, 'compila al momento'))));
  return { w: W, h: 900, interactive: true, body: ide({ baseFile: b, href: L, dim: true, overlay: dialog }) };
}

// ============================================================================ P-07
const hl = (t, q) => { const i = t.toLowerCase().indexOf(q.toLowerCase()); if (i < 0 || !q) return t; return [t.slice(0, i), span({ color: C.accent, fontWeight: 700 }, t.slice(i, i + q.length)), t.slice(i + q.length)]; };
function palItem({ title, sub, kbd, group, ic, sv, active, q = '', arrow }) {
  return div({ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, padding: '0 10px', borderRadius: 6, background: active ? C.hover : undefined, outline: active ? `1px solid ${C.accent}` : undefined, fontSize: 13, color: C.text },
    ic ? icon(ic, 18, C.text2) : sv ? raw(svg(sv, 18, C.text2)) : div({ width: 18, flexShrink: 0 }),
    col({ flexGrow: 1, minWidth: 0 }, span({ lineHeight: '19px' }, ...[].concat(hl(title, q))), sub ? span({ fontSize: 11.5, color: C.text3, fontFamily: MONO, lineHeight: '15px' }, sub) : ''),
    kbd ? row({ gap: 4 }, ...kbd.map((k) => Kbd(k, { background: 'transparent' }))) : '', arrow ? raw(svg('chevR', 16, C.text3)) : '', group ? span({ fontSize: 11, color: C.text2, flexShrink: 0 }, group) : '');
}
const palHead = (t) => div({ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.55px', textTransform: 'uppercase', color: C.text3, padding: '10px 10px 4px' }, t);
const palShell = (w, query, ...kids) => div({ width: w, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 16px 48px rgba(0, 0, 0, 0.35)', overflow: 'hidden' },
  row({ gap: 10, padding: '0 16px', height: 48, borderBottom: `1px solid ${C.border}` }, icon('search', 20, C.text3), span({ flexGrow: 1, fontSize: 15, color: query ? C.text : C.text3 }, query || 'Escribe un comando o el nombre de un archivo…'), Kbd('Esc')),
  col({ padding: 6, gap: 1 }, ...kids));
export function p07() {
  const oldItems = ['Ir al siguiente problema|Problemas', 'Ir al problema anterior|Problemas', 'Compilar ahora|Proyecto', 'Guardar|Proyecto', 'Historial del archivo…|Archivos', 'Instantáneas del proyecto…|Proyecto', 'Mis proyectos…|Proyecto', 'Nuevo proyecto vacío|Proyecto', 'Nuevo proyecto: Factura|Plantillas', 'Nuevo proyecto: Correo electrónico|Plantillas', 'Nuevo proyecto: Informe|Plantillas', 'Añadir archivo de helpers (helpers.js)|Proyecto', 'Exportar proyecto (carpeta o .zip)|Proyecto'];
  const before = div({ width: 400, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' },
    div({ padding: '14px 16px', fontSize: 15, color: C.text3, borderBottom: `1px solid ${C.border}` }, 'Escribe un comando o el nombre de un archivo…'),
    col({ padding: 6 }, ...oldItems.map((s, i) => { const [t, g] = s.split('|'); return div({ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px', borderRadius: 6, fontSize: 13, color: C.text, background: i === 0 ? C.hover : undefined, outline: i === 0 ? `1px solid ${C.accent}` : undefined }, span({}, t), span({ fontSize: 11, color: C.text2 }, g)); })));
  const after = palShell(460, '',
    palHead('Recientes'), palItem({ title: 'Instantáneas del proyecto…', sv: 'clock', active: true }), palItem({ title: 'Abrir /styles/informe.scss', sub: 'styles/informe.scss', sv: 'clock' }), palItem({ title: 'Cambiar dispositivo: Móvil', sv: 'clock' }),
    palHead('Proyecto'), palItem({ title: 'Guardar', kbd: ['Ctrl+S'] }), palItem({ title: 'Compilar ahora', kbd: ['Ctrl+Enter'] }), palItem({ title: 'Mis proyectos…' }), palItem({ title: 'Nuevo proyecto desde plantilla…', arrow: true }),
    palHead('Editor'), palItem({ title: 'Buscar y reemplazar en el proyecto', kbd: ['Ctrl+Shift+F'] }), palItem({ title: 'Ir a símbolo (mixins y bloques)', kbd: ['Ctrl+Shift+O'] }), palItem({ title: 'Formatear Pug', kbd: ['Shift+Alt+F'] }),
    palHead('Vista y disposición'), palItem({ title: 'Cambiar dispositivo…', arrow: true }), palItem({ title: 'Modo PDF / página impresa' }), palItem({ title: 'Disposición: Editor + vista previa', kbd: ['Ctrl+Alt+1'] }),
    div({ display: 'flex', gap: 12, padding: '10px 10px 4px', fontSize: 11.5, color: C.text3, borderTop: `1px solid ${C.borderSub}`, marginTop: 6 }, span({}, '↑↓ moverse'), span({}, 'Enter ejecutar'), span({}, 'Esc cerrar'), div({ flexGrow: 1 }), span({}, '44 comandos · escribe para filtrar')));
  const search = palShell(440, 'guar',
    palItem({ title: 'Guardar', q: 'guar', kbd: ['Ctrl+S'], group: 'Proyecto', active: true }),
    palItem({ title: 'Instantáneas del proyecto…', sub: 'coincide con «guardar» en las palabras clave', group: 'Proyecto' }),
    palItem({ title: 'Guardar proyecto como .zip', q: 'guar', group: 'Exportar' }),
    palItem({ title: 'Formato de Pug: guardar ordenando atributos', sub: 'Ajustes · desactivado', group: 'Ajustes' }),
    div({ padding: '12px 10px 6px', fontSize: 11.5, color: C.text3, borderTop: `1px solid ${C.borderSub}`, marginTop: 6 }, 'La coincidencia va resaltada; el atajo, a la derecha; el grupo, al final.'));
  const col3 = (x, w, label, side, inner) => abs(x, 130, w, 0, col({ gap: 10 }, row({ gap: 10 }, Side(side, side === 'before' ? 'Antes' : 'Después'), span({ fontSize: 13, color: C.text2 }, label)), inner));
  return { w: W, h: 940, body: root(W, 940,
    abs(0, 0, W, 112, Head('P-07', 'Paleta Ctrl+K con recientes, grupos y atajos visibles', 'Hoy la paleta es una lista plana de 44 comandos en el orden del código, sin atajos. La propuesta pone arriba lo último que usaste, agrupa lo demás, muestra el atajo de cada comando y recoge los 11 dispositivos en una sola entrada con sublista.')),
    col3(40, 400, 'App 0.5.1 · 13 de 44 visibles', 'before', before),
    col3(470, 460, 'Propuesta · sin escribir', 'after', after),
    col3(960, 440, 'Propuesta · escribiendo «guar»', 'after', search),
    abs(960, 470, 440, 400, col({ gap: 10 }, Metric({ label: 'Atajos visibles', before: '0', after: '9', w: 440, note: 'Los 9 que ya existen (Ctrl+S, Ctrl+Enter, Ctrl+Shift+F, Ctrl+Shift+O, Shift+Alt+F, Ctrl+Shift+J…).' }),
      Metric({ label: 'Entradas «Preview: …»', before: '12', after: '2', w: 440, note: 'Dispositivos en una sublista; PDF aparte.' }),
      Metric({ label: 'Repetir un comando reciente', before: '5+ teclas', after: '2 teclas', w: 440, note: 'Ctrl+K, Enter: el último ya está seleccionado.' })))) };
}

// ============================================================================ P-08
const wirePane = (label, w, k, hgt, o = {}) => div({ width: w * k, flexShrink: 0, height: hgt, border: `1px solid ${o.hi ? C.accent : C.border}`, background: o.hi ? C.active : C.low, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, overflow: 'hidden', minWidth: 0 },
  w * k > 40 ? span({ fontSize: 12, fontWeight: 600, color: o.hi ? C.accent : C.text, lineHeight: '16px', textAlign: 'center' }, label) : '', w * k > 40 ? span({ fontFamily: MONO, fontSize: 11, color: C.text2, lineHeight: '14px' }, `${w} px`) : '');
function wire({ k = 0.43, panes, bottom }) {
  const total = 900 * k, topH = 64 * k, statH = 32 * k, bodyH = total - topH - statH - 2;
  return div({ width: W * k, height: total, border: `1px solid ${C.border}`, borderRadius: 4, background: C.bg, overflow: 'hidden' },
    div({ height: topH, background: C.bg, borderBottom: `1px solid ${C.border}` }),
    div({ display: 'flex', height: bodyH }, ...panes.map((q) => wirePane(q[0], q[1], k, bodyH, { hi: q[2] }))),
    div({ height: statH, background: C.status }));
}
export function p08() {
  const k = 0.4;
  const zoomOf = (pw) => Math.round(((pw - 65) / 1440) * 100);
  const sheet = (pw) => ((pw - 65) / 1440 / 0.2257) ** 2;
  const presets = [
    { n: '1', name: 'Editor + vista previa', tag: 'Predeterminada', panes: [['Archivos · Datos', 280], ['Editor', 500], ['Vista previa', 660, true]], pw: 660, why: 'Los datos pasan a una pestaña del panel lateral: dejan de robar una columna y se ven a la vez que el editor y el preview.' },
    { n: '2', name: 'Editor + datos + vista previa', tag: 'Como hoy, con más preview', panes: [['Arch.', 48], ['Editor', 420], ['Datos', 300], ['Vista previa', 672, true]], pw: 672, why: 'Cuatro columnas como hoy, pero el árbol de archivos se recoge en un raíl de 48 px.' },
    { n: '3', name: 'Foco en el editor', tag: 'Escribir mucho', panes: [['Arch.', 48], ['Editor', 920, true], ['Vista previa', 472]], pw: 472, why: 'Editor ancho para plantillas largas; el preview sigue visible a un 28 %.' },
    { n: '4', name: 'Foco en la vista previa · PDF', tag: 'Revisar páginas', panes: [['Arch.', 48], ['Editor', 360], ['Vista previa · PDF', 1032, true]], pw: 1032, why: 'Para ajustar saltos de página y avisos de corte: las hojas A4 se ven a un 67 %.' },
  ];
  const card = (x, y, pr) => abs(x, y, 660, 500, col({ gap: 10, border: `1px solid ${C.border}`, borderRadius: 8, background: C.surf, padding: 16, height: 500 },
    row({ gap: 10 }, span({ fontFamily: MONO, fontSize: 12, fontWeight: 700, padding: '1px 8px', borderRadius: 4, background: C.accent, color: C.onAccent }, pr.n), span({ fontSize: 16, fontWeight: 600, flexGrow: 1 }, pr.name), Badge(pr.tag, C.text2)),
    div({ display: 'flex', justifyContent: 'center' }, raw(wire({ k, panes: pr.panes }))),
    row({ gap: 16, flexWrap: 'wrap' }, pr.panes[0][1] === 48 ? span({ fontSize: 13, color: C.text2 }, rich('Raíl **48 px**')) : '', span({ fontSize: 13, color: C.text2 }, rich(`Vista previa **${pr.pw} px** (${Math.round(pr.pw / 14.4)} %)`)), span({ fontSize: 13, color: C.text2 }, rich(`Zoom **${zoomOf(pr.pw)} %**`)), span({ fontSize: 13, color: C.text2 }, rich(`Hoja **×${sheet(pr.pw).toFixed(1).replace('.', ',')}**`))),
    p({ fontSize: 13, color: C.text2, lineHeight: '19px' }, pr.why)));
  const menu = Menu([{ head: 'Disposición' }, { label: 'Editor + vista previa', check: true, on: true, kbd: 'Ctrl+Alt+1' }, { label: 'Editor + datos + vista previa', check: true, kbd: 'Ctrl+Alt+2' }, { label: 'Foco en el editor', check: true, kbd: 'Ctrl+Alt+3' }, { label: 'Foco en la vista previa · PDF', check: true, kbd: 'Ctrl+Alt+4' },
    { sep: true }, { label: 'Panel lateral', ic: 'left_panel_close', kbd: 'Ctrl+B' }, { label: 'Panel inferior', ic: 'close_fullscreen', kbd: 'Ctrl+J' }, { sep: true }, { label: 'Restablecer los tamaños', ic: 'refresh' }], { w: 320, aria: 'Menú Disposición' });
  const sep = (label, state) => col({ gap: 6, width: 170 }, div({ display: 'flex', height: 64, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden', position: 'relative', background: C.low },
    div({ flex: 1, background: C.bg }),
    div({ width: 12, position: 'relative', flexShrink: 0, background: state === 'drag' ? C.active : 'transparent' }, div({ position: 'absolute', left: state === 'hover' || state === 'drag' ? 4 : 5.5, width: state === 'hover' || state === 'drag' ? 4 : 1, top: 0, bottom: 0, background: state === 'hover' || state === 'drag' ? C.accentC : C.border }), state === 'focus' ? div({ position: 'absolute', inset: '8px 1px', border: `2px solid ${C.accent}`, borderRadius: 3 }) : ''),
    div({ flex: 1, background: C.surf }), state === 'drag' ? div({ position: 'absolute', left: 58, top: 19, padding: '1px 6px', background: C.accent, color: C.onAccent, fontFamily: MONO, fontSize: 11, fontWeight: 700, borderRadius: 3 }, '660 px') : ''),
    span({ fontSize: 12, color: C.text2, lineHeight: '17px' }, label));
  return { w: W, h: 1620, body: root(W, 1620,
    abs(0, 0, W, 112, Head('P-08', 'Presets de disposición y paneles redimensionables', 'Hoy los cuatro paneles se reparten el ancho por proporciones fijas (240 / 487 / 325 / 389 px a 1440): el preview recibe el 27 % y su zoom es del 23 %. Cuatro disposiciones con nombre, tiradores entre paneles y tamaños que se recuerdan.')),
    card(40, 124, presets[0]), card(740, 124, presets[1]), card(40, 644, presets[2]), card(740, 644, presets[3]),
    abs(40, 1176, 340, 380, col({ gap: 8 }, row({ gap: 10 }, Side('after', 'Después'), span({ fontSize: 13, color: C.text2 }, 'Menú «Disposición» (barra de estado)')), div({ position: 'relative' }, raw(menu)))),
    abs(420, 1176, 560, 380, col({ gap: 12 }, row({ gap: 10 }, Side('after', 'Después'), span({ fontSize: 13, color: C.text2 }, 'Tirador entre paneles: cuatro estados')),
      row({ gap: 12, flexWrap: 'wrap' }, sep('Reposo: línea de 1 px, zona de agarre de 12 px', 'rest'), sep('Con el puntero: 4 px de acento y cursor de redimensión', 'hover'), sep('Con el teclado: anillo de foco; ← → mueven 16 px', 'focus'), sep('Arrastrando: muestra el ancho en px', 'drag')),
      Why({ w: 560, title: 'Reglas', text: '**Mínimos:** archivos 200 px, editor 360, datos 260, vista previa 320. **Doble clic** en un tirador restablece el tamaño de la disposición. Los tiradores son `role="separator"` con `aria-valuenow` y se mueven con el teclado (Mayús: 64 px). **Se recuerda** en las preferencias del usuario (no viaja con el proyecto compartido).' }))),
    abs(1020, 1176, 380, 380, col({ gap: 10 },
      Metric({ label: 'Ancho del preview (1440 px)', before: '389 px', after: '660 px', w: 380, note: '27 % → 46 % del ancho; hasta 1032 px (72 %) en «Foco en la vista previa».' }),
      Metric({ label: 'Hoja del preview', before: '325×203 px', after: '596×372 px', w: 380, note: 'Zoom «Ajustar» del 23 % al 41 %: **×3,4** de área, el texto de 14 px pasa de 3 a 6 px.' }),
      Metric({ label: 'Clics para ver el preview a 40 %+', before: 'colapsar 2 paneles', after: '1 (o 0)', w: 380 })))) };
}

// ============================================================================ P-09
const logLine = (time, src, text, color = C.text, dim = false, extra) => div({ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '3px 12px', lineHeight: '16.8px', opacity: dim ? 0.75 : 1 },
  span({ color: C.text3, fontSize: 11, lineHeight: '15.4px', whiteSpace: 'nowrap', flexShrink: 0 }, time), span({ color: C.accent, whiteSpace: 'nowrap', flexShrink: 0 }, `[${src}]`), span({ color: dim ? C.text2 : color, whiteSpace: 'pre-wrap', wordBreak: 'break-word', flexGrow: 1 }, text), extra ?? '');
const logHead = (filterActive, hidden) => div({ display: 'flex', alignItems: 'center', height: 36, flexShrink: 0, background: C.low, borderBottom: `1px solid ${C.border}`, paddingLeft: 8, fontFamily: FONT },
  ...['Problemas', 'Registro'].map((t) => h('button', { type: 'button', 'aria-pressed': t === 'Registro' ? 'true' : 'false', s: { display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', border: 'none', background: 'transparent', color: t === 'Registro' ? C.text : C.text2, fontSize: 13, fontWeight: t === 'Registro' ? 600 : 400, fontFamily: FONT, boxShadow: t === 'Registro' ? `inset 0 -2px 0 ${C.accent}` : undefined } }, t)),
  div({ width: 12 }), Segmented([{ label: 'Esenciales', active: filterActive === 'esenciales' }, { label: 'Todo', active: filterActive === 'todo' }], { aria: 'Filtro del registro', h: 26, size: 12 }),
  hidden ? span({ fontSize: 12, color: C.text2, marginLeft: 12 }, hidden) : '', div({ flexGrow: 1 }), IconBtn({ ic: 'delete', aria: 'Limpiar el registro (Ctrl+Shift+K)', size: 28 }), IconBtn({ ic: 'close', aria: 'Cerrar el panel inferior (Ctrl+J)', size: 28, s: { marginRight: 8 } }));
export function p09(base) {
  const b = f(base, 'V-01-IDE.dc.html');
  const before = fragment(b, '0.0.0.0.1.0.2.1');
  const log = (head, lines, hgt) => div({ width: 660, height: hgt, display: 'flex', flexDirection: 'column', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden', fontFamily: MONO, fontSize: 12, lineHeight: '18px' }, head, div({ flexGrow: 1, padding: '4px 0', overflow: 'hidden' }, ...lines));
  const fix = Btn({ label: 'Subir logo.svg…', kind: 'tonal', h: 24, px: 8, size: 12, aria: 'Subir logo.svg' });
  const esenciales = log(logHead('esenciales', '4 mensajes de detalle ocultos'), [
    logLine('11:42:08', 'Archivos', 'Faltan 1 archivo referenciado: /images/logo.svg. Súbelo desde el panel de archivos.', C.warn, false, fix), logLine('11:42:21', 'Archivos', 'Añadido: /images/logo.svg', C.ok)], 190);
  const todo = log(logHead('todo'), [
    logLine('11:41:55', 'Sistema', 'Sesión anterior restaurada.', C.text, true), logLine('11:41:56', 'Sistema', 'PugIDE listo.', C.text, true), logLine('11:42:08', 'Archivos', 'Faltan 1 archivo referenciado: /images/logo.svg. Súbelo desde el panel de archivos.', C.warn, false, fix),
    logLine('11:42:08', 'Compilador', 'Compilado en 509 ms', C.ok, true), logLine('11:42:21', 'Archivos', 'Añadido: /images/logo.svg', C.ok), logLine('11:42:21', 'Compilador', 'Compilado en 15 ms', C.ok, true)], 190);
  const slot = (x, y, label, side, inner) => abs(x, y, 662, 260, col({ gap: 8 }, row({ gap: 10 }, Side(side, side === 'before' ? 'Antes' : 'Después'), span({ fontSize: 13, color: C.text2 }, label)), inner));
  return { w: W, h: 900, body: root(W, 900,
    abs(0, 0, W, 112, Head('P-09', 'Terminal sin ruido: «Registro» con filtro por defecto y en español', 'Hoy la terminal se abre con 6 líneas y solo 1 es accionable; los errores ya tienen su sitio en «Problemas» (P-03). La terminal pasa a llamarse «Registro», muestra por defecto lo esencial y lleva todos los textos en español.')),
    slot(40, 124, 'App 0.5.1 · 180 px, 6 líneas, 1 accionable', 'before', div({ width: 660, height: 180, overflow: 'hidden', border: `1px solid ${C.border}`, borderRadius: 4 }, raw(before))),
    slot(740, 124, 'Propuesta · filtro «Esenciales» por defecto: 2 líneas', 'after', esenciales),
    slot(740, 390, 'Propuesta · «Todo»: el detalle, atenuado y con la hora real', 'after', todo),
    abs(40, 350, 662, 520, col({ gap: 12 },
      PanelLabel('Textos que cambian'),
      Table({ w: 660, size: 12.5, cols: ['Hoy (inglés)', 'Propuesta (español)'], rows: [
        ['All · Errors · Warnings · Info · Debug', 'Esenciales · Todo (los errores y avisos viven en «Problemas»)'], ['Restored your previous session.', 'Sesión anterior restaurada. (solo en «Todo»)'], ['PugIDE initialized successfully', 'PugIDE listo. (solo en «Todo»)'], ['Compiled in 509.2ms', 'Compilado en 509 ms (solo en «Todo»; ya está en la barra de estado)'],
        ['Welcome to PugIDE! Open a project or start coding.', 'Sustituido por la bienvenida de P-06'], ['00:01:12 (segundos desde que abrió)', '11:42:08 (hora del equipo)'] ] }))),
    abs(740, 660, 662, 220, col({ gap: 10 },
      row({ gap: 10 }, Metric({ label: 'Líneas por defecto', before: '6', after: '2', w: 326 }), Metric({ label: 'Accionables', before: '17 %', after: '50 %', w: 326, note: '1 de 2; el resto, en «Todo».' })),
      Metric({ label: 'Textos en inglés de la terminal', before: '9', after: '0', w: 662, note: 'Cinco filtros y cuatro mensajes. Los mensajes son una decisión de contenido: los traduce `terminal.state` y `orchestrator.service`, no el componente.' })))) };
}

// ============================================================================ P-11
export function p11() {
  const proyecto = Menu([{ ic: 'folder_open', label: 'Mis proyectos…' }, { ic: 'add', label: 'Nuevo proyecto desde plantilla…' }, { sep: true }, { sv: 'clock', label: 'Instantáneas del proyecto…' }, { ic: 'files', label: 'Historial del archivo…' }, { sep: true }, { ic: 'upload', label: 'Importar carpeta o .zip…' }, { ic: 'add_photo_alternate', label: 'Subir imágenes, fuentes o estilos…' }, { ic: 'translate', label: 'Añadir idioma…' }, { sep: true }, { ic: 'search', label: 'Buscar en el proyecto', kbd: 'Ctrl+Shift+F' }, { sv: 'keyboard', label: 'Atajos de teclado' }], { w: 320, aria: 'Menú Proyecto' });
  const exportar = Menu([{ ic: 'link', label: 'Copiar enlace para compartir' }, { sep: true }, { ic: 'code', label: 'HTML autocontenido' }, { ic: 'photo_camera', label: 'Captura PNG del preview' }, { ic: 'picture_as_pdf', label: 'Imprimir o guardar como PDF' }, { sep: true }, { ic: 'download', label: 'Proyecto en carpeta o .zip' }], { w: 320, aria: 'Menú Exportar' });
  const trig = (label, ic, open) => div({ alignSelf: 'flex-start' }, Btn({ label, ic, caret: true, aria: 'Menú ' + label, s: open ? { background: C.highest, color: C.text } : {} }));
  const slot = (x, label, trigEl, menu) => abs(x, 130, 340, 560, col({ gap: 10 }, trigEl, div({ height: 0 }), menu));
  const rows = [['Informe trimestral (abre Mis proyectos)', 'Proyecto ▸ Mis proyectos…'], ['Cámara (Instantáneas)', 'Proyecto ▸ Instantáneas del proyecto…'], ['Comandos', 'Campo «Buscar comandos y archivos…» · Ctrl K'], ['Compartir', 'Exportar ▸ Copiar enlace para compartir'], ['Exportar HTML', 'Exportar ▸ HTML autocontenido'], ['Autocompilar', 'Barra de estado: «Autocompilar: sí» · comando de la paleta'], ['Tema (icono)', 'Igual, con nombre accesible «Cambiar tema claro u oscuro»'], ['Guardar', 'Igual: el único botón relleno']];
  return { w: W, h: 900, body: root(W, 900,
    abs(0, 0, W, 112, Head('P-11', 'Barra superior: dos menús con texto y un solo botón primario', 'De 9 controles a 6: «Proyecto» y «Exportar» agrupan lo que hoy son cinco botones sueltos; la paleta pasa a ser un campo con el atajo visible; Autocompilar, que es un ajuste, baja a la barra de estado. No se pierde ninguna acción.')),
    abs(40, 124, 300, 70, col({ gap: 8 }, row({ gap: 10 }, Side('after', 'Después'), span({ fontSize: 13, color: C.text2 }, 'Menú «Proyecto»')))), slot(40, '', trig('Proyecto', 'folder_open', true), div({}, raw(proyecto))),
    abs(400, 124, 300, 70, col({ gap: 8 }, row({ gap: 10 }, Side('after', 'Después'), span({ fontSize: 13, color: C.text2 }, 'Menú «Exportar»')))), slot(400, '', trig('Exportar', 'download', true), div({}, raw(exportar))),
    abs(780, 124, 620, 640, col({ gap: 12 }, Table({ w: 620, size: 13, cols: ['Hoy en la barra', 'Dónde queda'], rows }),
      row({ gap: 10 }, Metric({ label: 'Controles', before: '9', after: '6', w: 200 }), Metric({ label: 'Rellenos de color', before: '2', after: '1', w: 200 }), Metric({ label: 'Solo icono', before: '2', after: '1', w: 200 })),
      Why({ w: 620, text: 'La cámara dejaba de ser ambigua: **Captura PNG** queda en «Exportar» y **Instantáneas** en «Proyecto». Los menús usan `role="menu"`, se abren con Intro o Espacio y se cierran con Esc devolviendo el foco al botón.' }))),
    abs(40, 700, 700, 170, col({ gap: 8 }, Why({ w: 700, title: 'Decisiones', text: 'El **nombre del proyecto** sale de la barra (ya está en el panel lateral). El **icono de tema** se queda sin texto: es el único y tiene nombre accesible; si prefieres una etiqueta, cabe «Tema». «Exportar» recoge también compartir, porque es sacar el proyecto de PugIDE.' })))) };
}

// ============================================================================ P-12
export function p12(base) {
  const b = f(base, 'V-01-IDE.dc.html');
  const steps = [
    { n: 1, t: 'Archivos y datos', hole: [0, 64, 280, 804], text: 'Aquí viven los archivos del proyecto y, en la pestaña «Datos», los datos de ejemplo. PugIDE detecta las variables y las claves `t(\'…\')` de tu plantilla y las rellena por ti; tú las editas después.', opts: { tab: 'archivos' } },
    { n: 2, t: 'El editor', hole: [281, 64, 499, 804], text: 'Escribe Pug con completado y ayuda al pasar el ratón. **F12** o **Ctrl+clic** llevan a una definición. Los errores se subrayan y se explican en el panel «Problemas».', opts: {} },
    { n: 3, t: 'La vista previa', hole: [781, 64, 660, 804], text: 'Se actualiza al escribir. Cambia entre Escritorio, Tablet, Móvil y PDF; en «Vista» tienes el idioma, el color, la captura y el inspector.', opts: {} },
    { n: 4, t: 'Todo con el teclado', hole: [520, 14, 400, 36], text: null, opts: {} },
  ];
  const cell = (s, x, y) => {
    const k = 660 / 1440;
    const [hx, hy, hw, hh] = s.hole;
    const spot = div({ position: 'absolute', left: hx, top: hy, width: hw, height: hh, border: `3px solid ${C.accent}`, borderRadius: 6, boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.62)', zIndex: 150 });
    const mini = div({ width: 660, height: 414, overflow: 'hidden', position: 'relative', border: `1px solid ${C.border}`, borderRadius: 6 }, div({ width: 1440, height: 900, transform: `scale(${k})`, transformOrigin: '0 0', position: 'relative' }, raw(ide({ baseFile: b, href: {}, ...s.opts })), spot));
    const body = s.text ? p({ fontSize: 14, color: C.text2, lineHeight: '21px' }, rich(s.text)) : col({ gap: 8 }, ...[['Ctrl+K', 'busca comandos y archivos'], ['Ctrl+S', 'guarda y crea una versión'], ['Ctrl+Enter', 'compila al momento'], ['Ctrl+Shift+F', 'busca en todo el proyecto']].map(([k2, t]) => row({ gap: 12, fontSize: 14, color: C.text2 }, div({ width: 112 }, Kbd(k2)), t)));
    return abs(x, y, 660, 600, col({ gap: 12 }, mini,
      div({ border: `1px solid ${C.border}`, borderRadius: 8, background: C.surf, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, height: 172 },
        row({ gap: 10 }, span({ fontFamily: MONO, fontSize: 12, color: C.text3 }, `${s.n} de 4`), span({ fontSize: 16, fontWeight: 600, color: C.text, flexGrow: 1 }, s.t), raw(svg('bulb', 18, C.warn))), body,
        row({ gap: 8 }, Btn({ label: 'Saltar el recorrido', kind: 'ghost', h: 32, px: 8, size: 13 }), div({ flexGrow: 1 }), s.n > 1 ? Btn({ label: 'Anterior', kind: 'outline', h: 32, px: 12, size: 13 }) : '', Btn({ label: s.n === 4 ? 'Terminar' : 'Siguiente', kind: 'primary', h: 32, px: 14, size: 13 })))));
  };
  return { w: W, h: 1400, body: root(W, 1400,
    abs(0, 0, W, 112, Head('P-12', 'Primer uso: recorrido de 4 pasos con consejos y atajos', 'Se ofrece desde la bienvenida (P-06) y desde la paleta («Ver el recorrido»). Cada paso ilumina una zona con un halo de acento y dice qué hacer en dos frases; el último reúne los cuatro atajos que más se usan. Se puede saltar en cualquier momento y no vuelve a salir.')),
    cell(steps[0], 40, 124), cell(steps[1], 740, 124), cell(steps[2], 40, 724), cell(steps[3], 740, 724)) };
}
