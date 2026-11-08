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
// El preview se pinta de forma asíncrona: hasta que el elemento existe en el marco la lectura da `null` (no lanza).
const style = async (page, sel, prop) => {
  try {
    const f = await previewFrame(page);
    return await f.evaluate(([s, p]) => { const el = document.querySelector(s); return el ? getComputedStyle(el)[p] : null; }, [sel, prop]);
  } catch { return null; }
};
const color = (page, sel) => style(page, sel, 'color');
const width = (page, sel) => style(page, sel, 'width');
/** Espera a que `prop` de `sel` valga `want`; devuelve true o falso (con el último valor leído en `seen.v`). */
const expectStyle = async (page, sel, prop, want, seen, timeout = 9000) => !!(await waitUntil(async () => (seen.v = await style(page, sel, prop)) === want, timeout));

export default async function (env) {
  // --- Sass real: mixin, @use, función, matemáticas, @each, Sass indentado ---
  const app = await openApp(env, { path: '/ide', session: session({ '/main.pug': PUG('/s/a.scss', '/s/b.sass'), '/s/a.scss': SCSS, '/s/b.sass': SASS }) });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 25000 });
  const seen = { v: null };
  check('40 @mixin/@include se aplica (azul)', await expectStyle(page, '.m', 'color', 'rgb(0, 0, 255)', seen), String(seen.v));
  check('40 @function y math.div (10 / 2 × 2 = 10px)', await expectStyle(page, '.f', 'width', '10px', seen), String(seen.v));
  check('40 @each con interpolación (rojo)', await expectStyle(page, '.e', 'color', 'rgb(255, 0, 0)', seen), String(seen.v));
  check('40 el Sass indentado (.sass) se aplica (verde)', await expectStyle(page, '.i', 'color', 'rgb(0, 255, 0)', seen), String(seen.v));
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
  await lite.page.locator('.monaco-editor').first().waitFor({ timeout: 25000 });
  const seenLite = { v: null };
  check('40 sin Sass, el subconjunto aplica variables (verde)', await expectStyle(lite.page, '.m', 'color', 'rgb(0, 255, 0)', seenLite), String(seenLite.v));
  check('40 y entiende la última declaración sin «;» (rojo)', await expectStyle(lite.page, '.z', 'color', 'rgb(255, 0, 0)', seenLite), String(seenLite.v));
  await openLogTab(lite.page);
  await waitUntil(async () => /No se pudo cargar Sass/.test(await lite.page.locator('#panel-log').innerText()), 6000);
  const log = (await lite.page.locator('#panel-log').innerText()).replace(/\s+/g, ' ');
  check('40 avisa en el Registro de que se usa un subconjunto de SCSS', /No se pudo cargar Sass: se usa un subconjunto de SCSS/.test(log), log.slice(0, 300));
  check('40 y lo avisa una sola vez', (log.match(/No se pudo cargar Sass/g) ?? []).length === 1, log.slice(0, 300));
  await sleep(100);
  await lite.close();
}
