import { check, openApp, waitUntil, previewText, sleep } from '../lib.mjs';

const session = {
  projectName: 'Informe',
  files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Informe trimestral\n    p= resumen\n' },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
  datasets: { version: 1, activeId: 'ds-1', locale: 'es', datasets: [{ id: 'ds-1', name: 'Por defecto', data: { resumen: 'Todo en orden' } }] },
};
const W = 1400; // ancho de la ventana de las pruebas
const box = async (page, sel) => (await page.locator(sel).first().boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
const widths = async (page) => ({
  side: Math.round((await box(page, 'app-sidebar')).width),
  editor: Math.round((await box(page, 'app-editor-panel')).width),
  data: (await page.locator('.app-body > app-smart-data-editor').count()) ? Math.round((await box(page, '.app-body > app-smart-data-editor')).width) : 0,
  preview: Math.round((await box(page, 'app-preview-panel')).width),
});
const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;
const prefsOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pug-ide-preferences') ?? '{}'));
const sep = (page, name) => page.locator(`[data-testid="resizer-${name}"]`);
const num = async (loc, attr) => Number(await loc.getAttribute(attr));
const menu = (page) => page.locator('app-statusbar [role="menu"]');

async function chooseLayout(page, label) {
  await page.locator('[data-testid="layout-menu"]').click();
  await menu(page).waitFor();
  await menu(page).getByText(label, { exact: true }).click();
  await menu(page).waitFor({ state: 'detached' });
}

// Disposición (P-08): pestañas Archivos | Datos, cuatro disposiciones con atajos, tiradores entre paneles y tamaños que se recuerdan
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await waitUntil(async () => (await previewText(page)).includes('Informe trimestral'));

  // --- Panel lateral con pestañas ---
  const tabs = page.locator('[role="tablist"][aria-label="Panel lateral"] [role="tab"]');
  check('36 el panel lateral tiene las pestañas Archivos y Datos', (await tabs.allInnerTexts()).map((t) => t.trim()).join('|') === 'Archivos|Datos');
  check('36 «Archivos» está seleccionada y enseña el árbol', (await tabs.nth(0).getAttribute('aria-selected')) === 'true' && (await page.locator('app-file-tree').isVisible()));
  check('36 los datos ya no son una columna propia', (await page.locator('.app-body > app-smart-data-editor').count()) === 0);
  await tabs.nth(1).click();
  await waitUntil(async () => (await page.locator('app-smart-data-editor .tree-view').isVisible()) && !(await page.locator('app-file-tree').isVisible()));
  check('36 «Datos» enseña el editor de datos (con su barra) y oculta el árbol', (await page.locator('app-smart-data-editor .tree-view').isVisible()) && !(await page.locator('app-file-tree').isVisible()) && (await page.locator('app-smart-data-editor').getByRole('button', { name: 'Regenerar' }).isVisible()));
  check('36 el panel de la pestaña está enlazado con ella (aria-controls)', (await tabs.nth(1).getAttribute('aria-controls')) === 'panel-datos' && (await page.locator('#panel-datos[role="tabpanel"]').isVisible()));
  await tabs.nth(1).focus();
  await page.keyboard.press('ArrowLeft');
  await waitUntil(async () => (await tabs.nth(0).getAttribute('aria-selected')) === 'true');
  check('36 ← vuelve a «Archivos» con el foco', (await tabs.nth(0).getAttribute('aria-selected')) === 'true' && (await page.evaluate(() => document.activeElement?.id)) === 'tab-archivos');
  check('36 la pestaña elegida se recuerda', (await prefsOf(page)).sidebarTab === 'archivos');

  // --- Disposición por defecto: 280 / editor / 660 ---
  let w = await widths(page);
  check('36 por defecto el panel lateral mide 280 y la vista previa ≈660 (≥640)', near(w.side, 280) && w.preview >= 640 && near(w.preview, 660), JSON.stringify(w));
  check('36 el editor no baja de 360', w.editor >= 360 && near(w.side + w.editor + w.preview, W, 3), JSON.stringify(w));
  const device = page.locator('app-preview-panel .device-switcher button').first();
  check('36 con el preview a ~660 px la barra enseña los textos (no solo iconos)', (await device.textContent()).includes('Escritorio') && (await page.locator('app-preview-panel .device-btn.icon-only').count()) === 0 && (await page.locator('app-preview-panel .inspector-btn').textContent()).includes('Inspector'));
  check('36 el menú de disposición de la barra de estado lo dice', (await page.locator('[data-testid="layout-menu"]').innerText()).includes('Editor + vista previa'));

  // --- Menú «Disposición» ---
  await page.locator('[data-testid="layout-menu"]').click();
  await menu(page).waitFor();
  const rows = await menu(page).locator('[role="menuitemradio"]').evaluateAll((els) => els.map((e) => ({ t: e.textContent.replace(/\s+/g, ' ').trim(), on: e.getAttribute('aria-checked') })));
  const mb = await menu(page).boundingBox();
  const tb = await box(page, '[data-testid="layout-menu"]');
  check('36 el menú se abre hacia arriba, con las cuatro disposiciones y su atajo, y marca la activa', rows.length === 4 && rows[0].on === 'true' && rows.every((r, i) => r.t.includes(`Ctrl+Alt+${i + 1}`)) && mb.y + mb.height <= tb.y + 2, JSON.stringify({ rows, mb, tb }));
  check('36 trae también Panel lateral (Ctrl+B), Panel inferior (Ctrl+J) y Restablecer los tamaños', (await menu(page).getByText('Panel lateral').count()) === 1 && (await menu(page).getByText('Ctrl+J').count()) === 1 && (await menu(page).getByText('Restablecer los tamaños').count()) === 1);
  await page.keyboard.press('Escape');
  await menu(page).waitFor({ state: 'detached' });

  // --- Las cuatro disposiciones (menú y atajos) ---
  await chooseLayout(page, 'Editor + datos + vista previa');
  await waitUntil(async () => (await widths(page)).data > 0);
  w = await widths(page);
  check('36 «Editor + datos + vista previa»: raíl de 48, datos 300 y vista previa 672', near(w.side, 48) && near(w.data, 300) && near(w.preview, 672) && w.editor >= 360, JSON.stringify(w));
  check('36 aquí los datos son una columna propia y la barra de datos sigue ahí', (await page.locator('.app-body > app-smart-data-editor .tree-view').isVisible()) && (await page.locator('[data-testid="resizer-data"]').count()) === 1);

  await page.keyboard.press('Control+Alt+3');
  await waitUntil(async () => near((await widths(page)).preview, 472));
  w = await widths(page);
  check('36 Ctrl+Alt+3 «Foco en el editor»: raíl de 48 y vista previa de 472', near(w.side, 48) && near(w.preview, 472) && w.editor > 800 && w.data === 0, JSON.stringify(w));
  check('36 con la vista previa a 472 px la barra pasa a solo iconos', (await page.locator('app-preview-panel .device-btn.icon-only').count()) > 0);

  await page.keyboard.press('Control+Alt+4');
  await waitUntil(async () => near((await widths(page)).preview, W - 48 - 360));
  w = await widths(page);
  check('36 Ctrl+Alt+4 «Foco en la vista previa · PDF»: el preview ocupa lo que deja el editor mínimo (360) y pasa a PDF', near(w.preview, W - 48 - 360) && w.editor >= 358 && (await page.locator('app-preview-panel button[aria-label="PDF / página impresa"].active').count()) === 1, JSON.stringify(w));

  await page.keyboard.press('Control+Alt+1');
  await waitUntil(async () => near((await widths(page)).side, 280));
  w = await widths(page);
  check('36 Ctrl+Alt+1 vuelve a «Editor + vista previa» (280 / 660)', near(w.side, 280) && near(w.preview, 660), JSON.stringify(w));
  check('36 la disposición se guarda en las preferencias', (await prefsOf(page)).layout === 'editor-preview');

  // AltGr (teclado español): Ctrl+Alt+1 teclea «|», no cambia la disposición
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '|', code: 'Digit1', ctrlKey: true, altKey: true, bubbles: true, cancelable: true })));
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '@', code: 'Digit2', ctrlKey: true, altKey: true, bubbles: true, cancelable: true })));
  await sleep(300);
  check('36 con AltGr («|», «@») no se secuestra la tecla ni cambia la disposición', (await prefsOf(page)).layout === 'editor-preview' && near((await widths(page)).side, 280));

  // --- Paneles: Ctrl+B y Ctrl+J ---
  await page.keyboard.press('Control+b');
  await waitUntil(async () => near((await widths(page)).side, 48));
  w = await widths(page);
  check('36 Ctrl+B recoge el panel lateral en un raíl de 48 y el editor gana el sitio', near(w.side, 48) && w.editor > 600, JSON.stringify(w));
  check('36 el raíl tiene un botón por panel, con nombre', (await page.locator('.rail-btn[aria-label="Mostrar Archivos"]').count()) === 1 && (await page.locator('.rail-btn[aria-label="Mostrar Datos"]').count()) === 1);
  await page.locator('[data-testid="rail-datos"]').click();
  await waitUntil(async () => near((await widths(page)).side, 280));
  check('36 el botón «Datos» del raíl abre el panel lateral en esa pestaña', (await page.locator('app-smart-data-editor .tree-view').isVisible()) && (await prefsOf(page)).sidebarTab === 'datos');
  await tabs.nth(0).click();
  const bottomOpen = async () => (await page.locator('section.app-terminal').count()) > 0;
  const before = await bottomOpen();
  await page.keyboard.press('Control+j');
  await waitUntil(async () => (await bottomOpen()) !== before);
  check('36 Ctrl+J muestra u oculta el panel inferior', (await bottomOpen()) !== before);
  await page.keyboard.press('Control+j');
  await waitUntil(async () => (await bottomOpen()) === before);

  // --- Tiradores: ratón ---
  const prev = sep(page, 'preview');
  check('36 el tirador de la vista previa es un separator con valor, mínimo y máximo', (await prev.getAttribute('role')) === 'separator' && (await num(prev, 'aria-valuemin')) === 320 && near(await num(prev, 'aria-valuemax'), W - 360 - 280) && near(await num(prev, 'aria-valuenow'), 660), `${await prev.getAttribute('aria-valuenow')}/${await prev.getAttribute('aria-valuemax')}`);
  let g = await prev.boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + 200);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2 - 30, g.y + 200, { steps: 4 });
  await page.mouse.move(g.x + g.width / 2 - 60, g.y + 200, { steps: 4 });
  check('36 mientras se arrastra se ve el ancho en px', /\d{3} px/.test(await page.locator('app-preview-panel .readout').innerText()));
  await page.mouse.up();
  await waitUntil(async () => near((await widths(page)).preview, 720, 3));
  w = await widths(page);
  check('36 arrastrar 60 px a la izquierda agranda la vista previa a ≈720', near(w.preview, 720, 3) && near(await num(prev, 'aria-valuenow'), 720, 3), JSON.stringify(w));
  check('36 el tamaño se guarda al soltar', near((await prefsOf(page)).panelSizes?.['editor-preview']?.preview, 720, 3), JSON.stringify((await prefsOf(page)).panelSizes));

  // arrastrar más allá del máximo: el editor conserva 360
  g = await prev.boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + 200);
  await page.mouse.down();
  await page.mouse.move(g.x - 400, g.y + 200, { steps: 6 });
  await page.mouse.up();
  await waitUntil(async () => near((await widths(page)).editor, 360, 2));
  w = await widths(page);
  check('36 no deja bajar el editor de 360 px (mínimo)', near(w.editor, 360, 2) && near(w.preview, W - 280 - 360, 2), JSON.stringify(w));
  g = await prev.boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + 200);
  await page.mouse.down();
  await page.mouse.move(g.x + 900, g.y + 200, { steps: 6 });
  await page.mouse.up();
  await waitUntil(async () => near((await widths(page)).preview, 320, 2));
  check('36 ni la vista previa de 320 px (mínimo)', near((await widths(page)).preview, 320, 2), JSON.stringify(await widths(page)));

  // --- Tiradores: teclado y doble clic ---
  await prev.focus();
  await page.keyboard.press('ArrowLeft'); // el preview está a la derecha: ← lo agranda
  await waitUntil(async () => near((await widths(page)).preview, 336, 2));
  check('36 con el teclado ← agranda la vista previa 16 px', near((await widths(page)).preview, 336, 2), JSON.stringify(await widths(page)));
  await page.keyboard.press('Shift+ArrowLeft');
  await waitUntil(async () => near((await widths(page)).preview, 400, 2));
  check('36 con Mayús, 64 px', near((await widths(page)).preview, 400, 2), JSON.stringify(await widths(page)));
  await page.keyboard.press('End');
  await waitUntil(async () => near((await widths(page)).editor, 360, 2));
  check('36 Fin lleva el tirador al máximo y Inicio al mínimo', near((await widths(page)).editor, 360, 2));
  await page.keyboard.press('Home');
  await waitUntil(async () => near((await widths(page)).preview, 320, 2));
  check('36 Inicio', near((await widths(page)).preview, 320, 2));
  await prev.dblclick();
  await waitUntil(async () => near((await widths(page)).preview, 660, 2));
  check('36 doble clic restablece el tamaño de la disposición', near((await widths(page)).preview, 660, 2) && (await prefsOf(page)).panelSizes?.['editor-preview']?.preview === undefined, JSON.stringify((await prefsOf(page)).panelSizes));

  // tirador del panel lateral
  const side = sep(page, 'sidebar');
  g = await side.boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + 200);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2 + 40, g.y + 200, { steps: 4 });
  await page.mouse.up();
  await waitUntil(async () => near((await widths(page)).side, 320, 3));
  check('36 el tirador del panel lateral lo ensancha (≈320)', near((await widths(page)).side, 320, 3), JSON.stringify(await widths(page)));
  await side.focus();
  await page.keyboard.press('Home');
  await waitUntil(async () => near((await widths(page)).side, 200, 2));
  check('36 mínimo del panel lateral: 200', near((await widths(page)).side, 200, 2));

  // --- Persistencia al recargar ---
  await page.keyboard.press('End');
  await sleep(200);
  await prev.focus();
  await page.keyboard.press('ArrowLeft');
  await sleep(300);
  const wBefore = await widths(page);
  await page.reload();
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await sleep(600);
  const wAfter = await widths(page);
  check('36 tras recargar se conservan la disposición y los tamaños elegidos', near(wAfter.side, wBefore.side, 2) && near(wAfter.preview, wBefore.preview, 2) && (await prefsOf(page)).layout === 'editor-preview', JSON.stringify({ wBefore, wAfter }));

  // restablecer desde el menú
  await page.locator('[data-testid="layout-menu"]').click();
  await menu(page).waitFor();
  await menu(page).getByText('Restablecer los tamaños').click();
  await waitUntil(async () => near((await widths(page)).side, 280) && near((await widths(page)).preview, 660));
  check('36 «Restablecer los tamaños» vuelve a 280 / 660', near((await widths(page)).side, 280) && near((await widths(page)).preview, 660) && !(await prefsOf(page)).panelSizes?.['editor-preview'], JSON.stringify(await widths(page)));

  // --- No viaja con el proyecto ---
  const project = await page.evaluate(() => localStorage.getItem('pug-ide-project') ?? '');
  check('36 la sesión del proyecto no guarda disposición ni tamaños (son del usuario)', project.length > 0 && !/panelSizes|sidebarTab|"layout"/.test(project), project.slice(0, 200));

  // --- Paleta ---
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type('Foco en el editor');
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts())[0] === 'Disposición: Foco en el editor');
  check('36 la paleta ofrece «Disposición: Foco en el editor» con su atajo', (await page.locator('.item.active .keys').innerText()) === 'Ctrl+Alt+3');
  await page.keyboard.press('Enter');
  await waitUntil(async () => near((await widths(page)).preview, 472));
  check('36 y la aplica', near((await widths(page)).preview, 472) && (await prefsOf(page)).layout === 'focus-editor');

  check('36 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
