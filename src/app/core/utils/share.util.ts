import { Inflate, deflateSync, strFromU8, strToU8 } from 'fflate';

/** Prefijo del hash de la URL: `#p=<payload base64url>`. */
export const SHARE_HASH_PREFIX = '#p=';
/** Por encima de este largo (caracteres del enlace completo) se avisa de que puede no abrirse en todas partes. */
export const SHARE_URL_WARN_LENGTH = 8000;
/** Tope de JSON descomprimido al leer un enlace (protege de bombas de compresión). */
export const SHARE_MAX_JSON_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 500;
const SHARE_VERSION = 1;

export interface SharePayload {
  projectName: string;
  files: Map<string, string>;
  data: Record<string, unknown>;
}

export class ShareDecodeError extends Error {}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new ShareDecodeError('El enlace contiene caracteres no válidos.');
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Descomprime con tope de tamaño (lanza ShareDecodeError si se supera). */
function inflateLimited(bytes: Uint8Array, max: number): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const inf = new Inflate((chunk) => {
    total += chunk.length;
    if (total > max) throw new ShareDecodeError('El proyecto compartido es demasiado grande.');
    chunks.push(chunk);
  });
  inf.push(bytes, true);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/** Serializa archivos de texto + datos a un payload base64url comprimido (sin assets binarios). */
export function encodeShare(projectName: string, files: Map<string, string>, data: Record<string, unknown>): string {
  const json = JSON.stringify({ v: SHARE_VERSION, n: projectName, f: Object.fromEntries(files), d: data });
  return toBase64Url(deflateSync(strToU8(json), { level: 9 }));
}

export function buildShareUrl(base: string, payload: string): string {
  return `${base.split('#')[0]}${SHARE_HASH_PREFIX}${payload}`;
}

/** Extrae el payload de un hash (`#p=...`) o null si no es un enlace compartido. */
export function payloadFromHash(hash: string): string | null {
  return hash.startsWith(SHARE_HASH_PREFIX) ? hash.slice(SHARE_HASH_PREFIX.length) : null;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function cleanPath(p: string): string | null {
  if (typeof p !== 'string' || p.length === 0 || p.length > 300 || p.includes('\0')) return null;
  const path = p.startsWith('/') ? p : '/' + p;
  if (path.split('/').some((s) => s === '..')) return null;
  return path;
}

/** Decodifica y valida un payload. Lanza ShareDecodeError con un mensaje en español si es inválido. */
export function decodeShare(payload: string): SharePayload {
  let parsed: unknown;
  try {
    const json = strFromU8(inflateLimited(fromBase64Url(payload), SHARE_MAX_JSON_BYTES));
    parsed = JSON.parse(json);
  } catch (err) {
    if (err instanceof ShareDecodeError) throw err;
    throw new ShareDecodeError('El enlace está dañado o incompleto.');
  }
  if (!isPlainObject(parsed) || parsed['v'] !== SHARE_VERSION) throw new ShareDecodeError('Versión de enlace no soportada.');
  const { n, f, d } = parsed;
  if (!isPlainObject(f)) throw new ShareDecodeError('El enlace no contiene archivos.');
  const entries = Object.entries(f);
  if (entries.length === 0 || entries.length > MAX_FILES) throw new ShareDecodeError('El enlace no contiene un número válido de archivos.');
  const files = new Map<string, string>();
  for (const [rawPath, content] of entries) {
    const path = cleanPath(rawPath);
    if (!path || typeof content !== 'string') throw new ShareDecodeError('El enlace contiene archivos no válidos.');
    files.set(path, content);
  }
  if (d !== undefined && !isPlainObject(d)) throw new ShareDecodeError('Los datos del enlace no son válidos.');
  const name = typeof n === 'string' && n.trim() ? n.trim().slice(0, 100) : 'Proyecto compartido';
  return { projectName: name, files, data: structuredClone((d ?? {}) as Record<string, unknown>) };
}
