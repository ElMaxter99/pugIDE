import { strToU8 } from 'fflate';
import { check, openApp, previewText, waitUntil, openLogTab, waitStored } from '../lib.mjs';

const session = {
  projectName: 'Plantillas',
  files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Portada principal\n' },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};

/** Suelta archivos sobre el árbol como lo haría el navegador. */
async function drop(page, files) {
  await page.evaluate((list) => {
    const dt = new DataTransfer();
    for (const f of list) dt.items.add(new File([Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0))], f.name, { type: 'text/plain' }));
    const tree = document.querySelector('.file-tree');
    tree.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    tree.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, files);
}
const file = (name, content) => ({ name, b64: Buffer.from(strToU8(content)).toString('base64') });
const row = (page, name) => page.locator('app-file-tree .file-item', { hasText: name });
const marks = (page) => page.evaluate(() => [...document.querySelectorAll('app-file-tree [data-testid="preview-mark"]')].map((m) => ({ path: m.closest('[data-path]').getAttribute('data-path'), text: m.textContent.replace(/\s+/g, ' ').trim(), pinned: m.classList.contains('pinned') })));
const log = async (page) => { await openLogTab(page); return page.evaluate(() => document.querySelector('app-terminal-panel')?.textContent.replace(/\s+/g, ' ') ?? ''); };
const palette = (page) => page.locator('[aria-label="Paleta de comandos"]');
const menuLabels = async (page) => { await page.locator('app-context-menu .context-label').first().waitFor(); return page.locator('app-context-menu .context-label').allInnerTexts(); };
const titles = (page) => page.locator('.item .title').allInnerTexts();

async function pickFromTree(page, name) {
  await row(page, name).click({ button: 'right' });
  await page.locator('app-context-menu').getByText('Previsualizar este archivo').click();
}
async function openPalette(page) {
  await page.keyboard.press('Control+k');
  await palette(page).waitFor();
}

// Importar varias plantillas (.pug y .jade) y elegir cuál se previsualiza, desde el árbol y desde la paleta
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await waitUntil(async () => (await previewText(page)).includes('Portada principal'));

  await drop(page, [
    file('factura.jade', 'doctype html\nhtml\n  body\n    include partes/cabecera\n    h1 Factura de marzo\n'),
    file('informe.pug', 'doctype html\nhtml\n  body\n    h1 Informe trimestral\n'),
    file('resumen.jade', 'doctype html\nhtml\n  body\n    h1 Resumen ejecutivo\n'),
  ]);
  await row(page, 'resumen.jade').waitFor({ timeout: 6000 });
  check('34 importar varias plantillas no cambia la vista previa', (await previewText(page)).includes('Portada principal'), await previewText(page));
  check('34 el Registro avisa de cómo elegir otra', !!(await waitUntil(async () => /Se previsualiza \/main\.pug\. Para ver otra plantilla/.test(await log(page)))), await log(page));
  let m = await marks(page);
  check('34 la marca está en main.pug, en modo automático', m.length === 1 && m[0].path === '/main.pug' && !m[0].pinned && !/Vista previa/.test(m[0].text.replace(/, vista previa automática/, '')), JSON.stringify(m));

  // --- Desde el menú del árbol ---
  await row(page, 'factura.jade').click({ button: 'right' });
  const items = await menuLabels(page);
  check('34 el menú de una plantilla ofrece «Previsualizar este archivo»', items.includes('Previsualizar este archivo') && !items.some((t) => t.startsWith('Vista previa automática')), JSON.stringify(items));
  await page.locator('.context-overlay').click({ position: { x: 5, y: 5 } });
  await pickFromTree(page, 'factura.jade');
  const factura = await waitUntil(async () => (await previewText(page)).includes('Factura de marzo'));
  check('34 elegir un .jade lo renderiza (con su parcial sin extensión sin crear errores)', !!factura, await previewText(page));
  m = await marks(page);
  check('34 la marca «Vista previa» pasa al archivo elegido', m.length === 1 && m[0].path === '/factura.jade' && m[0].pinned && /Vista previa/.test(m[0].text), JSON.stringify(m));
  check('34 el editor sigue en main.pug', (await page.evaluate(() => window.monaco.editor.getEditors()[0].getModel().uri.path)) === '/main.pug');

  await pickFromTree(page, 'informe.pug');
  check('34 elegir otra plantilla cambia la vista previa', !!(await waitUntil(async () => (await previewText(page)).includes('Informe trimestral'))), await previewText(page));

  // --- Desde la paleta ---
  await openPalette(page);
  await page.keyboard.type('Previsualizar archivo');
  await waitUntil(async () => (await titles(page))[0] === 'Previsualizar archivo…');
  await page.keyboard.press('Enter');
  // La lista raíz filtrada ya contiene «Previsualizar: resumen.jade»: hay que esperar a la sublista de verdad (su cabecera).
  await palette(page).locator('.crumb').waitFor({ timeout: 8000 });
  await waitUntil(async () => (await titles(page)).includes('Vista previa automática (main.pug)'));
  const sub = await titles(page);
  check('34 «Previsualizar archivo…» lista cada plantilla y sigue abierta', sub.length >= 5 && sub.includes('Previsualizar: factura.jade') && sub.includes('Previsualizar: informe.pug (en la vista previa)') && sub.includes('Vista previa automática (main.pug)') && (await palette(page).count()) === 1, JSON.stringify(sub));
  await page.keyboard.type('resumen');
  await waitUntil(async () => (await titles(page)).length === 1);
  await page.keyboard.press('Enter');
  check('34 elegir desde la paleta renderiza esa plantilla', !!(await waitUntil(async () => (await previewText(page)).includes('Resumen ejecutivo'))), await previewText(page));
  m = await marks(page);
  check('34 y la marca la sigue', m.length === 1 && m[0].path === '/resumen.jade' && m[0].pinned, JSON.stringify(m));
  // Al escribir «previsualizar» en la lista raíz también salen
  await openPalette(page);
  await page.keyboard.type('previsualizar: fact');
  await waitUntil(async () => (await titles(page))[0] === 'Previsualizar: factura.jade');
  check('34 también se encuentran escribiendo en la lista principal', (await titles(page))[0] === 'Previsualizar: factura.jade', JSON.stringify(await titles(page)));
  await page.keyboard.press('Escape');
  await waitUntil(async () => (await palette(page).count()) === 0);

  // --- Renombrar sigue al archivo ---
  await row(page, 'resumen.jade').click({ button: 'right' });
  await page.locator('app-context-menu').getByText('Renombrar').click();
  const input = page.locator('app-dialog input');
  await input.waitFor();
  await input.fill('/informes/resumen-q1.jade');
  await page.keyboard.press('Enter');
  await waitUntil(async () => (await marks(page)).some((x) => x.path === '/informes/resumen-q1.jade'));
  m = await marks(page);
  check('34 renombrar el archivo elegido conserva la marca', m.length === 1 && m[0].path === '/informes/resumen-q1.jade' && m[0].pinned, JSON.stringify(m));
  check('34 y la vista previa sigue mostrando esa plantilla', (await previewText(page)).includes('Resumen ejecutivo'), await previewText(page));

  // --- Recargar conserva la elección ---
  await waitUntil(async () => /vista previa|Vista previa/.test(await log(page)));
  // El autoguardado de la sesión va con antirrebote (~1 s): se espera a que la elección esté en lo guardado, no un tiempo fijo.
  await waitStored(page, 'pug-ide-project', '"previewEntry":"/informes/resumen-q1.jade"');
  await page.reload();
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await waitUntil(async () => (await previewText(page)).includes('Resumen ejecutivo'), 8000);
  m = (await waitUntil(async () => { const x = await marks(page); return x.length === 1 && x[0].pinned ? x : null; }, 8000)) ?? (await marks(page));
  check('34 recargar conserva la elección', (await previewText(page)).includes('Resumen ejecutivo') && m.length === 1 && m[0].path === '/informes/resumen-q1.jade' && m[0].pinned, JSON.stringify(m) + (await previewText(page)));

  // --- Borrar vuelve a automático ---
  await row(page, 'resumen-q1.jade').click({ button: 'right' });
  await page.locator('app-context-menu').getByText('Borrar').click();
  await page.locator('app-dialog').getByRole('button', { name: 'Borrar' }).click();
  check('34 borrar el archivo elegido vuelve a main.pug', !!(await waitUntil(async () => (await previewText(page)).includes('Portada principal'))), await previewText(page));
  m = await marks(page);
  check('34 y la marca vuelve a main.pug en automático', m.length === 1 && m[0].path === '/main.pug' && !m[0].pinned, JSON.stringify(m));
  check('34 el Registro lo explica', /vuelve a ser automática/.test(await log(page)), await log(page));

  // --- «Vista previa automática» a mano ---
  await pickFromTree(page, 'informe.pug');
  await waitUntil(async () => (await previewText(page)).includes('Informe trimestral'));
  await row(page, 'informe.pug').click({ button: 'right' });
  const pinnedItems = await menuLabels(page);
  check('34 con una elegida, el menú ofrece volver a «Vista previa automática (main.pug)»', pinnedItems.includes('Vista previa automática (main.pug)') && !pinnedItems.includes('Previsualizar este archivo'), JSON.stringify(pinnedItems));
  await page.locator('app-context-menu').getByText('Vista previa automática').click();
  check('34 volver a automático muestra main.pug', !!(await waitUntil(async () => (await previewText(page)).includes('Portada principal'))), await previewText(page));

  check('34 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
