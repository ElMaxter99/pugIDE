import { check, openApp, previewText, waitUntil } from '../lib.mjs';

const model = (page, path) => page.evaluate((p) => window.monaco.editor.getModels().find((m) => m.uri.path === p)?.getValue() ?? null, path);
const activePath = (page) => page.evaluate(() => window.monaco.editor.getEditors()[0].getModel()?.uri.path);
const activeLine = (page) => page.evaluate(() => window.monaco.editor.getEditors()[0].getPosition()?.lineNumber);
const banner = (page) => page.locator('.compile-error');

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
  const created = await waitUntil(async () => /include \.\/mixins/.test((await model(app.page, '/main.pug')) ?? '') && (await app.page.locator('.compile-error').count()) === 0, 10000);
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
  const toggle = banner(page).getByRole('button', { name: /Todos los problemas \(2\)/ });
  check('22 el aviso ofrece ver todos los problemas', (await toggle.count()) === 1, await banner(page).textContent());
  await toggle.click();
  const list = page.locator('app-problems-list .diag-row');
  await waitUntil(async () => (await list.count()) === 2, 4000);
  check('22 la lista muestra los dos problemas', (await list.count()) === 2, (await list.allInnerTexts()).join(' | '));
  await page.locator('app-problems-list .diag-go', { hasText: 'translations.json' }).click();
  check('22 un problema de la lista abre su archivo', !!(await waitUntil(async () => (await activePath(page)) === '/locales/es/translations.json', 4000)), String(await activePath(page)));
  await page.locator('app-problems-list .diag-go', { hasText: 'main.pug' }).click();
  check('22 y otro lleva a la línea de main.pug', !!(await waitUntil(async () => (await activePath(page)) === '/main.pug' && (await activeLine(page)) === 4, 4000)), `${await activePath(page)}:${await activeLine(page)}`);
  const link = page.locator('.log-link', { hasText: 'main.pug:4' }).first();
  check('22 la terminal enlaza el error a main.pug:4', (await link.count()) >= 1);
  await page.locator('app-problems-list .diag-go', { hasText: 'translations.json' }).click();
  await link.click();
  check('22 el enlace de la terminal abre main.pug en esa línea', !!(await waitUntil(async () => (await activePath(page)) === '/main.pug' && (await activeLine(page)) === 4, 4000)), `${await activePath(page)}:${await activeLine(page)}`);
  check('22 sin errores no controlados (varios problemas)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
