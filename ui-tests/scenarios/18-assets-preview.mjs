import { check, openApp, previewFrame, previewText, waitUntil } from '../lib.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const svg = (fill) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="${fill}"/></svg>`);
const fontDir = 'node_modules/@fontsource-variable/geist/files';
const fontFile = readdirSync(fontDir).find((f) => f.endsWith('.woff2'));

const MAIN = (extra = '') => [
  'doctype html', 'html', '  head', '    style.',
  "      @font-face { font-family: 'Prueba'; src: url(fonts/fuente.woff2) format('woff2'); }",
  "      .f { font-family: 'Prueba', sans-serif; } .bg { width: 40px; height: 30px; background: url(images/uno.svg); }",
  '  body', '    h1 Con assets', "    img#uno(src='images/uno.svg' alt='')", '    .bg', '    p.f Texto con fuente', extra,
].join('\n') + '\n';

const setMain = (page, text) => page.evaluate((t) => {
  window.monaco.editor.getModels().find((m) => m.uri.path === '/main.pug').setValue(t);
}, text);
const stats = async (page) => (await previewFrame(page))?.evaluate(() => ({ ...window.__pugideStats, marker: window.__marker })).catch(() => null);
const imgOk = async (page, id) => (await previewFrame(page))?.evaluate((i) => {
  const el = document.getElementById(i);
  return !!el && el.complete && el.naturalWidth === 40;
}, id).catch(() => false);

// Los assets llegan al iframe del preview una sola vez: cambiar solo el código no los reenvía ni recarga el iframe
export default async function (env) {
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Assets', files: { '/main.pug': MAIN() }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  const { page } = app;
  await page.locator('input[type="file"][multiple]').setInputFiles([
    { name: 'uno.svg', mimeType: 'image/svg+xml', buffer: svg('red') },
    { name: 'fuente.woff2', mimeType: 'font/woff2', buffer: readFileSync(join(fontDir, fontFile)) },
  ]);
  await page.locator('app-file-tree .file-item', { hasText: 'uno.svg' }).waitFor({ timeout: 8000 });
  await waitUntil(async () => await imgOk(page, 'uno'), 10000);
  check('18 la imagen de los assets se ve en el preview', !!(await imgOk(page, 'uno')));
  const html = await (await previewFrame(page)).evaluate(() => document.documentElement.outerHTML);
  check('18 el documento usa URL blob: propias del iframe, no data URI', html.includes('blob:') && !html.includes('data:image/svg'), html.slice(0, 300));
  const fontOk = await waitUntil(async () => (await previewFrame(page)).evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some((f) => f.family.includes('Prueba') && f.status === 'loaded');
  }), 8000);
  check('18 la fuente de @font-face (blob:) se carga', !!fontOk);

  // Solo código: el iframe se conserva (la marca de la ventana sigue) y los assets no se reenvían
  await (await previewFrame(page)).evaluate(() => { window.__marker = 'viva'; });
  const before = await stats(page);
  await setMain(page, MAIN('    p.nuevo Cambio solo de código'));
  await waitUntil(async () => (await previewText(page)).includes('Cambio solo de código'), 8000);
  const after = await stats(page);
  check('18 el cambio de código se ve en el preview', (await previewText(page)).includes('Cambio solo de código'));
  check('18 el iframe no se recarga al cambiar el código', after?.marker === 'viva' && after.docs === before.docs + 1, JSON.stringify([before, after]));
  check('18 cambiar solo el código no reenvía los assets', after?.assetMessages === before.assetMessages, JSON.stringify([before, after]));
  check('18 la imagen sigue visible tras el cambio de código', !!(await imgOk(page, 'uno')));

  // Un asset nuevo se envía (una vez) y se ve
  await page.locator('input[type="file"][multiple]').setInputFiles({ name: 'dos.svg', mimeType: 'image/svg+xml', buffer: svg('blue') });
  await page.locator('app-file-tree .file-item', { hasText: 'dos.svg' }).waitFor({ timeout: 8000 });
  await setMain(page, MAIN("    img#dos(src='images/dos.svg' alt='')"));
  await waitUntil(async () => await imgOk(page, 'dos'), 10000);
  const withNew = await stats(page);
  check('18 el asset nuevo se ve en el preview', !!(await imgOk(page, 'dos')));
  check('18 los assets nuevos se envían una sola vez', withNew?.assetMessages === after.assetMessages + 1, JSON.stringify([after, withNew]));
  check('18 y el iframe sigue siendo el mismo', withNew?.marker === 'viva');
  // El export HTML sigue siendo autocontenido: los assets van como data URI, sin blob:
  const download = page.waitForEvent('download', { timeout: 20000 });
  await page.getByText('Exportar HTML').first().click();
  const exported = readFileSync(await (await download).path(), 'utf8');
  check('18 el HTML exportado lleva los assets como data URI y ningún blob:', exported.includes('data:image/svg+xml;base64,') && !exported.includes('blob:'), exported.slice(0, 200));
  check('18 el preview no hizo peticiones externas', app.external.length === 0, app.external.join(' '));
  check('18 sin errores de página', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
