// Mediciones de rendimiento del preview (Chromium, build de producción). No forma parte del CI.
//
//   npm run build:prod && npm run perf
//   npm run perf -- --runs 7 --rows 500,2000 --only tables
//   npm run perf -- --dist ../otra-copia/dist/pug-ide/browser --only assets     (comparar con otro build)
//
// Escenarios:
//   tablas : una tabla con `thead` y N filas en modo PDF. Mide (a) el paginado (ms entre el mensaje `pugide-layout` y
//            `pugide-layout-result`, que es lo que corre dentro del iframe) y (b) el cambio de código completo
//            (debounce de 300 ms + compilación + escritura del documento + paginado).
//   assets : un cambio de código con un asset de ~3 MB en el proyecto, hasta que el preview lo muestra con la imagen.
// Imprime la mediana y el rango de cada medida.
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { headersFor } from '../ui-tests/headers.mjs';
import {
  ASSET_PUG, changeAndWait, imgLoaded, median, openAssetProject, openPdfProject, repaginate, tablePug,
} from '../ui-tests/perf-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const dist = resolve(opt('dist', join(here, '../dist/pug-ide/browser')));
const runs = Number(opt('runs', 5));
const rowsList = opt('rows', '500,2000,5000').split(',').map(Number);
const only = opt('only', 'tablas,assets');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json', '.pug': 'text/plain',
};
if (!existsSync(join(dist, 'index.html'))) {
  console.error(`No existe ${dist}: ejecuta antes "npm run build:prod".`);
  process.exit(1);
}

const server = await new Promise((r) => {
  const s = http.createServer((req, res) => {
    const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(dist, pathname);
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    if (pathname.startsWith('/_vercel/')) { res.writeHead(404).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
    const served = '/' + file.slice(dist.length + 1).split(sep).join('/');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', ...headersFor(served === '/index.html' ? pathname : served) });
    createReadStream(file).pipe(res);
  }).listen(0, '127.0.0.1', () => r(s));
});
const baseURL = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.PUGIDE_CHROMIUM || undefined, args: ['--no-sandbox'] });
const env = { baseURL, browser, browserName: 'chromium' };
console.log(`Chromium ${browser.version()} · ${dist} · ${runs} ejecuciones (mediana [mín–máx], ms)\n`);

const rows = [];
const fmt = (xs) => `${Math.round(median(xs))} [${Math.round(Math.min(...xs))}–${Math.round(Math.max(...xs))}]`;

if (only.includes('tablas')) {
  for (const n of rowsList) {
    const pag = [];
    const change = [];
    let pages = 0;
    for (let i = 0; i < runs; i++) {
      const app = await openPdfProject(env, tablePug(n));
      pag.push(await repaginate(app.page));
      pages = Number((await app.page.locator('.pdf-bar').innerText()).match(/(\d+) página/)?.[1]);
      change.push(await changeAndWait(app.page, tablePug(n, `Informe ${i}`), `Informe ${i}`, { layout: true }));
      if (app.errors.length) console.log('  errores de página:', app.errors.join(' | '));
      await app.context.close();
    }
    rows.push([`tabla ${n} filas (${pages} págs.)`, 'paginado (pugide-layout → resultado)', fmt(pag)]);
    rows.push([`tabla ${n} filas (${pages} págs.)`, 'cambio de código → preview paginado', fmt(change)]);
  }
}

if (only.includes('assets')) {
  const change = [];
  for (let i = 0; i < runs; i++) {
    const app = await openAssetProject(env);
    const { page } = app;
    // Primer render con el asset (no se mide) y luego cambios de solo código.
    await changeAndWait(page, ASSET_PUG(`calentamiento ${i}`), `calentamiento ${i}`, { ready: imgLoaded });
    change.push(await changeAndWait(page, ASSET_PUG(`cambio ${i}`), `cambio ${i}`, { ready: imgLoaded }));
    await app.context.close();
  }
  rows.push(['asset de 3 MB', 'cambio de código → preview con la imagen', fmt(change)]);
}

await browser.close();
server.close();
const w = [0, 1, 2].map((c) => Math.max(...rows.map((r) => r[c].length)));
for (const r of rows) console.log(r.map((x, c) => x.padEnd(w[c])).join('  '));
