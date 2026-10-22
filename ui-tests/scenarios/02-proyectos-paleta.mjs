import { check, openApp, previewText, projectName, sleep, waitUntil } from '../lib.mjs';

// Biblioteca de proyectos, plantillas y paleta de comandos
export default async function (env) {
  const app = await openApp(env, { path: '/ide' });
  const { page } = app;
  const trigger = page.locator('button[title^="Abrir, crear"]');
  const dialog = page.locator('[aria-label="Mis proyectos"]');

  check('02 arranca con el proyecto vacío', (await projectName(page)) === 'MiProyecto');
  await trigger.click();
  await dialog.waitFor();
  await page.selectOption('.template-select', 'invoice');
  await page.click('text=Nuevo proyecto');
  await sleep(1500);
  check('02 crear desde plantilla abre el proyecto "Factura"', (await projectName(page)) === 'Factura');
  const invoice = await previewText(page);
  check('02 el preview muestra la factura con sus datos', /factura/i.test(invoice) && invoice.includes('F-2026-0042'), invoice.slice(0, 120));

  await trigger.click();
  await dialog.waitFor();
  const rows = await waitUntil(async () => (await page.locator('.row').count()) === 2);
  check('02 la biblioteca lista los dos proyectos', !!rows, String(await page.locator('.row').count()));
  await page.locator('.row:not(.current) button:has-text("Abrir")').click();
  await sleep(1500);
  check('02 abrir el otro proyecto lo carga', (await projectName(page)) === 'MiProyecto');

  // Paleta de comandos
  await page.keyboard.press('Control+k');
  const palette = page.locator('[aria-label="Paleta de comandos"]');
  await palette.waitFor();
  await page.keyboard.type('informe');
  check('02 la paleta filtra por texto', (await page.locator('.item .title').allInnerTexts()).includes('Nuevo proyecto: Informe'));
  await page.keyboard.press('Enter');
  await sleep(1500);
  check('02 ejecutar el comando crea el proyecto "Informe" y cierra la paleta', (await projectName(page)) === 'Informe' && (await palette.count()) === 0);

  await page.reload();
  await sleep(3000);
  check('02 el proyecto activo se conserva al recargar', (await projectName(page)) === 'Informe');
  check('02 sin peticiones externas ni errores', app.external.length === 0 && app.errors.length === 0, app.external.concat(app.errors).join(' | '));
  await app.close();
}
