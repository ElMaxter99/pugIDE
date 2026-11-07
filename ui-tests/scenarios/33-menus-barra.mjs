import { check, chooseMenu, closeDialog, openApp, projectName, waitUntil } from '../lib.mjs';

const session = {
  projectName: 'Informe',
  files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Informe\n', '/mixins.pug': '//- mixins\n' },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};

// Barra superior (P-11): 6 controles, un único relleno, menús «Proyecto» y «Exportar» accesibles y Autocompilar en la barra de estado
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  const bar = page.locator('app-topbar header');
  const activeId = () => page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName);
  const activeMenuId = () => page.evaluate(() => document.activeElement?.getAttribute('data-menu-id'));
  const menuCount = () => page.locator('[role="menu"]').count();
  const dialogs = () => page.locator('[role="dialog"]').count();

  // --- Estructura ---
  const controls = await bar.locator('a[href], button').count();
  check('33 la barra tiene 6 controles (logo, Proyecto, Exportar, buscador, tema, Guardar)', controls === 6, String(controls));
  const filled = await bar.locator('button').evaluateAll((bs) => {
    const probe = document.createElement('i');
    probe.style.background = 'var(--accent-color)';
    document.body.appendChild(probe);
    const accent = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return bs.filter((b) => getComputedStyle(b).backgroundColor === accent).map((b) => b.textContent.trim());
  });
  check('33 solo «Guardar» lleva el relleno del color de acento', filled.length === 1 && filled[0] === 'Guardar', JSON.stringify(filled));
  const small = await bar.locator('a[href], button').evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).length);
  check('33 todos los controles miden al menos 24 px', small === 0, String(small));
  await waitUntil(async () => (await projectName(page)) === 'Informe');
  check('33 el nombre del proyecto ya no está en la barra y sí en el panel lateral', !(await bar.innerText()).includes('Informe') && (await page.locator('.workspace-name').first().textContent()).trim() === 'Informe');
  check('33 el buscador enseña Ctrl K', (await bar.locator('[data-testid="open-palette"]').innerText()).includes('Buscar comandos y archivos…') && (await bar.locator('[data-testid="open-palette"] kbd').innerText()) === 'Ctrl K');
  check('33 el botón de tema tiene nombre accesible', (await bar.locator('button[aria-label="Cambiar tema claro u oscuro"]').count()) === 1);

  // --- Menús: roles y contenido ---
  const itemsOf = async (menu) => {
    await page.locator(`[data-testid="menu-${menu}"]`).click();
    await page.locator('[role="menu"]').waitFor();
    const out = await page.locator('[role="menu"] [role="menuitem"]').evaluateAll((els) => els.map((e) => `${e.querySelector('.item-label')?.textContent.trim()}${e.querySelector('.item-keys') ? ' ' + e.querySelector('.item-keys').textContent.trim() : ''}`));
    const expanded = await page.locator(`[data-testid="menu-${menu}"]`).getAttribute('aria-expanded');
    await page.keyboard.press('Escape');
    await page.locator('[role="menu"]').waitFor({ state: 'detached' }); // el siguiente menú no debe confundirse con este
    return { out, expanded };
  };
  const proj = await itemsOf('proyecto');
  check('33 «Proyecto» es un menú (role=menu) con sus 9 acciones', proj.expanded === 'true' && proj.out.length === 9 && proj.out[0] === 'Mis proyectos…' && proj.out.some((t) => t.startsWith('Buscar en el proyecto') && t.includes('Ctrl+Shift+F')), JSON.stringify(proj));
  const exp = await itemsOf('exportar');
  check('33 «Exportar» es un menú con sus 5 acciones', exp.out.length === 5 && exp.out[0] === 'Copiar enlace para compartir', JSON.stringify(exp));

  // --- Teclado ---
  const trig = page.locator('[data-testid="menu-proyecto"]');
  await trig.focus();
  await page.keyboard.press('Enter');
  await waitUntil(async () => (await activeMenuId()) === 'projects', 6000);
  check('33 Intro abre el menú y el foco va a la primera fila', (await activeMenuId()) === 'projects', String(await activeMenuId()));
  await page.keyboard.press('ArrowDown');
  check('33 ↓ baja a la fila siguiente', (await activeMenuId()) === 'new-template');
  await page.keyboard.press('End');
  check('33 Fin va a la última fila', (await activeMenuId()) === 'shortcuts');
  await page.keyboard.press('Escape');
  await waitUntil(async () => (await menuCount()) === 0, 6000);
  check('33 Esc cierra el menú y devuelve el foco al botón', (await menuCount()) === 0 && (await activeId()) === 'menu-proyecto', await activeId());
  await trig.focus();
  await page.keyboard.press('Space');
  check('33 Espacio también lo abre', await waitUntil(async () => (await menuCount()) === 1));
  await page.keyboard.press('Escape');
  await waitUntil(async () => (await menuCount()) === 0);
  await trig.focus();
  await page.keyboard.press('ArrowDown');
  check('33 ↓ en el botón abre el menú', await waitUntil(async () => (await menuCount()) === 1));
  await page.keyboard.press('Escape');
  await waitUntil(async () => (await menuCount()) === 0);
  await page.locator('[data-testid="menu-exportar"]').click();
  await page.locator('[role="menu"]').waitFor();
  await page.mouse.click(5, 400);
  check('33 un clic fuera cierra el menú', await waitUntil(async () => (await menuCount()) === 0));

  // --- Cada acción de «Proyecto» llega a su destino ---
  await chooseMenu(page, 'proyecto', 'projects');
  check('33 Mis proyectos… abre la biblioteca', !!(await waitUntil(async () => (await page.locator('[aria-label="Mis proyectos"]').count()) > 0)));
  await closeDialog(page, '[aria-label="Mis proyectos"]');
  await chooseMenu(page, 'proyecto', 'new-template');
  check('33 Nuevo proyecto desde plantilla… abre la biblioteca con el selector de plantilla', !!(await waitUntil(async () => (await page.locator('[aria-label="Mis proyectos"] .template-select').count()) > 0)));
  await closeDialog(page, '[aria-label="Mis proyectos"]');
  await chooseMenu(page, 'proyecto', 'snapshots');
  check('33 Instantáneas del proyecto… abre su diálogo', !!(await waitUntil(async () => (await page.locator('[aria-label="Instantáneas del proyecto"]').count()) > 0)));
  await closeDialog(page, '[aria-label="Instantáneas del proyecto"]');
  await chooseMenu(page, 'proyecto', 'history');
  check('33 Historial del archivo… abre su diálogo', !!(await waitUntil(async () => (await dialogs()) > 0)));
  await closeDialog(page);
  await chooseMenu(page, 'proyecto', 'locale');
  check('33 Añadir idioma… abre su diálogo', !!(await waitUntil(async () => (await dialogs()) > 0)));
  await closeDialog(page);
  await chooseMenu(page, 'proyecto', 'shortcuts');
  check('33 Atajos de teclado abre su diálogo', !!(await waitUntil(async () => (await page.locator('[role="dialog"][aria-label="Atajos de teclado"]').count()) > 0)));
  await closeDialog(page, '[role="dialog"][aria-label="Atajos de teclado"]');
  await chooseMenu(page, 'proyecto', 'search');
  check('33 Buscar en el proyecto abre la búsqueda', !!(await waitUntil(async () => page.locator('app-project-search input').first().isVisible().catch(() => false))));
  await waitUntil(() => page.evaluate(() => !!document.activeElement?.closest('app-project-search')), 4000, 50);
  await page.keyboard.press('Escape');
  await waitUntil(async () => !(await page.locator('app-project-search input').first().isVisible().catch(() => false)));
  await chooseMenu(page, 'proyecto', 'import');
  check('33 Importar carpeta o .zip… abre el diálogo de importación', !!(await waitUntil(async () => (await dialogs()) > 0)));
  await closeDialog(page);
  const chooser = page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null);
  await chooseMenu(page, 'proyecto', 'assets');
  const fc = await chooser;
  check('33 Subir imágenes, fuentes o estilos… abre el selector de archivos (varios)', !!fc && fc.isMultiple());

  // --- Cada acción de «Exportar» ---
  const downloadFrom = async (id) => {
    const d = page.waitForEvent('download', { timeout: 20000 });
    await chooseMenu(page, 'exportar', id);
    return d;
  };
  const html = await downloadFrom('html');
  check('33 HTML autocontenido descarga el .html', /\.html$/.test(html.suggestedFilename()), html.suggestedFilename());
  const png = await downloadFrom('png');
  check('33 Captura PNG del preview descarga el .png', /\.png$/.test(png.suggestedFilename()), png.suggestedFilename());
  await chooseMenu(page, 'exportar', 'share');
  check('33 Copiar enlace para compartir muestra el aviso', !!(await waitUntil(async () => (await page.locator('.share-notice').count()) === 1)));
  await page.locator('.share-notice .notice-close').click();

  // --- Autocompilar en la barra de estado ---
  const auto = page.locator('[data-testid="autocompile-toggle"]');
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('pug-ide-preferences') ?? '{}').autoCompile);
  check('33 Autocompilar está en la barra de estado y ya no en la superior', (await auto.count()) === 1 && !(await bar.innerText()).includes('Autocompilar') && (await auto.getAttribute('aria-pressed')) === 'true' && (await auto.innerText()).includes('Autocompilar: sí'));
  await auto.click();
  await waitUntil(async () => (await auto.getAttribute('aria-pressed')) === 'false', 6000);
  check('33 pulsarlo desactiva la autocompilación y se guarda', (await auto.getAttribute('aria-pressed')) === 'false' && (await auto.innerText()).includes('Autocompilar: no') && (await stored()) === false);
  await auto.click();
  await waitUntil(async () => (await auto.getAttribute('aria-pressed')) === 'true', 6000);
  check('33 y otra vez la activa', (await auto.getAttribute('aria-pressed')) === 'true' && (await stored()) === true);

  // --- Paleta ---
  await page.locator('[data-testid="open-palette"]').click();
  check('33 el campo de la barra abre la paleta', !!(await waitUntil(async () => (await page.locator('[aria-label="Paleta de comandos"]').count()) === 1)));
  await page.keyboard.press('Escape');
  await waitUntil(async () => (await page.locator('[aria-label="Paleta de comandos"]').count()) === 0);
  await page.keyboard.press('Control+k');
  check('33 Ctrl+K sigue abriendo la paleta', !!(await waitUntil(async () => (await page.locator('[aria-label="Paleta de comandos"]').count()) === 1)));
  await page.keyboard.press('Escape');

  check('33 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
