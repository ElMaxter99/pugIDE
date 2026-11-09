'use strict';
// Servidor del protocolo `pugide://app/…`: sirve la app compilada desde el disco, sin red y sin servidor HTTP.
const { readFile, stat } = require('node:fs/promises');
const path = require('node:path');
const { headersFor } = require('./headers.cjs');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/**
 * Devuelve `{ status, body, headers }` para una ruta. Las rutas sin extensión (`/ide`) devuelven `index.html`, igual que
 * el `rewrites` de `vercel.json`. Una ruta que sale de la carpeta de la app se rechaza.
 */
async function resolveRequest(webRoot, rules, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return { status: 400, body: 'Bad request', headers: { 'content-type': 'text/plain' } }; }
  const root = path.resolve(webRoot);
  const wantsFile = /\.[a-zA-Z0-9]+$/.test(decoded) || decoded.startsWith('/assets/');
  const rel = decoded === '/' || !wantsFile ? '/index.html' : decoded;
  const file = path.resolve(root, '.' + rel);
  if (file !== root && !file.startsWith(root + path.sep)) return { status: 403, body: 'Forbidden', headers: { 'content-type': 'text/plain' } };
  try {
    if (!(await stat(file)).isFile()) throw new Error('no file');
    const body = await readFile(file);
    const headers = { ...headersFor(rules, rel === '/index.html' && !wantsFile ? decoded : rel), 'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream' };
    delete headers['strict-transport-security']; // solo tiene sentido en HTTPS
    return { status: 200, body, headers };
  } catch {
    return { status: 404, body: 'Not found', headers: { 'content-type': 'text/plain' } };
  }
}

module.exports = { resolveRequest, TYPES };
