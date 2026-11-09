// Prueba de humo de la app de escritorio: lanza Electron de verdad (Playwright `_electron`) contra la web compilada y
// comprueba arranque, seguridad (CSP y sandbox de producción), ausencia de red, service worker y analítica apagados.
// Necesita `npm run build:prod` en la carpeta del proyecto. En Linux sin pantalla: `xvfb-run -a npm test`.
import { _electron as electron } from 'playwright-core';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(here, '..');
let failed = 0;
const step = (m) => console.log(`... ${m}`); // trazas: si algo se cuelga en el CI, el log dice dónde
// Perro guardián: si la prueba no termina, falla con un mensaje en vez de colgar el flujo hasta su límite de tiempo.
const watchdog = setTimeout(() => { console.log('FAIL la prueba de humo no terminó en 4 minutos (¿Electron colgado al arrancar?)'); process.exit(1); }, 4 * 60 * 1000);
watchdog.unref?.();
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || !detail ? '' : `  -> ${detail}`}`); if (!ok) failed++; };
const wait = async (fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 250)); } return null; };

// Por defecto, el Electron de desktop/node_modules con el código de src/. Con PUGIDE_EXECUTABLE se prueba el binario ya
// empaquetado (el de `npm run pack` o el instalado), que es el que recibe la gente.
const packaged = process.env.PUGIDE_EXECUTABLE;
step('lanzando Electron');
const app = await electron.launch({ timeout: 90000, executablePath: packaged || createRequire(import.meta.url)('electron'), args: [...(packaged ? [] : ['.']), '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'], cwd: desktopDir, env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' } });
const violations = [];
const external = [];
try {
  step('Electron lanzado, esperando la ventana');
  const page = await app.firstWindow();
  step('ventana abierta: ' + page.url());
  page.on('console', (m) => { if (/Content Security Policy|Refused to /i.test(m.text())) violations.push(m.text().slice(0, 200)); });
  page.on('request', (r) => { const u = r.url(); if (!/^(pugide:|blob:|data:|devtools:)/.test(u)) external.push(u); });
  // La ventana puede abrirse antes de que cargue la app (en el primer arranque de un binario empaquetado tarda más): se espera.
  await page.waitForURL(/^pugide:\/\/app\//, { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');

  check('arranca en la app (pugide://app/ide)', page.url().startsWith('pugide://app/'), page.url());
  check('la ventana se llama PugIDE', (await page.title()).includes('PugIDE'), await page.title());
  const info = await page.evaluate(() => window.pugideDesktop ?? null);
  check('el preload expone la plataforma y la versión', !!info && typeof info.platform === 'string' && /^\d+\.\d+\.\d+/.test(info.version), JSON.stringify(info));
  check('y la dirección web para los enlaces de compartir', info?.webUrl === 'https://pug-ide.vercel.app', String(info?.webUrl));
  check('y nada más (sin funciones ni acceso al sistema)', !!info && Object.values(info).every((v) => typeof v === 'string') && Object.keys(info).length === 3, JSON.stringify(info));
  // Monaco define un `require` propio (su cargador AMD), así que no basta con mirar si existe: se comprueba que la página no
  // pueda llegar a Node (ni `process` de Node ni cargar `fs`).
  await wait(async () => (await page.locator('.monaco-editor').count()) > 0); // que el cargador de Monaco ya esté puesto
  const node = await page.evaluate(() => {
    const hasProcess = typeof process !== 'undefined' && !!process.versions?.node;
    let fs = false;
    try { fs = typeof require === 'function' && !!require('fs')?.readFileSync; } catch { fs = false; }
    return { hasProcess, fs, module: typeof module !== 'undefined' };
  });
  check('la página no tiene Node (ni process de Node, ni puede cargar fs)', !node.hasProcess && !node.fs && !node.module, JSON.stringify(node));

  const editor = await wait(async () => (await page.locator('.monaco-editor').count()) > 0);
  check('carga el editor (Monaco, con sus workers bajo la CSP)', !!editor);
  const preview = await wait(async () => (await page.locator('app-preview-panel iframe').count()) > 0);
  check('carga la vista previa', !!preview);
  const compiled = await wait(async () => page.frames().some((f) => f !== page.mainFrame() && f.url().startsWith('blob:') || f.url().startsWith('pugide://app/assets/preview-frame')), 30000);
  check('la vista previa compila y pinta (marco aislado)', !!compiled);

  const csp = await page.evaluate(async () => {
    const get = async (p) => (await fetch(p)).headers.get('content-security-policy') ?? '';
    return { main: await get('/ide'), render: await get('/assets/render-frame.html'), prev: await get('/assets/preview-frame.html') };
  });
  check('la app lleva la CSP de producción', /default-src 'self'/.test(csp.main) && /object-src 'none'/.test(csp.main), csp.main.slice(0, 80));
  check('los marcos del usuario llevan su sandbox', /sandbox allow-scripts/.test(csp.render) && /sandbox allow-scripts/.test(csp.prev), `${csp.render.slice(-40)} | ${csp.prev.slice(-40)}`);
  const status = await page.evaluate(async () => ({ spa: (await fetch('/ide/algo')).status, miss: (await fetch('/assets/no-existe.js')).status, trav: (await fetch('/..%2f..%2fpackage.json')).status }));
  check('las rutas de la app (SPA) funcionan, lo que no existe da 404 y no se sale de la carpeta', status.spa === 200 && status.miss === 404 && status.trav === 403, JSON.stringify(status));

  const sw = await page.evaluate(async () => { try { return navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0; } catch { return 0; } });
  check('no hay service worker (la app se actualiza con el instalador)', sw === 0, String(sw));
  check('no hay aviso de privacidad ni analítica', (await page.locator('app-consent-banner [role="region"]').count()) === 0);

  const before = app.windows().length;
  await page.evaluate(() => { window.open('https://example.com/', '_blank'); });
  await new Promise((r) => setTimeout(r, 800));
  check('un enlace externo no abre ventanas dentro de la app', app.windows().length === before, String(app.windows().length));

  await new Promise((r) => setTimeout(r, 1500));
  check('sin violaciones de la CSP', violations.length === 0, violations.slice(0, 3).join(' | '));
  check('sin peticiones a internet (funciona sin conexión)', external.length === 0, external.slice(0, 3).join(' | '));
} finally {
  step('cerrando');
  await Promise.race([app.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => undefined);
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
