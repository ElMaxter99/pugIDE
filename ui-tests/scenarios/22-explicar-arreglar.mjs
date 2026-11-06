import { check, openApp, previewText, waitUntil, CMD, openLogTab, openProblemsTab } from '../lib.mjs';

const model = (page, path) => page.evaluate((p) => window.monaco.editor.getModels().find((m) => m.uri.path === p)?.getValue() ?? null, path);
const activePath = (page) => page.evaluate(() => window.monaco.editor.getEditors()[0].getModel()?.uri.path);
const activeLine = (page) => page.evaluate(() => window.monaco.editor.getEditors()[0].getPosition()?.lineNumber);
// Primera fila del panel «Problemas» (el aviso con la explicación y el arreglo)
const banner = (page) => page.locator('app-problems-panel .diag-row').first();

async function open(env, files, tabs = ['/main.pug']) {
  return openApp(env, { path: '/ide', session: { projectName: 'Arreglos', files, openTabPaths: tabs, activeTabPath: '/main.pug' } });
}

// Los errores se explican y los más habituales se arreglan con un clic (mixin ausente, include que falta, errata)
export default async function (env) {
  // 1. Mixin que no existe: crear el mixin (y el include) desde el aviso
  let app = await open(env, { '/main.pug': 'html\n  body\n    +tarjeta("hola")\n', '/mixins.pug': 'mixin saludo(n)\n  p= n\n' });
  await banner(app.page).waitFor({ timeout: 10000 });
  let text = await banner(app.page).textContent();
  check('22 el aviso explica que el mixin no existe y lista los que hay', /ningún archivo define `mixin tarjeta/.test(text) && text.includes('+saludo'), text);
  const create = banner(app.page).getByRole('button', { name: 'Crear mixin tarjeta en mixins.pug' });
  check('22 hay un arreglo «Crear mixin»', (await create.count()) === 1, text);
  await create.click();
  const created = await waitUntil(async () => /include \.\/mixins/.test((await model(app.page, '/main.pug')) ?? '') && (await app.page.locator('app-problems-panel .diag-row').count()) === 0, 10000);
  check('22 tras el arreglo main.pug incluye mixins y ya no hay error', !!created, String(await model(app.page, '/main.pug')));
  check('22 el editor salta a la definición nueva', !!(await waitUntil(async () => (await activePath(app.page)) === '/mixins.pug', 5000)), String(await activePath(app.page)));
  check('22 el mixin queda definido en mixins.pug, en la línea a la que salta', /mixin tarjeta\(\)/.test((await model(app.page, '/mixins.pug')) ?? '') && (await activeLine(app.page)) === 4, `${await activeLine(app.page)}: ${await model(app.page, '/mixins.pug')}`);
  check('22 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // 2. Mixin definido en un archivo que no se incluye: añadir el include
  app = await open(env, { '/main.pug': 'html\n  body\n    +boton()\n', '/partials/ui.pug': 'mixin boton()\n  button Pulsar\n' });
  await banner(app.page).waitFor({ timeout: 10000 });
  text = await banner(app.page).textContent();
  check('22 el aviso indica el include que falta', text.includes('include ./partials/ui'), text);
  await banner(app.page).getByRole('button', { name: 'Añadir include ./partials/ui en main.pug' }).click();
  check('22 con el include añadido el botón se pinta en el preview', !!(await waitUntil(async () => (await previewText(app.page)).includes('Pulsar'), 8000)), await previewText(app.page));
  check('22 el include queda al principio de main.pug', (await model(app.page, '/main.pug')).startsWith('include ./partials/ui\n'), String(await model(app.page, '/main.pug')));
  await app.close();

  // 3. Errata: «¿Quisiste decir…?» y cambio en la línea
  app = await open(env, { '/main.pug': 'include ./mixins\nhtml\n  body\n    +saluda("Ana")\n', '/mixins.pug': 'mixin saludo(n)\n  p Hola #{n}\n' });
  await banner(app.page).waitFor({ timeout: 10000 });
  check('22 el aviso sugiere el nombre parecido', /¿Quisiste decir \+saludo\?/.test(await banner(app.page).textContent()));
  await banner(app.page).getByRole('button', { name: 'Cambiar +saluda por +saludo' }).click();
  check('22 la errata se corrige y el preview muestra el saludo', !!(await waitUntil(async () => (await previewText(app.page)).includes('Hola Ana'), 8000)), await previewText(app.page));
  await app.close();

  // 4. Varios problemas: lista completa, enlace a la línea y terminal con enlace
  app = await open(env, {
    '/main.pug': 'html\n  body\n    h1= t("A")\n    +falta()\n',
    '/locales/es/translations.json': '{ "A": ',
  }, ['/main.pug', '/locales/es/translations.json']);
  const { page } = app;
  await banner(page).waitFor({ timeout: 10000 });
  check('22 la pestaña «Problemas» cuenta los dos problemas', (await page.locator('[data-testid="tab-problems-count"]').textContent()).trim() === '2');
  const list = page.locator('app-problems-panel .diag-row');
  await waitUntil(async () => (await list.count()) === 2, 4000);
  check('22 la lista muestra los dos problemas', (await list.count()) === 2, (await list.allInnerTexts()).join(' | '));
  await page.locator('app-problems-panel .diag-go', { hasText: 'translations.json' }).click();
  check('22 un problema de la lista abre su archivo', !!(await waitUntil(async () => (await activePath(page)) === '/locales/es/translations.json', 4000)), String(await activePath(page)));
  await page.locator('app-problems-panel .diag-go', { hasText: 'main.pug' }).click();
  check('22 y otro lleva a la línea de main.pug', !!(await waitUntil(async () => (await activePath(page)) === '/main.pug' && (await activeLine(page)) === 4, 4000)), `${await activePath(page)}:${await activeLine(page)}`);
  // El Registro conserva los errores como detalle («Todo») con su enlace a la línea
  await openLogTab(page);
  await page.locator('[data-testid="log-filter-all"]').click();
  const link = page.locator('.log-link', { hasText: 'main.pug:4' }).first();
  await waitUntil(async () => (await link.count()) >= 1, 4000);
  check('22 el Registro (Todo) enlaza el error a main.pug:4', (await link.count()) >= 1);
  await openProblemsTab(page);
  await page.locator('app-problems-panel .diag-go', { hasText: 'translations.json' }).click();
  await waitUntil(async () => (await activePath(page)) === '/locales/es/translations.json', 4000);
  await openLogTab(page);
  await link.click();
  check('22 el enlace del Registro abre main.pug en esa línea', !!(await waitUntil(async () => (await activePath(page)) === '/main.pug' && (await activeLine(page)) === 4, 4000)), `${await activePath(page)}:${await activeLine(page)}`);
  check('22 sin errores no controlados (varios problemas)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // 5. Arreglo rápido de Monaco (Ctrl+.) sobre la línea con el error
  app = await open(env, { '/main.pug': 'include ./mixins\nhtml\n  body\n    +saluda("Ana")\n', '/mixins.pug': 'mixin saludo(n)\n  p Hola #{n}\n' });
  await banner(app.page).waitFor({ timeout: 10000 });
  await app.page.evaluate(() => { const e = window.monaco.editor.getEditors()[0]; e.setPosition({ lineNumber: 4, column: 7 }); e.focus(); });
  await app.page.keyboard.press(CMD + '+.');
  const action = app.page.locator('.action-widget .action', { hasText: 'Cambiar +saluda por +saludo' });
  await action.first().waitFor({ timeout: 5000 }).catch(() => {});
  check('22 Ctrl+. ofrece el arreglo rápido en la línea del error', (await action.count()) >= 1, await app.page.locator('.action-widget').allInnerTexts().then((x) => x.join('|')).catch(() => 'sin widget'));
  await app.page.keyboard.press('Enter');
  check('22 aplicar el arreglo rápido corrige la errata', !!(await waitUntil(async () => (await previewText(app.page)).includes('Hola Ana'), 8000)), await previewText(app.page));
  await app.close();
}
