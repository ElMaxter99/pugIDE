// Genera las mesas P-01 a P-12 de la propuesta 0.7 (dibujadas a mano, no son capturas de la app salvo el fondo anotado de
// P-01 y P-10 y los fragmentos «Antes») y las añade al índice del lienzo en una fila nueva «Propuesta 0.7 · …».
//
//   node design/tools/build.mjs --out /tmp/base --only V-01,V-02      (capturas reales y frescas de la app compilada)
//   node design/propuestas/build-mesas-0.7.mjs --base /tmp/base [--out design/canvas]
//
// Usa htmlparser2 (dependencia transitiva de Angular) para leer el marcado real de las mesas base.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Parser } from 'htmlparser2';
import { board } from './lib.mjs';
import { p01, p10 } from './boards-diagnostico.mjs';
import { p02, p03, p04, p05, p06, p07, p08, p09, p11, p12 } from './boards-propuesta.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const out = resolve(arg('--out') ?? join(here, '../canvas'));
const base = resolve(arg('--base') ?? join(here, '../canvas'));
mkdirSync(out, { recursive: true });

const BOARDS = [
  { id: 'P-01', file: 'P-01-Diagnostico.dc.html', title: 'P-01 Diagnóstico: la pantalla principal, medida', fn: () => p01(base), row: 'diag' },
  { id: 'P-10', file: 'P-10-Diagnostico-errores.dc.html', title: 'P-10 Diagnóstico: errores, paleta y primer uso', fn: () => p10(base), row: 'diag' },
  { id: 'P-02', file: 'P-02-IDE-propuesto.dc.html', title: 'P-02 IDE propuesto: barra simple, editor y preview amplios', fn: () => p02(base), row: 'ide' },
  { id: 'P-08', file: 'P-08-Disposicion.dc.html', title: 'P-08 Presets de disposición y tiradores', fn: () => p08(), row: 'ide' },
  { id: 'P-11', file: 'P-11-Menus.dc.html', title: 'P-11 Menús Proyecto y Exportar', fn: () => p11(), row: 'ide' },
  { id: 'P-03', file: 'P-03-Problemas.dc.html', title: 'P-03 Panel «Problemas» unificado', fn: () => p03(base), row: 'err' },
  { id: 'P-04', file: 'P-04-Barra-preview.dc.html', title: 'P-04 Barra del preview rediseñada', fn: () => p04(base), row: 'err' },
  { id: 'P-09', file: 'P-09-Registro.dc.html', title: 'P-09 Terminal sin ruido: Registro', fn: () => p09(base), row: 'err' },
  { id: 'P-05', file: 'P-05-Datos.dc.html', title: 'P-05 Panel de datos simplificado', fn: () => p05(base), row: 'dat' },
  { id: 'P-07', file: 'P-07-Paleta.dc.html', title: 'P-07 Paleta de comandos mejorada', fn: () => p07(), row: 'dat' },
  { id: 'P-06', file: 'P-06-Primer-uso.dc.html', title: 'P-06 Primer uso: bienvenida con plantillas', fn: () => p06(base), row: 'dat' },
  { id: 'P-12', file: 'P-12-Recorrido.dc.html', title: 'P-12 Primer uso: recorrido de 4 pasos', fn: () => p12(base), row: 'dat' },
];
const ROWS = [
  { id: 'diag', title: 'Propuesta 0.7 · diagnóstico de la app actual (0.5.1)' },
  { id: 'ide', title: 'Propuesta 0.7 · el IDE propuesto: barra, menús y disposición' },
  { id: 'err', title: 'Propuesta 0.7 · problemas, preview y registro' },
  { id: 'dat', title: 'Propuesta 0.7 · datos, paleta y primer uso' },
];

/** Comprueba que todas las etiquetas no vacías están cerradas por el autor (sin cierres implícitos). */
function checkClosed(html, name) {
  const errs = [];
  const VOID = new Set(['input', 'br', 'hr', 'img', 'meta', 'link', 'wbr']);
  const stack = [];
  const parser = new Parser({
    onopentag(n) { if (!VOID.has(n)) stack.push(n); },
    onclosetag(n, implied) { if (VOID.has(n)) return; if (implied) errs.push(`cierre implícito de <${n}>`); stack.pop(); },
  }, { lowerCaseTags: false, lowerCaseAttributeNames: false });
  parser.write(html); parser.end();
  if (stack.length) errs.push('sin cerrar: ' + stack.join(','));
  if (errs.length) throw new Error(`${name}: ${errs.slice(0, 5).join('; ')}`);
}

const built = {};
for (const b of BOARDS) {
  const r = b.fn();
  const html = board({ title: b.title, w: r.w, hgt: r.h, body: r.body });
  checkClosed(html, b.file);
  writeFileSync(join(out, b.file), html);
  built[b.file] = { ...b, w: r.w, h: r.h, interactive: !!r.interactive, kb: Math.round(html.length / 1024) };
  console.log(b.id.padEnd(5), b.file.padEnd(36), `${r.w}x${r.h}`.padEnd(10), built[b.file].kb + ' KB');
}

// ---------------------------------------------------------------- índice del lienzo
if (process.argv.includes('--index')) {
  const idxPath = join(out, 'canvas.json');
  const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
  // se parte del índice existente y solo se añaden las claves nuevas (no se toca ninguna mesa ni nota anterior)
  // la fila nueva va 420 px por debajo de la última mesa existente (el mismo paso que entre las demás filas)
  let y = Math.max(...Object.entries(idx.boards).filter(([k]) => !k.startsWith('P-')).map(([, e]) => e.y + e.h)) + 420;
  const firstY = y;
  for (const row of ROWS) {
    const list = BOARDS.filter((b) => b.row === row.id).map((b) => built[b.file]);
    let x = 0;
    const rowH = Math.max(...list.map((b) => b.h));
    for (const b of list) {
      const e = { x, y, w: b.w, h: b.h, title: b.title };
      if (b.interactive) e.is_interactive = true;
      idx.boards[b.file] = e;
      if (!idx.order.includes(b.file)) idx.order.push(b.file);
      x += b.w + 80;
    }
    idx.notes[`fila-p07-${row.id}`] = { x: 0, y: y - 240, text: row.title, kind: 'title1', maxW: Math.max(x - 80, 1440) };
    y += rowH + 420;
  }
  const stick = (i, text, fill) => ({ x: -560, y: firstY + i * 520, w: 440, text, size: 's', fill });
  idx.notes['nota-p07-convencion'] = stick(0, 'Propuesta 0.7 (pendiente de aprobar). Las mesas P-NN son propuestas de diseño: nada de esto está programado. Los V-NN son lo ya implementado y no se han tocado. Una mesa por tema o estado; solo tema oscuro porque la propuesta no cambia el tema claro. Si se aprueba una mesa, pasa a V-NN con el siguiente número libre y se implementa.', 'blue');
  idx.notes['nota-p07-antes'] = stick(1, 'ANTES / DESPUÉS. «Antes» es el marcado real de la app 0.5.1 (generado con design/tools/build.mjs sobre el build de producción, no dibujado). «Después» está dibujado a mano con los tokens de styles.scss, las medidas de V-01 y el icono de la fuente de la app; los iconos nuevos (puntos, ajustes, bombilla, reloj, teclado) van en trazo y se añadirán al subconjunto con npm run fonts:icons.', 'green');
  idx.notes['nota-p07-medidas'] = stick(2, 'Medidas. Las cifras de los hallazgos salen de medir el DOM con Playwright (1440×900, tema oscuro, «Informe trimestral»): número de controles, anchos de panel, altos de barra, contraste y tamaño de objetivo. El zoom «Ajustar» de cada disposición usa la misma fórmula que la app: (ancho del preview − 64 px) / 1440. Las llamadas amarillas numeradas de P-01 y P-10 remiten a las tarjetas de debajo.', 'orange');
  idx.notes['nota-p07-orden'] = stick(3, 'Orden recomendado. Oleada 1 (bajo riesgo): P-09 registro, P-07 paleta y los textos en español. Oleada 2: P-04 barra del preview, P-05 datos, P-11 menús. Oleada 3 (la más profunda): P-08 disposición, P-03 problemas unificados y P-06/P-12 primer uso. Detalle, riesgos y decisiones en design/propuestas/0.7-mejoras-funcionales.md.', 'purple');
  idx.notes['nota-p07-decisiones'] = stick(4, 'Decisiones por tomar (con recomendación): 1) llamar «Registro» a la terminal (sí); 2) datos como pestaña del panel lateral en la disposición por defecto (sí); 3) Autocompilar baja a la barra de estado (sí); 4) bienvenida solo en el primer uso y recorrido opcional (sí); 5) disposición por defecto «Editor + vista previa» (sí, con «como hoy» a un clic). Lista completa en el documento.', 'teal');
  writeFileSync(idxPath, JSON.stringify(idx, null, 2) + '\n');
  console.log('canvas.json actualizado:', Object.keys(idx.boards).length, 'mesas,', Object.keys(idx.notes).length, 'notas');
}
