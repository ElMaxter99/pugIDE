'use strict';
// Abrir archivos .pug y carpetas con PugIDE (P-40): doble clic o «Abrir con» desde el sistema, y arrastrar a la ventana.
// Parte pura (qué es una ruta y qué espacio la contiene) probada sin Electron en test/unit/open-path.test.mjs.
const path = require('node:path');

const TEMPLATE_RE = /\.(pug|jade)$/i;

/** Rutas que el sistema pasa al abrir la app (doble clic, «Abrir con»): plantillas y carpetas, nunca opciones ni la propia app. */
function pathsFromArgv(argv, { isDirectory, appPath, cwd }) {
  const out = [];
  for (const raw of (argv ?? []).slice(1)) {
    if (typeof raw !== 'string' || !raw || raw.startsWith('-') || raw.includes('://')) continue;
    const abs = path.resolve(cwd ?? process.cwd(), raw);
    if (appPath && (abs === path.resolve(appPath) || raw === '.')) continue;
    if (TEMPLATE_RE.test(abs)) out.push(abs);
    else if (path.isAbsolute(raw) && isDirectory(abs)) out.push(abs);
  }
  return out;
}

/** ¿La carpeta `dir` es `base` o está dentro? (sin falsos positivos como /a/bc dentro de /a/b). */
function isInside(base, dir) {
  const rel = path.relative(path.resolve(base), path.resolve(dir));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** El espacio de trabajo que contiene la carpeta (el más profundo si hay varios anidados). */
function workspaceFor(workspaces, dir) {
  let best = null;
  for (const ws of workspaces ?? []) {
    if (ws && typeof ws.path === 'string' && isInside(ws.path, dir) && (!best || ws.path.length > best.path.length)) best = ws;
  }
  return best;
}

/**
 * Qué hacer con una ruta: `folder` (abrir como espacio), `file` (una plantilla: preguntar o abrir su espacio),
 * `unsupported` (otro tipo de archivo) o `missing` (ya no existe).
 */
function classifyPath(p, { stat, workspaces }) {
  const name = path.basename(p);
  let st;
  try { st = stat(p); } catch { return { kind: 'missing', path: p, name }; }
  if (st.isDirectory()) {
    const ws = workspaceFor(workspaces, p);
    return { kind: 'folder', path: p, name, workspaceId: ws && path.resolve(ws.path) === path.resolve(p) ? ws.id : null };
  }
  if (!st.isFile() || !TEMPLATE_RE.test(p)) return { kind: 'unsupported', path: p, name };
  const folder = path.dirname(p);
  const ws = workspaceFor(workspaces, folder);
  // Ruta del archivo dentro del espacio (o de su carpeta), con «/» como en el proyecto.
  const base = ws ? ws.path : folder;
  const rel = '/' + path.relative(base, p).split(path.sep).join('/');
  return { kind: 'file', path: p, name, folder, folderName: path.basename(folder), workspaceId: ws ? ws.id : null, entry: rel };
}

module.exports = { pathsFromArgv, classifyPath, workspaceFor, isInside, TEMPLATE_RE };
