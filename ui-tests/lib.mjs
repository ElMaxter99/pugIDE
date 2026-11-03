// Utilidades de las pruebas de interfaz (Playwright sobre el build de producción).
export const stats = { fails: 0, checks: 0 };

export function check(name, ok, extra = '') {
  stats.checks++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  -> ${extra}`));
  if (!ok) stats.fails++;
}

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
 */
export async function openApp(env, { path = '/ide?demo=true', session, prefs, consent = 'denied', storage, viewport = { width: 1400, height: 850 }, wait = 4000 } = {}) {
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
  }, [session ?? null, prefs ?? null, consent, storage ?? {}]);
  const page = await context.newPage();
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

/** Nombre del proyecto que muestra el botón de la barra superior. */
export const projectName = async (page) =>
  (await page.locator('button[title^="Abrir, crear"]').innerText({ timeout: 1500 }).catch(() => '')).replace('folder_open', '').trim();
