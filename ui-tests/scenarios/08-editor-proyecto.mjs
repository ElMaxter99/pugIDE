import { check, openApp, previewText, waitUntil, CMD } from '../lib.mjs';

const MAIN = "doctype html\nhtml\n  body\n    include partials/card\n    h1 hola mundo\n    +card('x')\nmixin local(a)\n  p= a\nblock foot\n";
const CARD = "mixin card(t)\n  p hola #{t}\n";
const model = (page, path) => page.evaluate((p) => window.monaco.editor.getModels().find((m) => m.uri.path === p)?.getValue() ?? null, path);

// Buscar y reemplazar en el proyecto, hover y outline de mixins, y diálogo de atajos
export default async function (env) {
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Editor', files: { '/main.pug': MAIN, '/partials/card.pug': CARD }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  const { page } = app;
  await page.locator('.monaco-editor').first().click();

  // Hover sobre la llamada al mixin
  await page.evaluate(() => {
    const ed = window.monaco.editor.getEditors()[0];
    ed.setPosition({ lineNumber: 6, column: 7 });
    ed.trigger('test', 'editor.action.showHover', {});
  });
  const hover = await waitUntil(async () => (await page.locator('.monaco-hover').allInnerTexts()).find((t) => t.includes('mixin card(t)')));
  check('08 el hover de +mixin muestra la firma y dónde se define', !!hover && hover.includes('/partials/card.pug:1'), String(hover));
  await page.keyboard.press('Escape');

  // Outline: Ir a símbolo lista los mixins y bloques del archivo
  await page.evaluate(() => window.monaco.editor.getEditors()[0].trigger('test', 'editor.action.quickOutline', {}));
  const outline = await waitUntil(async () => {
    const t = (await page.locator('.quick-input-widget').allInnerTexts()).join(' ');
    return t.includes('local(a)') && t.includes('foot') ? t : null;
  });
  check('08 "Ir a símbolo" lista el mixin y el bloque del archivo', !!outline, String(outline));
  await page.keyboard.press('Escape');

  // Buscar y reemplazar en todo el proyecto
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+Shift+F');
  await page.locator('[data-testid="project-search"]').fill('hola');
  await page.locator('[data-testid="project-replace"]').fill('adiós');
  const summary = await waitUntil(async () => (await page.locator('.search-summary').innerText()).startsWith('2 resultados en 2 archivos'));
  check('08 la búsqueda encuentra las coincidencias en ambos archivos', !!summary, await page.locator('.search-summary').innerText());
  await page.locator('[data-testid="replace-all"]').click();
  const done = await waitUntil(async () => (await model(page, '/main.pug'))?.includes('adiós mundo') && (await model(page, '/partials/card.pug'))?.includes('adiós #{t}'));
  check('08 reemplazar todo cambia el archivo abierto y el cerrado', !!done, `${await model(page, '/main.pug')} || ${await model(page, '/partials/card.pug')}`);
  const shown = await waitUntil(async () => (await previewText(page)).includes('adiós mundo') && (await previewText(page)).includes('adiós x'), 8000);
  check('08 el preview refleja el reemplazo', !!shown, await previewText(page));
  check('08 tras reemplazar ya no quedan coincidencias', (await page.locator('.search-summary').innerText()).startsWith('0 resultados'), await page.locator('.search-summary').innerText());

  // Ctrl+Z deshace el reemplazo en el archivo activo
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press(CMD + '+z');
  const undone = await waitUntil(async () => (await model(page, '/main.pug')) === MAIN);
  check('08 Ctrl+Z deshace el reemplazo en el archivo abierto', !!undone, String(await model(page, '/main.pug')));
  // ...y en el archivo que no estaba abierto, al abrirlo
  await page.evaluate(() => {
    const m = window.monaco.editor.getModels().find((x) => x.uri.path === '/partials/card.pug');
    m.undo();
  });
  check('08 y en el archivo que no estaba abierto', (await model(page, '/partials/card.pug')) === CARD, String(await model(page, '/partials/card.pug')));

  // Atajos
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type('atajos');
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts()).join('|') === 'Atajos de teclado');
  await page.keyboard.press('Enter');
  const dlg = page.locator('[role="dialog"][aria-label="Atajos de teclado"]');
  await dlg.waitFor({ timeout: 4000 });
  check('08 el diálogo de atajos lista Ctrl+Shift+F', (await dlg.innerText()).includes('Ctrl+Shift+F'));
  await page.keyboard.press('Escape');
  await dlg.waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
  check('08 Escape cierra el diálogo de atajos', (await dlg.count()) === 0);
  check('08 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
