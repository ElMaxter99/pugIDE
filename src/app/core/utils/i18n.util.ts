/** Top-level key of the project data that holds the preview translations (nested by dotted key). */
export const TRANSLATIONS_KEY = 'translations';

/** Function names treated as translators: `t('A.B')`, `i18n.t('A.B')`, `$t(...)`, `translate(...)`. */
export const TRANSLATE_FNS = new Set(['t', '$t', '__', '_t', 'translate', 'trans', 'gettext', 'instant']);

/** Receivers of `x.t(...)` that are translation services rather than data (`i18n.t`, `$i18n.t`, `translate.instant`). */
export const TRANSLATOR_OBJECT_RE = /^\$?(i18n|i18next|translate|translator|translation|translations|lang|locale)$/i;

/** A literal first argument is only a key (not prose) when it looks like `SOME.NESTED_KEY`. */
export const TRANSLATION_KEY_RE = /^[\w$-]+(\.[\w$-]+)*$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

/** `['A.B', 'A.C']` → `{ A: { B: '', C: '' } }`. A key that is also a prefix of another one gives way to the container. */
export function buildTranslationSkeleton(keys: Iterable<string>): Obj {
  const root: Obj = {};
  for (const key of keys) {
    const parts = key.split('.');
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        if (!(p in node)) node[p] = '';
        break;
      }
      if (!isObj(node[p])) node[p] = {};
      node = node[p] as Obj;
    }
  }
  return root;
}

/** Translator used by the preview: filled-in value (nested or flat key) or the key itself; `{{name}}` / `{name}` params supported. */
export function createTranslator(data: Obj): (key?: unknown, params?: unknown) => string {
  const root = data[TRANSLATIONS_KEY];
  const lookup = (key: string): string => {
    if (!isObj(root)) return key;
    const flat = root[key];
    if (typeof flat === 'string' && flat) return flat;
    let cur: unknown = root;
    for (const p of key.split('.')) {
      if (isObj(cur) && p in cur) cur = cur[p];
      else return key;
    }
    return typeof cur === 'string' && cur ? cur : key;
  };
  return (key, params) => {
    const out = lookup(String(key ?? ''));
    if (!isObj(params)) return out;
    return out.replace(/\{\{?\s*([\w$]+)\s*\}?\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
  };
}
