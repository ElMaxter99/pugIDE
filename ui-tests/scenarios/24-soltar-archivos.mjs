import { zipSync, strToU8 } from 'fflate';
import { check, openApp, previewText, waitUntil } from '../lib.mjs';

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
const terminal = (page) => page.evaluate(() => document.querySelector('app-terminal-panel')?.textContent ?? '');

// Soltar archivos sobre el árbol: un .zip abre un proyecto, los archivos sueltos se añaden sin sobrescribir
export default async function (env) {
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Base', files: { '/main.pug': 'p Base\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  const { page } = app;
  await page.locator('.file-tree').waitFor();

  // 1. Archivos de texto sueltos: se añaden al proyecto
  await drop(page, [text('extra.pug', 'h2 Extra\n'), text('notas.md', '# notas\n')]);
  const added = await waitUntil(async () => (await paths(page)).includes('/extra.pug') && (await paths(page)).includes('/notas.md'), 5000);
  check('24 los archivos de texto soltados se añaden al proyecto', !!added, (await paths(page)).join(','));
  check('24 la terminal lo cuenta', /Añadidos 2 archivos/.test(await terminal(page)), await terminal(page));

  // 2. Sin sobrescribir lo que ya existe
  await drop(page, [text('extra.pug', 'h2 OTRO\n')]);
  await waitUntil(async () => /no se sobrescriben/.test(await terminal(page)), 5000);
  check('24 un archivo que ya existe no se sobrescribe y se avisa', /Ya existían y no se sobrescriben: \/extra\.pug/.test(await terminal(page)), await terminal(page));
  const kept = await page.evaluate(() => (window.monaco.editor.getModels().find((m) => m.uri.path === '/extra.pug')?.getValue()) ?? 'cerrado');
  check('24 su contenido sigue siendo el original', kept === 'cerrado' || kept === 'h2 Extra\n', kept);

  // 3. Imagen: sigue yendo a assets
  await drop(page, [{ name: 'logo.png', type: 'image/png', b64: PNG }]);
  check('24 una imagen soltada sigue entrando como asset', !!(await waitUntil(async () => (await paths(page)).includes('/assets/logo.png'), 5000)), (await paths(page)).join(','));

  // 4. Un .zip abre un proyecto nuevo con su estructura y deja el anterior en «Mis proyectos»
  const zip = zipSync({ 'main.pug': strToU8('html\n  body\n    include ./partials/hola\n'), 'partials/hola.pug': strToU8('h1 Hola desde el zip\n') });
  await drop(page, [{ name: 'Informe-trimestral.zip', type: 'application/zip', b64: b64(zip) }]);
  const loaded = await waitUntil(async () => (await paths(page)).includes('/partials/hola.pug'), 8000);
  check('24 el .zip abre un proyecto con su estructura', !!loaded, (await paths(page)).join(','));
  check('24 el proyecto toma el nombre del zip', (await page.locator('.workspace-name').innerText()).trim() === 'Informe-trimestral', await page.locator('.workspace-name').innerText());
  check('24 el preview muestra el contenido del zip', !!(await waitUntil(async () => (await previewText(page)).includes('Hola desde el zip'), 8000)), await previewText(page));
  check('24 el proyecto anterior ya no está abierto', !(await paths(page)).includes('/extra.pug'));
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type('Mis proyectos');
  await page.keyboard.press('Enter');
  const dialog = page.locator('[aria-label="Mis proyectos"]');
  await dialog.waitFor({ timeout: 4000 });
  const names = await dialog.locator('.row .name').allInnerTexts();
  check('24 el proyecto anterior queda guardado en Mis proyectos', names.includes('Base'), names.join(' | '));
  await page.keyboard.press('Escape');
  check('24 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
