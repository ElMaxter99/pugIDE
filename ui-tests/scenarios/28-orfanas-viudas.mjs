import { createRequire } from 'node:module';
import { check, openApp, previewFrame } from '../lib.mjs';
import { pdfPageTexts } from '../pdf-text.mjs';

const require = createRequire(import.meta.url);

export const browsers = ['chromium'];
export const why = 'compara con page.pdf() de Playwright, que solo existe en Chromium';

const LINE = 24; // line-height fijo: las líneas miden lo mismo en cualquier tipografía
const SHEET_H = 600;

const css = (page, extra) => `
      ${page}
      body { margin: 0; font: 12pt/${LINE}px sans-serif }
      p { margin: 0; ${extra} }
      .u { break-before: page }
      .big { break-inside: avoid }`;

const pug = (page, extra, body) => `doctype html
html
  head
    style.${css(page, extra)}
  body
${body.map((l) => `    ${l}`).join('\n')}
`;

/** Una "unidad" por caso: `k` líneas de `n` caben en la hoja; el resto pasa a la siguiente (que arranca con un salto forzado). */
function sweep(prefix, lineCounts, contentH) {
  const out = [];
  for (const n of lineCounts) {
    for (let k = 0; k <= n; k++) {
      const lines = Array.from({ length: n }, (_, i) => `${prefix}${n}k${k}L${String(i + 1).padStart(2, '0')}`).join('<br>');
      out.push(`<div class="u"><div style="height:${contentH - k * LINE - 6}px"></div><p>${lines}</p></div>`);
    }
  }
  return out;
}

/** Texto (sin espacios) con que empieza cada hoja del PDF real. */
async function realStarts(env, source) {
  const ctx = await env.browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(require('pug').render(source));
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await ctx.close();
  return { pages: pdfPageTexts(pdf).map((t) => t.replace(/\s+/g, '')), count: (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length };
}

/** Texto (sin espacios) de cada hoja del preview: los renglones cuyo borde superior cae dentro de la hoja. */
async function previewPagesText(frame, pages) {
  return frame.evaluate(({ n, sheetH }) => {
    const out = Array.from({ length: n }, () => '');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.data.trim() || node.parentElement.closest('[data-pg-spacer]')) continue;
      range.selectNodeContents(node);
      const rect = [...range.getClientRects()].find((r) => r.height > 0);
      if (!rect) continue;
      const k = Math.floor((rect.top + scrollY + rect.height / 2) / sheetH);
      if (k >= 0 && k < n) out[k] += node.data.replace(/\s+/g, '');
    }
    return out;
  }, { n: pages, sheetH: SHEET_H });
}

async function compare(env, label, source) {
  const real = await realStarts(env, source);
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Orfanas', files: { '/main.pug': source }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
    prefs: { previewDevice: 'PDF' },
    viewport: { width: 1500, height: 900 },
    wait: 4500,
  });
  const { page } = app;
  const bar = (await page.locator('.pdf-bar').innerText()).replace(/\s+/g, ' ');
  const previewPages = Number(bar.match(/(\d+) página/)?.[1]);
  check(`28 (${label}) el preview tiene las mismas páginas que la impresión real`, previewPages === real.count && real.count > 3, `preview=${previewPages} real=${real.count}`);
  const frame = await previewFrame(page);
  const got = await previewPagesText(frame, real.count);
  const bad = real.pages.map((w, i) => (w === got[i] ? null : `${i + 1}: real=${w.slice(0, 40)} preview=${got[i].slice(0, 40)}`)).filter(Boolean);
  check(`28 (${label}) cada hoja lleva el mismo texto que la impresión real`, bad.length === 0, bad.slice(0, 6).join(' | '));
  check(`28 (${label}) sin errores no controlados`, app.errors.length === 0, app.errors.join(' | '));
  await app.close();
  return real;
}

// Huérfanas y viudas: el preview reparte los párrafos entre hojas como la impresión real, con y sin márgenes de @page
export default async function (env) {
  const PAGE0 = `@page { size: 800px ${SHEET_H}px; margin: 0 }`;
  const PAGE1 = `@page { size: 800px ${SHEET_H}px; margin: 40px 30px }`;
  const H1 = SHEET_H - 80;

  await compare(env, 'sin márgenes, orphans/widows por defecto', pug(PAGE0, '', sweep('A', [8], SHEET_H)));
  await compare(env, 'con márgenes, orphans/widows por defecto', pug(PAGE1, '', sweep('B', [8], H1)));
  await compare(env, 'sin márgenes, orphans 3 y widows 3', pug(PAGE0, 'orphans: 3; widows: 3', sweep('C', [9], SHEET_H)));
  await compare(env, 'con márgenes, orphans 4 y widows 2', pug(PAGE1, 'orphans: 4; widows: 2', sweep('D', [9], H1)));
  await compare(env, 'con márgenes, orphans 1 y widows 4', pug(PAGE1, 'orphans: 1; widows: 4', sweep('E', [9], H1)));
  await compare(env, 'con márgenes, orphans 1 y widows 1', pug(PAGE1, 'orphans: 1; widows: 1', sweep('F', [7], H1)));
  await compare(env, 'bloques de una, dos y tres líneas', pug(PAGE1, '', sweep('G', [1, 2, 3], H1)));
  await compare(env, 'bloques cortos con orphans 3 y widows 3', pug(PAGE0, 'orphans: 3; widows: 3', sweep('H', [2, 4, 5], SHEET_H)));

  // break-inside: avoid manda sobre orphans/widows: el párrafo baja entero
  const avoid = [];
  for (let k = 0; k <= 6; k++) {
    const lines = Array.from({ length: 6 }, (_, i) => `V6k${k}L${i + 1}`).join('<br>');
    avoid.push(`<div class="u"><div style="height:${H1 - k * LINE - 6}px"></div><p class="big">${lines}</p></div>`);
  }
  await compare(env, 'break-inside: avoid', pug(PAGE1, 'orphans: 1; widows: 1', avoid));

  // Texto corrido que se ajusta a su caja: muchos párrafos con distinto número de líneas
  const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
  const flow = [];
  const sizes = [5, 3, 8, 2, 6, 1, 9, 4];
  for (let i = 0; i < 28; i++) {
    const words = LOREM.split(' ');
    const take = Math.min(words.length, 8 + sizes[i % sizes.length] * 9);
    flow.push(`<p style="width:480px;margin-bottom:${10 + (i % 3) * 7}px">P${String(i).padStart(2, '0')} ${words.slice(0, take).join(' ')}</p>`);
  }
  await compare(env, 'texto corrido con márgenes', pug(PAGE1, '', flow));
  await compare(env, 'texto corrido sin márgenes y orphans/widows 3', pug(PAGE0, 'orphans: 3; widows: 3', flow));

  // string()/string-set/element(): Chromium no los imprime (la caja de margen sale vacía): el preview avisa y no los emula
  const STR = pug(`@page { size: 800px ${SHEET_H}px; margin: 60px 30px; @top-center { content: "CABFIJA " string(titulo) } @bottom-center { content: "PIE " counter(page) } }
      h1 { string-set: titulo content() }`, '', ['<h1>Informe Anual</h1>', '<p>Texto del informe.</p>']);
  const real = await realStarts(env, STR);
  check('28 Chromium no imprime la caja con string(): ni "CABFIJA" ni el título repetido', !real.pages.join('').includes('CABFIJA') && real.pages.join('').includes('PIE1') && (real.pages.join('').match(/InformeAnual/g) || []).length === 1, JSON.stringify(real.pages));
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Cabecera', files: { '/main.pug': STR }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
    prefs: { previewDevice: 'PDF' },
    viewport: { width: 1500, height: 900 },
    wait: 4500,
  });
  const warn = app.page.locator('.pdf-warn');
  check('28 el preview avisa de string()/string-set', (await warn.count()) === 1 && /string\(\)/.test((await warn.getAttribute('title')) ?? '') && /texto fijo o `counter\(page\)`/.test((await warn.getAttribute('title')) ?? ''), await warn.getAttribute('title').catch(() => 'sin aviso'));
  const boxes = await app.page.locator('.pg-box').allInnerTexts();
  check('28 el preview no dibuja la caja con string() (como Chromium) y sí el pie', boxes.length === 1 && boxes[0] === 'PIE 1', JSON.stringify(boxes));
  check('28 sin errores no controlados (string)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
