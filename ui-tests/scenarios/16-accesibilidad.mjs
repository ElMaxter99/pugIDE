import { check, chooseMenu, openApp, previewText, waitUntil } from '../lib.mjs';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
// La CSP de la app no admite scripts inline: axe se evalúa por el protocolo (`evaluate`), que no pasa por ella.
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/**
 * Auditoría automática (axe-core: etiquetas, nombres accesibles, contraste, puntos de referencia, encabezados…) de
 * cada pantalla y diálogo, en tema oscuro y claro. Debe dar 0 incumplimientos. Se excluye Monaco, que es de
 * terceros, y los iframes del preview, que son contenido del usuario.
 * Limitación: es una revisión automática; no sustituye a probar con un lector de pantalla.
 */
async function audit(page, label) {
  // Los diálogos entran con una animación de opacidad: se mide el contraste cuando ya terminó, no a medias.
  // Las infinitas (el punto «live» del preview) nunca terminan: solo se esperan las finitas.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  if (!(await page.evaluate(() => typeof globalThis.axe !== 'undefined'))) await page.evaluate(AXE_SOURCE);
  const res = await page.evaluate(() => axe.run(document, { exclude: [['.monaco-editor'], ['.preview-iframe']], resultTypes: ['violations'] }));
  const detail = res.violations
    .map((v) => `${v.id} [${v.impact}] x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join('>').replace(/\[_ngcontent[^\]]*\]/g, '').slice(0, 60)).join(' ; ')}`)
    .join(' | ');
  check(`16 accesibilidad: ${label}`, res.violations.length === 0, detail);
}

const session = {
  projectName: 'Accesible',
  files: {
    '/main.pug': "doctype html\nhtml\n  body\n    h1= t('HOME.TITLE')\n    p= name\n",
    '/locales/es-ES/translations.json': '{ "HOME": { "TITLE": "Hola" } }\n',
    '/locales/en/translations.json': '{ "HOME": { "TITLE": "Hello" } }\n',
  },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};

async function openPalette(page, text, title) {
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type(text);
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts())[0] === title);
}

export default async function (env) {
  let app = await openApp(env, { path: '/' });
  await audit(app.page, 'landing');
  await app.close();

  app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await audit(page, 'IDE (oscuro, con selector de idioma)');

  await openPalette(page, 'Atajos', 'Atajos de teclado');
  await audit(page, 'paleta de comandos');
  await page.keyboard.press('Enter');
  await page.locator('[role="dialog"][aria-label="Atajos de teclado"]').waitFor();
  await audit(page, 'diálogo de atajos');
  await page.keyboard.press('Escape');

  await chooseMenu(page, 'proyecto', 'projects');
  await page.locator('[aria-label="Mis proyectos"]').waitFor();
  await audit(page, 'diálogo Mis proyectos');
  await page.keyboard.press('Escape');

  await page.locator('button[title="Nuevo archivo"]').click();
  await page.locator('app-dialog input').waitFor();
  await audit(page, 'diálogo Nuevo archivo');
  await page.keyboard.press('Escape');

  await openPalette(page, 'Añadir idioma', 'Añadir idioma…');
  await page.keyboard.press('Enter');
  await page.locator('app-dialog input').waitFor();
  await audit(page, 'diálogo Añadir idioma');
  await page.keyboard.press('Escape');

  await openPalette(page, 'Historial del archivo', 'Historial del archivo…');
  await page.keyboard.press('Enter');
  await page.locator('[role="dialog"][aria-label="Historial del archivo"]').waitFor();
  await audit(page, 'diálogo Historial');
  await page.keyboard.press('Escape');

  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+Shift+F');
  await page.locator('[data-testid="project-search"]').waitFor();
  await page.locator('[data-testid="project-search"]').fill('Hola');
  await audit(page, 'búsqueda y reemplazo en el proyecto');
  await page.keyboard.press('Escape');

  await page.keyboard.press('Control+Shift+J');
  await page.locator('textarea.json-textarea').waitFor({ state: 'visible' });
  await audit(page, 'editor de datos en modo JSON');
  await page.keyboard.press('Control+Shift+J');

  await page.locator('button[title="Cambiar tema claro u oscuro"]').click();
  await page.waitForTimeout(400);
  await audit(page, 'IDE (claro)');
  await page.locator('button[title="PDF / página impresa"]').click();
  await page.locator('.pdf-bar').waitFor();
  await audit(page, 'modo PDF (claro)');
  await app.close();

  await teclado(env);
  await tecladoArboles(env);
}

// Con el teclado: el orden de tabulación recorre elementos visibles y con nombre, empezando por el logo.
async function teclado(env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('app-topbar').waitFor();
  await page.evaluate(() => document.activeElement?.blur());
  const stops = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      // Nombre accesible aproximado: lo que oiría un lector de pantalla (sin lo marcado aria-hidden, como los iconos).
      const clone = el.cloneNode(true);
      clone.querySelectorAll?.('[aria-hidden="true"]').forEach((n) => n.remove());
      const name = el.getAttribute('aria-label') || clone.textContent?.trim() || el.getAttribute('title') || el.getAttribute('placeholder') || '';
      return { tag: el.tagName.toLowerCase(), cls: el.className?.toString().slice(0, 30), name: name.slice(0, 40), visible: r.width > 0 && r.height > 0, monaco: el.classList.contains('inputarea') };
    });
    if (!stop) continue;
    stops.push(stop);
    if (stop.monaco) break; // Monaco captura Tab para sangrar (Ctrl+M lo libera)
  }
  check('16 teclado: el primer elemento enfocable es el logo (enlace al inicio)', stops[0]?.tag === 'a' && stops[0]?.name === 'PugIDE', JSON.stringify(stops[0]));
  check('16 teclado: la barra superior, el Workspace y el árbol de archivos se pueden recorrer con Tab', stops.length >= 8, JSON.stringify(stops.map((s) => s.name)));
  // El textarea interno de Monaco (su campo de entrada) mide 0×0 en Firefox: se exige que tenga nombre, no que se vea.
  check('16 teclado: todos los elementos enfocados son visibles y tienen nombre', stops.every((s) => (s.visible || s.monaco) && s.name), JSON.stringify(stops.filter((s) => !(s.visible || s.monaco) || !s.name)));
  check('16 teclado: el árbol de archivos y las pestañas son paradas de Tab', stops.some((s) => s.name === 'main.pug') && stops.filter((s) => s.cls?.includes('tab-main')).length === 1, JSON.stringify(stops.map((s) => s.name)));
  check('16 teclado: se llega hasta el editor', stops.at(-1)?.monaco === true, JSON.stringify(stops.at(-1)));
  // Ctrl+M libera el foco del editor: el siguiente Tab sale de él
  // En Mac (el WebKit de Playwright se identifica como Macintosh) Monaco usa Ctrl+Mayús+M para esto.
  await page.keyboard.press(process.env.PUGIDE_BROWSER === 'webkit' ? 'Control+Shift+m' : 'Control+m');
  await page.keyboard.press('Tab');
  const out = await page.evaluate(() => !document.activeElement?.classList.contains('inputarea'));
  check('16 teclado: Ctrl+M + Tab saca el foco del editor (no hay trampa de teclado)', out);
  check('16 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}

// Árbol de archivos con teclado: flechas, Enter/Espacio y menú contextual; árbol de datos: plegar y cambiar booleanos.
async function tecladoArboles(env) {
  const app = await openApp(env, {
    path: '/ide',
    session: {
      projectName: 'Teclas',
      files: { '/main.pug': 'if activo\n  p activo\nelse\n  p inactivo\n', '/partials/card.pug': 'p card\n', '/partials/footer.pug': 'p pie\n' },
      openTabPaths: ['/main.pug'],
      activeTabPath: '/main.pug',
      datasets: { version: 1, activeId: 'ds-1', locale: 'es', datasets: [{ id: 'ds-1', name: 'Por defecto', data: { activo: true } }] },
    },
  });
  const { page } = app;
  const tree = page.locator('app-file-tree');
  await tree.locator('.file-row').first().waitFor();
  const rows = () => tree.locator('.file-row').evaluateAll((els) => els.map((e) => e.dataset.path));
  const focused = () => page.evaluate(() => document.activeElement?.dataset?.path ?? null);
  check('16 árbol: una sola parada de Tab (el archivo abierto) y el resto tabindex -1', (await tree.locator('.file-row[tabindex="0"]').count()) === 1 && (await tree.locator('.file-row[tabindex="0"]').getAttribute('data-path')) === '/main.pug');
  await tree.locator('.file-row[tabindex="0"]').focus();
  await page.keyboard.press('ArrowDown');
  check('16 árbol: ↓ mueve el foco a la fila siguiente', (await focused()) === '/partials', String(await focused()));
  await page.keyboard.press('ArrowLeft');
  check('16 árbol: ← pliega la carpeta', !!(await waitUntil(async () => !(await rows()).includes('/partials/card.pug'))), JSON.stringify(await rows()));
  await page.keyboard.press('ArrowRight');
  check('16 árbol: → la despliega', !!(await waitUntil(async () => (await rows()).includes('/partials/card.pug'))), JSON.stringify(await rows()));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  check('16 árbol: Enter abre el archivo', !!(await waitUntil(async () => (await page.locator('.tab-name').allInnerTexts()).includes('card.pug'))), JSON.stringify(await page.locator('.tab-name').allInnerTexts()));
  await tree.locator('.file-row[data-path="/partials/card.pug"]').focus();
  await page.keyboard.press('Shift+F10');
  check('16 árbol: Mayús+F10 abre el menú contextual del archivo', !!(await waitUntil(async () => (await page.locator('app-context-menu').getByText('Renombrar').count()) > 0)));
  await page.keyboard.press('Escape');
  check('16 pestañas: se activan con el teclado', await page.locator('.tab-main').nth(0).evaluate((b) => { b.focus(); return document.activeElement === b; }));
  await page.keyboard.press('Enter');
  check('16 pestañas: Enter activa la pestaña', !!(await waitUntil(async () => (await page.locator('.tab-main[aria-current="true"]').innerText()).includes('main.pug'))));

  // Árbol de datos: plegar con Enter y cambiar un booleano con Espacio
  await page.locator('app-smart-data-editor').getByText('Árbol').first().waitFor();
  const toggle = page.locator('app-data-tree [role="switch"]').first();
  check('16 datos: el booleano es un interruptor con nombre y estado', (await toggle.count()) === 1 && (await toggle.getAttribute('aria-checked')) === 'true' && (await toggle.getAttribute('aria-label')) === 'Valor de activo');
  await toggle.focus();
  await page.keyboard.press('Space');
  check('16 datos: Espacio cambia el booleano y el preview', !!(await waitUntil(async () => (await page.locator('app-data-tree [role="switch"]').first().getAttribute('aria-checked')) === 'false' && (await previewText(page)).includes('inactivo'))), await previewText(page));
  check('16 sin errores no controlados (teclado en árboles)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
