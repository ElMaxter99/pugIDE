import { brokenIcons, check, openApp, previewText, waitUntil } from '../lib.mjs';

const MAIN = "include mixins\ndoctype html\nhtml\n  body\n    h1 Informe\n    +noexiste(1)\n";
const session = {
  projectName: 'Iconos',
  files: { '/main.pug': MAIN, '/mixins.pug': 'mixin ok\n  p ok\n' },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};
const icons = (page) => page.locator('.material-symbols-outlined:visible').count();

// Los iconos vienen en el paquete (fuente recortada, sin CDN): ninguno puede quedarse como texto («screen_rotation»)
export default async function (env) {
  // Dispositivo móvil: sale el botón de girar, que usaba un alias antiguo que la fuente recortada no traía
  const app = await openApp(env, { path: '/ide', session, prefs: { previewDevice: 'Mobile' } });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await waitUntil(async () => (await icons(page)) > 10);
  await page.locator('app-preview-panel button[aria-label="Girar"]').waitFor({ timeout: 6000 });
  check('38 el botón de girar (móvil) tiene su icono y no el texto', (await brokenIcons(page)).length === 0, JSON.stringify(await brokenIcons(page)));
  check('38 el botón de girar mide como un icono', (await page.locator('app-preview-panel button[aria-label="Girar"] .material-symbols-outlined').boundingBox()).width < 30);

  // Menús abiertos, panel de problemas (hay un error) y pestaña de datos
  for (const [name, trigger] of [['Proyecto', '[data-testid="menu-proyecto"]'], ['Exportar', '[data-testid="menu-exportar"]'], ['Vista', '[data-testid="preview-view-menu"]']]) {
    await page.locator(trigger).click();
    await page.locator('[role="menu"]').first().waitFor();
    check(`38 menú «${name}»: todos sus iconos se dibujan`, (await brokenIcons(page)).length === 0, JSON.stringify(await brokenIcons(page)));
    await page.keyboard.press('Escape');
    await waitUntil(async () => (await page.locator('[role="menu"]').count()) === 0);
  }
  check('38 panel Problemas con un error: iconos dibujados', (await icons(page)) > 10 && (await brokenIcons(page)).length === 0, JSON.stringify(await brokenIcons(page)));
  await page.getByRole('tab', { name: 'Datos' }).first().click();
  await waitUntil(async () => (await page.locator('app-smart-data-editor').count()) > 0);
  check('38 pestaña Datos: iconos dibujados', (await brokenIcons(page)).length === 0, JSON.stringify(await brokenIcons(page)));
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  check('38 paleta de comandos: iconos dibujados', (await brokenIcons(page)).length === 0, JSON.stringify(await brokenIcons(page)));
  await page.keyboard.press('Escape');
  check('38 ni una petición externa (los iconos y fuentes vienen en el paquete)', app.external.length === 0, app.external.join(' | '));
  check('38 sin errores', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // Primer uso: bienvenida y recorrido
  const first = await openApp(env, { path: '/ide', welcome: true });
  await first.page.locator('[role="dialog"]').first().waitFor({ timeout: 8000 });
  check('38 bienvenida: iconos dibujados', (await brokenIcons(first.page)).length === 0, JSON.stringify(await brokenIcons(first.page)));
  await first.close();
}
