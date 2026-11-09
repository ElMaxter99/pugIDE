import { check, openApp, waitUntil } from '../lib.mjs';

// Los menús desplegables nunca se salen de la ventana ni los recorta un panel: el «⋯» de Datos, abierto desde el panel lateral
// (estrecho y pegado al borde izquierdo), salía cortado por la izquierda y por abajo.
const session = { projectName: 'Menús', files: { '/main.pug': 'p= nombre\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };
const inside = (page, sel) => page.evaluate((s) => {
  const m = document.querySelector(s);
  if (!m) return null;
  const b = m.getBoundingClientRect();
  return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, vw: innerWidth, vh: innerHeight, scrolls: m.scrollHeight > m.clientHeight + 1 };
}, sel);
const fits = (r) => !!r && r.left >= 0 && r.right <= r.vw && r.top >= 0 && r.bottom <= r.vh;

export default async function (env) {
  // --- «⋯» de Datos en el panel lateral, con la ventana alta y con una baja ---
  for (const [name, viewport] of [['alta', { width: 1400, height: 850 }], ['baja', { width: 1280, height: 520 }]]) {
    const app = await openApp(env, { path: '/ide', session, viewport });
    const { page } = app;
    await page.locator('.monaco-editor').first().waitFor({ timeout: 25000 });
    await page.getByRole('tab', { name: /Datos/ }).click();
    await page.locator('[data-testid="data-more-menu"]').click();
    const menu = page.locator('app-dataset-bar [role="menu"]');
    await menu.waitFor({ timeout: 4000 });
    await page.waitForTimeout(300);
    const r = await inside(page, 'app-dataset-bar [role="menu"]');
    check(`47b el menú «⋯» de Datos cabe en la ventana (${name})`, fits(r), JSON.stringify(r));
    const items = await menu.locator('[role="menuitem"]').count();
    check(`47b y se ven todas sus opciones o se puede hacer scroll (${name})`, items >= 8 && (!r.scrolls || r.bottom <= r.vh), `${items} ${JSON.stringify(r)}`);
    if (name === 'baja') {
      await menu.locator('[role="menuitem"]').last().scrollIntoViewIfNeeded();
      const last = await menu.locator('[role="menuitem"]').last().boundingBox();
      check('47b con la ventana baja la última opción se alcanza con scroll', !!last && last.y + last.height <= 520, JSON.stringify(last));
    }
    await page.keyboard.press('Escape');
    await app.close();
  }

  // --- El resto de menús sigue donde estaba (junto a su botón y dentro de la ventana) ---
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 25000 });
  for (const [testid, sel, label] of [['menu-proyecto', 'app-topbar [role="menu"]', 'Proyecto'], ['menu-exportar', 'app-topbar [role="menu"]', 'Exportar'], ['layout-menu', 'app-statusbar [role="menu"]', 'Disposición'], ['preview-view-menu', 'app-preview-panel [role="menu"]', 'Vista']]) {
    await page.locator(`[data-testid="${testid}"]`).click();
    await page.locator(sel).first().waitFor({ timeout: 4000 });
    await page.waitForTimeout(250);
    const r = await inside(page, sel);
    check(`47b el menú «${label}» cabe en la ventana`, fits(r), JSON.stringify(r));
    if (testid === 'layout-menu') {
      const trig = await page.locator(`[data-testid="${testid}"]`).boundingBox();
      check('47b el menú de la barra de estado se abre hacia arriba', r.bottom <= trig.y + 1, JSON.stringify({ r, trig }));
    }
    await page.keyboard.press('Escape');
    await waitUntil(async () => (await page.locator(sel).count()) === 0, 2000);
  }
  check('47b sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
