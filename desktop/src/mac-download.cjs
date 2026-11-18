'use strict';
// macOS: la app no está firmada, así que el sistema no deja que se actualice sola (docs/ACTUALIZAR-ESCRITORIO.md). Lo que sí
// se puede hacer dentro de la app: descargar el .dmg de la release, comprobar su huella SHA-512 (la que publica
// latest-mac.yml) y abrirlo. Sin Electron: el `fetch` y las rutas se pasan de fuera, para probarlo en Node.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/** Lee los `files:` de un latest*.yml (url, sha512, size) sin dependencias: el formato de electron-builder es plano. */
function parseLatestYml(text) {
  const files = [];
  let cur = null;
  let inFiles = false;
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    if (/^files:\s*$/.test(raw)) { inFiles = true; continue; }
    if (inFiles && /^\S/.test(raw)) { inFiles = false; if (cur) files.push(cur); cur = null; }
    if (!inFiles) continue;
    const item = /^\s*-\s+url:\s*(.+?)\s*$/.exec(raw);
    if (item) { if (cur) files.push(cur); cur = { url: item[1].replace(/^['"]|['"]$/g, ''), sha512: '', size: 0 }; continue; }
    const kv = /^\s+(sha512|size):\s*(.+?)\s*$/.exec(raw);
    if (kv && cur) { if (kv[1] === 'sha512') cur.sha512 = kv[2].replace(/^['"]|['"]$/g, ''); else cur.size = Number(kv[2]) || 0; }
  }
  if (cur) files.push(cur);
  return files;
}

/** El .dmg de esta arquitectura (`x64` o `arm64`); null si la release no lo trae. */
function pickDmg(files, arch) {
  const want = arch === 'arm64' ? 'arm64' : 'x64';
  return files.find((f) => new RegExp(`-mac-${want}\\.dmg$`).test(f.url) && /^[\w.-]+$/.test(f.url) && f.sha512) ?? null;
}

/**
 * Descarga `url` a `destDir/name`, comprueba el SHA-512 y solo entonces deja el archivo con su nombre.
 * @param {object} o
 * @param {typeof fetch} o.fetchFn
 * @param {(percent: number, transferred: number, total: number) => void} [o.onProgress]
 * @param {{cancelled: boolean}} [o.token]
 */
async function downloadVerified({ fetchFn, url, sha512, size = 0, destDir, name, onProgress = () => {}, token = { cancelled: false } }) {
  const res = await fetchFn(url, { headers: { 'User-Agent': 'PugIDE-desktop' } });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} (404 si el instalador aún no está)`);
  const total = Number(res.headers?.get?.('content-length')) || size || 0;
  fs.mkdirSync(destDir, { recursive: true });
  const final = path.join(destDir, name);
  const part = `${final}.part`;
  const out = fs.createWriteStream(part);
  // Un error del disco (sin espacio, permisos) llega como evento asíncrono: sin oyente tumbaría el proceso principal.
  let writeError = null;
  const failed = new Promise((_, reject) => { out.on('error', (e) => { writeError = e; reject(e); }); });
  failed.catch(() => undefined);
  const hash = crypto.createHash('sha512');
  let done = 0;
  try {
    const reader = res.body.getReader();
    for (;;) {
      if (token.cancelled) throw new Error('cancelled');
      if (writeError) throw writeError;
      const { value, done: end } = await reader.read();
      if (end) break;
      hash.update(value);
      if (!out.write(value)) await Promise.race([new Promise((r) => out.once('drain', r)), failed]);
      done += value.length;
      onProgress(total ? Math.min(99, Math.floor((done / total) * 100)) : 0, done, total);
    }
    await Promise.race([new Promise((resolve, reject) => { out.end((e) => (e ? reject(e) : resolve())); }), failed]);
    if (hash.digest('base64') !== sha512) throw new Error('sha512 checksum mismatch');
    fs.renameSync(part, final);
    onProgress(100, done, total || done);
    return final;
  } catch (err) {
    out.destroy();
    try { fs.rmSync(part, { force: true }); } catch { /* ya no está */ }
    throw err;
  }
}

/** Todo el flujo: manifiesto de la release → el .dmg de esta arquitectura → descargar y comprobar. */
async function downloadMacDmg({ fetchFn, repoUrl, tag, version, arch, destDir, onProgress, token }) {
  const base = `${String(repoUrl).replace(/\/+$/, '')}/releases/download/${encodeURIComponent(tag)}/`;
  const res = await fetchFn(`${base}latest-mac.yml`, { headers: { 'User-Agent': 'PugIDE-desktop' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} (404 latest-mac.yml: el instalador aún no está)`);
  const file = pickDmg(parseLatestYml(await res.text()), arch);
  if (!file) throw new Error('Cannot find the .dmg in latest-mac.yml (404)');
  return downloadVerified({ fetchFn, url: base + encodeURIComponent(file.url), sha512: file.sha512, size: file.size, destDir, name: file.url, onProgress, token });
}

module.exports = { parseLatestYml, pickDmg, downloadVerified, downloadMacDmg };
