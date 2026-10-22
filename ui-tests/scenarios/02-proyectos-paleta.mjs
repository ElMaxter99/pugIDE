import { check, openApp, previewText, projectName, waitUntil } from '../lib.mjs';

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
  const invoiceOpen = await waitUntil(async () => (await projectName(page)) === 'Factura', 10000);
  check('02 crear desde plantilla abre el proyecto "Factura"', !!invoiceOpen, await projectName(page));
  await waitUntil(async () => (await previewText(page)).includes('F-2026-0042'), 8000);
  const invoice = await previewText(page);
  check('02 el preview muestra la factura con sus datos', /factura/i.test(invoice) && invoice.includes('F-2026-0042'), invoice.slice(0, 120));

  await trigger.click();
  await dialog.waitFor();
  const rows = await waitUntil(async () => (await page.locator('.row').count()) === 2);
  check('02 la biblioteca lista los dos proyectos', !!rows, String(await page.locator('.row').count()));
  await page.locator('.row:not(.current) button:has-text("Abrir")').click();
  const reopened = await waitUntil(async () => (await projectName(page)) === 'MiProyecto', 10000);
  check('02 abrir el otro proyecto lo carga', !!reopened, await projectName(page));

  // Paleta de comandos
  await page.keyboard.press('Control+k');
  const palette = page.locator('[aria-label="Paleta de comandos"]');
  await palette.waitFor();
  await page.keyboard.type('informe');
  // Con la lista aún sin filtrar también aparece "Nuevo proyecto: Informe": se espera a que quede solo ese resultado.
  const list = () => page.locator('.item .title').allInnerTexts();
  const filtered = await waitUntil(async () => (await list()).join('|') === 'Nuevo proyecto: Informe');
  check('02 la paleta filtra por texto', !!filtered, JSON.stringify((await list()).slice(0, 3)));
  await page.keyboard.press('Enter');
  const created = await waitUntil(async () => (await projectName(page)) === 'Informe', 10000);
  check('02 ejecutar el comando crea el proyecto "Informe" y cierra la paleta', !!created && (await palette.count()) === 0, await projectName(page));

  await page.reload();
  const kept = await waitUntil(async () => (await projectName(page).catch(() => '')) === 'Informe', 10000);
  check('02 el proyecto activo se conserva al recargar', !!kept, await projectName(page));
  check('02 sin peticiones externas ni errores', app.external.length === 0 && app.errors.length === 0, app.external.concat(app.errors).join(' | '));
  await app.close();
  await stress(env);
}

// El navegador puede entregar un mouseenter tardío sobre un elemento de la lista antigua cuando el filtro ya se aplicó.
// Con el puntero quieto sobre la lista, el único resultado debe quedar siempre resaltado (si no, Enter no hace nada).
// Es una carrera: se repite varias veces para que, de existir el fallo, salga.
export async function stress(env) {
  const app = await openApp(env, { path: '/ide' });
  const { page } = app;
  await page.mouse.move(700, 330); // sobre donde aparece la lista de la paleta
  let notHighlighted = 0;
  const rounds = 14;
  for (let i = 0; i < rounds; i++) {
    await page.keyboard.press('Control+k');
    await page.locator('[aria-label="Paleta de comandos"]').waitFor();
    await page.keyboard.type('informe');
    await waitUntil(async () => (await page.locator('.item').count()) === 1);
    if ((await page.locator('.item.active').count()) !== 1) notHighlighted++;
    await page.keyboard.press('Escape');
    await page.locator('[aria-label="Paleta de comandos"]').waitFor({ state: 'detached' });
  }
  check('02 con el puntero sobre la lista, el resultado filtrado siempre queda resaltado', notHighlighted === 0, `${notHighlighted} de ${rounds}`);
  await app.close();
}
