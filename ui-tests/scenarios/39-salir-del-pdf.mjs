import { check, openApp, previewText, waitUntil } from '../lib.mjs';

const session = {
  projectName: 'Salir del PDF',
  files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Informe\n' },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};

const prefsOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pug-ide-preferences') ?? '{}'));
/** Título del segmento de dispositivo marcado (`aria-pressed`), o `null` si ninguno lo está. */
const activeDevice = (page) => page.evaluate(() => document.querySelector('app-preview-panel .device-switcher button[aria-pressed="true"]')?.getAttribute('aria-label') ?? null);
const waitDevice = async (page, title) => !!(await waitUntil(async () => (await activeDevice(page)) === title));
/** Espera a que las preferencias guardadas cumplan `fn` y las devuelve (o `null` si no llegan a cumplirla). */
const waitPrefs = (page, fn) => waitUntil(async () => { const p = await prefsOf(page); return fn(p) ? p : null; });
const waitLayout = (page, id) => waitPrefs(page, (p) => p.layout === id);
const PDF = 'PDF / página impresa';

async function fromMenu(page, label) {
  await page.locator('[data-testid="layout-menu"]').click();
  const menu = page.locator('[role="menu"]');
  await menu.waitFor({ timeout: 4000 });
  await menu.getByRole('menuitemradio', { name: label }).click();
  await menu.waitFor({ state: 'detached', timeout: 4000 });
}
async function pressLayout(page, n) {
  await page.keyboard.press(`Control+Alt+${n}`);
}
async function boot(env, extra = {}) {
  const app = await openApp(env, { path: '/ide', session, ...extra });
  await app.page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await waitUntil(async () => (await previewText(app.page)).includes('Informe'));
  await app.page.locator('[data-testid="layout-menu"]').waitFor();
  return app;
}

// Salir de «Foco en la vista previa · PDF» devuelve el dispositivo que había (salvo que se haya elegido otro a mano)
export default async function (env) {
  // --- Escritorio → PDF (Ctrl+Alt+4) → Ctrl+Alt+1 ---
  let app = await boot(env);
  let page = app.page;
  check('39 de partida el preview está en Escritorio', await waitDevice(page, 'Escritorio'), String(await activeDevice(page)));
  await pressLayout(page, 4);
  check('39 Ctrl+Alt+4 pone el modo PDF', await waitDevice(page, PDF), String(await activeDevice(page)));
  let p = await waitPrefs(page, (x) => x.layout === 'focus-preview' && x.previewDevice === 'PDF' && x.deviceBeforePdf?.name === 'Desktop');
  check('39 recuerda el Escritorio (con su tamaño) y no guarda «PDF» como dispositivo recordado', !!p && p.deviceBeforePdf.width > 0 && p.deviceBeforePdf.height > 0, JSON.stringify(await prefsOf(page)));
  await pressLayout(page, 1);
  check('39 Ctrl+Alt+1 vuelve a Escritorio', await waitDevice(page, 'Escritorio'), String(await activeDevice(page)));
  p = await waitPrefs(page, (x) => x.layout === 'editor-preview' && x.previewDevice === 'Desktop' && !x.deviceBeforePdf);
  check('39 y lo recordado se borra (las preferencias dicen Escritorio)', !!p, JSON.stringify(await prefsOf(page)));

  // --- Móvil → PDF → «Foco en el editor» desde el menú «Disposición» ---
  await page.getByRole('button', { name: 'Móvil', exact: true }).click();
  check('39 se elige Móvil a mano', await waitDevice(page, 'Móvil'), String(await activeDevice(page)));
  await pressLayout(page, 4);
  check('39 Móvil → Ctrl+Alt+4: PDF', await waitDevice(page, PDF), String(await activeDevice(page)));
  await fromMenu(page, /Foco en el editor/);
  check('39 desde el menú «Disposición» a «Foco en el editor» vuelve a Móvil', await waitDevice(page, 'Móvil'), String(await activeDevice(page)));
  check('39 y la disposición es la elegida', !!(await waitLayout(page, 'focus-editor')), JSON.stringify(await prefsOf(page)));

  // --- Pulsar Ctrl+Alt+4 dos veces no pierde lo recordado ---
  await pressLayout(page, 4);
  await waitDevice(page, PDF);
  await pressLayout(page, 4);
  await waitLayout(page, 'focus-preview');
  p = await prefsOf(page);
  check('39 repetir Ctrl+Alt+4 estando ya en PDF mantiene el Móvil recordado', p.deviceBeforePdf?.name === 'Mobile', JSON.stringify(p));
  await pressLayout(page, 2);
  check('39 salir con Ctrl+Alt+2 vuelve a Móvil', await waitDevice(page, 'Móvil'), String(await activeDevice(page)));

  // --- Elegir a mano otro dispositivo estando en PDF: no se vuelve a nada ---
  await pressLayout(page, 4);
  await waitDevice(page, PDF);
  await page.getByRole('button', { name: 'Tableta', exact: true }).click();
  check('39 en PDF se elige Tableta a mano', await waitDevice(page, 'Tableta'), String(await activeDevice(page)));
  p = await waitPrefs(page, (x) => x.previewDevice === 'Tablet' && !x.deviceBeforePdf);
  check('39 elegirlo a mano borra lo recordado', !!p, JSON.stringify(await prefsOf(page)));
  await pressLayout(page, 1);
  await waitLayout(page, 'editor-preview');
  check('39 y al cambiar de disposición se queda en Tableta (no vuelve a Móvil)', (await activeDevice(page)) === 'Tableta', String(await activeDevice(page)));

  // --- El PDF elegido a mano (sin la disposición): entrar y salir no cambia el dispositivo a otro ---
  await page.getByRole('button', { name: PDF, exact: true }).click();
  check('39 se elige el modo PDF a mano', await waitDevice(page, PDF), String(await activeDevice(page)));
  await pressLayout(page, 4);
  await waitLayout(page, 'focus-preview');
  p = await prefsOf(page);
  check('39 entrar en la disposición PDF estando ya en PDF no recuerda nada', !p.deviceBeforePdf && p.previewDevice === 'PDF', JSON.stringify(p));
  await pressLayout(page, 3);
  await waitLayout(page, 'focus-editor');
  check('39 salir sigue en PDF (no se inventa un dispositivo)', (await activeDevice(page)) === PDF && (await prefsOf(page)).previewDevice === 'PDF', String(await activeDevice(page)));

  // --- Un dispositivo girado se recuerda con su tamaño ---
  await page.getByRole('button', { name: 'Móvil', exact: true }).click();
  await waitDevice(page, 'Móvil');
  await page.getByRole('button', { name: 'Girar', exact: true }).click();
  await pressLayout(page, 4);
  p = await waitPrefs(page, (x) => x.layout === 'focus-preview' && x.deviceBeforePdf?.name === 'Mobile');
  check('39 el Móvil girado se recuerda con su tamaño girado (más ancho que alto)', !!p && p.deviceBeforePdf.width > p.deviceBeforePdf.height, JSON.stringify(await prefsOf(page)));
  await pressLayout(page, 1);
  check('39 y al salir vuelve a Móvil', await waitDevice(page, 'Móvil'), String(await activeDevice(page)));

  // --- Nada de esto viaja con el proyecto ---
  const stored = await page.evaluate(() => localStorage.getItem('pug-ide-project') ?? '');
  check('39 el proyecto guardado no lleva el dispositivo recordado ni la disposición', !/deviceBeforePdf|previewDevice|"layout"/.test(stored), stored.slice(0, 200));
  check('39 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();

  // --- Recargar estando en la disposición PDF: lo recordado sobrevive y al salir se vuelve a ello ---
  app = await boot(env);
  page = app.page;
  await waitDevice(page, 'Escritorio');
  await pressLayout(page, 4);
  await waitDevice(page, PDF);
  await waitPrefs(page, (x) => x.deviceBeforePdf?.name === 'Desktop');
  await page.reload();
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  check('39 tras recargar sigue en PDF con la disposición de foco', await waitDevice(page, PDF), String(await activeDevice(page)));
  await pressLayout(page, 1);
  check('39 y al salir vuelve al Escritorio recordado antes de recargar', await waitDevice(page, 'Escritorio'), String(await activeDevice(page)));
  check('39 sin errores', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // --- Preferencias antiguas o a mano con un recuerdo no válido: se descarta, no rompe nada ---
  app = await boot(env, { prefs: { previewDevice: 'PDF', layout: 'focus-preview', deviceBeforePdf: { name: 'PDF', width: 0, height: 0 } } });
  page = app.page;
  check('39 con un recuerdo «PDF» no válido en las preferencias carga en PDF sin romper', await waitDevice(page, PDF), String(await activeDevice(page)));
  await pressLayout(page, 1);
  await waitLayout(page, 'editor-preview');
  check('39 salir sin nada que recordar deja el modo PDF', (await activeDevice(page)) === PDF, String(await activeDevice(page)));
  check('39 y el recuerdo no válido ya no está en las preferencias guardadas', !(await prefsOf(page)).deviceBeforePdf, JSON.stringify(await prefsOf(page)));
  check('39 sin errores (preferencias no válidas)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
