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
