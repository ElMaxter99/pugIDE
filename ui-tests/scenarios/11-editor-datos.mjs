import { check, openApp, previewText, waitUntil, sleep } from '../lib.mjs';

const session = {
  projectName: 'Datos',
  files: { '/main.pug': "doctype html\nhtml\n  body\n    h1= title\n    p= user.name\n" },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
  datasets: { version: 1, activeId: 'ds-1', locale: 'es', datasets: [{ id: 'ds-1', name: 'Por defecto', data: { title: 'Hola', user: { name: 'Ana' } } }] },
};
const dsOptions = (page) => page.locator('app-dataset-bar select').first().locator('option').allInnerTexts();

// Editor de datos: árbol, modo JSON y barra de juegos de datos
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  const tree = page.locator('app-smart-data-editor .tree-view');
  await tree.waitFor({ timeout: 6000 });
  const text = await waitUntil(async () => (await previewText(page)).includes('Hola') && (await previewText(page)).includes('Ana'));
  check('11 el preview usa los datos del juego', !!text, await previewText(page));

  // Árbol: editar una hoja recompila
  const titleInput = tree.locator('.tree-row', { hasText: 'title' }).locator('input.string-input');
  await titleInput.fill('Adiós');
  await titleInput.dispatchEvent('change');
  check('11 editar una hoja del árbol actualiza el preview', !!(await waitUntil(async () => (await previewText(page)).includes('Adiós'))), await previewText(page));
  // Desplegar el objeto anidado
  await tree.locator('.tree-row.expandable', { hasText: 'user' }).click();
  check('11 desplegar un objeto muestra sus campos', !!(await waitUntil(async () => (await tree.locator('input.string-input').count()) >= 2)));

  // Modo JSON: Ctrl+Shift+J, editar y aplicar al salir
  await page.locator('.json-editor-area').waitFor({ state: 'attached' });
  await page.keyboard.press('Control+Shift+J');
  const area = page.locator('textarea.json-textarea');
  await area.waitFor({ state: 'visible' });
  const json = JSON.parse(await area.inputValue());
  check('11 el modo JSON muestra los datos actuales', json.title === 'Adiós' && json.user.name === 'Ana', await area.inputValue());
  await area.fill('{ "title": "Roto"');
  check('11 un JSON inválido muestra el error', !!(await waitUntil(async () => (await page.locator('.json-error-text').count()) === 1)));
  await area.fill(JSON.stringify({ title: 'Desde JSON', user: { name: 'Beto' } }));
  await page.keyboard.press('Control+Shift+J');
  check('11 al volver al árbol se aplican los cambios', !!(await waitUntil(async () => (await previewText(page)).includes('Desde JSON') && (await previewText(page)).includes('Beto'))), await previewText(page));

  // Barra de juegos de datos: crear uno vacío, volver al anterior
  await page.locator('[data-testid="data-more-menu"]').click();
  await page.getByRole('menuitem', { name: 'Nuevo juego vacío' }).click();
  const two = await waitUntil(async () => (await dsOptions(page)).length === 2);
  check('11 crear un juego de datos lo añade y lo activa', !!two, JSON.stringify(await dsOptions(page)));
  const emptied = await waitUntil(async () => !(await previewText(page)).includes('Desde JSON'));
  check('11 el juego vacío cambia el preview', !!emptied, await previewText(page));
  await page.locator('app-dataset-bar select').first().selectOption({ label: 'Por defecto' });
  check('11 volver al juego anterior recupera sus datos', !!(await waitUntil(async () => (await previewText(page)).includes('Desde JSON'))), await previewText(page));
  await sleep(100);
  check('11 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
