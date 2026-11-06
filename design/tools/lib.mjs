// Apertura de la app para fotografiarla: contexto aislado con sesión, preferencias y consentimiento sembrados.
import { FILES, FILES_ERROR, MAIN_PUG_PDF, SESSION, PREFS } from './fixtures.mjs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function waitUntil(fn, timeout = 8000, step = 150) {
  const end = Date.now() + timeout;
  let v = await fn();
  while (!v && Date.now() < end) { await sleep(step); v = await fn(); }
  return v;
}

/** Marco del iframe del preview (no el oculto del render). */
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

export async function previewText(page) {
  const f = await previewFrame(page);
  if (!f) return '';
  try { return await f.evaluate(() => document.body?.innerText ?? ''); } catch { return ''; }
}

/**
 * @param env  { baseURL, browser }
 * @param o    { path, session, prefs, consent, storage, viewport }
 */
export async function openApp(env, { path = '/ide', session = SESSION, prefs = PREFS, consent = 'denied', storage = {}, viewport = { width: 1440, height: 900 } } = {}) {
  const context = await env.browser.newContext({ viewport, deviceScaleFactor: 1, serviceWorkers: 'block', bypassCSP: true, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(env.baseURL) || url.startsWith('blob:') || url.startsWith('data:')) return route.continue();
    return route.abort();
  });
  await context.addInitScript(([s, p, c, extra]) => {
    try { localStorage.length; } catch { return; }
    if (localStorage.getItem('__cap_seeded')) return;
    localStorage.setItem('__cap_seeded', '1');
    if (s) localStorage.setItem('pug-ide-project', JSON.stringify(s));
    if (p) localStorage.setItem('pug-ide-preferences', JSON.stringify(p));
    if (c) localStorage.setItem('pug-ide-analytics-consent', c);
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, [session ?? null, prefs ?? null, consent, storage]);
  const page = await context.newPage();
  await page.goto(env.baseURL + path);
  return { context, page };
}

/** Espera a que la app termine de arrancar y compilar. */
export async function settle(page, { ms = 1200 } = {}) {
  await page.waitForSelector('app-main-layout, app-landing', { timeout: 15000 }).catch(() => {});
  if (await page.locator('app-landing').count()) { await sleep(ms); return; }
  await waitUntil(async () => (await previewText(page)).length > 10 || (await page.locator('[data-testid="problem-strip"]').count()) > 0, 12000);
  await sleep(ms);
}

/** PNG sintético (un logotipo sencillo) para subirlo como asset. */
export function logoPng() {
  // 1x1 transparente escalable no sirve: se genera un PNG 160x56 morado con PIL desde Node es costoso; se usa SVG.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="56" viewBox="0 0 160 56"><rect width="160" height="56" rx="8" fill="#5b3fd0"/><text x="80" y="35" font-family="sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="#fff">Norte</text></svg>`;
  return { name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) };
}

export async function uploadAsset(page, file = logoPng()) {
  await page.locator('input[type="file"][multiple]').first().setInputFiles(file);
  await sleep(900);
}

/** Elige una fila de los menús «Proyecto» (`proyecto`) o «Exportar» (`exportar`) de la barra superior. */
export async function chooseMenu(page, menu, id) {
  await page.locator(`[data-testid="menu-${menu}"]`).click();
  await page.locator(`[role="menu"] [data-menu-id="${id}"]`).click();
}

export { FILES, FILES_ERROR, MAIN_PUG_PDF, SESSION, PREFS };
