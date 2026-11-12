import { strToU8 } from 'fflate';
import { check, openApp, previewText, waitUntil, confirmImport } from '../lib.mjs';

const PUG = "doctype html\nhtml\n  body\n    h1= t('HOME.TITLE')\n    p= t('HOME.INTRO')\n";
const session = (files) => ({ projectName: 'Idiomas', files, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' });
const file = (name, content) => ({ name, type: 'application/json', b64: Buffer.from(strToU8(content)).toString('base64') });
const files = (page) => page.evaluate(() => [...document.querySelectorAll('.file-tree [data-path]')].map((e) => e.getAttribute('data-path')));
const model = (page, path) => page.evaluate((p) => window.monaco.editor.getModels().find((m) => m.uri.path === p)?.getValue() ?? null, path);
async function openPalette(page, text, title) {
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type(text);
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts())[0] === title);
}
async function drop(page, list) {
  await page.evaluate((fs) => {
    const dt = new DataTransfer();
    for (const f of fs) dt.items.add(new File([Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0))], f.name, { type: f.type }));
    const tree = document.querySelector('.file-tree');
    tree.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    tree.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, list);
}

// P-14: importar un archivo de idioma desde «Añadir idioma» y al soltar un JSON de textos
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session: session({ '/main.pug': PUG }) });
  const { page } = app;
  await page.locator('.file-tree').waitFor();

  // 1. «Añadir idioma → Importar archivo…»
  await openPalette(page, 'Añadir idioma', 'Añadir idioma…');
  await page.keyboard.press('Enter');
  const extra = page.locator('app-dialog .dialog-extra');
  await extra.waitFor({ timeout: 5000 });
  check('42 el diálogo «Añadir idioma» ofrece «Importar archivo .json…»', /Importar archivo/.test(await extra.innerText()));
  const chooser = page.waitForEvent('filechooser');
  await extra.click();
  await (await chooser).setFiles({ name: 'es-ES.json', mimeType: 'application/json', buffer: Buffer.from('{ "HOME.TITLE": "Hola", "HOME.INTRO": "Bienvenido" }') });
  const dlg = page.locator('app-import-locale-dialog [role="dialog"]');
  await dlg.waitFor({ timeout: 5000 });
  check('42 propone el código del nombre del archivo', (await page.locator('app-import-locale-dialog input.input').inputValue()) === 'es-ES');
  await page.locator('app-import-locale-dialog .btn.primary').click();
  const ok = await waitUntil(async () => (await files(page)).includes('/locales/es-ES/translations.json'), 6000);
  check('42 importar crea locales/es-ES/translations.json', !!ok, (await files(page)).join(','));
  const nested = await waitUntil(async () => /"HOME": \{/.test((await model(page, '/locales/es-ES/translations.json')) ?? ''), 4000);
  check('42 las claves planas quedan anidadas', !!nested, String(await model(page, '/locales/es-ES/translations.json')));
  check('42 el preview usa el idioma importado', !!(await waitUntil(async () => (await previewText(page)).includes('Bienvenido'), 8000)), await previewText(page));

  // 2. El idioma ya existe: fusionar por defecto
  await drop(page, [file('es-ES.json', '{ "HOME": { "TITLE": "Otro", "NEW": "n" } }')]);
  await dlg.waitFor({ timeout: 5000 });
  check('42 al soltar un JSON de textos pregunta si es un idioma', /¿Es un archivo de idioma\?/.test(await dlg.innerText()));
  check('42 avisa de que el idioma ya existe y fusiona por defecto', /ya existe/.test(await dlg.innerText()) && (await page.locator('app-import-locale-dialog input[type=radio]').first().isChecked()));
  await page.locator('app-import-locale-dialog .btn.primary').click();
  const merged = await waitUntil(async () => /"NEW": "n"/.test((await model(page, '/locales/es-ES/translations.json')) ?? ''), 4000);
  const after = (await model(page, '/locales/es-ES/translations.json')) ?? '';
  check('42 fusionar añade lo nuevo y no pisa lo traducido', !!merged && /"TITLE": "Hola"/.test(after), after);

  // 3. «Es un dato más»: se añade como archivo normal
  await drop(page, [file('textos.json', '{ "a": "b" }'), file('lista-es.json', '{ "A": "b" }')]);
  await confirmImport(page);
  await drop(page, [file('translations.json', '{ "HOME": { "TITLE": "x" } }')]);
  await dlg.waitFor({ timeout: 5000 });
  await page.locator('app-import-locale-dialog .btn.secondary').click();
  const kept = await waitUntil(async () => (await files(page)).includes('/translations.json'), 4000);
  check('42 «Es un dato más» lo deja como archivo del proyecto', !!kept, (await files(page)).join(','));
  const plain = await waitUntil(async () => (await files(page)).includes('/textos.json'), 4000);
  check('42 un JSON con otro nombre no pregunta nada', !!plain && (await page.locator('app-import-locale-dialog [role="dialog"]').count()) === 0, (await files(page)).join(','));
  check('42 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
