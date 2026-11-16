import { check, previewFrame } from '../lib.mjs';
import { A4_HEIGHT, openPdfProject } from '../perf-lib.mjs';

// Tablas de miles de filas en modo PDF: las posiciones de las filas se calculan en vez de medirse en cada hoja (para
// que el preview no se congele). Aquí se comprueba, en los tres motores, que lo calculado no se separa de lo real:
// ninguna fila queda cortada ni metida en los márgenes y la cabecera se repite justo al empezar cada hoja.
const ROWS = 1500;
const source = `doctype html
html
  head
    style.
      @page { size: A4; margin: 15mm }
      body { margin: 0; font: 11pt/1.2 Arial, sans-serif }
      table { width: 100%; border-collapse: collapse }
      thead th { height: 40px; background: #cde; text-align: left; padding: 0 8px; border-bottom: 2px solid #468 }
      td { height: 28px; padding: 0 8px; border-bottom: 1px solid #999 }
  body
    h1 Citas de Clínica Aurora
    table
      thead
        tr
          th Paciente
          th Importe
          th Estado
      tbody
        - for (let r = 0; r < ${ROWS}; r++)
          tr
            td Paciente #{r}
            td #{r * 10}
            td Pendiente
`;

export default async function (env) {
  const app = await openPdfProject(env, source, { timeout: 120000 });
  const { page } = app;
  const pages = Number((await page.locator('.pdf-bar').innerText()).match(/Página\s+de\s+(\d+)/)?.[1]);
  const m = await (await previewFrame(page)).evaluate((H) => {
    // Los márgenes de la hoja son el relleno que el paginado pone en la raíz del documento.
    const margin = parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0;
    const y = (el) => el.getBoundingClientRect().top + window.scrollY;
    const body = [...document.querySelectorAll('tbody > tr:not([data-pg-spacer])')];
    let worst = 0; // lo que más se sale una fila del contenido de su hoja, en px
    for (const tr of body) {
      const top = y(tr);
      const k = Math.floor(top / H);
      worst = Math.max(worst, k * H + margin - top, top + tr.getBoundingClientRect().height - ((k + 1) * H - margin));
    }
    const copies = [...document.querySelectorAll('tr[data-pg-spacer]')].filter((r) => r.textContent.includes('Paciente'));
    const offTop = Math.max(0, ...copies.map((c) => { const top = y(c); return Math.abs(top - (Math.floor(top / H) * H + margin)); }));
    return { rows: body.length, copies: copies.length, worst, offTop, margin };
  }, Math.round(A4_HEIGHT)); // la app redondea el alto de la hoja a px enteros
  check('72 la tabla de 1500 filas está entera, con márgenes, y ocupa muchas hojas', m.rows === ROWS && pages > 40 && m.margin > 50, `filas=${m.rows} páginas=${pages} margen=${m.margin}`);
  check('72 la cabecera se repite en cada hoja menos la primera', m.copies === pages - 1, `copias=${m.copies} páginas=${pages}`);
  check('72 cada cabecera repetida empieza justo donde empieza el contenido de su hoja', m.offTop < 1.5, `desvío máx. ${m.offTop.toFixed(2)} px`);
  check('72 ninguna fila queda cortada ni metida en los márgenes', m.worst < 1.5, `se sale ${m.worst.toFixed(2)} px`);
  check('72 sin errores de página', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
