import { createRequire } from 'node:module';
import { check, openApp, previewFrame } from '../lib.mjs';

const require = createRequire(import.meta.url);

// Con estas alturas y filas, repetir la cabecera cambia el número de páginas respecto a no repetirla (medido con page.pdf()).
const pug = (page, rows, height) => `doctype html
html
  head
    style.
      ${page}
      body { margin: 0; font: 12pt/1.2 Arial, sans-serif }
      table { width: 100%; border-collapse: collapse }
      thead th { height: ${height}px; background: #cde; vertical-align: top; text-align: left }
      td { height: 80px; padding: 0 6px; border-bottom: 1px solid #999 }
  body
    table
      thead
        tr
          th Cabecera repetida
          th Importe
      tbody
        - for (let r = 0; r < ${rows}; r++)
          tr
            td Fila #{r}
            td #{r * 10}
`;

export const browsers = ['chromium'];
export const why = 'compara con page.pdf() de Playwright, que solo existe en Chromium';

// Las cabeceras de tabla (thead) se repiten al empezar cada página, igual que en la impresión real
export default async function (env) {
  const cases = [
    { label: 'sin márgenes', css: '@page { size: A4; margin: 0 }', rows: 38, height: 120, repeats: true },
    { label: 'con márgenes', css: '@page { size: A4; margin: 20mm 15mm }', rows: 34, height: 120, repeats: true },
    // Chromium no repite una cabecera que ocupa más de un cuarto de la hoja: el preview tampoco.
    { label: 'cabecera demasiado alta', css: '@page { size: A4; margin: 0 }', rows: 36, height: 300, repeats: false },
  ];
  for (const { label, css, rows, height, repeats } of cases) {
    const source = pug(css, rows, height);
    const raw = await env.browser.newContext();
    const realPage = await raw.newPage();
    await realPage.setContent(require('pug').render(source));
    const pdf = await realPage.pdf({ preferCSSPageSize: true, printBackground: true });
    await raw.close();
    const realPages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

    const app = await openApp(env, {
      path: '/ide',
      session: { projectName: 'Tabla', files: { '/main.pug': source }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
      prefs: { previewDevice: 'PDF' },
      viewport: { width: 1500, height: 900 },
      wait: 4500,
    });
    const { page } = app;
    const bar = (await page.locator('.pdf-bar').innerText()).replace(/\s+/g, ' ');
    const previewPages = Number(bar.match(/Página\s+de\s+(\d+)/)?.[1]);
    check(`23 (${label}) el preview tiene las mismas páginas que la impresión real`, previewPages === realPages && realPages > 2, `preview=${previewPages} real=${realPages}`);

    const frame = await previewFrame(page);
    const tops = await frame.evaluate(() => [...document.querySelectorAll('tr[data-pg-spacer]')]
      .filter((r) => r.textContent.includes('Cabecera repetida')).map((r) => Math.round(r.getBoundingClientRect().top + scrollY)));
    if (repeats) {
      check(`23 (${label}) la cabecera se copia en cada hoja menos la primera`, tops.length === realPages - 1, `copias=${tops.length} páginas=${realPages}`);
      check(`23 (${label}) las copias van en hojas distintas, de arriba abajo`, tops.every((y, i) => i === 0 || y - tops[i - 1] > 500), JSON.stringify(tops));
    } else {
      check(`23 (${label}) la cabecera no se copia`, tops.length === 0, JSON.stringify(tops));
    }
    check(`23 (${label}) sin errores no controlados`, app.errors.length === 0, app.errors.join(' | '));
    await app.close();
  }
}
