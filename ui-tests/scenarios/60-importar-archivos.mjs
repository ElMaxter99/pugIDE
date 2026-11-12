import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check, chooseMenu, openApp, openLogTab, waitUntil } from '../lib.mjs';

// «Importar archivos» (P-28): el botón del panel de archivos añade al proyecto ABIERTO (archivos sueltos o una carpeta),
// en la carpeta elegida, enseñando antes qué es nuevo y qué ya existe. No crea ni sustituye ningún proyecto.
const session = {
  projectName: 'Informe trimestral',
  files: { '/main.pug': 'p informe\n', '/partials/cabeceras/tabla.pug': 'p tabla original\n' },
  openTabPaths: ['/main.pug'], activeTabPath: '/main.pug',
};
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4"/></svg>';
const dlg = (page) => page.locator('[data-testid="import-files"]');
const stored = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('pug-ide-project')); } catch { return null; } });
const fileOf = async (page, path) => (await stored(page))?.files?.[path];
const hasRow = (page, path) => page.locator(`app-file-tree [data-path="${path}"]`).count();
const rowsText = (page) => dlg(page).locator('[data-testid="import-rows"] .row').allInnerTexts();

export default async function (env) {
  const dir = mkdtempSync(join(tmpdir(), 'pugide-import-'));
  const folder = join(dir, 'cabeceras');
  mkdirSync(folder);
  writeFileSync(join(folder, 'portada.pug'), 'p portada\n');
  writeFileSync(join(folder, 'tabla.pug'), 'p tabla importada\n');
  writeFileSync(join(folder, 'logo.svg'), SVG);
  writeFileSync(join(folder, 'boceto.psd'), 'x');

  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });

  // --- El botón y su nombre ---
  const btn = page.locator('[data-testid="import-files-btn"]');
  check('60 el botón del panel se llama «Importar archivos al proyecto»', (await btn.getAttribute('aria-label')) === 'Importar archivos al proyecto');
  check('60 ya no hay un botón «Importar proyecto» en el panel de archivos', (await page.locator('app-sidebar button[aria-label^="Importar proyecto"]').count()) === 0);
  await btn.click();
  await dlg(page).waitFor({ timeout: 5000 });
  check('60 el diálogo dice a qué proyecto se añaden', /Importar archivos al proyecto «Informe trimestral»/.test((await dlg(page).getAttribute('aria-label')) ?? ''));
  check('60 ofrece archivos y carpeta', (await dlg(page).locator('[data-testid="import-pick-files"]').count()) === 1 && (await dlg(page).locator('[data-testid="import-pick-folder"]').count()) === 1);
  const targets = await dlg(page).locator('[data-testid="import-target"] option').allInnerTexts();
  check('60 el destino lista las carpetas del proyecto, con la raíz primero', targets[0].startsWith('/ (raíz') && targets.includes('/partials') && targets.includes('/partials/cabeceras'), targets.join(' | '));

  // --- Archivos sueltos a la raíz ---
  await dlg(page).locator('[data-testid="import-files-input"]').setInputFiles([
    { name: 'nuevo.pug', mimeType: 'text/plain', buffer: Buffer.from('p nuevo\n') },
    { name: 'sello.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) },
    { name: 'notas.docx', mimeType: 'application/octet-stream', buffer: Buffer.from('x') },
  ]);
  await dlg(page).locator('[data-testid="import-summary"]').waitFor({ timeout: 5000 });
  check('60 resumen: 2 nuevos y 1 que no se importa', (await dlg(page).locator('[data-testid="import-summary"]').innerText()).trim() === '2 nuevos · 1 no se importa');
  check('60 el botón dice cuántos se importan', (await dlg(page).locator('[data-testid="import-go"]').innerText()).trim() === 'Importar 2 archivos');
  await dlg(page).locator('[data-testid="import-go"]').click();
  await dlg(page).waitFor({ state: 'detached', timeout: 6000 });
  check('60 los archivos sueltos aparecen en el árbol', !!(await waitUntil(async () => (await hasRow(page, '/nuevo.pug')) === 1 && (await hasRow(page, '/sello.svg')) === 1)));
  check('60 el proyecto abierto sigue siendo el mismo, con lo que tenía', !!(await waitUntil(async () => { const s = await stored(page); return s?.projectName === 'Informe trimestral' && s.files['/main.pug'] === 'p informe\n' && s.files['/nuevo.pug'] === 'p nuevo\n'; }, 8000)));
  check('60 la pestaña abierta no cambia', (await page.locator('.tab.active, [role="tab"][aria-selected="true"]').allInnerTexts()).join(' ').includes('main.pug'));

  // --- Una carpeta dentro de /partials, con un archivo que ya existe ---
  await chooseMenu(page, 'proyecto', 'import');
  await dlg(page).waitFor({ timeout: 5000 });
  await dlg(page).locator('[data-testid="import-target"]').selectOption('/partials');
  await dlg(page).locator('[data-testid="import-folder-input"]').setInputFiles(folder);
  await dlg(page).locator('[data-testid="import-summary"]').waitFor({ timeout: 5000 });
  check('60 reconoce la carpeta elegida', /Carpeta cabeceras · 4 archivos/.test(await dlg(page).locator('[data-testid="import-what"]').innerText()));
  check('60 resumen de la carpeta: nuevos, existentes y no admitidos', (await dlg(page).locator('[data-testid="import-summary"]').innerText()).trim() === '2 nuevos · 1 ya existe · 1 no se importa');
  const rows = (await rowsText(page)).join(' | ');
  check('60 cada fila enseña su ruta de destino y su estado', /\/partials\/cabeceras\/portada\.pug\s+nuevo/.test(rows) && /\/partials\/cabeceras\/tabla\.pug\s+ya existe/.test(rows) && /boceto\.psd\s+tipo no admitido/.test(rows), rows);
  check('60 por defecto no se tocan los que ya existen', await dlg(page).locator('input[name="import-conflict"][value="skip"]').isChecked());
  // Sin conservar la carpeta, el contenido va directo al destino
  await dlg(page).locator('[data-testid="import-keep-folder"]').uncheck();
  check('60 sin «crear la carpeta», las rutas cuelgan del destino', !!(await waitUntil(async () => /\/partials\/portada\.pug\s+nuevo/.test((await rowsText(page)).join(' | ')))));
  await dlg(page).locator('[data-testid="import-keep-folder"]').check();
  await waitUntil(async () => /\/partials\/cabeceras\/tabla\.pug\s+ya existe/.test((await rowsText(page)).join(' | ')));
  await dlg(page).locator('[data-testid="import-go"]').click();
  await dlg(page).waitFor({ state: 'detached', timeout: 6000 });
  check('60 entran los nuevos (texto e imagen)', !!(await waitUntil(async () => (await hasRow(page, '/partials/cabeceras/portada.pug')) === 1 && (await hasRow(page, '/partials/cabeceras/logo.svg')) === 1)));
  check('60 el que ya existía no se ha tocado', !!(await waitUntil(async () => (await fileOf(page, '/partials/cabeceras/portada.pug')) === 'p portada\n', 8000)) && (await fileOf(page, '/partials/cabeceras/tabla.pug')) === 'p tabla original\n');
  await openLogTab(page);
  check('60 el Registro lo cuenta', !!(await waitUntil(async () => /Añadidos 2 archivos en \/partials\/cabeceras.*1 ya existía y no se ha tocado/.test(await page.locator('#panel-log').innerText()))));

  // --- Sustituir, y deshacer toda la importación de una vez ---
  await btn.click();
  await dlg(page).waitFor({ timeout: 5000 });
  await dlg(page).locator('[data-testid="import-target"]').selectOption('/partials');
  await dlg(page).locator('[data-testid="import-folder-input"]').setInputFiles(folder);
  await dlg(page).locator('[data-testid="import-replace"]').check();
  check('60 «sustituirlos» importa también los que ya existen', !!(await waitUntil(async () => (await dlg(page).locator('[data-testid="import-go"]').innerText()).trim() === 'Importar 3 archivos')));
  await dlg(page).locator('[data-testid="import-go"]').click();
  await dlg(page).waitFor({ state: 'detached', timeout: 6000 });
  check('60 el archivo existente queda sustituido', !!(await waitUntil(async () => (await fileOf(page, '/partials/cabeceras/tabla.pug')) === 'p tabla importada\n', 8000)));
  const undo = page.locator('app-sidebar button[aria-label^="Deshacer la importación"]');
  check('60 se ofrece deshacer la importación', (await undo.count()) === 1);
  await undo.click();
  check('60 deshacer devuelve el archivo sustituido', !!(await waitUntil(async () => (await fileOf(page, '/partials/cabeceras/tabla.pug')) === 'p tabla original\n', 8000)));

  // --- Conservar los dos ---
  await btn.click();
  await dlg(page).waitFor({ timeout: 5000 });
  await dlg(page).locator('[data-testid="import-target"]').selectOption('/partials/cabeceras');
  await dlg(page).locator('[data-testid="import-files-input"]').setInputFiles([{ name: 'tabla.pug', mimeType: 'text/plain', buffer: Buffer.from('p otra tabla\n') }]);
  await dlg(page).locator('[data-testid="import-keep-both"]').check();
  await dlg(page).locator('[data-testid="import-go"]').click();
  await dlg(page).waitFor({ state: 'detached', timeout: 6000 });
  check('60 «conservar los dos» guarda el importado con otro nombre', !!(await waitUntil(async () => (await fileOf(page, '/partials/cabeceras/tabla-2.pug')) === 'p otra tabla\n', 8000)) && (await fileOf(page, '/partials/cabeceras/tabla.pug')) === 'p tabla original\n');

  // --- Nada admitido: se dice y el diálogo sigue abierto ---
  await btn.click();
  await dlg(page).waitFor({ timeout: 5000 });
  await dlg(page).locator('[data-testid="import-files-input"]').setInputFiles([{ name: 'foto.psd', mimeType: 'application/octet-stream', buffer: Buffer.from('x') }]);
  check('60 sin nada admitido se avisa y no se cierra', !!(await waitUntil(async () => /No hay archivos que PugIDE pueda importar/.test(await dlg(page).locator('[data-testid="import-error"]').innerText().catch(() => '')))) && (await dlg(page).count()) === 1);
  await page.keyboard.press('Escape');
  await dlg(page).waitFor({ state: 'detached', timeout: 6000 }).catch(() => {});

  // --- Menú contextual de una carpeta: «Importar archivos aquí…» con esa carpeta de destino ---
  await page.locator('app-file-tree [data-path="/partials"]').click({ button: 'right' });
  await page.locator('[role="menuitem"]', { hasText: 'Importar archivos aquí' }).click();
  await dlg(page).waitFor({ timeout: 5000 });
  check('60 «Importar archivos aquí…» abre el diálogo con esa carpeta de destino', (await dlg(page).locator('[data-testid="import-target"]').inputValue()) === '/partials');
  await page.keyboard.press('Escape');

  check('60 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
  rmSync(dir, { recursive: true, force: true });
}
