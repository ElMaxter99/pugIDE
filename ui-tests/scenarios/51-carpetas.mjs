import { check, closeDialog, openApp, openLogTab, waitUntil } from '../lib.mjs';

// P-18: renombrar y borrar carpetas con todo su contenido, con confirmación y «Deshacer» de una vez.
const many = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`/grande/f${i}.pug`, `p ${i}\n`]));
const FILES = { '/main.pug': 'p inicio\n', '/partials/card.pug': 'p card\n', '/partials/ui/boton.pug': 'button b\n', '/partials/ui/aviso.pug': 'p aviso\n', ...many };
const session = { projectName: 'Carpetas', files: FILES, openTabPaths: ['/main.pug', '/partials/card.pug'], activeTabPath: '/main.pug' };
const paths = (page) => page.evaluate(() => [...document.querySelectorAll('app-file-tree [data-path]')].map((e) => e.getAttribute('data-path')));
const row = (page, p) => page.locator(`.file-row[data-path="${p}"]`);
const menuItem = (page, name) => page.locator('app-sidebar [role="menuitem"]', { hasText: name });

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await row(page, '/partials').waitFor({ timeout: 25000 });
  const dlg = page.locator('app-dialog [role="dialog"]');

  // Menú de la carpeta
  await row(page, '/partials').click({ button: 'right' });
  const labels = await page.locator('app-sidebar [role="menuitem"] .context-label').allInnerTexts();
  check('51 el menú de una carpeta ofrece «Nuevo archivo», «Renombrar» y «Borrar carpeta»', ['Nuevo archivo', 'Renombrar', 'Borrar carpeta'].every((l) => labels.includes(l)), JSON.stringify(labels));
  await page.keyboard.press('Escape');

  // Borrar una carpeta pequeña: un clic, y dice qué se borra
  await row(page, '/partials').click({ button: 'right' });
  await menuItem(page, 'Borrar carpeta').click();
  await dlg.waitFor({ timeout: 4000 });
  const t = await dlg.innerText();
  check('51 el diálogo dice qué se borra (3 archivos)', /\/partials/.test(t) && /3 archivos/.test(t), t);
  check('51 y lista las rutas', /\/partials\/card\.pug/.test(t) && /\/partials\/ui\/boton\.pug/.test(t));
  check('51 una carpeta pequeña no pide escribir el nombre', (await dlg.locator('input').count()) === 0);
  await dlg.getByRole('button', { name: 'Borrar carpeta' }).click();
  check('51 la carpeta y su contenido desaparecen del árbol', !!(await waitUntil(async () => !(await paths(page)).some((p) => p.startsWith('/partials')), 4000)), (await paths(page)).join(','));
  check('51 y se cierra la pestaña de lo borrado', (await page.locator('.tab-name', { hasText: 'card.pug' }).count()) === 0);
  await openLogTab(page);
  const undo = page.locator('[data-testid="log-undo"]');
  check('51 el Registro lo cuenta y ofrece «Deshacer»', !!(await waitUntil(async () => (await undo.count()) === 1, 4000)) && /Carpeta \/partials borrada \(3 archivos\)/.test(await page.locator('#panel-log').innerText()));
  await undo.click();
  check('51 «Deshacer» recupera toda la carpeta de una vez', !!(await waitUntil(async () => { const p = await paths(page); return p.includes('/partials/card.pug') && p.includes('/partials/ui/boton.pug') && p.includes('/partials/ui/aviso.pug'); }, 4000)), (await paths(page)).join(','));

  // Renombrar
  await row(page, '/partials').click({ button: 'right' });
  await menuItem(page, 'Renombrar').click();
  await dlg.waitFor({ timeout: 4000 });
  check('51 «Renombrar carpeta» dice cuánto se mueve y avisa de las referencias', /3 archivos/.test(await dlg.innerText()) && /PugIDE avisa de los que se rompan/.test(await dlg.innerText()));
  await dlg.locator('input').fill('/partials/dentro');
  await dlg.getByRole('button', { name: 'Renombrar' }).click();
  check('51 no deja mover una carpeta dentro de sí misma', !!(await waitUntil(async () => (await paths(page)).includes('/partials/card.pug'), 2000)) && !(await paths(page)).some((p) => p.startsWith('/partials/dentro')));
  await row(page, '/partials').click({ button: 'right' });
  await menuItem(page, 'Renombrar').click();
  await dlg.waitFor({ timeout: 4000 });
  await dlg.locator('input').fill('/componentes');
  await dlg.getByRole('button', { name: 'Renombrar' }).click();
  check('51 renombrar mueve todo el contenido', !!(await waitUntil(async () => { const p = await paths(page); return p.includes('/componentes/card.pug') && p.includes('/componentes/ui/boton.pug') && !p.some((x) => x.startsWith('/partials')); }, 4000)), (await paths(page)).join(','));

  // F2 y Supr
  await row(page, '/componentes').focus();
  await page.keyboard.press('F2');
  await dlg.waitFor({ timeout: 4000 });
  check('51 F2 en una carpeta abre «Renombrar carpeta»', /Renombrar carpeta/.test(await dlg.innerText()));
  await closeDialog(page, 'app-dialog [role="dialog"]');

  // Carpeta grande: hay que escribir el nombre
  await row(page, '/grande').click({ button: 'right' });
  await menuItem(page, 'Borrar carpeta').click();
  await dlg.waitFor({ timeout: 4000 });
  const confirmBtn = dlg.getByRole('button', { name: 'Borrar carpeta' });
  check('51 una carpeta de más de 10 archivos pide escribir su nombre', (await dlg.locator('input').count()) === 1 && /12 archivos/.test(await dlg.innerText()) && (await confirmBtn.isDisabled()));
  check('51 y lista solo los primeros con «…y N más»', /…y 7 más/.test(await dlg.innerText()), await dlg.innerText());
  await dlg.locator('input').fill('otra');
  check('51 con otro nombre sigue sin dejar', await confirmBtn.isDisabled());
  await dlg.locator('input').fill('grande');
  check('51 con el nombre exacto se activa', !(await confirmBtn.isDisabled()));
  await confirmBtn.click();
  check('51 se borra la carpeta grande', !!(await waitUntil(async () => !(await paths(page)).some((p) => p.startsWith('/grande')), 4000)));
  check('51 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
