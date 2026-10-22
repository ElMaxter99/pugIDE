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
 * - `consent`: decisión guardada sobre la analítica (`'denied'` por defecto, para que el aviso no estorbe;
 *   `null` = sin decidir, aparece el aviso).
 */
export async function openApp(env, { path = '/ide?demo=true', session, prefs, consent = 'denied', viewport = { width: 1400, height: 850 }, wait = 4000 } = {}) {
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
  await context.addInitScript(([s, p, c]) => {
    if (localStorage.getItem('__pugide_seeded')) return;
    localStorage.setItem('__pugide_seeded', '1');
    if (s) localStorage.setItem('pug-ide-project', JSON.stringify(s));
    if (p) localStorage.setItem('pug-ide-preferences', JSON.stringify(p));
    if (c) localStorage.setItem('pug-ide-analytics-consent', c);
  }, [session ?? null, prefs ?? null, consent]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(env.baseURL + path);
  await page.waitForTimeout(wait);
  return { context, page, external, requests, errors, close: () => context.close() };
}

/** Texto visible del cuerpo del iframe del preview. */
export const previewText = (page) =>
  page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => f.contentDocument?.body?.innerText ?? '').join('\n'));

/** Nombre del proyecto que muestra el botón de la barra superior. */
export const projectName = async (page) =>
  (await page.locator('button[title^="Abrir, crear"]').innerText({ timeout: 1500 }).catch(() => '')).replace('folder_open', '').trim();
