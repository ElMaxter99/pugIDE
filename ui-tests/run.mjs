// Pruebas de interfaz: Chromium (Playwright) sobre el build de producción (`npm run build:prod`).
//
//   npm run build:prod && npm run test:ui
//
// Chromium: se usa el de Playwright (`npx playwright install chromium`) o el indicado en PUGIDE_CHROMIUM.
import http from 'node:http';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { stats } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist/pug-ide/browser');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('No existe dist/pug-ide/browser: ejecuta antes "npm run build:prod".');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json', '.pug': 'text/plain',
};

/** Servidor estático con la misma lógica de SPA que producción: lo que no existe devuelve index.html. */
function serve() {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(dist, pathname);
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    if (pathname.startsWith('/_vercel/')) { res.writeHead(404).end(); return; } // analítica de Vercel: no existe en local
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

const server = await serve();
const baseURL = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath: process.env.PUGIDE_CHROMIUM || undefined,
  args: ['--no-sandbox'],
});
const env = { baseURL, browser };

const only = process.argv.slice(2);
const dir = join(here, 'scenarios');
const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && (only.length === 0 || only.some((o) => f.includes(o)))).sort();
for (const f of files) {
  console.log(`\n# ${f}`);
  try {
    await (await import(join(dir, f))).default(env);
  } catch (err) {
    stats.fails++;
    console.log(`FAIL ${f} lanzó una excepción  -> ${err?.stack ?? err}`);
  }
}

await browser.close();
server.close();
console.log(stats.fails ? `\n${stats.fails} FAILED (de ${stats.checks})` : `\nall passed (${stats.checks})`);
process.exit(stats.fails ? 1 : 0);
