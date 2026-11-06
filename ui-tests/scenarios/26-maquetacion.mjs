import { check, openApp, waitUntil } from '../lib.mjs';

// Maquetación de tres piezas que se veían mal: el aviso de error (el texto se quedaba a ancho cero con tantos botones),
// la lista de resultados de la búsqueda (4 px de alto) y la tipografía de la portada (no usaba Geist)
export default async function (env) {
  // 1. Aviso de error con explicación y arreglo en el ancho normal del preview
  let app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Maquetación', files: { '/main.pug': 'html\n  body\n    +tarjeta("hola")\n', '/mixins.pug': 'mixin saludo(n)\n  p= n\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  let { page } = app;
  await page.locator('.compile-error').waitFor({ timeout: 10000 });
  const text = await page.locator('.compile-error-text').boundingBox();
  check('26 el texto del aviso de error se ve (no queda a ancho cero)', !!text && text.width >= 150 && text.height >= 14, JSON.stringify(text));
  const bar = await page.locator('.compile-error').boundingBox();
  const buttons = await page.locator('.compile-error .compile-error-btn').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }));
  check('26 los botones del aviso caben dentro de él', !!bar && buttons.every(([l, r]) => l >= bar.x - 1 && r <= bar.x + bar.width + 1), JSON.stringify({ bar, buttons }));
  await app.close();

  // 2. Resultados de la búsqueda en el proyecto
  app = await openApp(env, {
    path: '/ide',
    session: {
      projectName: 'Búsqueda',
      files: { '/main.pug': 'p hola\np hola otra vez\n', '/a.pug': 'p hola\n', '/b.pug': 'p hola\n' },
      openTabPaths: ['/main.pug'], activeTabPath: '/main.pug',
    },
  });
  page = app.page;
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+Shift+f');
  const input = page.locator('app-project-search input').first();
  await input.waitFor({ timeout: 4000 });
  await input.fill('hola');
  await waitUntil(async () => (await page.locator('.search-summary').innerText().catch(() => '')).includes('resultados'), 4000);
  const results = await page.locator('.search-results').boundingBox();
  check('26 la lista de resultados de la búsqueda se ve (más de 60 px)', !!results && results.height > 60, JSON.stringify(results));
  check('26 y muestra los resultados', (await page.locator('.search-results').innerText()).includes('main.pug'));
  await app.close();

  // 3. Tipografía de la portada: Geist (la variable que carga la app), no el sans-serif del sistema
  app = await openApp(env, { path: '/' });
  page = app.page;
  const fonts = await page.evaluate(() => [...document.querySelectorAll('h1, h2, p, a, button')].slice(0, 12).map((e) => getComputedStyle(e).fontFamily));
  check('26 la portada usa la fuente de la app (Geist Variable)', fonts.length > 0 && fonts.every((f) => f.includes('Geist Variable')), JSON.stringify([...new Set(fonts)]));
  await app.close();

  // 4. Lista de todos los problemas: el texto no se aplasta junto a los botones
  app = await openApp(env, {
    path: '/ide',
    session: {
      projectName: 'Problemas',
      files: { '/main.pug': 'html\n  body\n    +falta()\n', '/locales/es/translations.json': '{ "A": ' },
      openTabPaths: ['/main.pug'], activeTabPath: '/main.pug',
    },
  });
  page = app.page;
  await page.locator('.compile-error').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /Todos los problemas/ }).click();
  await page.locator('app-problems-list .diag-row').first().waitFor({ timeout: 4000 });
  const widths = await page.locator('app-problems-list .diag-text').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  check('26 en la lista de problemas el texto de cada uno ocupa un ancho legible (≥ 150 px)', widths.length === 2 && widths.every((w) => w >= 150), JSON.stringify(widths));
  await app.close();
}
