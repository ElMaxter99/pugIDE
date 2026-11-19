/** Top-level key of the project data that holds the preview translations (nested by dotted key). */
export const TRANSLATIONS_KEY = 'translations';

/** Function names treated as translators: `t('A.B')`, `i18n.t('A.B')`, `$t(...)`, `translate(...)`. */
export const TRANSLATE_FNS = new Set(['t', '$t', '__', '_t', 'translate', 'trans', 'gettext', 'instant']);

/** Receivers of `x.t(...)` that are translation services rather than data (`i18n.t`, `$i18n.t`, `translate.instant`). */
export const TRANSLATOR_OBJECT_RE = /^\$?(i18n|i18next|translate|translator|translation|translations|lang|locale|req|res|locals|ctx|context)$/i;

/** A literal first argument is only a key (not prose) when it looks like `SOME.NESTED_KEY` (con espacio de nombres opcional: `common:SOME.KEY`). */
export const TRANSLATION_KEY_RE = /^([\w$-]+:)?[\w$-]+(\.[\w$-]+)*$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

/** `['A.B', 'A.C']` → `{ A: { B: '', C: '' } }`. A key that is also a prefix of another one gives way to the container. */
export function buildTranslationSkeleton(keys: Iterable<string>): Obj {
  const root: Obj = {};
  for (const key of keys) {
    const parts = key.replace(/^([\w$-]+):/, '$1.').split('.'); // `ns:A.B` → un nivel más: `ns.A.B`
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


/** Índice de la `}` que cierra la `{` de `from` (con llaves anidadas), o -1. */
function closingBrace(text: string, from: number): number {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

/**
 * Sustituye cada `{x, plural, one {…} other {…}}` del texto por su forma según `count` (`#` es el número).
 * Devuelve null si el texto no lleva ninguno.
 */
function expandIcuPlurals(text: string, count: number, select: (n: number) => string): string | null {
  const head = /\{\s*\w+\s*,\s*plural\s*,/g;
  let out = '';
  let last = 0;
  let found = false;
  for (let m = head.exec(text); m; m = head.exec(text)) {
    const end = closingBrace(text, m.index);
    if (end < 0) break;
    const forms = new Map<string, string>();
    let i = m.index + m[0].length;
    while (i < end) {
      const f = /\s*(=?\w+)\s*\{/y;
      f.lastIndex = i;
      const fm = f.exec(text);
      if (!fm) break;
      const open = fm.index + fm[0].length - 1;
      const close = closingBrace(text, open);
      if (close < 0 || close > end) break;
      forms.set(fm[1], text.slice(open + 1, close));
      i = close + 1;
    }
    const chosen = forms.get(`=${count}`) ?? forms.get(select(count)) ?? forms.get('other') ?? '';
    out += text.slice(last, m.index) + chosen.replace(/#/g, String(count));
    last = end + 1;
    head.lastIndex = end + 1;
    found = true;
  }
  return found ? out + text.slice(last) : null;
}

/** Código de idioma para las reglas de plural: `locale`/`lang` de los datos o español. */
function pluralLocale(data: Obj): string {
  const v = data['locale'] ?? data['lang'] ?? data['language'];
  return typeof v === 'string' && /^[a-z]{2,3}([-_][A-Za-z]{2,4})?$/.test(v) ? v.replace('_', '-') : 'es';
}

/**
 * Traductor de la vista previa. Lo que hacen i18next, ngx-translate, vue-i18n e i18n-js en lo habitual:
 * - clave anidada (`A.B`) o plana con puntos; la que falta devuelve la propia clave (o su valor por defecto);
 * - valor por defecto: 2.º argumento de texto o `{ defaultValue }`; lista de claves de reserva `t(['A', 'B'])`;
 * - espacios de nombres `ns:clave` (un nivel más dentro del idioma, `ns.clave`; si no está, se busca sin él) y `{ ns }`;
 * - parámetros `{{nombre}}`, `{{- nombre}}` (sin escapar), `{nombre}` y `%{nombre}`; `$t(otra.clave)` dentro de un texto;
 * - plurales con `count`: `clave_one`/`clave_other`… (`Intl.PluralRules`), `clave_plural` (i18next v3), `a | b | c`
 *   (vue-i18n) y `{count, plural, one {# x} other {# y}}` (ICU); `count` también se puede usar como parámetro;
 * - contexto `{ context: 'vip' }` → `clave_vip`.
 */
export function createTranslator(data: Obj): (key?: unknown, params?: unknown) => string {
  const root = data[TRANSLATIONS_KEY];
  const rules = (() => { try { return new Intl.PluralRules(pluralLocale(data)); } catch { return new Intl.PluralRules('es'); } })();

  const raw = (key: string): string | undefined => {
    if (!isObj(root) || !key) return undefined;
    const flat = root[key];
    if (typeof flat === 'string' && flat) return flat;
    let cur: unknown = root;
    for (const p of key.split('.')) {
      if (isObj(cur) && p in cur) cur = cur[p];
      else return undefined;
    }
    return typeof cur === 'string' && cur ? cur : undefined;
  };
  /** `ns:clave` → `ns.clave`; si el archivo de ese espacio no está cargado, la clave sola. */
  const find = (key: string, ns?: string): string | undefined => {
    const m = /^([\w$-]+):(.+)$/.exec(key);
    const space = m ? m[1] : ns;
    const bare = m ? m[2] : key;
    return (space ? raw(`${space}.${bare}`) : undefined) ?? raw(bare);
  };

  const pluralOf = (text: string, count: number): string => {
    // ICU, también dentro de un texto: «Tienes {count, plural, one {# aviso} other {# avisos}}.»
    const icu = expandIcuPlurals(text, count, (n) => rules.select(n));
    if (icu !== null) return icu;
    // vue-i18n: «ninguno | uno | muchos» (con 2 formas: 1 → la primera; con 3: 0, 1, resto)
    if (text.includes(' | ')) {
      const parts = text.split(' | ').map((x) => x.trim());
      if (parts.length === 2) return count === 1 ? parts[0] : parts[1];
      return parts[Math.min(count === 0 ? 0 : count === 1 ? 1 : 2, parts.length - 1)];
    }
    return text;
  };

  const resolve = (key: string, options: Obj, depth: number): string | undefined => {
    const ns = typeof options['ns'] === 'string' ? options['ns'] : undefined;
    const count = typeof options['count'] === 'number' ? options['count'] : undefined;
    const context = typeof options['context'] === 'string' && options['context'] ? options['context'] : undefined;
    const bases = context ? [`${key}_${context}`, key] : [key];
    let found: string | undefined;
    for (const base of bases) {
      if (count !== undefined) {
        found = (count === 0 ? find(`${base}_zero`, ns) : undefined)
          ?? find(`${base}_${rules.select(count)}`, ns)
          ?? (count !== 1 ? find(`${base}_plural`, ns) : undefined)
          ?? find(`${base}_other`, ns);
      }
      found ??= find(base, ns);
      if (found !== undefined) break;
    }
    if (found === undefined) return undefined;
    if (count !== undefined) found = pluralOf(found, count);
    // `$t(otra.clave)`: una traducción dentro de otra
    if (depth < 4 && found.includes('$t(')) {
      found = found.replace(/\$t\(\s*([^),\s]+)\s*\)/g, (m, k: string) => resolve(k.replace(/^['"]|['"]$/g, ''), options, depth + 1) ?? m);
    }
    return found;
  };

  return (key, params) => {
    const options: Obj = isObj(params) ? params : {};
    const keys = Array.isArray(key) ? key.map(String) : [String(key ?? '')];
    let text: string | undefined;
    for (const k of keys) { text = resolve(k, options, 0); if (text !== undefined) break; }
    if (text === undefined) {
      const fallback = typeof params === 'string' ? params : typeof options['defaultValue'] === 'string' ? (options['defaultValue'] as string) : undefined;
      const k = keys[keys.length - 1] ?? '';
      text = fallback ?? k;
      if (fallback === undefined && !isObj(params)) return text;
      if (fallback !== undefined && typeof options['count'] === 'number') text = pluralOf(text, options['count'] as number);
    }
    if (!isObj(params)) return text;
    return text
      .replace(/\{\{-?\s*([\w$]+)\s*(?:,[^}]*)?\}\}|%\{\s*([\w$]+)\s*\}|\{\s*([\w$]+)\s*\}/g, (m, a: string, b: string, c: string) => {
        const name = a ?? b ?? c;
        return name in options && options[name] !== undefined && options[name] !== null ? String(options[name]) : m;
      });
  };
}
