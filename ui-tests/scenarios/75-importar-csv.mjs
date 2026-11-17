import { check, openApp, openLogTab, previewText, waitUntil } from '../lib.mjs';

// «Importar CSV» (P-44): una fila = un juego de datos. Web y escritorio.
const session = {
  projectName: 'Clínica Aurora',
  files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Factura #{numero}\n    p= paciente.nombre\n' },
  openTabPaths: ['/main.pug'], activeTabPath: '/main.pug',
  datasets: { version: 1, activeId: 'ds-1', locale: 'es', datasets: [{ id: 'ds-1', name: 'Por defecto', data: { numero: 'FA-0', paciente: { nombre: 'Marta Gil Peña' } } }] },
};
const aurora = '﻿numero;paciente.nombre;paciente.nif;total;pagada\r\nFA-2026-0312;Lucía Romero Vidal;48211905K;85,50;sí\r\nFA-2026-0313;Andrés Vidal Soto;33907412B;120;no\r\nFA-2026-0314;"Marta Gil, Peña";71562308T;60,25;sí\r\nFA-2026-0315;Taller Hermanos Vidal;B41238856;412;no\r\n';
const grande = `n;nota\n${Array.from({ length: 812 }, (_, i) => `${i + 1};x`).join('\n')}\n`;
const corto = 'a;b;c\n1;2;3\n4;5\n';

async function upload(page, name, content) {
  await page.locator('[data-testid="tab-datos"]').click();
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    await waitUntil(async () => (await page.locator('[role="menu"]').count()) === 0, 4000);
    await page.locator('[data-testid="data-more-menu"]').click();
    const item = page.getByRole('menuitem', { name: /Importar JSON/ });
    await item.waitFor({ timeout: 5000 });
    const chooser = page.waitForEvent('filechooser', { timeout: 8000 });
    chooser.catch(() => undefined);
    await item.click();
    try { await (await chooser).setFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(content) }); return; } catch (err) { last = err; await page.keyboard.press('Escape'); }
  }
  throw last;
}
const open = async (env) => {
  const app = await openApp(env, { path: '/ide', session, storage: { 'pug-ide-workspaces-intro': '1' } });
  await app.page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  return app;
};
const datasetNames = (page) => page.locator('app-dataset-bar select').first().evaluate((el) => [...el.options].map((o) => o.text));
const selectedDataset = (page) => page.locator('app-dataset-bar select').first().evaluate((el) => el.options[el.selectedIndex]?.text ?? '');

export default async function (env) {
  let app = await open(env);
  let page = app.page;
  await page.locator('[data-testid="tab-datos"]').click();
  await page.locator('[data-testid="data-more-menu"]').click();
  check('75 el menú ofrece «Importar JSON, CSV, Schema u OpenAPI…»', !!(await waitUntil(async () => (await page.getByRole('menuitem', { name: 'Importar JSON, CSV, Schema u OpenAPI…' }).count()) === 1, 4000)));
  await page.keyboard.press('Escape');
  await upload(page, 'clientes-aurora.csv', aurora);
  const dlg = page.locator('[data-testid="csv-import"]');
  await dlg.waitFor({ timeout: 8000 });
  const text = async () => (await dlg.innerText()).replace(/\s+/g, ' ');
  check('75 un .csv abre su diálogo con las filas, las columnas y el separador detectado', /Importar CSV · clientes-aurora\.csv/.test(await text()) && /4 filas · 5 columnas · separador «;» detectado\. Solo se lee este archivo\./.test(await text()), await text());
  const head = (await page.locator('[data-testid="csv-preview"] th').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  check('75 la vista previa enseña las claves con su tipo (con BOM y CRLF bien leídos)', head.join('|') === 'numero texto|paciente.nombre texto|paciente.nif texto|total número|pagada sí/no', head.join('|'));
  check('75 y las filas, con las comillas y la coma dentro de «Marta Gil, Peña»', /Marta Gil, Peña/.test(await page.locator('[data-testid="csv-preview"]').innerText()));
  check('75 el nombre de cada juego es la primera columna y el botón cuenta los juegos', (await page.locator('[data-testid="csv-name-column"]').evaluate((el) => el.options[el.selectedIndex].text)) === 'numero' && /Importar 4 juegos/.test(await page.locator('[data-testid="csv-go"]').innerText()));
  await page.locator('[data-testid="csv-as-text"]').check();
  check('75 «Todo como texto» cambia los tipos de la vista previa', !!(await waitUntil(async () => (await page.locator('[data-testid="csv-preview"] th').allInnerTexts()).every((t) => /texto/.test(t)), 3000)));
  await page.locator('[data-testid="csv-as-text"]').uncheck();
  await page.locator('[data-testid="csv-go"]').click();
  const done = page.locator('[data-testid="csv-done"]');
  check('75 al importar: «4 juegos de datos importados» y el activo no cambia', !!(await waitUntil(async () => (await done.count()) === 1, 6000)) && /4 juegos de datos importados/.test(await done.innerText()) && /el juego activo sigue siendo «Por defecto»/.test(await done.innerText()), await done.innerText().catch(() => ''));
  const names = await datasetNames(page);
  check('75 el selector de juegos enseña los nuevos con el valor de la columna elegida', ['Por defecto', 'FA-2026-0312', 'FA-2026-0313', 'FA-2026-0314', 'FA-2026-0315'].every((n) => names.includes(n)) && (await selectedDataset(page)) === 'Por defecto', names.join('|'));
  await page.locator('app-dataset-bar select').first().selectOption({ label: 'FA-2026-0314' });
  check('75 cada juego lleva los datos de su fila: objetos, números y sí/no', !!(await waitUntil(async () => /Factura FA-2026-0314/.test(await previewText(page)) && /Marta Gil, Peña/.test(await previewText(page)), 8000)), await previewText(page));
  await page.locator('app-dataset-bar select').first().selectOption({ label: 'Por defecto' });
  await openLogTab(page);
  const log = page.locator('#panel-log');
  check('75 queda en el Registro con las claves', !!(await waitUntil(async () => /Importado clientes-aurora\.csv \(CSV\): 4 juegos de datos \(numero, paciente\.nombre, paciente\.nif, total, pagada\)\./.test(await log.innerText()), 4000)), await log.innerText().catch(() => ''));
  await page.locator('[data-testid="csv-undo"]').click();
  check('75 «Deshacer» quita los 4 juegos', !!(await waitUntil(async () => (await datasetNames(page)).join('|') === 'Por defecto', 4000)) && (await page.locator('[data-testid="csv-done"]').count()) === 0, (await datasetNames(page)).join('|'));
  check('75 sin errores no controlados', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();

  // Más filas que el tope y avisos de filas cortas.
  app = await open(env);
  page = app.page;
  await upload(page, 'todos-los-clientes.csv', grande);
  const d2 = page.locator('[data-testid="csv-import"]');
  await d2.waitFor({ timeout: 8000 });
  const many = page.locator('[data-testid="csv-many"]');
  check('75 con más de 500 filas se avisa y se importan las 500 primeras', !!(await waitUntil(async () => (await many.count()) === 1, 4000)) && /812 filas\. Se importan 500/.test(await many.innerText()) && /Importar 500 juegos/.test(await page.locator('[data-testid="csv-go"]').innerText()), await many.innerText().catch(() => ''));
  await page.locator('[data-testid="csv-chunk-500"]').click();
  check('75 «Las filas 501 a 812» importa lo que queda', !!(await waitUntil(async () => /Importar 312 juegos/.test(await page.locator('[data-testid="csv-go"]').innerText()), 4000)));
  await page.locator('[data-testid="csv-cancel"]').click();
  check('75 «Cancelar» no importa nada', !!(await waitUntil(async () => (await d2.count()) === 0, 3000)) && (await datasetNames(page)).join('|') === 'Por defecto');
  await upload(page, 'corto.csv', corto);
  const warn = page.locator('[data-testid="csv-warning"]');
  check('75 una fila con menos columnas se avisa, con su número, sin impedir importar', !!(await waitUntil(async () => /1 fila \(3\) tiene menos columnas que la cabecera: se rellenan con vacío\./.test(await warn.first().innerText().catch(() => '')), 5000)) && !(await page.locator('[data-testid="csv-go"]').isDisabled()), await warn.first().innerText().catch(() => ''));
  await page.locator('[data-testid="csv-delimiter"]').selectOption(',');
  check('75 con otro separador cambia el resultado: una sola columna con «;» dentro es un error', !!(await waitUntil(async () => /una sola columna/.test(await page.locator('[data-testid="csv-error"]').innerText().catch(() => '')), 4000)) && (await page.locator('[data-testid="csv-go"]').isDisabled()));
  await page.locator('[data-testid="csv-cancel"]').click();
  check('75 sin errores no controlados (tope y avisos)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
