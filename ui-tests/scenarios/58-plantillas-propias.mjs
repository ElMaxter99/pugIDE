import { readFileSync } from 'node:fs';
import { check, openApp, previewText, waitUntil } from '../lib.mjs';

// P-25: guardar el proyecto como plantilla propia, usarla, renombrarla, exportarla, importarla y borrarla.
const session = {
  projectName: 'Factura Norte',
  files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Factura de #{cliente}\n', '/styles/f.css': 'h1 { color: #333 }\n' },
  datasets: { version: 1, activeId: 'a', locale: 'es', datasets: [{ id: 'a', name: 'Cliente', data: { cliente: 'Norte Analytics' } }] },
  openTabPaths: ['/main.pug'], activeTabPath: '/main.pug',
};
const tree = (page) => page.evaluate(() => [...document.querySelectorAll('app-file-tree [data-path]')].map((e) => e.getAttribute('data-path')));

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await waitUntil(async () => /Factura de Norte Analytics/.test(await previewText(page)), 15000);

  await page.locator('[data-testid="menu-proyecto"]').click();
  await page.locator('[role="menuitem"]', { hasText: 'Guardar como plantilla' }).click();
  const save = page.locator('[data-testid="save-template"]');
  await save.waitFor({ timeout: 4000 });
  check('58 propone el nombre del proyecto', (await page.locator('[data-testid="save-template-name"]').inputValue()) === 'Factura Norte');
  check('58 dice qué se guarda y dónde', /en este navegador/.test(await page.locator('[data-testid="save-template-size"]').innerText()) && /2 archivos/.test(await page.locator('[data-testid="save-template-size"]').innerText()));
  await page.locator('[data-testid="save-template-name"]').fill('  ');
  check('58 sin nombre no deja guardar', await page.locator('[data-testid="save-template-go"]').isDisabled());
  await page.locator('[data-testid="save-template-name"]').fill('Factura base');
  await page.locator('[data-testid="save-template-go"]').click();
  await save.waitFor({ state: 'detached', timeout: 4000 });

  // Cambiar el proyecto abierto para comprobar que la plantilla no se ve afectada
  await page.locator('[data-testid="menu-proyecto"]').click();
  await page.locator('[role="menuitem"]', { hasText: 'Mis proyectos' }).click();
  const dlg = page.locator('[role="dialog"][aria-label="Mis proyectos"]');
  await dlg.waitFor({ timeout: 4000 });
  const list = page.locator('[data-testid="user-templates"]');
  check('58 «Mis plantillas» la lista con su tamaño', /Factura base/.test(await list.innerText()) && /2 archivo/.test(await list.innerText()), await list.innerText());
  await page.locator('[data-testid="template-use-Factura base"]').click();
  await dlg.waitFor({ state: 'detached', timeout: 6000 });
  check('58 «Usar» crea un proyecto nuevo con sus archivos', !!(await waitUntil(async () => (await tree(page)).includes('/styles/f.css'), 6000)), (await tree(page)).join());
  check('58 con sus datos de ejemplo', !!(await waitUntil(async () => /Factura de Norte Analytics/.test(await previewText(page)), 8000)), await previewText(page));
  const names = async () => { await page.locator('[data-testid="menu-proyecto"]').click(); const t = await page.locator('[role="menuitem"]', { hasText: 'Mis proyectos' }).innerText(); await page.keyboard.press('Escape'); return t; };
  check('58 el proyecto nuevo toma el nombre de la plantilla', /Factura base/.test(await names()), await names());

  // Renombrar, exportar, borrar e importar
  await page.locator('[data-testid="menu-proyecto"]').click();
  await page.locator('[role="menuitem"]', { hasText: 'Mis proyectos' }).click();
  await dlg.waitFor({ timeout: 4000 });
  check('58 el proyecto de origen sigue en la biblioteca', /Factura Norte/.test(await dlg.innerText()));
  const row = list.locator('li.row').first();
  await row.locator('button', { hasText: 'Renombrar' }).click();
  await row.locator('input').fill('Factura corporativa');
  await row.locator('input').press('Enter');
  check('58 renombrar la plantilla', !!(await waitUntil(async () => /Factura corporativa/.test(await list.innerText()), 4000)), await list.innerText());
  const download = page.waitForEvent('download');
  await list.locator('li.row').first().locator('button', { hasText: 'Exportar' }).click();
  const file = await download;
  check('58 exporta la plantilla como .zip', file.suggestedFilename() === 'Factura corporativa-plantilla.zip', file.suggestedFilename());
  const zipPath = await file.path();
  await list.locator('li.row').first().locator('button', { hasText: 'Borrar' }).click();
  await list.locator('li.row').first().locator('button', { hasText: 'Confirmar' }).click();
  check('58 borrar pide confirmación y la quita', !!(await waitUntil(async () => /Aún no tienes plantillas propias/.test(await list.innerText()), 4000)), await list.innerText());
  await dlg.locator('input[type="file"]').setInputFiles({ name: 'Factura corporativa-plantilla.zip', mimeType: 'application/zip', buffer: readFileSync(zipPath) });
  check('58 importar la devuelve con su nombre', !!(await waitUntil(async () => /Factura corporativa/.test(await list.innerText()), 6000)), await list.innerText());
  await dlg.locator('input[type="file"]').setInputFiles({ name: 'roto.zip', mimeType: 'application/zip', buffer: Buffer.from('no es un zip') });
  check('58 un .zip que no vale se rechaza con su motivo', !!(await waitUntil(async () => /no es un \.zip válido/.test(await dlg.innerText()), 4000)), await dlg.innerText());
  await page.reload();
  await page.waitForTimeout(2500);
  await page.locator('[data-testid="menu-proyecto"]').click();
  await page.locator('[role="menuitem"]', { hasText: 'Mis proyectos' }).click();
  check('58 las plantillas siguen ahí al recargar', !!(await waitUntil(async () => /Factura corporativa/.test(await page.locator('[data-testid="user-templates"]').innerText()), 6000)));
  check('58 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
