// Servidor estático del build de producción + navegador, compartido por las herramientas del lienzo.
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { headersFor } from '../../ui-tests/headers.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const dist = resolve(here, '../../dist/pug-ide/browser');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.pug': 'text/plain' };

export async function start() {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('Falta dist/pug-ide/browser: ejecuta antes "npm run build:prod".');
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(dist, pathname);
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    if (pathname.startsWith('/_vercel/')) { res.writeHead(404).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
    const served = '/' + file.slice(dist.length + 1).split(sep).join('/');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', ...headersFor(served === '/index.html' ? pathname : served) });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.PUGIDE_CHROMIUM || undefined, args: ['--no-sandbox'] });
  return { baseURL, browser, close: async () => { await browser.close(); server.close(); } };
}
