import { Inflate, deflateSync, strFromU8, strToU8 } from 'fflate';
import { ASSET_EXT_RE, mimeForPath } from './asset.util';

/** Prefijo del hash de la URL: `#p=<payload base64url>`. */
export const SHARE_HASH_PREFIX = '#p=';
/** Prefijo de un enlace con contraseña: `#e=<contenido cifrado base64url>`. */
export const SHARE_ENCRYPTED_HASH_PREFIX = '#e=';
/** Largo mínimo de la contraseña de un enlace. */
export const SHARE_MIN_PASSWORD = 8;
/** Vueltas de PBKDF2-SHA-256 (la contraseña se estira para que probar claves sin conexión sea caro). */
export const SHARE_PBKDF2_ITERATIONS = 600_000;
/** Por encima de este largo (caracteres del enlace completo) se avisa de que puede no abrirse en todas partes. */
export const SHARE_URL_WARN_LENGTH = 8000;
/** Tope de JSON descomprimido al leer un enlace (protege de bombas de compresión). */
export const SHARE_MAX_JSON_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 500;
/** Versión que se escribe; se siguen leyendo la 1 (sin assets), la 2 y la 3 (caducidad y nota). */
const SHARE_VERSION = 3;
/** Tope de bytes de assets (sin comprimir) que viajan dentro del enlace; el resto no se incluye. */
export const SHARE_MAX_ASSET_BYTES = 60 * 1024;

export interface ShareAsset {
  path: string;
  mime: string;
  data: Uint8Array;
}

export interface SharePayload {
  projectName: string;
  files: Map<string, string>;
  data: Record<string, unknown>;
  assets: ShareAsset[];
  /** Instante (ms desde 1970) a partir del cual PugIDE se niega a abrir el enlace. */
  expiresAt?: number;
  /** Nota de quien creó el enlace, para quien lo abre. */
  note?: string;
}

/** Lo que se añade a un enlace además del proyecto. */
export interface ShareExtras {
  expiresAt?: number;
  note?: string;
}

/** Opciones de «Compartir proyecto» (P-15). */
export interface ShareLinkOptions extends ShareExtras {
  /** Cifra el contenido con esta contraseña (mínimo `SHARE_MIN_PASSWORD` caracteres). */
  password?: string;
  /** Los datos de ejemplo viajan en el enlace (por defecto sí). */
  includeData?: boolean;
  /** Las imágenes y fuentes pequeñas viajan en el enlace (por defecto sí). */
  includeAssets?: boolean;
}

export interface ShareLink {
  url: string;
  length: number;
  tooLong: boolean;
  included: string[];
  omitted: string[];
  encrypted: boolean;
  expiresAt?: number;
}

export class ShareDecodeError extends Error {}
/** El enlace caducó (la fecha viaja dentro del enlace; PugIDE la respeta, pero no es una protección). */
export class ShareExpiredError extends ShareDecodeError {
  constructor(readonly expiresAt: number) {
    super('Este enlace caducó.');
  }
}
export class SharePasswordRequiredError extends ShareDecodeError {}
export class ShareWrongPasswordError extends ShareDecodeError {
  constructor() {
    super('Contraseña incorrecta.');
  }
}

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
export function encodeShare(
  projectName: string,
  files: Map<string, string>,
  data: Record<string, unknown>,
  assets: Iterable<ShareAsset> = [],
  extras: ShareExtras = {},
): string {
  const a: Record<string, string> = {};
  for (const asset of assets) a[asset.path] = toBase64Url(asset.data);
  const note = extras.note?.trim().slice(0, 300);
  const json = JSON.stringify({
    v: SHARE_VERSION, n: projectName, f: Object.fromEntries(files), d: data, a,
    ...(extras.expiresAt ? { x: extras.expiresAt } : {}),
    ...(note ? { m: note } : {}),
  });
  return toBase64Url(deflateSync(strToU8(json), { level: 9 }));
}

/**
 * Reparte los assets entre los que caben en el enlace (de menor a mayor tamaño, hasta
 * `SHARE_MAX_ASSET_BYTES` en total) y los que se quedan fuera.
 */
export function splitAssetsForShare(assets: Iterable<ShareAsset>): { included: ShareAsset[]; omitted: ShareAsset[] } {
  const included: ShareAsset[] = [];
  const omitted: ShareAsset[] = [];
  let total = 0;
  for (const a of [...assets].sort((x, y) => x.data.length - y.data.length)) {
    if (total + a.data.length <= SHARE_MAX_ASSET_BYTES) {
      included.push(a);
      total += a.data.length;
    } else omitted.push(a);
  }
  return { included, omitted };
}

export function buildShareUrl(base: string, payload: string, encrypted = false): string {
  return `${base.split('#')[0]}${encrypted ? SHARE_ENCRYPTED_HASH_PREFIX : SHARE_HASH_PREFIX}${payload}`;
}

/** Extrae el contenido cifrado de un hash (`#e=...`) o null si no es un enlace con contraseña. */
export function encryptedFromHash(hash: string): string | null {
  return hash.startsWith(SHARE_ENCRYPTED_HASH_PREFIX) ? hash.slice(SHARE_ENCRYPTED_HASH_PREFIX.length) : null;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', strToU8(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: SHARE_PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

/**
 * Cifra un payload (el texto base64url de `encodeShare`) con la contraseña: AES-GCM de 256 bits, clave derivada con
 * PBKDF2-SHA-256, sal e IV aleatorios. Formato: `[versión 1][sal 16][iv 12][texto cifrado]` en base64url.
 */
export async function encryptShare(payload: string, password: string): Promise<string> {
  if (password.length < SHARE_MIN_PASSWORD) throw new ShareDecodeError(`La contraseña necesita al menos ${SHARE_MIN_PASSWORD} caracteres.`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, fromBase64Url(payload) as BufferSource));
  const out = new Uint8Array(1 + 16 + 12 + body.length);
  out[0] = 1;
  out.set(salt, 1);
  out.set(iv, 17);
  out.set(body, 29);
  return toBase64Url(out);
}

/** Descifra el contenido de un enlace con contraseña y devuelve el payload normal. Lanza ShareWrongPasswordError si no coincide. */
export async function decryptShare(encrypted: string, password: string): Promise<string> {
  let bytes: Uint8Array;
  try { bytes = fromBase64Url(encrypted); } catch { throw new ShareDecodeError('El enlace está dañado o incompleto.'); }
  if (bytes.length < 29 + 16 || bytes[0] !== 1) throw new ShareDecodeError('El enlace está dañado o incompleto.');
  const salt = bytes.subarray(1, 17);
  const iv = bytes.subarray(17, 29);
  try {
    const key = await deriveKey(password, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, bytes.subarray(29) as BufferSource);
    return toBase64Url(new Uint8Array(plain));
  } catch {
    // AES-GCM autentica: una contraseña mala y un texto manipulado fallan igual.
    throw new ShareWrongPasswordError();
  }
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
export function decodeShare(payload: string, now: number = Date.now()): SharePayload {
  let parsed: unknown;
  try {
    const json = strFromU8(inflateLimited(fromBase64Url(payload), SHARE_MAX_JSON_BYTES));
    parsed = JSON.parse(json);
  } catch (err) {
    if (err instanceof ShareDecodeError) throw err;
    throw new ShareDecodeError('El enlace está dañado o incompleto.');
  }
  if (!isPlainObject(parsed) || (parsed['v'] !== 1 && parsed['v'] !== 2 && parsed['v'] !== 3)) throw new ShareDecodeError('Versión de enlace no soportada.');
  const { n, f, d, a, x, m } = parsed;
  const expiresAt = typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : undefined;
  if (expiresAt !== undefined && now > expiresAt) throw new ShareExpiredError(expiresAt);
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
  const assets: ShareAsset[] = [];
  if (a !== undefined) {
    if (!isPlainObject(a)) throw new ShareDecodeError('Los assets del enlace no son válidos.');
    let total = 0;
    for (const [rawPath, b64] of Object.entries(a)) {
      const path = cleanPath(rawPath);
      if (!path || typeof b64 !== 'string' || !ASSET_EXT_RE.test(path)) throw new ShareDecodeError('El enlace contiene assets no válidos.');
      const bytes = fromBase64Url(b64);
      total += bytes.length;
      if (total > SHARE_MAX_JSON_BYTES) throw new ShareDecodeError('El proyecto compartido es demasiado grande.');
      assets.push({ path, mime: mimeForPath(path), data: bytes });
    }
  }
  const name = typeof n === 'string' && n.trim() ? n.trim().slice(0, 100) : 'Proyecto compartido';
  const note = typeof m === 'string' && m.trim() ? m.trim().slice(0, 300) : undefined;
  return { projectName: name, files, data: structuredClone((d ?? {}) as Record<string, unknown>), assets, ...(expiresAt !== undefined ? { expiresAt } : {}), ...(note ? { note } : {}) };
}
