import { check, openApp, previewText, waitUntil, sleep, openLogTab, stable } from '../lib.mjs';

const session = {
  projectName: 'Datos',
  files: { '/main.pug': "doctype html\nhtml\n  body\n    h1= title\n    p= user.name\n" },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
  datasets: { version: 1, activeId: 'ds-1', locale: 'es', datasets: [{ id: 'ds-1', name: 'Por defecto', data: { title: 'Hola', user: { name: 'Ana' } } }] },
};

// Barra de datos (P-05, ordenada en P-38): 10 controles en 3 filas, menú «⋯» con role=menu y teclado, y cada acción del menú funciona
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  try { await app.context.grantPermissions(['clipboard-read', 'clipboard-write']); } catch { /* Firefox y WebKit no admiten estos permisos */ }
  // Los datos viven en la pestaña «Datos» del panel lateral (P-08)
  await page.locator('[data-testid="tab-datos"]').click();
  const panel = page.locator('app-smart-data-editor');
  await panel.locator('.tree-view').waitFor({ timeout: 6000 });
  await waitUntil(async () => (await previewText(page)).includes('Hola'));

  // --- Qué se ve de entrada (P-38): juego de datos arriba, filtro y modo debajo, y una tira con el resumen ---
  const bars = panel.locator('app-dataset-bar .dataset-bar, .data-tools, .data-strip');
  // Una sola lectura dentro del navegador (preguntar `isVisible()` y leer luego el atributo del mismo botón se puede cruzar con
  // un repintado) y sobre el estado asentado de la barra.
  const names = await stable(() => panel.evaluate((root) => [...root.querySelectorAll('app-dataset-bar select, app-dataset-bar button, .data-tools input, .data-tools button, .data-strip button')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })
    .map((e) => (e.getAttribute('aria-label') || e.innerText || e.getAttribute('title') || '').trim())));
  const wantedControls = ['Juego de datos activo', 'Regenerar datos de ejemplo', 'Más acciones de datos', 'Filtrar datos', 'Árbol', 'JSON', 'Deshacer', 'Rehacer', 'Contraer todo', 'Expandir todo'];
  check('32 la cabecera tiene sus 10 controles, cada uno con nombre', names.length === 10 && wantedControls.every((w) => names.includes(w)), JSON.stringify(names));
  check('32 la cabecera ocupa 3 filas', (await bars.count()) === 3);
  const tops = await bars.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  check('32 las filas están una bajo otra, sin envolver', tops[1] > tops[0] && tops[2] > tops[1], JSON.stringify(tops));
  check('32 el juego de datos se lee entero (no se corta «Por defecto»)', await panel.locator('app-dataset-bar select').evaluate((s) => s.scrollWidth <= s.clientWidth + 1 && s.getBoundingClientRect().width >= 140));
  check('32 «Árbol» y «JSON» son texto visible y el modo activo está marcado', (await panel.locator('[data-testid="data-mode-tree"]').getAttribute('aria-pressed')) === 'true' && (await panel.locator('[data-testid="data-mode-json"]').innerText()).trim() === 'JSON');
  check('32 el dado de «Regenerar» dice lo que hace', (await panel.locator('[data-testid="data-regenerate"]').getAttribute('title')).startsWith('Regenerar datos de ejemplo'));
  const small = await panel.locator('app-dataset-bar button, app-dataset-bar select, .data-tools button, .data-strip button').evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 24 || r.height < 24); }).length);
  check('32 todos los controles miden al menos 24 px', small === 0, String(small));
  check('32 la tabla tiene columnas CLAVE y VALOR', (await panel.locator('.tree-head').innerText()).toUpperCase().replace(/\s+/g, ' ').includes('CLAVE VALOR'));
  check('32 la tira resume cuántas claves hay', /^\d+ claves?/.test(await panel.locator('[data-testid="data-summary"]').innerText()), await panel.locator('[data-testid="data-summary"]').innerText());

  // --- Segmentado ---
  await panel.locator('[data-testid="data-mode-json"]').click();
  await panel.locator('textarea.json-textarea').waitFor({ state: 'visible' });
  check('32 «JSON» abre el editor JSON', (await panel.locator('[data-testid="data-mode-json"]').getAttribute('aria-pressed')) === 'true');
  await panel.locator('[data-testid="data-mode-tree"]').click();
  await panel.locator('.tree-view').waitFor({ state: 'visible' });
  check('32 «Árbol» vuelve al árbol', (await panel.locator('[data-testid="data-mode-tree"]').getAttribute('aria-pressed')) === 'true');

  // --- Menú «⋯» y teclado ---
  const trigger = page.locator('[data-testid="data-more-menu"]');
  check('32 el botón «⋯» tiene nombre accesible y anuncia el menú', (await trigger.getAttribute('aria-label')) === 'Más acciones de datos' && (await trigger.getAttribute('aria-haspopup')) === 'menu');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.locator('[role="menu"]');
  await menu.waitFor();
  check('32 Intro abre el menú (role=menu) y expone aria-expanded', (await trigger.getAttribute('aria-expanded')) === 'true');
  const labels = (await menu.locator('[role^="menuitem"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  const wanted = ['Nuevo juego vacío', 'Nuevo juego lleno', 'Nuevo juego de error', 'Nuevo juego como copia personalizada', 'Renombrar…', 'Duplicar', 'Borrar…', 'Idioma: es', 'Idioma: en', 'Importar JSON, Schema u OpenAPI…', 'Copiar JSON', 'Dejar objeto vacío…'];
  check('32 el menú tiene todas las acciones de los controles antiguos', wanted.every((w) => labels.some((l) => l.includes(w))), JSON.stringify(labels));
  check('32 «Borrar…» está desactivado con un solo juego', await menu.getByRole('menuitem', { name: 'Borrar…' }).isDisabled());
  await page.keyboard.press('ArrowDown');
  check('32 ↓ mueve el foco a una fila del menú', await page.evaluate(() => !!document.activeElement?.closest('[role="menu"]')));
  await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'detached' });
  check('32 Esc cierra el menú y devuelve el foco al botón', await trigger.evaluate((el) => el === document.activeElement));

  const open = async () => { await trigger.click(); await menu.waitFor(); };
  const pick = async (name) => { await open(); await menu.getByRole('menuitem', { name }).click(); };
  const dsOptions = () => panel.locator('app-dataset-bar select option').allInnerTexts();

  // --- Juego: nuevo, renombrar, duplicar, borrar ---
  await pick('Nuevo juego vacío');
  check('32 «Nuevo juego vacío» crea y activa un juego', !!(await waitUntil(async () => (await dsOptions()).length === 2)), JSON.stringify(await dsOptions()));
  page.once('dialog', (d) => d.accept('Mi juego'));
  await pick('Renombrar…');
  check('32 «Renombrar…» cambia el nombre del juego activo', !!(await waitUntil(async () => (await dsOptions()).includes('Mi juego'))), JSON.stringify(await dsOptions()));
  await pick('Duplicar');
  check('32 «Duplicar» añade una copia', !!(await waitUntil(async () => (await dsOptions()).length === 3)), JSON.stringify(await dsOptions()));
  page.once('dialog', (d) => d.accept());
  await pick('Borrar…');
  check('32 «Borrar…» elimina el juego activo (tras confirmar)', !!(await waitUntil(async () => (await dsOptions()).length === 2)), JSON.stringify(await dsOptions()));
  await pick('Nuevo juego lleno');
  await pick('Nuevo juego de error');
  await pick('Nuevo juego como copia personalizada');
  check('32 lleno, error y copia personalizada también crean juegos', !!(await waitUntil(async () => (await dsOptions()).length === 5)), JSON.stringify(await dsOptions()));

  // --- Idioma de los datos de ejemplo ---
  await page.locator('app-dataset-bar select').selectOption({ label: 'Por defecto' });
  await open();
  check('32 el idioma activo lleva marca (aria-checked)', (await menu.getByRole('menuitemradio', { name: /Idioma: es/ }).getAttribute('aria-checked')) === 'true');
  await menu.getByRole('menuitemradio', { name: /Idioma: en/ }).click();
  await open();
  check('32 «Idioma: en» pasa a ser el activo', (await menu.getByRole('menuitemradio', { name: /Idioma: en/ }).getAttribute('aria-checked')) === 'true' && (await menu.getByRole('menuitemradio', { name: /Idioma: es/ }).getAttribute('aria-checked')) === 'false');
  await page.keyboard.press('Escape');

  // --- Importar ---
  await open();
  const chooser = page.waitForEvent('filechooser');
  await menu.getByRole('menuitem', { name: /Importar JSON/ }).click();
  await (await chooser).setFiles({ name: 'cliente.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ title: 'Importado', user: { name: 'Carla' } })) });
  check('32 «Importar…» añade el JSON como juego nuevo', !!(await waitUntil(async () => (await previewText(page)).includes('Importado') && (await previewText(page)).includes('Carla'))), await previewText(page));

  // --- Copiar JSON ---
  await pick('Copiar JSON');
  await openLogTab(page);
  const log = page.locator('app-terminal-panel');
  const copied = await waitUntil(async () => /JSON copiado al portapapeles|No se pudo copiar al portapapeles/.test(await log.innerText()));
  check('32 «Copiar JSON» se ejecuta y lo anota en el Registro', !!copied, await log.innerText());

  // --- Dejar objeto vacío y deshacer ---
  await pick('Dejar objeto vacío…');
  check('32 «Dejar objeto vacío…» vacía los datos', !!(await waitUntil(async () => !(await previewText(page)).includes('Carla'))), await previewText(page));
  await panel.getByRole('button', { name: 'Deshacer' }).click();
  check('32 y Deshacer los recupera', !!(await waitUntil(async () => (await previewText(page)).includes('Carla'))), await previewText(page));
  await sleep(100);
  check('32 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
