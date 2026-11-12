import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { check, libraryNames, openApp, openLogTab, projectName, stable, waitUntil } from '../lib.mjs';

// «Importar proyecto» (P-29): está en «Mis proyectos» y crea un proyecto NUEVO con una carpeta o un .zip.
// El proyecto abierto no se pierde: sigue en la lista.
const session = { projectName: 'Informe trimestral', files: { '/main.pug': 'p informe\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };
const dlg = (page) => page.locator('[role="dialog"][aria-label="Mis proyectos"]');
const stored = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('pug-ide-project')); } catch { return null; } });
/**
 * Abre «Mis proyectos» y espera a que la lista termine de cargar (IndexedDB, asíncrono): al llegar las filas el pie del
 * diálogo baja, y un clic en el menú de importar hecho antes caería en otro sitio.
 */
async function openProjects(page) {
  await page.locator('[data-testid="menu-proyecto"]').click();
  await page.locator('[role="menuitem"]', { hasText: 'Mis proyectos' }).click();
  await dlg(page).waitFor({ timeout: 5000 });
  const rows = () => dlg(page).locator('.list:not(.tpl-list) li.row').count();
  await waitUntil(async () => (await dlg(page).locator('.list .empty', { hasText: 'Cargando' }).count()) === 0 && (await rows()) > 0, 5000);
  await stable(rows);
}
/**
 * Un solo oyente de «filechooser» para toda la prueba. Con `waitForEvent` en cada importación, Playwright apaga la
 * captura del selector al recibir el primero y la vuelve a encender en el siguiente; en Firefox eso es asíncrono y el
 * clic puede llegar antes, con lo que el segundo selector no se captura.
 */
function chooserQueue(page) {
  const ready = [];
  const waiting = [];
  page.on('filechooser', (fc) => { const w = waiting.shift(); if (w) w(fc); else ready.push(fc); });
  return () => {
    const fc = ready.shift();
    if (fc) return Promise.resolve(fc);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('no se abrió el selector de archivos')), 6000);
      waiting.push((x) => { clearTimeout(t); resolve(x); });
    });
  };
}
async function importWith(page, nextChooser, testid, files) {
  await openProjects(page);
  await dlg(page).locator('[data-testid="import-project"]').click();
  await dlg(page).locator(`[data-testid="${testid}"]`).click();
  await (await nextChooser()).setFiles(files);
}

export default async function (env) {
  const dir = mkdtempSync(join(tmpdir(), 'pugide-proyecto-'));
  const folder = join(dir, 'plantillas-norte');
  mkdirSync(join(folder, 'partials'), { recursive: true });
  mkdirSync(join(folder, 'node_modules', 'x'), { recursive: true });
  writeFileSync(join(folder, 'main.pug'), 'include partials/pie\np carta de Norte\n');
  writeFileSync(join(folder, 'partials', 'pie.pug'), 'p pie de Norte\n');
  writeFileSync(join(folder, 'node_modules', 'x', 'index.js'), 'x');
  writeFileSync(join(folder, 'boceto.psd'), 'x');

  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  const nextChooser = chooserQueue(page);
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });

  // --- Dónde está ---
  await openProjects(page);
  const btn = dlg(page).locator('[data-testid="import-project"]');
  check('61 «Mis proyectos» tiene «Importar proyecto…»', (await btn.innerText()).includes('Importar proyecto…'));
  await btn.click();
  await dlg(page).locator('.import-menu').waitFor({ timeout: 4000 });
  const items = await dlg(page).locator('.import-menu [role="menuitem"]').allInnerTexts();
  check('61 ofrece carpeta y .zip', items.length === 2 && /Desde una carpeta/.test(items[0]) && /Desde un archivo \.zip/.test(items[1]), items.join(' | '));
  check('61 avisa de que el abierto se conserva', /Crea un proyecto nuevo\. «Informe trimestral» sigue guardado aquí/.test(await dlg(page).locator('.menu-note').innerText()));
  await btn.click();
  await page.keyboard.press('Escape');
  await dlg(page).waitFor({ state: 'detached', timeout: 6000 }).catch(() => {});

  // --- Desde una carpeta ---
  await importWith(page, nextChooser, 'import-project-folder', folder);
  check('61 se abre un proyecto nuevo con el nombre de la carpeta', !!(await waitUntil(async () => (await projectName(page)) === 'plantillas-norte', 10000)), await projectName(page));
  const s = await waitUntil(async () => { const x = await stored(page); return x?.projectName === 'plantillas-norte' ? x : null; }, 8000);
  check('61 con sus archivos, sin la carpeta raíz y sin node_modules', !!s && s.files['/main.pug']?.includes('carta de Norte') && s.files['/partials/pie.pug'] === 'p pie de Norte\n' && !Object.keys(s.files).some((p) => p.includes('node_modules') || p.includes('plantillas-norte')), JSON.stringify(Object.keys(s?.files ?? {})));
  check('61 el proyecto anterior sigue en «Mis proyectos»', !!(await waitUntil(async () => { const n = await libraryNames(page); return n.includes('Informe trimestral') && n.includes('plantillas-norte'); }, 10000)), JSON.stringify(await libraryNames(page)));
  await openLogTab(page);
  check('61 el Registro dice qué ha pasado con el anterior', !!(await waitUntil(async () => /Proyecto «plantillas-norte» creado con lo importado\. «Informe trimestral» sigue en «Mis proyectos»/.test(await page.locator('#panel-log').innerText()))));

  // --- Desde un .zip, y con un nombre que ya existe ---
  const zip = Buffer.from(zipSync({ 'plantillas-norte/main.pug': strToU8('p desde el zip\n'), 'plantillas-norte/estilos/base.css': strToU8('p{margin:0}') }));
  await importWith(page, nextChooser, 'import-project-zip', { name: 'plantillas-norte.zip', mimeType: 'application/zip', buffer: zip });
  check('61 el .zip crea otro proyecto con nombre libre', !!(await waitUntil(async () => (await projectName(page)) === 'plantillas-norte (2)', 10000)), await projectName(page));
  const z = await waitUntil(async () => { const x = await stored(page); return x?.projectName === 'plantillas-norte (2)' ? x : null; }, 8000);
  check('61 con el contenido del .zip', !!z && z.files['/main.pug'] === 'p desde el zip\n' && z.files['/estilos/base.css'] === 'p{margin:0}');
  check('61 los tres proyectos están en la lista', !!(await waitUntil(async () => { const n = await libraryNames(page); return ['Informe trimestral', 'plantillas-norte', 'plantillas-norte (2)'].every((x) => n.includes(x)); }, 10000)), JSON.stringify(await libraryNames(page)));

  // --- Un .zip elegido en «Importar archivos» pregunta qué hacer; añadirlo no cambia de proyecto ---
  await page.locator('[data-testid="import-files-btn"]').click();
  const files = page.locator('[data-testid="import-files"]');
  await files.waitFor({ timeout: 5000 });
  await files.locator('[data-testid="import-files-input"]').setInputFiles({ name: 'extra.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync({ 'extra/aviso.pug': strToU8('p aviso\n') })) });
  check('61 un .zip en «Importar archivos» pregunta: añadir o abrir como proyecto', !!(await waitUntil(async () => (await files.locator('[data-testid="import-zip-add"]').count()) === 1 && (await files.locator('[data-testid="import-zip-project"]').count()) === 1)));
  await files.locator('[data-testid="import-zip-add"]').click();
  await files.locator('[data-testid="import-go"]').waitFor({ timeout: 5000 });
  await files.locator('[data-testid="import-go"]').click();
  await files.waitFor({ state: 'detached', timeout: 6000 });
  check('61 su contenido se añade al proyecto abierto, que no cambia', !!(await waitUntil(async () => { const x = await stored(page); return x?.projectName === 'plantillas-norte (2)' && x.files['/aviso.pug'] === 'p aviso\n' && x.files['/main.pug'] === 'p desde el zip\n'; }, 8000)), JSON.stringify(Object.keys((await stored(page))?.files ?? {})));

  check('61 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
  rmSync(dir, { recursive: true, force: true });
}
