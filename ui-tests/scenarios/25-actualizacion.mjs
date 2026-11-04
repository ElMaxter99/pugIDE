import http from 'node:http';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, openApp, waitUntil } from '../lib.mjs';
import { headersFor } from '../headers.mjs';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/pug-ide/browser');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Servidor de prueba con DOS versiones de la app: la compilada («v1») y una «v2» que solo cambia el número de versión
 * del Workspace. `publishV2()` hace que el servidor empiece a servir la v2 con su `ngsw.json` (hashes incluidos), como
 * haría un despliegue nuevo.
 */
function versionedServer() {
  const version = JSON.parse(readFileSync(resolve(dist, '../../../package.json'), 'utf8')).version;
  // El número de versión va inlinado en algún chunk de JS: ese es el archivo que la v2 cambia.
  // (esbuild lo escribe como literal con comillas dobles, simples o invertidas, según el caso)
  const literal = new RegExp('(["\'`])' + version.replace(/\./g, '\\.') + '\\1');
  const target = readdirSync(dist).filter((f) => f.endsWith('.js')).find((f) => literal.test(readFileSync(join(dist, f), 'utf8')));
  if (!target) throw new Error(`No se encontró el literal de la versión ${version} en ningún .js de dist`);
  const overrides = new Map();
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const body = overrides.get(pathname);
    const served = body ? pathname : null;
    if (body) {
      res.writeHead(200, { 'content-type': TYPES[extname(pathname)] ?? 'application/octet-stream', ...headersFor(pathname) });
      res.end(body);
      return;
    }
    let file = join(dist, pathname);
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    if (pathname.startsWith('/_vercel/')) { res.writeHead(404).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
    const path = '/' + file.slice(dist.length + 1).split(sep).join('/');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', ...headersFor(path === '/index.html' ? pathname : path) });
    createReadStream(file).pipe(res);
    void served;
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({
    server,
    url: `http://127.0.0.1:${server.address().port}`,
    target,
    publishV2() {
      const js = readFileSync(join(dist, target), 'utf8').replace(literal, '$19.9.9$1');
      const manifest = JSON.parse(readFileSync(join(dist, 'ngsw.json'), 'utf8'));
      manifest.hashTable['/' + target] = createHash('sha1').update(js).digest('hex');
      manifest.timestamp = Date.now();
      overrides.set('/' + target, js);
      overrides.set('/ngsw.json', JSON.stringify(manifest));
    },
  })));
}

const versionText = (page) => page.locator('.workspace-version').innerText().then((t) => t.trim()).catch(() => '');
/** El service worker ya controla la página y terminó de instalar la versión que sirve. */
const swReady = (page) => waitUntil(async () => page.evaluate(async () => {
  if (!navigator.serviceWorker?.controller) return false;
  const state = await fetch('/ngsw/state').then((r) => r.text()).catch(() => '');
  return /Driver state: NORMAL/.test(state);
}), 20000, 300);

export const browsers = ['chromium'];
export const why = 'necesita un service worker real y un servidor que cambie de versión; se prueba en Chromium';

// La app se mantiene en su última versión: se actualiza sola al entrar y avisa (sin recargar) mientras se trabaja
export default async function (env) {
  const site = await versionedServer();
  const sw = { ...env, baseURL: site.url, serviceWorkers: 'allow' };
  const session = { projectName: 'Actualización', files: { '/main.pug': 'p Hola\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };

  // 1. Al entrar, sin haber tocado nada: la versión nueva se aplica sola
  let app = await openApp(sw, { path: '/ide', session });
  let { page } = app;
  const v1 = await waitUntil(async () => (await versionText(page)).startsWith('v') && (await versionText(page)) !== 'v9.9.9' && (await versionText(page)));
  check('25 arranca en la versión compilada', !!v1 && v1 !== 'v9.9.9', String(v1));
  check('25 el service worker instala la versión', !!(await swReady(page)));
  site.publishV2();
  await page.reload();
  const auto = await waitUntil(async () => (await versionText(page)) === 'v9.9.9', 30000, 300);
  check('25 al entrar, la versión nueva se aplica sola (sin tocar nada)', !!auto, await versionText(page));
  check('25 sin errores no controlados (entrada)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // 2. Trabajando: solo se avisa, sin recargar, y «Más tarde» oculta el aviso hasta la próxima comprobación
  site.server.close();
  const site2 = await versionedServer();
  const sw2 = { ...env, baseURL: site2.url, serviceWorkers: 'allow' };
  app = await openApp(sw2, { path: '/ide', session });
  page = app.page;
  await swReady(page);
  await page.mouse.click(700, 400); // primer gesto del usuario: la ventana de actualización automática se cierra
  site2.publishV2();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const bar = page.locator('app-update-bar [role="status"]');
  const shown = await waitUntil(async () => (await bar.count()) === 1, 15000, 300);
  check('25 trabajando, una versión nueva muestra el aviso', !!shown);
  check('25 el aviso explica qué pasa y ofrece Actualizar ahora y Más tarde',
    !!shown && /Hay una versión nueva de PugIDE/.test(await bar.textContent()) && (await bar.getByRole('button', { name: 'Actualizar ahora' }).count()) === 1 && (await bar.getByRole('button', { name: 'Más tarde' }).count()) === 1);
  check('25 no recarga sola: sigue en la versión anterior', (await versionText(page)) !== 'v9.9.9', await versionText(page));
  await bar.getByRole('button', { name: 'Más tarde' }).click();
  check('25 «Más tarde» oculta el aviso', !!(await waitUntil(async () => (await bar.count()) === 0, 4000, 100)));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  check('25 en la siguiente comprobación el aviso vuelve', !!(await waitUntil(async () => (await bar.count()) === 1, 15000, 300)));
  await bar.getByRole('button', { name: 'Actualizar ahora' }).click();
  check('25 «Actualizar ahora» recarga con la versión nueva', !!(await waitUntil(async () => (await versionText(page)) === 'v9.9.9', 30000, 300)), await versionText(page));
  check('25 el proyecto sigue ahí tras actualizar', !!(await waitUntil(() => page.evaluate(() => window.monaco?.editor.getModels().some((m) => m.getValue().includes('Hola')) === true), 10000, 300)));
  check('25 sin errores no controlados (trabajando)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
  site2.server.close();
}
