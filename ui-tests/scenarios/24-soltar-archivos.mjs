import { zipSync, strToU8 } from 'fflate';
import { check, openApp, previewText, waitUntil, openLogTab, confirmImport } from '../lib.mjs';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/** Suelta archivos sobre el árbol del Workspace como lo haría el navegador (DataTransfer con `File`). */
async function drop(page, files) {
  await page.evaluate((list) => {
    const dt = new DataTransfer();
    for (const f of list) {
      const bytes = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
      dt.items.add(new File([bytes], f.name, { type: f.type }));
    }
    const tree = document.querySelector('.file-tree');
    tree.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    tree.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, files);
}
const b64 = (u8) => Buffer.from(u8).toString('base64');
const text = (name, content) => ({ name, type: 'text/plain', b64: b64(strToU8(content)) });
const paths = (page) => page.evaluate(() => [...document.querySelectorAll('.file-tree [data-path]')].map((e) => e.getAttribute('data-path')));
const terminal = async (page) => { await openLogTab(page); return page.evaluate(() => document.querySelector('app-terminal-panel')?.textContent ?? ''); };

// Soltar sobre el árbol (P-28): todo pasa por «Importar archivos» y se añade al proyecto abierto sin sobrescribir;
// un .zip pregunta si añadir su contenido o abrirlo como proyecto nuevo.
export default async function (env) {
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Base', files: { '/main.pug': 'p Base\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  const { page } = app;
  await page.locator('.file-tree').waitFor();

  // 1. Archivos de texto sueltos: se añaden al proyecto
  await drop(page, [text('extra.pug', 'h2 Extra\n'), text('notas.md', '# notas\n')]);
  await confirmImport(page);
  const added = await waitUntil(async () => (await paths(page)).includes('/extra.pug') && (await paths(page)).includes('/notas.md'), 5000);
  check('24 los archivos de texto soltados se añaden al proyecto', !!added, (await paths(page)).join(','));
  check('24 la terminal lo cuenta', /Añadidos 2 archivos/.test(await terminal(page)), await terminal(page));

  // 2. Sin sobrescribir lo que ya existe
  await drop(page, [text('extra.pug', 'h2 OTRO\n')]);
  const again = page.locator('[data-testid="import-files"]');
  await again.locator('[data-testid="import-rows"]').waitFor({ timeout: 6000 });
  check('24 un archivo que ya existe se marca y por defecto no se sobrescribe', /\/extra\.pug\s+ya existe/.test(await again.locator('[data-testid="import-rows"]').innerText()) && (await again.locator('[data-testid="import-go"]').isDisabled()), await again.innerText());
  await page.keyboard.press('Escape');
  await again.waitFor({ state: 'detached', timeout: 6000 }).catch(() => {});
  const kept = await page.evaluate(() => (window.monaco.editor.getModels().find((m) => m.uri.path === '/extra.pug')?.getValue()) ?? 'cerrado');
  check('24 su contenido sigue siendo el original', kept === 'cerrado' || kept === 'h2 Extra\n', kept);

  // 3. Imagen: entra como asset
  await drop(page, [{ name: 'logo.png', type: 'image/png', b64: PNG }]);
  await confirmImport(page);
  check('24 una imagen soltada entra como asset en el destino', !!(await waitUntil(async () => (await paths(page)).includes('/logo.png'), 5000)), (await paths(page)).join(','));

  // 4. Un .zip abre un proyecto nuevo con su estructura y deja el anterior en «Mis proyectos»
  const zip = zipSync({ 'main.pug': strToU8('html\n  body\n    include ./partials/hola\n'), 'partials/hola.pug': strToU8('h1 Hola desde el zip\n') });
  await drop(page, [{ name: 'Informe-trimestral.zip', type: 'application/zip', b64: b64(zip) }]);
  await confirmImport(page, { zip: 'project' });
  const loaded = await waitUntil(async () => (await paths(page)).includes('/partials/hola.pug'), 8000);
  check('24 el .zip abre un proyecto con su estructura', !!loaded, (await paths(page)).join(','));
  check('24 el proyecto toma el nombre del zip', (await page.locator('.workspace-name').innerText()).trim() === 'Informe-trimestral', await page.locator('.workspace-name').innerText());
  check('24 el preview muestra el contenido del zip', !!(await waitUntil(async () => (await previewText(page)).includes('Hola desde el zip'), 8000)), await previewText(page));
  check('24 el proyecto anterior ya no está abierto', !(await paths(page)).includes('/extra.pug'));
  // El guardado en la biblioteca es asíncrono (IndexedDB): se reabre el diálogo hasta que aparece el proyecto anterior.
  let names = [];
  for (let i = 0; i < 6 && !names.includes('Base'); i++) {
    await page.keyboard.press('Control+k');
    await page.locator('[aria-label="Paleta de comandos"]').waitFor();
    await page.keyboard.type('Mis proyectos');
    await page.keyboard.press('Enter');
    const dialog = page.locator('[aria-label="Mis proyectos"]');
    await dialog.waitFor({ timeout: 4000 });
    names = await dialog.locator('.row .name').allInnerTexts();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
    if (!names.includes('Base')) await page.waitForTimeout(500);
  }
  check('24 el proyecto anterior queda guardado en Mis proyectos', names.includes('Base'), names.join(' | '));

  // 5. Un .zip con una carpeta raíz única y restos de macOS: se aplana y se ignoran los restos
  const zip2 = zipSync({
    'Mi Proyecto/main.pug': strToU8('html\n  body\n    include /partials/hola\n'),
    'Mi Proyecto/partials/hola.pug': strToU8('h1 Hola aplanado\n'),
    'Mi Proyecto/.DS_Store': strToU8('x'),
    '__MACOSX/Mi Proyecto/._main.pug': strToU8('x'),
  });
  await drop(page, [{ name: 'Mi-Proyecto.zip', type: 'application/zip', b64: b64(zip2) }]);
  await confirmImport(page, { zip: 'project' });
  const flat = await waitUntil(async () => (await paths(page)).includes('/partials/hola.pug'), 8000);
  const flatPaths = (await paths(page)).join(',');
  check('24 el .zip con una carpeta raíz única se aplana', !!flat && !flatPaths.includes('Mi Proyecto') && !flatPaths.includes('__MACOSX') && !flatPaths.includes('.DS_Store'), flatPaths);
  check('24 y las rutas absolutas del proyecto funcionan', !!(await waitUntil(async () => (await previewText(page)).includes('Hola aplanado'), 8000)), await previewText(page));
  check('24 avisa de la carpeta quitada y de los restos ignorados', /carpeta «Mi Proyecto»/.test(await terminal(page)) && /Ignorados 2 archivos del sistema/.test(await terminal(page)), await terminal(page));
  check('24 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
