// Escribe design/canvas/canvas.json (índice del lienzo): posición de cada mesa, filas por versión y notas.
// Ajusta además el alto de las mesas de flujo libre (tokens, componentes) al que ocupan de verdad.
//
//   node design/tools/layout.mjs [--out design/canvas]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from './server.mjs';
import { localHtml } from './local-render.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const out = resolve(arg('--out') ?? join(here, '../canvas'));

const W = 1440, GAP_X = 80, GAP_Y = 120, TITLE_SPACE = 300;

// Filas del lienzo, en orden. `boards`: archivos; el título de cada mesa sale de su <title> de la escena (scenes.mjs).
export const ROWS = [
  { id: 'ref', title: 'Referencia · tokens y componentes', boards: ['Main.dc.html', 'Componentes.dc.html', 'Componentes-claro.dc.html'] },
  { id: '05-a', title: 'Versión 0.5 · pantallas', boards: ['V-01-IDE.dc.html', 'V-02-Errores.dc.html', 'V-04-Inicio.dc.html', 'V-05-IDE-claro.dc.html'] },
  { id: '05-b', title: 'Versión 0.5 · preview y paneles', boards: ['V-06-PDF.dc.html', 'V-07-Inspector.dc.html', 'V-08-Terminal.dc.html', 'V-09-Datos.dc.html'] },
  { id: '05-c', title: 'Versión 0.5 · archivos, proyectos y paleta', boards: ['V-10-Archivos-que-faltan.dc.html', 'V-11-Proyectos.dc.html', 'V-12-Paleta.dc.html', 'V-13-Atajos.dc.html'] },
  { id: '05-d', title: 'Versión 0.5 · historial, compartir y búsqueda', boards: ['V-14-Historial.dc.html', 'V-15-Proyecto-compartido.dc.html', 'V-16-Buscar.dc.html', 'V-17-Anadir-idioma.dc.html'] },
  { id: '05-e', title: 'Versión 0.5 · diálogos y avisos', boards: ['V-18-Nuevo-archivo.dc.html', 'V-19-Borrar-archivo.dc.html', 'V-20-Importar.dc.html', 'V-21-Menu-contextual.dc.html'] },
  { id: '05-f', title: 'Versión 0.5 · privacidad y compartir', boards: ['V-22-Privacidad.dc.html', 'V-23-Compartir.dc.html'] },
  { id: '05-g', title: 'Versión 0.5 · tema claro', boards: ['V-24-Inicio-claro.dc.html', 'V-25-Errores-claro.dc.html', 'V-26-PDF-claro.dc.html', 'V-27-Proyectos-claro.dc.html'] },
  { id: '051', title: 'Versión 0.5.1 · usar siempre la última versión', boards: ['V-03-Actualizacion.dc.html'] },
];

const INTERACTIVE = new Set(['V-01-IDE.dc.html', 'V-03-Actualizacion.dc.html', 'V-04-Inicio.dc.html', 'Main.dc.html', 'Componentes.dc.html', 'Componentes-claro.dc.html', 'V-11-Proyectos.dc.html', 'V-13-Atajos.dc.html', 'V-14-Historial.dc.html', 'V-15-Proyecto-compartido.dc.html', 'V-17-Anadir-idioma.dc.html', 'V-18-Nuevo-archivo.dc.html', 'V-19-Borrar-archivo.dc.html', 'V-20-Importar.dc.html', 'V-27-Proyectos-claro.dc.html']);

const read = (f) => readFileSync(join(out, f), 'utf8');
const previewOf = (f) => { const m = read(f).match(/"\$preview":\{"width":(\d+),"height":(\d+)\}/); return { w: +m[1], h: +m[2] }; };
const titleOf = (f) => read(f).match(/<title>([^<]*)<\/title>/)[1];

// Títulos de mesa en el lienzo (nombre estable «V-NN …»)
const BOARD_TITLES = {
  'Main.dc.html': 'Tokens de diseño',
  'Componentes.dc.html': 'Componentes · tema oscuro',
  'Componentes-claro.dc.html': 'Componentes · tema claro',
  'V-03-Actualizacion.dc.html': 'V-03 Actualización: aviso y recarga',
};
async function scenesTitles() {
  const { scenes } = await import('./scenes.mjs');
  return Object.fromEntries(scenes.map((s) => [s.file, s.title]));
}

// 1. Alto real de las mesas de flujo libre
const FLOW = ['Main.dc.html', 'Componentes.dc.html', 'Componentes-claro.dc.html'];
const env = await start();
const page = await (await env.browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
for (const f of FLOW) {
  if (!existsSync(join(out, f))) continue;
  const tmp = join(out, '..', '..', 'node_modules', '.cache-design-' + f);
  localHtml(join(out, f), tmp);
  await page.goto('file://' + tmp);
  await page.waitForTimeout(1500);
  const hgt = await page.evaluate(() => Math.ceil(document.querySelector('x-dc > div').getBoundingClientRect().height));
  writeFileSync(join(out, f), read(f).replace(/"\$preview":\{"width":(\d+),"height":\d+\}/, `"$preview":{"width":$1,"height":${hgt}}`));
}
await env.close();

// 2. Índice
const titles = { ...(await scenesTitles()), ...BOARD_TITLES };
const boards = {};
const order = [];
let y = 0;
const notes = {};
ROWS.forEach((row, ri) => {
  const present = row.boards.filter((f) => existsSync(join(out, f)));
  if (!present.length) return;
  if (ri > 0) y += TITLE_SPACE;
  const sizes = present.map((f) => previewOf(f));
  const rowH = Math.max(...sizes.map((s) => s.h));
  let x = 0;
  present.forEach((f, i) => {
    const { w, h } = sizes[i];
    const e = { x, y, w, h, title: titles[f] ?? titleOf(f) };
    if (INTERACTIVE.has(f)) e.is_interactive = true;
    if (f === 'V-03-Actualizacion.dc.html') e.expand = 'fill';
    boards[f] = e;
    order.push(f);
    x += w + GAP_X;
  });
  notes[`fila-${row.id}`] = { x: 0, y: y - 240, text: row.title, kind: 'title1', maxW: Math.max(x - GAP_X, W) };
  y += rowH + GAP_Y;
});

// Notas de la convención, a la izquierda de la primera fila
const stick = (i, text, fill) => ({ x: -560, y: i * 470, w: 440, text, size: 's', fill });
notes['nota-convencion'] = stick(0, 'Convención. Una mesa por pantalla o estado, con nombre estable «V-NN …» que no se reutiliza ni se renumera. Filas por versión: cada versión añade una fila con solo las mesas que cambian o nacen. Una mesa por tema solo cuando cambia algo.', 'blue');
notes['nota-fidelidad'] = stick(1, 'Fidelidad. Las mesas de la app real (V-01 a V-02 y V-04 a V-27) se generan fotografiando el DOM de la app compilada con node design/tools/build.mjs: mismas medidas, colores y textos. Las mesas nuevas (diseño primero) se dibujan a mano con los tokens y los componentes de las dos primeras mesas.', 'green');
notes['nota-nuevas'] = stick(2, 'Diseño primero. Para una pantalla nueva: copia la mesa más parecida a una fila nueva de la versión en curso, cámbiala con los componentes y tokens, y pide aprobación aquí antes de programar. Al aprobarla se copia a design/canvas/ y se actualiza design/README.md.', 'orange');
notes['nota-v03'] = stick(3, 'V-03 (aviso de actualización de la 0.5.1) es un diseño aprobado todavía sin programar: no es una captura de la app. Cuando se implemente se sustituirá por la captura real y se anotará en design/README.md.', 'purple');

const canvas = {
  v: 3,
  createdOnFiles: { v: 1, at: '2026-11-04T10:30:00Z' },
  title: 'PugIDE · Diseño de la interfaz',
  launch: { view: 'canvas' },
  pages: [],
  boards,
  order,
  notes,
  designSystems: [],
};
writeFileSync(join(out, 'canvas.json'), JSON.stringify(canvas, null, 2) + '\n');
console.log(`canvas.json: ${order.length} mesas, ${Object.keys(notes).length} notas`);
