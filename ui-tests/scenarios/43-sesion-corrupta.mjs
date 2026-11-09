import { check, openApp, openLogTab, waitUntil } from '../lib.mjs';

// Una sesión guardada dañada no se pierde en silencio: se avisa en el Registro y queda una copia del original.
const BAD = '{"projectName":"Mío","files":{"/main.pug":"p Hola';
export default async function (env) {
  const app = await openApp(env, { path: '/ide', storage: { 'pug-ide-project': BAD } });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 25000 });
  await openLogTab(page);
  const warned = await waitUntil(async () => /La sesión guardada no se pudo leer/.test(await page.locator('#panel-log').innerText()), 8000);
  check('43 avisa en el Registro de que la sesión no se pudo leer', !!warned, await page.locator('#panel-log').innerText());
  check('43 guarda una copia del original', (await page.evaluate(() => localStorage.getItem('pug-ide-project-corrupt'))) === BAD);
  check('43 la app arranca con un proyecto', (await page.locator('app-file-tree .file-item').count()) > 0);
  check('43 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
