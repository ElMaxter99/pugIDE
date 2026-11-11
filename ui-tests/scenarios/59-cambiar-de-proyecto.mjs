import { check, openApp, previewText, waitUntil } from '../lib.mjs';

// Regresión grave: al crear un proyecto o cambiar a otro que tiene un archivo con el mismo nombre que el abierto
// (main.pug → main.pug), el editor se quedaba en blanco y el archivo del proyecto que se abría quedaba pisado con el
// contenido del proyecto anterior.
const session = { projectName: 'Origen', files: { '/main.pug': 'p texto del proyecto de origen\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };
const model = (page) => page.evaluate(() => window.monaco?.editor.getModels().find((m) => m.uri.path === '/main.pug')?.getValue() ?? null);
const saved = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('pug-ide-project')).files['/main.pug']; } catch { return null; } });
const dlg = (page) => page.locator('[role="dialog"][aria-label="Mis proyectos"]');
async function openProjects(page) {
  await page.locator('[data-testid="menu-proyecto"]').click();
  await page.locator('[role="menuitem"]', { hasText: 'Mis proyectos' }).click();
  await dlg(page).waitFor({ timeout: 5000 });
}

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  check('59 el editor enseña el proyecto de origen', !!(await waitUntil(async () => /proyecto de origen/.test((await model(page)) ?? ''), 8000)));

  // Proyecto nuevo: su main.pug es otro
  await openProjects(page);
  await dlg(page).locator('.footer button', { hasText: 'Nuevo proyecto' }).click();
  await dlg(page).waitFor({ state: 'detached', timeout: 6000 });
  check('59 tras «Nuevo proyecto» el editor enseña el main.pug nuevo', !!(await waitUntil(async () => /Hola, #\{nombre\}/.test((await model(page)) ?? ''), 8000)), String(await model(page)));
  check('59 y el editor sigue en pantalla (no en blanco)', (await page.locator('.monaco-editor .view-lines').count()) > 0);
  check('59 la vista previa es la del proyecto nuevo', !!(await waitUntil(async () => /Hola, Mundo/.test(await previewText(page)), 8000)), await previewText(page));
  await page.waitForTimeout(1500); // margen para el guardado automático
  check('59 lo guardado del proyecto nuevo es su propio contenido, no el del anterior', /Hola, #\{nombre\}/.test((await saved(page)) ?? '') && !/proyecto de origen/.test((await saved(page)) ?? ''), String(await saved(page)));

  // Escribir en el nuevo y volver al de origen: cada uno conserva lo suyo
  await page.evaluate(() => { const m = window.monaco.editor.getModels().find((x) => x.uri.path === '/main.pug'); m.setValue(m.getValue() + '\n//- marca del proyecto nuevo\n'); });
  await page.waitForTimeout(1200);
  await openProjects(page);
  await dlg(page).locator('li.row', { hasText: 'Origen' }).first().locator('button', { hasText: 'Abrir' }).click();
  await dlg(page).waitFor({ state: 'detached', timeout: 6000 });
  check('59 al volver al proyecto de origen se ve su contenido intacto', !!(await waitUntil(async () => (await model(page)) === 'p texto del proyecto de origen\n', 8000)), String(await model(page)));
  await page.waitForTimeout(1500);
  check('59 y lo guardado del de origen no se ha pisado', (await saved(page)) === 'p texto del proyecto de origen\n', String(await saved(page)));

  // Y de vuelta al nuevo: conserva su marca
  await openProjects(page);
  const other = dlg(page).locator('li.row').filter({ hasNotText: 'Origen' }).first();
  await other.locator('button', { hasText: 'Abrir' }).click();
  await dlg(page).waitFor({ state: 'detached', timeout: 6000 });
  check('59 el proyecto nuevo conserva lo que se escribió en él', !!(await waitUntil(async () => /marca del proyecto nuevo/.test((await model(page)) ?? '') && !/proyecto de origen/.test((await model(page)) ?? ''), 8000)), String(await model(page)));

  // Tras recargar, sigue bien
  await page.reload();
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  check('59 tras recargar, el proyecto abierto sigue con su contenido', !!(await waitUntil(async () => /marca del proyecto nuevo/.test((await model(page)) ?? ''), 8000)), String(await model(page)));
  check('59 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
