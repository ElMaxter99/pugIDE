import { check, openApp, previewText, waitUntil, CMD } from '../lib.mjs';

const MAIN = "doctype html\nhtml\n  body\n    h1 Informe de septiembre\n    img(src='images/logo.svg' alt='')\n    p versión base\n";
const session = {
  projectName: 'Informe',
  files: { '/main.pug': MAIN },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="red"/></svg>');
const model = (page, path = '/main.pug') => page.evaluate((p) => window.monaco.editor.getModels().find((m) => m.uri.path === p)?.getValue() ?? null, path);
const setModel = (page, text) => page.evaluate((t) => window.monaco.editor.getModels().find((m) => m.uri.path === '/main.pug').setValue(t), text);

// Instantáneas del proyecto: guardar, listar, comparar tras editar, restaurar (con copia automática), eliminar, tope de 20 y persistencia
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await waitUntil(async () => (await previewText(page)).includes('Informe de septiembre'));

  // Un asset y un idioma forman parte del proyecto
  await page.locator('input[type="file"][multiple]').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: svg });
  await page.locator('app-file-tree .file-item', { hasText: 'logo.svg' }).waitFor({ timeout: 8000 });

  const dlg = page.locator('[role="dialog"][aria-label="Instantáneas del proyecto"]');
  const rows = dlg.locator('[data-testid="snapshot-row"]');
  const open = async () => {
    await page.locator('[data-testid="open-snapshots"]').click();
    await dlg.waitFor({ timeout: 4000 });
  };
  const rowTexts = async () => (await rows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));
  const save = async (name) => {
    const before = await rows.count();
    await dlg.locator('[data-testid="snapshot-name"]').fill(name);
    await dlg.locator('[data-testid="snapshot-save"]').click();
    return before;
  };

  // --- Vacío, guardar y listar ---
  await open();
  check('29 el botón de la barra abre el diálogo y empieza vacío', !!(await waitUntil(async () => (await dlg.locator('[data-testid="snapshot-empty"]').count()) === 1)) && (await dlg.innerText()).includes('0 de 20 instantáneas'), await dlg.innerText());
  check('29 el foco entra en el diálogo', await page.evaluate(() => !!document.querySelector('[role="dialog"][aria-label="Instantáneas del proyecto"]')?.contains(document.activeElement)));
  await save('Versión base');
  check('29 guardar añade una fila con nombre, archivos, assets y tamaño', !!(await waitUntil(async () => (await rows.count()) === 1)) && (await rowTexts())[0].includes('Versión base') && (await rowTexts())[0].includes('1 archivo · 1 asset') && /\d+ B|\d+ KB/.test((await rowTexts())[0]), JSON.stringify(await rowTexts()));
  check('29 avisa de que se guardó y actualiza el contador', !!(await waitUntil(async () => (await dlg.locator('[data-testid="snapshot-notice"]').count()) === 1)) && (await dlg.locator('[data-testid="snapshot-count"]').innerText()).startsWith('1 de 20'));
  await page.keyboard.press('Escape');
  await dlg.waitFor({ state: 'detached' });
  check('29 Escape cierra y el foco vuelve al botón', await waitUntil(async () => page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'open-snapshots')));

  // --- Editar el proyecto: archivo modificado (sin guardar) y archivo nuevo ---
  const edited = MAIN.replace('versión base', 'versión editada').replace('septiembre', 'octubre');
  await setModel(page, edited);
  await waitUntil(async () => (await previewText(page)).includes('versión editada'));
  await page.locator('button[title="Nuevo archivo"]').click();
  await page.locator('app-dialog [role="dialog"] input').fill('/nuevo.pug');
  await page.keyboard.press('Enter');
  await page.locator('app-file-tree .file-item', { hasText: 'nuevo.pug' }).waitFor({ timeout: 6000 });
  await page.locator('button.tab-main[title="/main.pug"]').click();

  // --- Comparar ---
  await open();
  await rows.first().locator('[data-testid="snapshot-compare"]').click();
  const cmp = page.locator('[role="dialog"][aria-label="Comparar instantánea"]');
  await cmp.waitFor({ timeout: 4000 });
  const counts = cmp.locator('[data-testid="compare-counts"]');
  check('29 comparar cuenta añadidos y modificados', !!(await waitUntil(async () => /1\s*añadido.*0\s*eliminados.*1\s*modificado/s.test(await counts.innerText().catch(() => '')))), await counts.innerText().catch(() => ''));
  const entries = cmp.locator('[data-testid="compare-entry"]');
  const entryTexts = await entries.allInnerTexts();
  check('29 lista los archivos que cambiaron con su estado', entryTexts.length === 2 && entryTexts.some((t) => t.includes('/main.pug') && t.includes('modificado')) && entryTexts.some((t) => t.includes('/nuevo.pug') && t.includes('añadido')), JSON.stringify(entryTexts));
  const diffBox = cmp.locator('[data-testid="compare-diff"]');
  const diffText = await diffBox.innerText();
  check('29 el diff del archivo elegido muestra lo quitado (−) y lo añadido (+) desde la instantánea', diffText.includes('− ') && diffText.includes('h1 Informe de septiembre') && diffText.includes('+ ') && diffText.includes('h1 Informe de octubre') && diffText.includes('versión editada'), diffText);
  await entries.nth(1).click();
  check('29 elegir otro archivo cambia el diff', !!(await waitUntil(async () => (await diffBox.innerText()).includes('+ '))));
  await cmp.locator('[data-testid="compare-back"]').click();
  check('29 volver a la lista conserva las instantáneas', !!(await waitUntil(async () => (await dlg.isVisible()) && (await rows.count()) === 1)));

  // --- Restaurar ---
  await rows.first().locator('[data-testid="snapshot-restore"]').click();
  const confirm = page.locator('[role="dialog"][aria-label="Restaurar instantánea"]');
  await confirm.waitFor({ timeout: 4000 });
  const note = (await confirm.locator('[data-testid="restore-note"]').innerText()).replace(/\s+/g, ' ');
  check('29 la confirmación avisa de la copia automática «Antes de restaurar»', note.includes('Antes de restaurar «Versión base»'), note);
  check('29 y resume qué cambia', !!(await waitUntil(async () => (await confirm.locator('[data-testid="restore-summary"]').count()) === 1)) && (await confirm.locator('[data-testid="restore-summary"]').innerText()).includes('/nuevo.pug'));
  await page.keyboard.press('Escape');
  await confirm.waitFor({ state: 'detached' });
  check('29 Escape en la confirmación la cierra sin restaurar y deja el diálogo', (await dlg.isVisible()) && (await model(page)) === edited);
  await rows.first().locator('[data-testid="snapshot-restore"]').click();
  await confirm.waitFor({ timeout: 4000 });
  await confirm.locator('[data-testid="restore-confirm"]').click();
  await confirm.waitFor({ state: 'detached' });
  await dlg.waitFor({ state: 'detached' });
  check('29 restaurar devuelve el archivo a la instantánea', !!(await waitUntil(async () => (await model(page)) === MAIN)), String(await model(page)));
  check('29 y el preview la muestra', !!(await waitUntil(async () => (await previewText(page)).includes('Informe de septiembre') && !(await previewText(page)).includes('editada'))), await previewText(page));
  check('29 el archivo añadido después desaparece, el asset se conserva', !!(await waitUntil(async () => (await page.locator('app-file-tree .file-item', { hasText: 'nuevo.pug' }).count()) === 0)) && (await page.locator('app-file-tree .file-item', { hasText: 'logo.svg' }).count()) === 1);

  // Ctrl+Z deshace la restauración en el editor
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press(CMD + '+z');
  check('29 Ctrl+Z deshace la restauración', !!(await waitUntil(async () => (await model(page)) === edited)), String(await model(page)));
  await setModel(page, MAIN);

  // La copia automática está en la lista, marcada
  await open();
  const afterRestore = await waitUntil(async () => (await rows.count()) === 2 && (await rowTexts()));
  check('29 se guardó la copia «Antes de restaurar…», automática y la más reciente', !!afterRestore && afterRestore[0].includes('Antes de restaurar «Versión base»') && afterRestore[0].includes('automática') && afterRestore[1].includes('Versión base'), JSON.stringify(afterRestore));
  const ownDb = await page.evaluate(async () => {
    try { return (await indexedDB.databases()).map((d) => d.name).includes('pug-ide-snapshots'); } catch { return null; }
  });
  check('29 vive en su propia base IndexedDB «pug-ide-snapshots»', ownDb !== false);

  // Renombrar
  await rows.nth(1).locator('[data-testid="snapshot-rename"]').click();
  const input = rows.nth(1).locator('[data-testid="snapshot-rename-input"]');
  await input.fill('Cierre de septiembre');
  await input.press('Enter');
  check('29 renombrar cambia el nombre', !!(await waitUntil(async () => (await rowTexts())[1]?.includes('Cierre de septiembre'))), JSON.stringify(await rowTexts()));

  // Eliminar (pide confirmación)
  await rows.first().locator('[data-testid="snapshot-delete"]').click();
  check('29 eliminar pide confirmar antes de borrar', !!(await waitUntil(async () => (await rows.first().locator('[data-testid="snapshot-delete-confirm"]').count()) === 1)) && (await rows.count()) === 2);
  await rows.first().locator('[data-testid="snapshot-delete-confirm"]').click();
  check('29 confirmar elimina la instantánea', !!(await waitUntil(async () => (await rows.count()) === 1)) && (await rowTexts())[0].includes('Cierre de septiembre'), JSON.stringify(await rowTexts()));

  // --- Tope de 20 ---
  for (let i = 1; i <= 19; i++) {
    const before = await save(`Copia ${i}`);
    if (!(await waitUntil(async () => (await rows.count()) === before + 1, 8000))) break;
  }
  check('29 se pueden guardar hasta 20 instantáneas', (await rows.count()) === 20 && (await dlg.locator('[data-testid="snapshot-count"]').innerText()).includes('20 de 20 instantáneas · tope alcanzado'), await dlg.locator('[data-testid="snapshot-count"]').innerText());
  await save('Copia 20');
  const warn = dlg.locator('[data-testid="snapshot-replace"]');
  check('29 con 20, guardar otra avisa de cuál se eliminará y no guarda aún', !!(await waitUntil(async () => (await warn.count()) === 1)) && (await warn.innerText()).includes('«Cierre de septiembre»') && (await rows.count()) === 20, await warn.innerText().catch(() => ''));
  await dlg.locator('[data-testid="snapshot-replace-cancel"]').click();
  check('29 cancelar no elimina nada', !!(await waitUntil(async () => (await warn.count()) === 0)) && (await rows.count()) === 20 && (await rowTexts()).some((t) => t.includes('Cierre de septiembre')));
  await dlg.locator('[data-testid="snapshot-save"]').click();
  await warn.waitFor({ timeout: 3000 });
  await dlg.locator('[data-testid="snapshot-replace-confirm"]').click();
  check('29 confirmar guarda la nueva y elimina la más antigua', !!(await waitUntil(async () => {
    const t = await rowTexts();
    return t.length === 20 && t[0].includes('Copia 20') && !t.some((x) => x.includes('Cierre de septiembre'));
  })), JSON.stringify((await rowTexts()).slice(0, 2)));
  check('29 y lo dice', (await dlg.locator('[data-testid="snapshot-notice"]').innerText()).includes('Se eliminó la más antigua'));

  // Restaurar con el tope alcanzado avisa de la sustitución antes de confirmar
  await rows.nth(3).locator('[data-testid="snapshot-restore"]').click();
  await confirm.waitFor({ timeout: 4000 });
  check('29 restaurar con 20 avisa de que la copia automática elimina la más antigua', (await confirm.locator('[data-testid="restore-limit"]').innerText()).includes('Copia 1'), await confirm.innerText());
  await confirm.locator('[data-testid="restore-confirm"]').click();
  await confirm.waitFor({ state: 'detached' });
  await dlg.waitFor({ state: 'detached' });
  await open();
  check('29 tras restaurar siguen siendo 20 y está la copia automática', !!(await waitUntil(async () => (await rows.count()) === 20 && (await rowTexts())[0].includes('Antes de restaurar'))), JSON.stringify((await rowTexts()).slice(0, 1)));
  const lastNames = await rowTexts();
  await page.keyboard.press('Escape');
  await dlg.waitFor({ state: 'detached' });

  // --- Persisten al recargar ---
  await page.reload();
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await page.waitForTimeout(1500);
  await open();
  const persisted = await waitUntil(async () => (await rows.count()) === 20 && (await rowTexts()));
  check('29 al recargar las 20 instantáneas siguen ahí', !!persisted && persisted[0].includes('Antes de restaurar') && persisted.join('|') === lastNames.join('|'), JSON.stringify((persisted || []).slice(0, 2)));
  await page.keyboard.press('Escape');

  // --- Paleta de comandos ---
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type('Instantáneas del proyecto');
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts())[0] === 'Instantáneas del proyecto…');
  await page.keyboard.press('Enter');
  await dlg.waitFor({ timeout: 4000 });
  check('29 el comando de la paleta abre el diálogo', await dlg.isVisible());
  await page.keyboard.press('Escape');

  check('29 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
