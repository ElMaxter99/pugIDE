import { check, openApp, previewText, waitUntil } from '../lib.mjs';

const session = {
  projectName: 'Historial',
  files: { '/main.pug': "doctype html\nhtml\n  body\n    h1 Primera versión\n    p texto\n" },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};
const model = (page) => page.evaluate(() => window.monaco.editor.getModels().find((m) => m.uri.path === '/main.pug')?.getValue() ?? null);

async function openHistory(page) {
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type('Historial del archivo');
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts())[0] === 'Historial del archivo…');
  await page.keyboard.press('Enter');
  const dlg = page.locator('[role="dialog"][aria-label="Historial del archivo"]');
  await dlg.waitFor({ timeout: 4000 });
  return dlg;
}

// Historial por archivo: versiones al guardar, diff y restaurar (con Ctrl+Z), y persistencia al recargar
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('.monaco-editor').first().click();
  await waitUntil(async () => (await previewText(page)).includes('Primera versión'));

  let dlg = await openHistory(page);
  check('14 un archivo sin guardar aún no tiene versiones', !!(await waitUntil(async () => (await dlg.innerText()).includes('aún no tiene versiones'))), await dlg.innerText());
  await page.keyboard.press('Escape');

  // Editar y guardar con Ctrl+S
  const edited = "doctype html\nhtml\n  body\n    h1 Segunda versión\n    p texto\n    p añadido\n";
  await page.evaluate((src) => window.monaco.editor.getModels().find((m) => m.uri.path === '/main.pug').setValue(src), edited);
  await waitUntil(async () => (await previewText(page)).includes('Segunda versión'));
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+s');
  await waitUntil(async () => true, 300);

  dlg = await openHistory(page);
  const items = page.locator('[data-testid="history-version"]');
  const listed = await waitUntil(async () => (await items.count()) === 2);
  check('14 guardar crea una versión y conserva la inicial', !!listed, String(await items.count()));
  const texts = await items.allInnerTexts();
  check('14 cada versión indica su motivo', texts[0].includes('guardado') && texts[1].includes('inicial'), JSON.stringify(texts));

  await items.nth(1).click();
  const diffBox = page.locator('[data-testid="history-diff"]');
  await waitUntil(async () => (await diffBox.innerText()).includes('Primera versión'));
  const diff = await diffBox.innerText();
  check('14 el diff muestra qué vuelve y qué desaparece al restaurar la inicial', diff.includes('+ ') && diff.includes('    h1 Primera versión') && diff.includes('− ') && diff.includes('    p añadido'), diff);

  await page.locator('[data-testid="history-restore"]').click();
  await dlg.waitFor({ state: 'detached' });
  const restored = await waitUntil(async () => (await model(page)) === session.files['/main.pug']);
  check('14 restaurar devuelve el archivo a esa versión en el editor', !!restored, String(await model(page)));
  check('14 y el preview la muestra', !!(await waitUntil(async () => (await previewText(page)).includes('Primera versión'))), await previewText(page));

  // Ctrl+Z en el editor deshace la restauración
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+z');
  const undone = await waitUntil(async () => (await model(page)) === edited);
  check('14 Ctrl+Z deshace la restauración', !!undone, String(await model(page)));

  // Un cambio sin guardar queda protegido: al restaurar se guarda como «antes de restaurar»
  const unsaved = edited + '    p sin guardar\n';
  await page.evaluate((src) => window.monaco.editor.getModels().find((m) => m.uri.path === '/main.pug').setValue(src), unsaved);
  await waitUntil(async () => (await previewText(page)).includes('sin guardar'));
  dlg = await openHistory(page);
  await waitUntil(async () => (await items.count()) === 2);
  await items.nth(1).click();
  await waitUntil(async () => (await page.locator('[data-testid="history-diff"]').innerText()).includes('Primera versión'));
  await page.locator('[data-testid="history-restore"]').click();
  await dlg.waitFor({ state: 'detached' });
  await waitUntil(async () => (await model(page)) === session.files['/main.pug']);

  // Todo sobrevive a una recarga
  await page.reload();
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await page.waitForTimeout(1500);
  dlg = await openHistory(page);
  const after = await waitUntil(async () => (await items.count()) >= 3 && (await items.allInnerTexts()));
  check('14 al recargar el historial sigue ahí, con la versión previa a restaurar', !!after && after[0].includes('antes de restaurar') && after.some((t) => t.includes('guardado')) && after.some((t) => t.includes('inicial')), JSON.stringify(after));
  await items.nth(0).click();
  check('14 la versión protegida conserva el cambio sin guardar', (await page.locator('[data-testid="history-diff"]').innerText()).includes('p sin guardar'));
  check('14 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
