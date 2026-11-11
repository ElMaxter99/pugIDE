'use strict';
// Espacios de trabajo (P-26): cada espacio es una carpeta del disco. Este módulo es el único que toca archivos, y solo
// dentro de las carpetas que la persona eligió con el diálogo del sistema. Sin Electron: se prueba con Node.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const TEXT_EXT = new Set(['pug', 'jade', 'css', 'scss', 'sass', 'less', 'json', 'js', 'mjs', 'html', 'htm', 'md', 'txt', 'yml', 'yaml', 'xml', 'csv']);
const ASSET_MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
};
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'target', 'vendor', '__pycache__']);
const LIMITS = { files: 2000, textBytes: 2 * 1024 * 1024, assetBytes: 10 * 1024 * 1024, totalBytes: 60 * 1024 * 1024, depth: 12 };
const DATASETS = '.pugide/datasets.json';
const COLORS = ['#ddb7ff', '#4cd7f6', '#fabc4e', '#a6e3a1', '#ffb4ab', '#cfc2d6'];

const ext = (p) => (p.split('.').pop() ?? '').toLowerCase();
const cleanName = (raw) => String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);

/** Ruta de la app (`/styles/a.css`) → ruta absoluta dentro de `root`, o null si se sale de la carpeta. */
function inside(root, appPath) {
  if (typeof appPath !== 'string' || !appPath.startsWith('/') || appPath.includes('\0')) return null;
  const base = path.resolve(root);
  const abs = path.resolve(base, '.' + appPath);
  return abs !== base && abs.startsWith(base + path.sep) ? abs : null;
}

class WorkspaceStore {
  /** `file`: JSON con la lista de espacios (en la carpeta de datos de la app). */
  constructor(file) {
    this.file = file;
    this.state = { workspaces: [], lastId: null, updates: { asked: false, enabled: false, dismissed: null, lastCheck: 0, latest: null } };
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (raw && Array.isArray(raw.workspaces)) {
        this.state.workspaces = raw.workspaces.filter((w) => w && typeof w.id === 'string' && typeof w.path === 'string' && typeof w.name === 'string');
        this.state.lastId = typeof raw.lastId === 'string' ? raw.lastId : null;
        if (raw.updates && typeof raw.updates === 'object') Object.assign(this.state.updates, raw.updates);
      }
    } catch { /* primera vez o archivo dañado: se empieza vacío */ }
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
      fs.renameSync(tmp, this.file);
    } catch { /* sin permiso de escritura: la lista vive mientras la app esté abierta */ }
  }

  get(id) { return this.state.workspaces.find((w) => w.id === id) ?? null; }

  /** Lista para la interfaz, la más reciente primero, con si la carpeta sigue ahí. */
  list() {
    return [...this.state.workspaces].sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0)).map((w) => {
      let exists = false;
      try { exists = fs.statSync(w.path).isDirectory(); } catch { exists = false; }
      return { id: w.id, name: w.name, color: w.color, path: w.path, lastOpened: w.lastOpened ?? 0, exists };
    });
  }

  create(name, color, dir) {
    const clean = cleanName(name) || path.basename(dir);
    const abs = path.resolve(dir);
    const existing = this.state.workspaces.find((w) => path.resolve(w.path) === abs);
    if (existing) return existing;
    const ws = { id: crypto.randomUUID(), name: clean, color: COLORS.includes(color) ? color : COLORS[0], path: abs, lastOpened: Date.now() };
    this.state.workspaces.push(ws);
    this.save();
    return ws;
  }

  update(id, patch) {
    const ws = this.get(id);
    if (!ws) return null;
    if (patch.name !== undefined && cleanName(patch.name)) ws.name = cleanName(patch.name);
    if (patch.color !== undefined && COLORS.includes(patch.color)) ws.color = patch.color;
    if (patch.path !== undefined) ws.path = path.resolve(patch.path);
    this.save();
    return ws;
  }

  remove(id) {
    this.state.workspaces = this.state.workspaces.filter((w) => w.id !== id);
    if (this.state.lastId === id) this.state.lastId = null;
    this.save();
  }

  touch(id) {
    const ws = this.get(id);
    if (!ws) return;
    ws.lastOpened = Date.now();
    this.state.lastId = id;
    this.save();
  }

  setLast(id) { this.state.lastId = id; this.save(); }
}

/** Lee la carpeta: archivos de texto, imágenes y fuentes. Lo demás se cuenta y no se toca. */
async function readWorkspace(root) {
  const files = {};
  const assets = [];
  const skipped = [];
  let datasets = null;
  let total = 0, count = 0, tooBig = false;
  async function walk(dir, rel, depth) {
    if (tooBig || depth > LIMITS.depth) return;
    let entries;
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (tooBig) return;
      const abs = path.join(dir, e.name);
      const appPath = `${rel}/${e.name}`;
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (e.name === '.pugide') {
          try { datasets = await fsp.readFile(path.join(abs, 'datasets.json'), 'utf8'); } catch { /* sin datos guardados */ }
          continue;
        }
        if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
        await walk(abs, appPath, depth + 1);
        continue;
      }
      if (!e.isFile() || e.name.startsWith('.')) continue;
      const x = ext(e.name);
      const isText = TEXT_EXT.has(x), mime = ASSET_MIME[x];
      if (!isText && !mime) { skipped.push(appPath); continue; }
      let size = 0;
      try { size = (await fsp.stat(abs)).size; } catch { continue; }
      if (size > (mime ? LIMITS.assetBytes : LIMITS.textBytes)) { skipped.push(appPath); continue; }
      if (++count > LIMITS.files || (total += size) > LIMITS.totalBytes) { tooBig = true; return; }
      try {
        if (mime) assets.push({ path: appPath, mime, data: new Uint8Array(await fsp.readFile(abs)) });
        else files[appPath] = (await fsp.readFile(abs, 'utf8')).replace(/^﻿/, '');
      } catch { skipped.push(appPath); }
    }
  }
  await walk(root, '', 0);
  if (tooBig) return { ok: false, reason: 'too-big', limits: LIMITS };
  return { ok: true, files, assets, datasets, skipped: skipped.slice(0, 200), skippedCount: skipped.length };
}

/** Lee solo unas rutas (tras un cambio en disco). `null` = ya no existe. */
async function readPaths(root, paths) {
  const out = {};
  for (const p of paths.slice(0, 500)) {
    const abs = p === '/' + DATASETS ? path.join(path.resolve(root), DATASETS) : inside(root, p);
    if (!abs) continue;
    try {
      const mime = ASSET_MIME[ext(p)];
      out[p] = mime ? { mime, data: new Uint8Array(await fsp.readFile(abs)) } : { text: (await fsp.readFile(abs, 'utf8')).replace(/^﻿/, '') };
    } catch { out[p] = null; }
  }
  return out;
}

async function writeAtomic(abs, data) {
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.pugide-${process.pid}.tmp`;
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, abs);
}

/** Escribe lo que cambió y borra lo que se quitó. Devuelve lo escrito (para no tomarlo por un cambio ajeno). */
async function writeWorkspace(root, change) {
  const written = [], failed = [];
  const put = async (appPath, data) => {
    const abs = inside(root, appPath);
    if (!abs) { failed.push(appPath); return; }
    try { await writeAtomic(abs, data); written.push(appPath); } catch { failed.push(appPath); }
  };
  for (const [p, text] of Object.entries(change.files ?? {})) if (typeof text === 'string') await put(p, text);
  for (const a of change.assets ?? []) if (a && a.data) await put(a.path, Buffer.from(a.data));
  if (typeof change.datasets === 'string') await put('/' + DATASETS, change.datasets);
  for (const p of change.deleted ?? []) {
    const abs = inside(root, p);
    if (!abs) continue;
    try { await fsp.rm(abs, { force: true }); written.push(p); } catch { failed.push(p); }
    // Carpetas que se quedan vacías se quitan (hasta la raíz, sin tocarla).
    let dir = path.dirname(abs);
    const base = path.resolve(root);
    while (dir !== base && dir.startsWith(base + path.sep)) {
      try { await fsp.rmdir(dir); } catch { break; }
      dir = path.dirname(dir);
    }
  }
  return { written, failed };
}

/** ¿Es una ruta que la app maneja (para filtrar los avisos de cambios)? */
function watchedPath(rel) {
  const parts = rel.split(/[\\/]/);
  if (rel.replace(/\\/g, '/') === DATASETS) return true;
  if (parts.some((s) => s.startsWith('.') || SKIP_DIRS.has(s))) return false;
  const x = ext(parts[parts.length - 1]);
  return (TEXT_EXT.has(x) || !!ASSET_MIME[x]) && !/\.pugide-\d+\.tmp$/.test(rel);
}

module.exports = { WorkspaceStore, readWorkspace, readPaths, writeWorkspace, watchedPath, inside, COLORS, LIMITS, DATASETS };
