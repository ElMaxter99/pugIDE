import { check, closeDialog, openApp, waitUntil } from '../lib.mjs';

// 0.8, oleada 1 (WCAG 2.1.1): renombrar, duplicar y borrar archivos solo con teclado.
const session = {
  projectName: 'Teclado',
  files: { '/main.pug': 'p hola\n', '/otra.pug': 'p otra\n', '/partials/card.pug': 'p card\n' },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};
const focusedPath = (page) => page.evaluate(() => document.activeElement?.dataset?.path ?? null);

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  const row = page.locator('.file-row[data-path="/otra.pug"]');
  await row.waitFor({ timeout: 25000 });

  // Mayús+F10 abre el menú y el foco entra en él
  await row.focus();
  await page.keyboard.press('Shift+F10');
  const menu = page.locator('app-sidebar [role="menu"]');
  await menu.waitFor({ timeout: 4000 });
  check('45 el menú del árbol tiene role=menu y opciones menuitem', (await menu.locator('[role="menuitem"]').count()) >= 3);
  check('45 el foco entra en la primera opción', await waitUntil(() => page.evaluate(() => document.activeElement?.getAttribute('role') === 'menuitem'), 3000) === true);
  const labels = async () => page.evaluate(() => document.activeElement?.textContent?.trim());
  const first = await labels();
  await page.keyboard.press('ArrowDown');
  const second = await labels();
  check('45 ↓ recorre las opciones del menú (sin mover el árbol)', !!first && !!second && first !== second && (await menu.count()) === 1, `${first} -> ${second}`);
  await page.keyboard.press('ArrowUp');
  check('45 ↑ vuelve a la anterior', (await labels()) === first, String(await labels()));
  await page.keyboard.press('End');
  await page.keyboard.press('Home');
  check('45 Inicio y Fin saltan a los extremos', (await labels()) === first);
  await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'detached', timeout: 4000 });
  check('45 Esc cierra el menú y devuelve el foco a la fila', !!(await waitUntil(async () => (await focusedPath(page)) === '/otra.pug', 3000)), String(await focusedPath(page)));

  // Elegir «Renombrar» con el teclado
  await page.keyboard.press('Shift+F10');
  await menu.waitFor({ timeout: 4000 });
  await page.locator('app-sidebar [role="menuitem"]', { hasText: /Renombrar|Cambiar nombre/ }).first().focus();
  await page.keyboard.press('Enter');
  const input = page.locator('app-dialog input');
  await input.waitFor({ timeout: 4000 });
  check('45 «Renombrar» desde el menú con teclado abre su diálogo', (await input.inputValue()).includes('otra'), await input.inputValue());
  await closeDialog(page, 'app-dialog [role="dialog"]');

  // F2 renombra y Supr borra
  await row.focus();
  await page.keyboard.press('F2');
  await input.waitFor({ timeout: 4000 });
  check('45 F2 renombra el archivo con el foco', (await input.inputValue()).includes('otra'), await input.inputValue());
  await closeDialog(page, 'app-dialog [role="dialog"]');
  await row.focus();
  await page.keyboard.press('Delete');
  const dialog = page.locator('app-dialog [role="dialog"]');
  await dialog.waitFor({ timeout: 4000 });
  check('45 Supr pide confirmar el borrado del archivo con el foco', /otra/.test(await dialog.innerText()), await dialog.innerText());
  await closeDialog(page, 'app-dialog [role="dialog"]');
  check('45 y no lo borra hasta confirmar', (await page.locator('.file-row[data-path="/otra.pug"]').count()) === 1);
  // En una carpeta, F2 y Supr no abren un diálogo que no haría nada
  await page.locator('.file-row[data-path="/partials"]').focus();
  await page.keyboard.press('Delete');
  await page.keyboard.press('F2');
  await page.waitForTimeout(300);
  const dlgTxt = await page.locator('app-dialog [role="dialog"]').allInnerTexts();
  check('45 F2 y Supr sobre una carpeta no abren diálogos', dlgTxt.length === 0, dlgTxt.join(' / '));
  check('45 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
