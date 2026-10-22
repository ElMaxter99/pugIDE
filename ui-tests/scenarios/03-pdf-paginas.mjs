import { createRequire } from 'node:module';
import { check, openApp, sleep } from '../lib.mjs';

const require = createRequire(import.meta.url);

const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';
const PUG = `doctype html
html
  head
    style.
      @page { size: A4; margin: 25mm 15mm;
        @top-center { content: "Informe trimestral"; font-size: 10pt }
        @bottom-right { content: "Página " counter(page) " de " counter(pages); font-size: 10pt }
      }
      @page :first { @top-center { content: none } }
      body { margin: 0; font: 12pt/1.5 Georgia, serif }
      h2 { margin: 24px 0 8px }
      table { width: 100%; border-collapse: collapse }
      td { padding: 6px; border-bottom: 1px solid #ccc }
      .big { break-inside: avoid; height: 200px; background: #ddd }
  body
    h1 Titulo
    - for (let i = 0; i < 6; i++)
      h2 Seccion #{i}
      p ${LOREM} ${LOREM}
      p ${LOREM}
    table
      - for (let r = 0; r < 40; r++)
        tr
          td Fila #{r}
          td ${LOREM.slice(0, 60)}
    .big Bloque indivisible
    p Fin ${LOREM}
`;

// Preview PDF con @page (márgenes, cabecera y pie con contador): mismo número de páginas que la impresión real
export default async function (env) {
  // Impresión real de Chromium
  const html = require('pug').render(PUG);
  const raw = await env.browser.newContext();
  const realPage = await raw.newPage();
  await realPage.setContent(html);
  const pdf = await realPage.pdf({ preferCSSPageSize: true, printBackground: true });
  await raw.close();
  const realPages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Informe', files: { '/main.pug': PUG }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
    prefs: { previewDevice: 'PDF' },
    viewport: { width: 1500, height: 900 },
    wait: 4500,
  });
  const { page } = app;
  const bar = (await page.locator('.pdf-bar').innerText()).replace(/\s+/g, ' ');
  const previewPages = Number(bar.match(/(\d+) página/)?.[1]);
  check('03 el preview PDF tiene las mismas páginas que la impresión real', previewPages === realPages && realPages > 1, `preview=${previewPages} real=${realPages}`);

  const boxes = await page.locator('.pg-box').allInnerTexts();
  check('03 el pie numera las páginas con counter(page) y counter(pages)', boxes.includes(`Página 2 de ${realPages}`) && boxes.includes(`Página ${realPages} de ${realPages}`), JSON.stringify(boxes));
  check('03 @page :first oculta la cabecera solo en la primera página', boxes[0] === `Página 1 de ${realPages}` && boxes.filter((b) => b === 'Informe trimestral').length === realPages - 1, JSON.stringify(boxes));

  // El texto con que empieza cada página coincide con el de la impresión real
  const frame = page.frames().find((f) => f !== page.mainFrame() && f.url().startsWith('blob:'));
  const starts = await frame.evaluate((n) => {
    const mm = 96 / 25.4;
    const out = [];
    for (let k = 0; k < n; k++) {
      const el = document.elementFromPoint(120, k * 1123 + 25 * mm + 3);
      out.push(el ? (el.tagName === 'TD' ? el.parentElement.innerText : el.innerText).trim().slice(0, 12) : '');
    }
    return out;
  }, realPages);
  check('03 las páginas empiezan donde las de la impresión real (portada, sección, fila 15, bloque)', starts[0].startsWith('Titulo') && starts.some((s) => s.startsWith('Seccion 5')) && starts.some((s) => s.startsWith('Fila 15')) && starts[realPages - 1].startsWith('Bloque'), JSON.stringify(starts));
  check('03 sin peticiones externas ni errores', app.external.length === 0 && app.errors.length === 0, app.external.concat(app.errors).join(' | '));
  await app.close();
}
