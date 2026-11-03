import { check, openApp, waitUntil } from '../lib.mjs';

const session = {
  projectName: 'Workspace',
  files: { '/main.pug': 'p hola\n', '/partials/card.pug': 'p card\n' },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};
const tabs = (page) => page.locator('.tab-name').allInnerTexts();
const rowNames = (page) => page.locator('app-file-tree .file-name').allInnerTexts();

// Workspace: crear, renombrar, borrar y deshacer archivos desde el árbol
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  const tree = page.locator('app-file-tree');
  await tree.waitFor();
  check('12 el árbol lista carpetas y archivos', (await rowNames(page)).includes('main.pug') && (await rowNames(page)).includes('partials'), JSON.stringify(await rowNames(page)));

  // Las carpetas empiezan desplegadas: plegar oculta sus archivos y desplegar los vuelve a mostrar
  const folder = tree.locator('.directory-row', { hasText: 'partials' });
  check('12 las carpetas empiezan desplegadas', (await rowNames(page)).includes('card.pug'), JSON.stringify(await rowNames(page)));
  await folder.click();
  check('12 plegar una carpeta oculta sus archivos', !!(await waitUntil(async () => !(await rowNames(page)).includes('card.pug'))), JSON.stringify(await rowNames(page)));
  await folder.click();
  check('12 desplegarla los muestra otra vez', !!(await waitUntil(async () => (await rowNames(page)).includes('card.pug'))), JSON.stringify(await rowNames(page)));
  await tree.locator('.file-item', { hasText: 'card.pug' }).click();
  check('12 abrir un archivo crea su pestaña', !!(await waitUntil(async () => (await tabs(page)).includes('card.pug'))), JSON.stringify(await tabs(page)));

  // Nuevo archivo
  await page.locator('button[title="Nuevo archivo"]').click();
  const input = page.locator('app-dialog input');
  await input.waitFor();
  check('12 el diálogo propone la carpeta del archivo activo', (await input.inputValue()).startsWith('/partials/'), await input.inputValue());
  await input.fill('/partials/footer.pug');
  await page.keyboard.press('Enter');
  check('12 crear un archivo lo abre', !!(await waitUntil(async () => (await tabs(page)).includes('footer.pug'))), JSON.stringify(await tabs(page)));

  // Renombrar desde el menú contextual
  await tree.locator('.file-item', { hasText: 'footer.pug' }).click({ button: 'right' });
  await page.locator('app-context-menu').getByText('Renombrar').click();
  await input.waitFor();
  await input.fill('/partials/pie.pug');
  await page.keyboard.press('Enter');
  check('12 renombrar actualiza el árbol y la pestaña', !!(await waitUntil(async () => (await rowNames(page)).includes('pie.pug') && (await tabs(page)).includes('pie.pug') && !(await tabs(page)).includes('footer.pug'))), `${await rowNames(page)} | ${await tabs(page)}`);

  // Borrar y deshacer desde la paleta
  await tree.locator('.file-item', { hasText: 'pie.pug' }).click({ button: 'right' });
  await page.locator('app-context-menu').getByText('Borrar').click();
  await page.locator('app-dialog').getByRole('button', { name: 'Borrar' }).click();
  check('12 borrar quita el archivo del árbol', !!(await waitUntil(async () => !(await rowNames(page)).includes('pie.pug'))), JSON.stringify(await rowNames(page)));
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type('Deshacer borrar');
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts()).some((t) => t.startsWith('Deshacer borrar')));
  await page.keyboard.press('Enter');
  check('12 deshacer recupera el archivo borrado', !!(await waitUntil(async () => (await rowNames(page)).includes('pie.pug'))), JSON.stringify(await rowNames(page)));
  check('12 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
