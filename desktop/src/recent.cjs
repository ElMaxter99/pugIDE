'use strict';
// Archivos y carpetas recientes de la app de escritorio (P-46): «Archivo → Abrir reciente». La lista vive en el almacén de
// la app (junto a los espacios de trabajo), nunca sale del equipo y se vacía con «Borrar la lista». Parte pura, sin Electron.
const path = require('node:path');

const MAX_RECENT = 10;
/** Windows y macOS no distinguen mayúsculas en las rutas; Linux sí. */
const caseInsensitive = () => process.platform !== 'linux';
const keyOf = (p, ci) => { const r = path.resolve(String(p)); return ci ? r.toLowerCase() : r; };

/** Lo guardado (o escrito a mano): solo entradas con ruta absoluta y tipo válido, sin repetir, como mucho `MAX_RECENT`. */
function sanitizeRecent(raw, ci = caseInsensitive()) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const e of raw) {
    if (!e || typeof e.path !== 'string' || !path.isAbsolute(e.path) || e.path.includes('\0')) continue;
    if (e.kind !== 'file' && e.kind !== 'folder') continue;
    const k = keyOf(e.path, ci);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ path: e.path, kind: e.kind, at: Number.isFinite(e.at) ? e.at : 0 });
    if (out.length >= MAX_RECENT) break;
  }
  return out;
}

/** El más reciente arriba: lo que ya estaba sube en vez de repetirse. */
function addRecent(list, entry, { now = Date.now(), ci = caseInsensitive() } = {}) {
  if (!entry || typeof entry.path !== 'string' || !path.isAbsolute(entry.path) || (entry.kind !== 'file' && entry.kind !== 'folder')) return sanitizeRecent(list, ci);
  const k = keyOf(entry.path, ci);
  return sanitizeRecent([{ path: entry.path, kind: entry.kind, at: now }, ...(list ?? []).filter((e) => e && typeof e.path === 'string' && keyOf(e.path, ci) !== k)], ci);
}

function removeRecent(list, p, ci = caseInsensitive()) {
  const k = keyOf(p, ci);
  return (list ?? []).filter((e) => e && typeof e.path === 'string' && keyOf(e.path, ci) !== k);
}

/** Texto del menú: `factura.pug — C:\Trabajo\clinica-aurora\plantillas` (la carpeta distingue dos `factura.pug`). */
function recentLabel(entry) {
  const name = path.basename(entry.path) || entry.path;
  const dir = entry.kind === 'folder' ? entry.path : path.dirname(entry.path);
  return `${name} — ${dir}`;
}

module.exports = { MAX_RECENT, sanitizeRecent, addRecent, removeRecent, recentLabel };
