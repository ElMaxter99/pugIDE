// Utilidades de las pruebas de interfaz (Playwright sobre el build de producción).
export const stats = { fails: 0, checks: 0 };

export function check(name, ok, extra = '') {
  stats.checks++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  -> ${extra}`));
  if (!ok) stats.fails++;
}

/**
 * Tecla de comando de Monaco: el WebKit de Playwright se identifica como Macintosh (aunque corra en Linux), así que
 * Monaco espera Cmd (Meta) y no Ctrl para deshacer, pegar, etc. En Chromium y Firefox es Ctrl.
 */
export const CMD = process.env.PUGIDE_BROWSER === 'webkit' ? 'Meta' : 'Control';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Espera (hasta `timeout` ms) a que `fn` devuelva algo verdadero; devuelve su último valor. */
export async function waitUntil(fn, timeout = 6000, step = 150) {
  const end = Date.now() + timeout;
  let value = await fn();
  while (!value && Date.now() < end) {
    await sleep(step);
    value = await fn();
  }
  return value;
}

/**
 * Abre la app en un contexto nuevo y aislado. Bloquea (y registra) cualquier petición que no sea al
 * servidor local: PugIDE no debe necesitar CDNs ni terceros.
 *
 * - `session`: sesión guardada (`pug-ide-project`) que se inyecta antes de arrancar.
 * - `prefs`: preferencias guardadas (`pug-ide-preferences`).
 * - `storage`: otras claves de `localStorage` a sembrar (`{ clave: valor }`).
 * - `consent`: decisión guardada sobre la analítica (`'denied'` por defecto, para que el aviso no estorbe;
 *   `null` = sin decidir, aparece el aviso).
 * - `welcome`: por defecto la bienvenida de primer uso se da por vista (`pug-ide-welcome`) para que no estorbe en los
 *   escenarios que abren `/ide` sin sesión; con `welcome: true` se parte de un primer uso de verdad.
 */
export async function openApp(env, { path = '/ide?demo=true', session, prefs, consent = 'denied', storage, welcome = false, viewport = { width: 1400, height: 850 }, wait = 4000 } = {}) {
  const context = await env.browser.newContext({ viewport, serviceWorkers: env.serviceWorkers ?? 'block' });
  const external = [];
  const requests = [];
  context.on('request', (r) => requests.push(r.url()));
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(env.baseURL) || url.startsWith('blob:') || url.startsWith('data:')) return route.continue();
    external.push(url);
    return route.abort();
  });
  // Violaciones de la CSP en cualquier marco (también los de origen opaco) y en Workers: se aplican las cabeceras de producción.
  const violations = [];
  const CSP_LOG = /Content Security Policy|Refused to |__PUGIDE_CSP__/i;
  const onConsole = (m) => { if (CSP_LOG.test(m.text())) violations.push(m.text().slice(0, 300)); };
  context.on('console', onConsole);
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.warn(`__PUGIDE_CSP__ ${e.violatedDirective} ${e.blockedURI}`));
  });
  await context.addInitScript(([s, p, c, extra]) => {
    // Se ejecuta en todos los marcos, también en los iframes aislados (origen opaco), donde no hay localStorage.
    try { localStorage.length; } catch { return; }
    if (localStorage.getItem('__pugide_seeded')) return;
    localStorage.setItem('__pugide_seeded', '1');
    if (s) localStorage.setItem('pug-ide-project', JSON.stringify(s));
    if (p) localStorage.setItem('pug-ide-preferences', JSON.stringify(p));
    if (c) localStorage.setItem('pug-ide-analytics-consent', c);
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, [session ?? null, prefs ?? null, consent, { ...(welcome ? {} : { 'pug-ide-welcome': '1' }), ...(storage ?? {}) }]);
  const page = await context.newPage();
  // `PUGIDE_CPU_THROTTLE=4` ralentiza la CPU de la página (solo Chromium): saca a la luz las pruebas que leen el DOM sin
  // esperar a que Angular repinte (con `eventCoalescing` el repintado va al siguiente fotograma). Sin la variable no cambia nada.
  const throttle = Number(process.env.PUGIDE_CPU_THROTTLE ?? 0);
  if (throttle > 1 && env.browser.browserType().name() === 'chromium') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  }
  page.on('worker', (w) => w.on('console', onConsole));
  const errors = [];
  // Playwright inyecta (serviceWorkers: 'block') un script en cada marco que falla en los iframes de origen opaco: no es de la app.
  // WebKit muestra como error de página el CancellationError interno de Monaco («Canceled: Canceled»), que no es de la app.
  const NOISE = [/Service worker is disabled because the context is sandboxed/i, /^Canceled: Canceled$/];
  page.on('pageerror', (e) => { if (!NOISE.some((re) => re.test(e.message))) errors.push(e.message); });
  await page.goto(env.baseURL + path);
  await page.waitForTimeout(wait);
  return {
    context, page, external, requests, errors, violations,
    // Cada escenario debe cerrar sin violaciones de la CSP, salvo que provoque una a propósito (`expectViolations`).
    close: async ({ expectViolations = false } = {}) => {
      if (!expectViolations) check(`${path} sin violaciones de la CSP`, violations.length === 0, violations.slice(0, 3).join(' | '));
      await context.close();
    },
  };
}

/**
 * El iframe del preview tiene origen opaco (la página no puede leer su DOM): se lee desde su propio marco.
 * `previewFrame` devuelve el marco del preview (no el oculto del render).
 */
export async function previewFrame(page) {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    try {
      const el = await f.frameElement();
      if (await el.evaluate((n) => n.classList.contains('preview-iframe'))) return f;
    } catch { /* marco desaparecido */ }
  }
  return null;
}

/** Texto visible del cuerpo del iframe del preview. */
export async function previewText(page) {
  const f = await previewFrame(page);
  if (!f) return '';
  try { return await f.evaluate(() => document.body?.innerText ?? ''); } catch { return ''; }
}

/** Abre la pestaña «Registro» del panel inferior (por defecto se ve «Problemas») y espera a que se pinte. */
export async function openLogTab(page) {
  const tab = page.locator('[data-testid="tab-log"]');
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  await page.locator('#panel-log').waitFor({ timeout: 4000 });
}

/** Abre la pestaña «Problemas» del panel inferior y espera a que se pinte. */
export async function openProblemsTab(page) {
  const tab = page.locator('[data-testid="tab-problems"]');
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  await page.locator('#panel-problems').waitFor({ timeout: 4000 });
}

/** Nombre del proyecto que muestra el panel lateral (la barra superior ya no lo enseña). */
export const projectName = async (page) =>
  ((await page.locator('.workspace-name').first().textContent({ timeout: 4000 }).catch(() => '')) ?? '').trim();

/** Elige una fila de los menús «Proyecto» (`proyecto`) o «Exportar» (`exportar`) de la barra superior por su `data-menu-id`. */
export async function chooseMenu(page, menu, id) {
  await page.locator(`[data-testid="menu-${menu}"]`).click();
  await page.locator(`[role="menu"] [data-menu-id="${id}"]`).click();
}

/** Abre el menú «Vista» de la barra del preview (si no está abierto) y devuelve su lista. */
export async function openViewMenu(page) {
  const menu = page.locator('app-preview-panel [role="menu"]');
  const trigger = page.locator('[data-testid="preview-view-menu"]');
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  await menu.waitFor({ timeout: 4000 });
  return menu;
}

/** Elige una acción del menú «Vista» por su identificador (`png`, `a11y`, `reload`, `newtab`, `scheme:dark`, `locale:es-ES`, `device:Mobile`…). */
export async function chooseView(page, id) {
  const menu = await openViewMenu(page);
  await menu.locator(`[data-menu-id="${id}"]`).click();
  await menu.waitFor({ state: 'detached', timeout: 4000 }); // elegir una acción cierra el menú
}

/** Cierra el menú «Vista» con Esc y espera a que desaparezca (así la siguiente orden no ve el menú viejo). */
export async function closeViewMenu(page) {
  await page.keyboard.press('Escape');
  await page.locator('app-preview-panel [role="menu"]').waitFor({ state: 'detached', timeout: 4000 });
}

/**
 * Iconos de Material Symbols visibles que NO se han dibujado como icono: si el nombre no existe en la fuente, el navegador
 * pinta el texto («screen_rotation») y la caja mide mucho más que el tamaño de letra. Devuelve sus nombres.
 */
export const brokenIcons = (page) => page.evaluate(async () => {
  // Hasta que la fuente de iconos no ha cargado, el texto («keyboard_arrow_down») mide como letras normales y parecería roto:
  // se espera a que esté lista antes de medir (con `font-display: block` el navegador la pide al pintar el primer icono).
  try { await document.fonts.load('18px "Material Symbols Outlined"'); await document.fonts.ready; } catch { /* sin API de fuentes: se mide igual */ }
  return [...document.querySelectorAll('.material-symbols-outlined')]
    .filter((e) => e.getClientRects().length > 0 && e.textContent.trim() !== '')
    .map((e) => ({ name: e.textContent.trim(), width: e.getBoundingClientRect().width, size: parseFloat(getComputedStyle(e).fontSize) || 18 }))
    .filter((i) => i.width > i.size * 1.6 + 2)
    .map((i) => `${i.name} (${Math.round(i.width)} px)`);
});

/**
 * Lee `read()` hasta que da lo mismo `rounds` veces seguidas (separadas `interval` ms) y devuelve ese valor estable (o el
 * último si no se asienta en `timeout`). Para medidas que cambian mientras Angular repinta, el `ResizeObserver` reacciona o
 * una transición termina: se afirma sobre el estado asentado, no sobre el primero que se lee.
 */
export async function stable(read, { timeout = 6000, interval = 120, rounds = 3 } = {}) {
  const end = Date.now() + timeout;
  let last = await read();
  let same = 1;
  while (same < rounds && Date.now() < end) {
    await sleep(interval);
    const value = await read();
    same = JSON.stringify(value) === JSON.stringify(last) ? same + 1 : 1;
    last = value;
  }
  return last;
}

/**
 * Cierra un diálogo con Esc de forma fiable: su `keydown.escape` está en el propio diálogo, así que solo vale con el foco
 * dentro (el foco entra un instante después de pintarse). Espera a que el foco esté dentro, pulsa Esc y espera a que se vaya.
 */
export async function closeDialog(page, selector = '[role="dialog"]') {
  await waitUntil(() => page.evaluate((sel) => !!document.activeElement?.closest(sel), selector), 4000, 50);
  await page.keyboard.press('Escape');
  await page.locator(selector).first().waitFor({ state: 'detached', timeout: 6000 }).catch(() => {});
  return (await page.locator(selector).count()) === 0;
}

/** Espera a que lo guardado en `localStorage[key]` contenga `text` (p. ej. el autoguardado de la sesión, que va con antirrebote). */
export const waitStored = (page, key, text, timeout = 10000) =>
  waitUntil(() => page.evaluate(([k, t]) => (localStorage.getItem(k) ?? '').includes(t), [key, text]), timeout, 100);

/** Proyectos guardados en la biblioteca (IndexedDB `pug-ide-projects`, almacén `meta`): el guardado es asíncrono. */
export const libraryNames = (page) => page.evaluate(() => new Promise((resolve) => {
  const open = indexedDB.open('pug-ide-projects');
  open.onerror = () => resolve([]);
  open.onsuccess = () => {
    try {
      const db = open.result;
      if (!db.objectStoreNames.contains('meta')) { db.close(); resolve([]); return; }
      const all = db.transaction('meta', 'readonly').objectStore('meta').getAll();
      all.onsuccess = () => { db.close(); resolve(all.result.map((p) => p.name)); };
      all.onerror = () => { db.close(); resolve([]); };
    } catch { resolve([]); }
  };
}));
