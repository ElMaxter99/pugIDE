import { check, openApp, previewText, waitUntil } from '../lib.mjs';

const PUG = "doctype html\nhtml\n  body\n    h1= t('HOME.TITLE')\n    p= t('HOME.INTRO')\n";
const session = {
  projectName: 'Idiomas',
  files: {
    '/main.pug': PUG,
    '/locales/es-ES/translations.json': '{\n  "HOME": { "TITLE": "Hola", "INTRO": "Bienvenido" }\n}\n',
    '/locales/es-CAT/translations.json': '{\n  "HOME": { "TITLE": "Hola (cat)", "INTRO": "Benvingut" }\n}\n',
  },
  openTabPaths: ['/main.pug', '/locales/es-ES/translations.json', '/locales/es-CAT/translations.json'],
  activeTabPath: '/main.pug',
};
const model = (page, path) => page.evaluate((p) => window.monaco.editor.getModels().find((m) => m.uri.path === p)?.getValue() ?? null, path);

// Traducciones por idioma: selector en el preview, persistencia, añadir idioma y pestañas con nombre repetido
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  const select = page.locator('[data-testid="preview-locale"]');
  await select.waitFor({ timeout: 6000 });
  check('10 el selector lista los idiomas del proyecto', (await select.locator('option').allInnerTexts()).join() === 'es-CAT,es-ES');
  check('10 empieza en el primero', (await previewText(page)).includes('Benvingut'), await previewText(page));

  await select.selectOption('es-ES');
  const es = await waitUntil(async () => (await previewText(page)).includes('Bienvenido'));
  check('10 cambiar de idioma cambia el texto del preview', !!es, await previewText(page));
  await page.reload();
  await select.waitFor({ timeout: 8000 });
  const kept = await waitUntil(async () => (await select.inputValue()) === 'es-ES' && (await previewText(page)).includes('Bienvenido'), 8000);
  check('10 el idioma elegido se conserva al recargar', !!kept, `${await select.inputValue()} / ${await previewText(page)}`);

  const labels = await page.locator('.tab-name').allInnerTexts();
  check('10 las pestañas con el mismo nombre muestran su carpeta', labels.includes('es-ES/translations.json') && labels.includes('es-CAT/translations.json'), JSON.stringify(labels));

  // Una clave nueva en la plantilla llega, vacía, a los archivos de idioma (también al modelo abierto de Monaco)
  await page.locator('.tab', { hasText: 'es-ES/translations.json' }).click();
  await page.locator('.tab', { hasText: 'main.pug' }).click();
  await waitUntil(() => page.evaluate(() => window.monaco.editor.getEditors()[0].getModel()?.uri.path === '/main.pug'));
  await page.evaluate((src) => window.monaco.editor.getModels().find((m) => m.uri.path === '/main.pug').setValue(src), PUG + "    p= t('HOME.EXTRA')\n");
  const synced = await waitUntil(async () => (await model(page, '/locales/es-ES/translations.json'))?.includes('"EXTRA": ""'), 8000);
  check('10 la clave nueva aparece en el editor del archivo de idioma abierto', !!synced, String(await model(page, '/locales/es-ES/translations.json')));

  // Añadir idioma desde la paleta
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type('Añadir idioma');
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts()).join('|') === 'Añadir idioma…');
  await page.keyboard.press('Enter');
  const input = page.locator('app-dialog input');
  await input.waitFor({ timeout: 4000 });
  await input.fill('en');
  await page.keyboard.press('Enter');
  const added = await waitUntil(async () => (await select.locator('option').allInnerTexts()).join() === 'en,es-CAT,es-ES' && (await select.inputValue()) === 'en', 8000);
  check('10 añadir un idioma lo crea y lo activa', !!added, (await select.locator('option').allInnerTexts()).join());
  const cat = await waitUntil(async () => (await previewText(page)).includes('HOME.TITLE'), 8000);
  check('10 el idioma nuevo muestra las claves hasta traducirlas', !!cat, await previewText(page));
  check('10 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
