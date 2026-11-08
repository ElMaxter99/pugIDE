import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { check, openApp, openLogTab, openProblemsTab, previewFrame, sleep, waitUntil } from '../lib.mjs';

// Sass real bajo las cabeceras de PRODUCCIÓN (openApp las aplica): la CSP de la app no admite `unsafe-eval` y dart-sass crea
// con `new Function` unas funciones auxiliares; scripts/bundle-sass.mjs las reescribe. Antes de esto `@mixin`, `@use` y las
// funciones salían sin estilo y sin ningún aviso (la app caía en silencio al subconjunto `scss-lite`).
const PUG = (...links) => `doctype html\nhtml\n  head\n${links.map((l) => `    link(rel='stylesheet' href='${l}')`).join('\n')}\n  body\n    p.m hola\n    p.f funcion\n    p.e cada\n    p.i indentado\n    p.z ultima\n`;
const SCSS = [
  "@use 'sass:math';",
  '@mixin tinta($c) { color: $c; }',
  '@function doble($n) { @return $n * 2; }',
  '.m { @include tinta(#0000ff); }',
  '.f { width: doble(math.div(10, 2)) * 1px; }',
  '@each $k, $c in (e: #ff0000) { .#{$k} { color: $c; } }',
  '',
].join('\n');
const SASS = '.i\n  color: #00ff00\n  &:hover\n    color: #000000\n';
const session = (files) => ({ projectName: 'Sass', files, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' });
const color = (page, sel) => previewFrame(page).then((f) => f.evaluate((s) => getComputedStyle(document.querySelector(s)).color, sel));
const width = (page, sel) => previewFrame(page).then((f) => f.evaluate((s) => getComputedStyle(document.querySelector(s)).width, sel));

export default async function (env) {
  // --- Sass real: mixin, @use, función, matemáticas, @each, Sass indentado ---
  const app = await openApp(env, { path: '/ide', session: session({ '/main.pug': PUG('/s/a.scss', '/s/b.sass'), '/s/a.scss': SCSS, '/s/b.sass': SASS }) });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  check('40 @mixin/@include se aplica (azul)', !!(await waitUntil(async () => (await color(page, '.m')) === 'rgb(0, 0, 255)', 9000)), await color(page, '.m'));
  check('40 @function y math.div (10 / 2 × 2 = 10px)', (await width(page, '.f')) === '10px' || !!(await waitUntil(async () => (await width(page, '.f')) === '10px', 3000)), await width(page, '.f'));
  check('40 @each con interpolación (rojo)', (await color(page, '.e')) === 'rgb(255, 0, 0)', await color(page, '.e'));
  check('40 el Sass indentado (.sass) se aplica (verde)', (await color(page, '.i')) === 'rgb(0, 255, 0)', await color(page, '.i'));
  await openLogTab(page);
  check('40 sin el aviso del respaldo cuando Sass carga', !/No se pudo cargar Sass/.test(await page.locator('#panel-log').innerText()));

  // Un error de Sass sale como problema, con su archivo y su línea
  await page.locator('app-file-tree .file-item', { hasText: 'a.scss' }).click();
  await waitUntil(() => page.evaluate(() => !!window.monaco.editor.getModels().find((m) => m.uri.path === '/s/a.scss')), 6000);
  await page.evaluate(() => window.monaco.editor.getModels().find((m) => m.uri.path === '/s/a.scss').setValue('.m {\n  color: $noexiste;\n}\n'));
  await openProblemsTab(page);
  const row = page.locator('app-problems-panel .diag-row').first();
  check('40 una variable inexistente aparece en «Problemas»', !!(await waitUntil(async () => (await page.locator('app-problems-panel .diag-row').count()) >= 1, 8000)), '0 problemas');
  const text = (await row.innerText().catch(() => '')).replace(/\s+/g, ' ');
  check('40 con el archivo y la línea del error', /a\.scss/.test(text) && /:2\b/.test(text), text);
  check('40 sin violaciones de la CSP ni errores', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();

  // --- Si Sass no carga, la app lo dice y el respaldo funciona (también la última declaración sin «;») ---
  const dist = resolve('dist/pug-ide/browser');
  const sassChunk = readdirSync(dist).find((f) => /^chunk-.*\.js$/.test(f) && readFileSync(resolve(dist, f), 'utf8').includes('compileString'));
  check('40 el chunk de Sass existe en el build', !!sassChunk, 'no se encontró ningún chunk con compileString');
  const lite = await openApp(env, { path: '/ide', session: session({ '/main.pug': PUG('/s/a.scss'), '/s/a.scss': '$verde: #00ff00;\n.m { color: $verde; }\n.z{color:#ff0000}\n' }) });
  await lite.context.route(new RegExp(String(sassChunk).replace(/\./g, '\\.')), (r) => r.abort());
  await lite.page.reload();
  await lite.page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  check('40 sin Sass, el subconjunto aplica variables (verde)', !!(await waitUntil(async () => (await color(lite.page, '.m')) === 'rgb(0, 255, 0)', 9000)), await color(lite.page, '.m'));
  check('40 y entiende la última declaración sin «;» (rojo)', (await color(lite.page, '.z')) === 'rgb(255, 0, 0)', await color(lite.page, '.z'));
  await openLogTab(lite.page);
  await waitUntil(async () => /No se pudo cargar Sass/.test(await lite.page.locator('#panel-log').innerText()), 6000);
  const log = (await lite.page.locator('#panel-log').innerText()).replace(/\s+/g, ' ');
  check('40 avisa en el Registro de que se usa un subconjunto de SCSS', /No se pudo cargar Sass: se usa un subconjunto de SCSS/.test(log), log.slice(0, 300));
  check('40 y lo avisa una sola vez', (log.match(/No se pudo cargar Sass/g) ?? []).length === 1, log.slice(0, 300));
  await sleep(100);
  await lite.close();
}
