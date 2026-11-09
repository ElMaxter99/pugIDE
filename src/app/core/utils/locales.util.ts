/**
 * Traducciones por idioma como archivos del proyecto: `/locales/<código>/translations.json`
 * (`es-ES`, `es-CAT`…). Utilidades puras, sin Angular.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

export const LOCALES_DIR = '/locales';
export const TRANSLATIONS_FILE = 'translations.json';

const LOCALE_PATH_RE = /^\/locales\/([^/]+)\/translations\.json$/;
/** Código de idioma estilo BCP 47 simplificado: `es`, `es-ES`, `es-CAT`, `zh-Hans-CN`. */
const LOCALE_CODE_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/;

export function localePath(code: string): string {
  return `${LOCALES_DIR}/${code}/${TRANSLATIONS_FILE}`;
}

export function isValidLocaleCode(code: string): boolean {
  return LOCALE_CODE_RE.test(code);
}

/** Códigos de idioma que tienen su `translations.json`, ordenados. */
export function listLocales(files: Iterable<string>): string[] {
  const out: string[] = [];
  for (const path of files) {
    const m = LOCALE_PATH_RE.exec(path);
    if (m) out.push(m[1]);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

/** El idioma elegido si existe; si no, el primero. null si no hay idiomas. */
export function resolveLocale(stored: string | null | undefined, locales: string[]): string | null {
  if (!locales.length) return null;
  return stored && locales.includes(stored) ? stored : locales[0];
}

export interface ParsedTranslations {
  value: Obj;
  error?: { message: string; line?: number };
}

/** Lee un `translations.json`: un archivo vacío vale `{}`; un JSON inválido o que no sea un objeto devuelve `error`. */
export function parseTranslations(text: string): ParsedTranslations {
  if (!text.trim()) return { value: {} };
  try {
    const raw: unknown = JSON.parse(text);
    if (!isObj(raw)) return { value: {}, error: { message: 'El archivo debe contener un objeto JSON ({ … }).', line: 1 } };
    return { value: raw };
  } catch (err) {
    const message = (err as Error).message;
    const pos = /position (\d+)/.exec(message);
    const lineCol = /line (\d+)/.exec(message);
    // Algunos motores no indican la posición: se marca la última línea con contenido.
    const lines = text.replace(/\s+$/, '').split('\n').length;
    const line = lineCol ? Number(lineCol[1]) : pos ? text.slice(0, Number(pos[1])).split('\n').length : lines;
    return { value: {}, error: { message: `JSON no válido: ${message}`, line } };
  }
}

export function serializeTranslations(value: Obj): string {
  return JSON.stringify(value, null, 2) + '\n';
}

/** Misma estructura con todas las hojas vacías: la lista de claves por traducir. */
export function blankTranslations(value: Obj): Obj {
  const out: Obj = {};
  for (const [k, v] of Object.entries(value)) out[k] = isObj(v) ? blankTranslations(v) : '';
  return out;
}

/** Añade a `target` las claves de `source` que le faltan (sin pisar valores). Devuelve si cambió algo. */
export function addMissingKeys(target: Obj, source: Obj): boolean {
  let changed = false;
  for (const [k, v] of Object.entries(source)) {
    if (!(k in target) || (target[k] === '' && isObj(v))) {
      target[k] = structuredClone(v);
      changed = true;
    } else if (isObj(v) && isObj(target[k])) {
      if (addMissingKeys(target[k] as Obj, v)) changed = true;
    }
  }
  return changed;
}

// --- Importar un archivo de idioma suelto (P-14) ---

/** Nombres genéricos que no dicen el idioma (`translations.json`, `messages.json`…). */
const GENERIC_NAME_RE = /^(translations?|messages?|locales?|i18n|lang)$/i;
/** JSON habituales de un proyecto que nunca son un idioma, aunque solo tengan textos. */
const NOT_A_LOCALE_RE = /^(package(-lock)?|tsconfig[\w.-]*|manifest|composer|\.eslintrc|\.prettierrc|angular|vercel|renovate)\.json$/i;

function baseName(name: string): string {
  return name.split(/[\\/]/).pop() ?? name;
}

/** Código de idioma que da el nombre del archivo: `es-ES.json` → `es-ES`; `translations.json` → null. */
export function localeCodeFromFileName(name: string): string | null {
  const stem = baseName(name).replace(/\.json$/i, '');
  return isValidLocaleCode(stem) && !GENERIC_NAME_RE.test(stem) ? stem : null;
}

/** Convierte claves planas con puntos (`"HOME.TITLE": "…"`) en anidadas, que es lo que edita la app. */
export function normalizeTranslations(value: Obj): Obj {
  const out: Obj = {};
  for (const [path, leaf] of leaves(value)) {
    const parts = path.split('.').filter((p) => p !== '');
    if (!parts.length) continue;
    let node = out;
    for (const p of parts.slice(0, -1)) {
      if (!isObj(node[p])) node[p] = {};
      node = node[p] as Obj;
    }
    const last = parts[parts.length - 1];
    if (!isObj(node[last])) node[last] = leaf; // un contenedor gana a una hoja con el mismo nombre
  }
  return out;
}

/** Número de textos (hojas) de un objeto de traducciones. */
export function countTranslations(value: Obj): number {
  let n = 0;
  for (const v of Object.values(value)) n += isObj(v) ? countTranslations(v) : 1;
  return n;
}

function leaves(value: Obj, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [k, v] of Object.entries(value)) {
    if (isObj(v)) for (const [p, x] of leaves(v, `${prefix}${k}.`)) out.set(p, x);
    else out.set(`${prefix}${k}`, v);
  }
  return out;
}

/** Qué cambiaría al importar `incoming` sobre `existing`: claves nuevas (o vacías) y claves con otro valor. */
export function diffTranslations(existing: Obj, incoming: Obj): { added: number; changed: number } {
  const have = leaves(existing);
  let added = 0;
  let changed = 0;
  for (const [k, v] of leaves(incoming)) {
    if (!have.has(k) || have.get(k) === '') added++; // una clave vacía cuenta como nueva: al fusionar se rellena
    else if (have.get(k) !== v) changed++;
  }
  return { added, changed };
}

/** Fusiona sin pisar lo que ya tienes: añade las claves nuevas y rellena las vacías. Devuelve el resultado y cuántas tocó. */
export function mergeTranslations(existing: Obj, incoming: Obj): { value: Obj; touched: number } {
  const value = structuredClone(existing);
  let touched = 0;
  const walk = (target: Obj, source: Obj): void => {
    for (const [k, v] of Object.entries(source)) {
      if (isObj(v)) {
        if (!isObj(target[k])) { target[k] = {}; }
        walk(target[k] as Obj, v);
      } else if (!(k in target) || target[k] === '' || target[k] === undefined) {
        if (v !== '' || !(k in target)) { target[k] = v; touched++; }
      }
    }
  };
  walk(value, incoming);
  return { value, touched };
}

/**
 * ¿Parece un archivo de idioma suelto? Solo textos (ninguna hoja que no sea cadena), con un nombre que lo sugiere
 * (`es-ES.json`, `translations.json`…) y que no sea un JSON conocido del proyecto ni esté ya en `/locales` o `/.pugide`.
 */
export function looksLikeTranslations(name: string, text: string): boolean {
  const base = baseName(name);
  if (!/\.json$/i.test(base) || NOT_A_LOCALE_RE.test(base)) return false;
  if (/^\/?(locales|\.pugide)\//.test(name.replace(/\\/g, '/'))) return false;
  const stem = base.replace(/\.json$/i, '');
  if (!(GENERIC_NAME_RE.test(stem) || isValidLocaleCode(stem))) return false;
  const parsed = parseTranslations(text);
  if (parsed.error || !text.trim()) return false;
  const all = [...leaves(parsed.value).values()];
  return all.length > 0 && all.every((v) => typeof v === 'string');
}
