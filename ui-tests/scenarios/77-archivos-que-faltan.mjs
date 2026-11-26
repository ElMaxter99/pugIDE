import { check, openApp, waitUntil } from '../lib.mjs';

// «Archivos que faltan» plegable y con scroll propio (P-50): con muchos archivos que faltan (un CSS con 84 fuentes y 2 imágenes) la
// caja no se come el árbol de archivos. Plegada por defecto si son más de 6, scroll propio al desplegar, nombre del archivo siempre entero.
const FONTS = [];
for (const fam of ['dosis', 'frutiger-black', 'frutiger-bold', 'frutiger-light']) {
  for (const w of ['Bold', 'Light', 'Medium', 'Regular', 'Thin', 'Black', 'Heavy']) {
    for (const ext of ['eot', 'woff', 'woff2', 'ttf']) if (FONTS.length < 84) FONTS.push(`fonts/${fam}/${fam}-${w}.${ext}`);
  }
}
const css = (fonts, imgs = ['images/logo-aurora.svg', 'images/firma.png']) => [
  ...fonts.map((f, i) => `      @font-face { font-family: 'F${i}'; src: url(${f}); }`),
  ...imgs.map((u, i) => `      .im${i} { background: url(${u}); }`),
].join('\n');
const MAIN = (fonts, imgs) => ['doctype html', 'html', '  head', '    style.', css(fonts, imgs), '  body', '    h1 Informe'].join('\n') + '\n';
const session = (main) => ({ projectName: 'Informe Aurora', files: { '/main.pug': main, '/partials/cabecera.pug': 'p cabecera\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' });
const setMain = (page, text) => page.evaluate((t) => { window.monaco.editor.getModels().find((m) => m.uri.path === '/main.pug').setValue(t); }, text);
const expanded = (page) => page.locator('[data-testid="missing-toggle"]').getAttribute('aria-expanded');
// El clic y las teclas devuelven antes de que Angular repinte: se espera al estado, no se lee de golpe.
const becomes = (page, value) => waitUntil(async () => (await expanded(page).catch(() => null)) === value, 4000).then(Boolean);
const treeVisible = (page) => page.evaluate(() => {
  const row = document.querySelector('app-file-tree [role="treeitem"]');
  if (!row) return false;
  const r = row.getBoundingClientRect();
  return r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
});

export default async function (env) {
  // 1 · Muchos archivos que faltan: plegada, con resumen, y el árbol a la vista.
  let app = await openApp(env, { path: '/ide', session: session(MAIN(FONTS)) });
  let page = app.page;
  const toggle = page.locator('[data-testid="missing-toggle"]');
  await toggle.waitFor({ timeout: 15000 });
  check('77 el título cuenta los archivos que faltan', /Faltan 86 archivo/.test(await page.locator('[data-testid="missing-title"]').innerText()), await page.locator('[data-testid="missing-title"]').innerText());
  check('77 el resumen dice 84 fuentes y 2 imágenes', (await page.locator('[data-testid="missing-summary"]').innerText()).trim() === '84 fuentes · 2 imágenes');
  check('77 con más de 6 arranca plegada (aria-expanded=false, sin lista)', (await expanded(page)) === 'false' && (await page.locator('[data-testid="missing-list"]').count()) === 0);
  check('77 plegada, la caja es baja y el árbol de archivos se ve', (await page.locator('[data-testid="missing-assets"]').evaluate((e) => e.getBoundingClientRect().height)) < 90 && !!(await treeVisible(page)));
  check('77 la cabecera es un botón con aria-controls', (await toggle.evaluate((e) => e.tagName)) === 'BUTTON' && (await toggle.getAttribute('aria-controls')) === 'missing-list');

  // 2 · Desplegada: altura máxima, scroll propio y el árbol sigue a la vista.
  await toggle.click();
  const list = page.locator('[data-testid="missing-list"]');
  await list.waitFor({ timeout: 4000 });
  check('77 al pulsar se despliega (aria-expanded=true)', await becomes(page, 'true'));
  const m = await list.evaluate((e) => ({ h: e.clientHeight, sh: e.scrollHeight }));
  check('77 la lista no pasa de unas 7 filas y tiene scroll propio', m.h <= 172 && m.sh > m.h + 100, JSON.stringify(m));
  await list.evaluate((e) => { e.scrollTop = 400; });
  check('77 la lista se desplaza dentro de su caja', (await list.evaluate((e) => e.scrollTop)) > 100);
  check('77 desplegada, el árbol de archivos sigue a la vista', !!(await treeVisible(page)));
  check('77 la lista tiene nombre accesible', (await list.getAttribute('aria-label')) === 'Archivos que faltan');

  // 3 · El nombre con su extensión nunca se corta; la carpeta sí se acorta.
  await list.evaluate((e) => { e.scrollTop = 0; });
  const names = await page.locator('.missing-row').evaluateAll((rows) => rows.map((r) => {
    const f = r.querySelector('.missing-file');
    const d = r.querySelector('.missing-dir');
    const fr = f.getBoundingClientRect().width; return { file: f.textContent.trim(), fileClipped: f.scrollWidth - fr > 1.5, sw: f.scrollWidth, w: Math.round(fr * 10) / 10, dirClipped: d.scrollWidth > d.clientWidth, title: r.title };
  }));
  check('77 ningún nombre de archivo sale cortado', names.length === 86 && names.every((n) => !n.fileClipped), JSON.stringify(names.filter((n) => n.fileClipped).slice(0, 2)));
  check('77 el nombre lleva su extensión (.eot, .woff, .woff2, .ttf)', names.slice(0, 12).every((n) => /\.(eot|woff2?|ttf)$/.test(n.file)));
  check('77 la ruta completa sigue en el título de la fila', names.every((n) => n.title.startsWith('Subir /')));
  check('77 la carpeta larga se acorta (frutiger-black/…)', names.some((n) => n.dirClipped));

  // 4 · Teclado: Intro y Espacio pliegan y despliegan.
  await toggle.focus();
  await page.keyboard.press('Enter');
  check('77 Intro pliega', await becomes(page, 'false'));
  await page.keyboard.press('Space');
  check('77 Espacio despliega', await becomes(page, 'true'));

  // 5 · La elección se recuerda mientras la lista no crezca; si crece (otro CSS), vuelve a la regla por defecto.
  await setMain(page, MAIN(FONTS.slice(0, 80)));
  await waitUntil(async () => /Faltan 82 archivo/.test(await page.locator('[data-testid="missing-title"]').innerText().catch(() => '')), 15000);
  check('77 si faltan menos archivos, la elección se mantiene (sigue desplegada)', await becomes(page, 'true'));
  await setMain(page, MAIN([...FONTS.slice(0, 80), 'fonts/nueva/Nueva-Bold.woff', 'fonts/nueva/Nueva-Light.woff']));
  await waitUntil(async () => /Faltan 84 archivo/.test(await page.locator('[data-testid="missing-title"]').innerText().catch(() => '')), 15000);
  check('77 si la lista crece, vuelve a la regla por defecto (plegada)', await becomes(page, 'false'));
  check('77 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // 6 · Pocos archivos (3): desplegada y sin scroll, como antes, pero se puede plegar.
  app = await openApp(env, { path: '/ide', session: session(MAIN(['fonts/Lato-Bold.ttf'], ['images/logo-aurora.svg', 'images/firma.png'])) });
  page = app.page;
  await page.locator('[data-testid="missing-toggle"]').waitFor({ timeout: 15000 });
  check('77 con 3 archivos arranca desplegada', (await expanded(page)) === 'true' && (await page.locator('.missing-row').count()) === 3);
  check('77 con 3 archivos no hay scroll en la lista', await page.locator('[data-testid="missing-list"]').evaluate((e) => e.scrollHeight <= e.clientHeight + 1));
  check('77 el resumen de 1 fuente y 2 imágenes', (await page.locator('[data-testid="missing-summary"]').innerText()).trim() === '1 fuente · 2 imágenes');
  await page.locator('[data-testid="missing-toggle"]').click();
  check('77 con pocos archivos también se puede plegar', (await becomes(page, 'false')) && (await page.locator('[data-testid="missing-list"]').count()) === 0);
  check('77 sin errores no controlados (pocos archivos)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
