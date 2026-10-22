// Utilidades de las pruebas de interfaz (Playwright sobre el build de producción).
export const stats = { fails: 0, checks: 0 };

export function check(name, ok, extra = '') {
  stats.checks++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  -> ${extra}`));
  if (!ok) stats.fails++;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Abre la app en un contexto nuevo y aislado. Bloquea (y registra) cualquier petición que no sea al
 * servidor local: PugIDE no debe necesitar CDNs ni terceros.
 *
 * - `session`: sesión guardada (`pug-ide-project`) que se inyecta antes de arrancar.
 * - `prefs`: preferencias guardadas (`pug-ide-preferences`).
 */
export async function openApp(env, { path = '/ide?demo=true', session, prefs, viewport = { width: 1400, height: 850 }, wait = 4000 } = {}) {
  const context = await env.browser.newContext({ viewport, serviceWorkers: env.serviceWorkers ?? 'block' });
  const external = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(env.baseURL) || url.startsWith('blob:') || url.startsWith('data:')) return route.continue();
    external.push(url);
    return route.abort();
  });
  if (session || prefs) {
    await context.addInitScript(([s, p]) => {
      if (localStorage.getItem('__pugide_seeded')) return;
      localStorage.setItem('__pugide_seeded', '1');
      if (s) localStorage.setItem('pug-ide-project', JSON.stringify(s));
      if (p) localStorage.setItem('pug-ide-preferences', JSON.stringify(p));
    }, [session ?? null, prefs ?? null]);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(env.baseURL + path);
  await page.waitForTimeout(wait);
  return { context, page, external, errors, close: () => context.close() };
}

/** Texto visible del cuerpo del iframe del preview. */
export const previewText = (page) =>
  page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => f.contentDocument?.body?.innerText ?? '').join('\n'));

/** Nombre del proyecto que muestra el botón de la barra superior. */
export const projectName = async (page) =>
  (await page.locator('button[title^="Abrir, crear"]').innerText()).replace('folder_open', '').trim();
