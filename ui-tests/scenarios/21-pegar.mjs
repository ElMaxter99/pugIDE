import { check, openApp, waitUntil } from '../lib.mjs';

const model = (page) => page.evaluate(() => window.monaco.editor.getEditors()[0].getModel().getValue());
const PUG = 'html\n  body\n    h1 Pegado con el teclado\n    //- línea con "comillas" y #{variable}\n';

export const browsers = ['chromium', 'firefox'];
export const why = 'el WebKit de Playwright no deja escribir en el portapapeles sin gesto del usuario: el pegado sale vacío';

// Pegar con el teclado (Ctrl+V) en el editor y en un campo de texto de la app.
// Regresión: el polyfill de `process` declaraba `versions.node` y Monaco, creyéndose en Node/Electron, enlazaba
// Ctrl+V por su cuenta; en Chromium y WebKit el navegador dejaba de pegar sin ningún error.
export default async function (env) {
  const app = await openApp(env, { path: '/ide' });
  const { page, context } = app;
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: env.baseURL }).catch(() => {});
  check('21 Monaco no cree estar en Node/Electron (sin process.versions.node)', (await page.evaluate(() => typeof globalThis.process?.versions?.node)) !== 'string');

  await page.locator('.monaco-editor').first().click();
  await page.evaluate((t) => navigator.clipboard.writeText(t), PUG);
  // Seleccionar todo por la API: Ctrl+A no es fiable en WebKit de Playwright; lo que se prueba es la tecla de pegar.
  await page.evaluate(() => { const e = window.monaco.editor.getEditors()[0]; e.setSelection(e.getModel().getFullModelRange()); });
  await page.keyboard.press('Control+v');
  const pasted = await waitUntil(async () => (await model(page)) === PUG, 4000);
  check('21 Ctrl+V pega en el editor y sustituye la selección', !!pasted, JSON.stringify((await model(page)).slice(0, 80)));

  await page.evaluate(() => { const e = window.monaco.editor.getEditors()[0]; const m = e.getModel(); const end = m.getFullModelRange().getEndPosition(); e.setPosition(end); e.focus(); });
  await page.keyboard.press('Control+v');
  const again = await waitUntil(async () => (await model(page)).split(PUG).length === 3, 4000);
  check('21 Ctrl+V pega también al final del documento (queda dos veces)', !!again);

  await page.keyboard.press('Control+Shift+f');
  const search = page.locator('app-project-search input').first();
  await search.waitFor({ timeout: 4000 });
  await search.focus();
  await page.keyboard.press('Control+v');
  check('21 Ctrl+V pega en el buscador del proyecto', (await waitUntil(async () => (await search.inputValue()).includes('Pegado con el teclado'), 3000)) !== null && (await search.inputValue()).length > 0);
  check('21 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
