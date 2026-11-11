import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { check, openApp, previewText, waitUntil } from '../lib.mjs';

// P-24: navegador de páginas del modo PDF, «Exportar todas las plantillas» y enlaces entre plantillas.
const rows = Array.from({ length: 140 }, (_, i) => `    p Línea ${i + 1} del informe`).join('\n');
const FILES = {
  '/portada.pug': `doctype html\nhtml\n  body\n    include partials/cabecera\n    h1 Portada del informe\n    a#ir(href="factura.pug") Ver la factura\n${rows}\n`,
  '/factura.pug': 'doctype html\nhtml\n  body\n    h1 Factura 2026-014\n    a(href="portada.pug") Volver\n',
  '/rota.pug': 'doctype html\nhtml\n  body\n    p= sin.definir.nada(\n',
  '/partials/cabecera.pug': 'header Norte Analytics\n',
};
const session = { projectName: 'Varias', files: FILES, openTabPaths: ['/portada.pug'], activeTabPath: '/portada.pug' };

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await waitUntil(async () => /Portada del informe/.test(await previewText(page)), 15000);

  // --- A: navegador de páginas ---
  await page.locator('button[title="PDF / página impresa"]').click();
  const count = page.locator('[data-testid="pdf-count"]');
  await waitUntil(async () => Number(await count.innerText()) >= 3, 10000);
  const total = Number(await count.innerText());
  check('57 el documento tiene varias páginas', total >= 3, String(total));
  const pageNo = () => page.locator('[data-testid="pdf-page"]').inputValue();
  check('57 empieza en la página 1 y «anterior» está apagado', (await pageNo()) === '1' && (await page.locator('[data-testid="pdf-prev"]').isDisabled()));
  await page.locator('[data-testid="pdf-next"]').click();
  check('57 «siguiente» pasa a la página 2', !!(await waitUntil(async () => (await pageNo()) === '2', 3000)), await pageNo());
  const input = page.locator('[data-testid="pdf-page"]');
  await input.fill(String(total));
  await input.press('Enter');
  check('57 «ir a la página» lleva a la última', !!(await waitUntil(async () => (await pageNo()) === String(total), 3000)), await pageNo());
  check('57 en la última, «siguiente» está apagado', await page.locator('[data-testid="pdf-next"]').isDisabled());
  await input.fill('999');
  await input.press('Enter');
  check('57 un número fuera de rango se queda en la última', (await pageNo()) === String(total), await pageNo());
  await page.locator('[data-testid="pdf-pages-btn"]').click();
  const tiles = page.locator('[data-testid="pdf-pages"] .page-tile');
  await tiles.first().waitFor({ timeout: 4000 });
  check('57 «Páginas» enseña una ficha por página', (await tiles.count()) === total, String(await tiles.count()));
  await tiles.nth(0).click();
  check('57 una ficha lleva a su página', !!(await waitUntil(async () => (await pageNo()) === '1', 3000)), await pageNo());
  check('57 y queda marcada como actual', (await tiles.nth(0).getAttribute('aria-current')) === 'page');
  await page.locator('.preview-canvas').focus();
  await page.keyboard.press('PageDown');
  check('57 Av Pág pasa de hoja', !!(await waitUntil(async () => (await pageNo()) === '2', 3000)), await pageNo());
  await page.locator('button[title="Escritorio"]').click();

  // --- B: enlaces entre plantillas ---
  const frame = await waitUntil(async () => page.frames().find((f) => f !== page.mainFrame() && f.url() !== 'about:blank'), 5000);
  let clicked = false;
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    try { if (await f.locator('#ir').count()) { await f.locator('#ir').click(); clicked = true; break; } } catch { /* otro marco */ }
  }
  check('57 el enlace existe en la vista previa', clicked && !!frame);
  check('57 pulsar un enlace a otra plantilla la previsualiza', !!(await waitUntil(async () => /Factura 2026-014/.test(await previewText(page)), 8000)), await previewText(page));
  check('57 y queda marcada en el árbol', (await page.locator('app-file-tree [data-testid="preview-mark"].pinned').count()) === 1);

  // --- B: exportar todas ---
  await page.locator('[data-testid="menu-exportar"]').click();
  await page.locator('[role="menuitem"]', { hasText: 'Todas las plantillas' }).click();
  const dlg = page.locator('[data-testid="export-all"]');
  await dlg.waitFor({ timeout: 4000 });
  const text = await dlg.innerText();
  check('57 lista las páginas con su .html', /portada\.pug/.test(text) && /→ portada\.html/.test(text) && /→ factura\.html/.test(text), text);
  check('57 los parciales se enseñan pero no se exportan', /partials\/cabecera\.pug/.test(text) && /parcial, no se exporta/.test(text) && (await dlg.locator('input[type="checkbox"]').count()) === 3);
  const download = page.waitForEvent('download');
  await page.locator('[data-testid="export-all-go"]').click();
  const file = await download;
  check('57 descarga <proyecto>-html.zip', file.suggestedFilename() === 'Varias-html.zip', file.suggestedFilename());
  const zip = unzipSync(new Uint8Array(readFileSync(await file.path())));
  const names = Object.keys(zip).sort();
  check('57 el zip lleva un .html por página que compila', names.join() === 'factura.html,portada.html', names.join());
  const portada = strFromU8(zip['portada.html']);
  check('57 cada .html está compilado con sus parciales', /Portada del informe/.test(portada) && /Norte Analytics/.test(portada));
  check('57 los enlaces entre plantillas pasan a .html', /href="factura\.html"/.test(portada) && /href="portada\.html"/.test(strFromU8(zip['factura.html'])));
  check('57 sin restos del editor', !/data-pugide/.test(portada) && !/pugide-inspector/.test(portada));
  check('57 la plantilla que no compila se dice y el diálogo sigue abierto', /rota\.pug/.test(await dlg.innerText()) && /No se exportó/.test(await dlg.innerText()), await dlg.innerText());
  check('57 exportar no cambió la vista previa', /Factura 2026-014/.test(await previewText(page)));
  await page.keyboard.press('Escape');
  await app.close();
}
