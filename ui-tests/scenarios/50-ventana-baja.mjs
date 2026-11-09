import { check, openApp, waitUntil } from '../lib.mjs';

// P-19: una interfaz usable con ventana baja o zoom al 200 %.
const FILES = { '/main.pug': 'html\n  body\n    h1= titulo\n    +falta()\n' };
const session = { projectName: 'Baja', files: FILES, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };
const box = (page, sel) => page.locator(sel).first().boundingBox();
const open = async (env, w, h) => {
  const app = await openApp(env, { path: '/ide', session, viewport: { width: w, height: h } });
  await app.page.locator('app-topbar').waitFor();
  await app.page.waitForTimeout(300);
  return app;
};
const inside = (b, w, h) => !!b && b.x >= -1 && b.y >= -1 && b.x + b.width <= w + 1 && b.y + b.height <= h + 1;

export default async function (env) {
  // --- 1440 × 900: como siempre ---
  let app = await open(env, 1440, 900);
  let panel = await box(app.page, 'section.app-terminal');
  check('50 con 900 px de alto el panel inferior mide 240 px', !!panel && Math.abs(panel.height - 240) <= 1, JSON.stringify(panel));
  check('50 y la barra superior es la completa (con el texto del buscador)', (await app.page.locator('.search-text').count()) === 1 && (await app.page.locator('app-topbar .logo a').innerText()).trim() === 'PugIDE');
  await app.close();

  // --- 960 × 540: el panel mide clamp(120, 33 vh, 240) = 178 px y el editor conserva sitio ---
  app = await open(env, 960, 540);
  panel = await box(app.page, 'section.app-terminal');
  check('50 con 540 px de alto el panel inferior mide ≈178 px', !!panel && Math.abs(panel.height - 178) <= 2, JSON.stringify(panel));
  const ed = await box(app.page, 'app-editor-panel');
  check('50 y el editor se queda con más de 240 px de alto', !!ed && ed.height >= 240, JSON.stringify(ed));
  check('50 sin franja: el panel se ve entero', (await app.page.locator('[data-testid="bottom-strip"]').count()) === 0);
  await app.close();

  // --- 960 × 480: el editor quedaría bajo 240 px → el panel se recoge en una franja ---
  app = await open(env, 960, 480);
  const { page } = app;
  const strip = page.locator('[data-testid="bottom-strip"]');
  await strip.waitFor({ timeout: 5000 });
  const sb = await strip.boundingBox();
  check('50 con el editor bajo el panel se recoge en una franja de 34 px', !!sb && Math.abs(sb.height - 34) <= 1 && (await page.locator('section.app-terminal').count()) === 0, JSON.stringify(sb));
  check('50 la franja dice cuántos errores hay', /\d+ error(es)?/.test(await strip.innerText()), await strip.innerText());
  const edLow = await box(page, 'app-editor-panel');
  check('50 y el editor gana ese sitio (más de 240 px)', !!edLow && edLow.height >= 240, JSON.stringify(edLow));
  await strip.click();
  const over = page.locator('section.app-terminal.overlay');
  await over.waitFor({ timeout: 4000 });
  const ob = await over.boundingBox();
  const content = await box(page, '.app-content');
  check('50 «Mostrar» abre el panel sobre el editor (≈60 % del alto)', !!ob && !!content && Math.abs(ob.height / content.height - 0.6) < 0.05, JSON.stringify({ ob, content }));
  check('50 con los botones de arreglo a la vista', (await over.locator('.diag-fix').count()) === 1 && inside(await over.locator('.diag-fix').boundingBox(), 960, 480));
  await page.keyboard.press('Control+j');
  check('50 Ctrl+J lo recoge de nuevo', !!(await waitUntil(async () => (await strip.count()) === 1, 3000)));
  await page.keyboard.press('Control+j');
  check('50 y lo vuelve a abrir', !!(await waitUntil(async () => (await over.count()) === 1, 3000)));
  await page.locator('app-problems-panel').first().focus().catch(() => undefined);
  await page.locator('.diag-go').first().focus();
  await page.keyboard.press('Escape');
  check('50 Esc dentro del panel abierto lo recoge', !!(await waitUntil(async () => (await strip.count()) === 1, 3000)));
  await app.close();

  // --- 640 × 360: barra superior y de estado compactas ---
  app = await open(env, 640, 360);
  const p2 = app.page;
  const save = await p2.getByRole('button', { name: 'Guardar', exact: true }).boundingBox();
  check('50 a 640 px «Guardar» está dentro de la ventana', inside(save, 640, 360), JSON.stringify(save));
  const theme = await p2.locator('button[title="Cambiar tema claro u oscuro"]').boundingBox();
  check('50 y el botón de tema también', inside(theme, 640, 360), JSON.stringify(theme));
  const search = await p2.locator('[data-testid="open-palette"]').boundingBox();
  check('50 el buscador pasa a un botón con icono (la paleta sigue abriéndose)', inside(search, 640, 360) && search.width <= 40 && (await p2.locator('.search-text').count()) === 0);
  check('50 el logo se reduce a la «P» sin perder su nombre', (await p2.locator('app-topbar .logo a').innerText()).trim() === 'P' && (await p2.locator('app-topbar .logo a').getAttribute('aria-label')) === 'PugIDE');
  check('50 «Proyecto» y «Exportar» son solo icono, con nombre', (await p2.locator('[data-testid="menu-proyecto"]').getAttribute('aria-label')) === 'Proyecto' && ((await p2.locator('[data-testid="menu-proyecto"]').boundingBox())?.width ?? 99) <= 40);
  const status = await p2.evaluate(() => { const b = document.querySelector('app-statusbar .statusbar'); const r = b.getBoundingClientRect(); return { h: r.height, fits: b.scrollWidth <= b.clientWidth + 1 }; });
  check('50 la barra de estado cabe en una línea de 32 px', Math.abs(status.h - 32) <= 1 && status.fits, JSON.stringify(status));
  check('50 sin «Compilado en N ms», UTF-8 ni lenguaje', !/Compilado en|UTF-8/.test(await p2.locator('app-statusbar').innerText()));
  await p2.locator('[data-testid="open-palette"]').click();
  check('50 la paleta se abre desde el botón del buscador', !!(await waitUntil(async () => (await p2.locator('[aria-label="Paleta de comandos"]').count()) === 1, 3000)));
  check('50 sin errores no controlados', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
