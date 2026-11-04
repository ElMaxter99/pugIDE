/**
 * Helpers definidos por el usuario: funciones (y valores) que las plantillas llaman pero que el JSON de datos
 * no puede contener (`formatDate(x)`, `money(n)`, `utils.upper(s)`…). Se escriben en `/helpers.js` o en
 * `/helpers/*.js` con `module.exports = { … }` / `exports.nombre = …`, y se ejecutan en el navegador, igual
 * que el JavaScript de la propia plantilla. Sin Angular ni DOM.
 */

export type HelperExports = Record<string, unknown>;

export interface HelperError {
  path: string;
  message: string;
  /** 1-based; 1 si el motor no indica la línea. */
  line: number;
}

export interface LoadedHelpers {
  helpers: HelperExports;
  errors: HelperError[];
}

const HELPERS_RE = /^\/helpers(?:\.js|\/.+\.js)$/i;

export function isHelperPath(path: string): boolean {
  return HELPERS_RE.test(path);
}

/** Archivos de helpers del proyecto, ordenados (los posteriores pisan a los anteriores). */
export function helperPaths(files: Iterable<string>): string[] {
  return [...files].filter(isHelperPath).sort();
}

let memo: { key: string; value: LoadedHelpers } | null = null;

/** Ejecuta los archivos de helpers y reúne lo que exportan. Un archivo roto se informa y no impide cargar el resto. */
export function loadHelpers(files: ReadonlyMap<string, string>): LoadedHelpers {
  const paths = helperPaths(files.keys());
  if (!paths.length) return { helpers: {}, errors: [] };
  const key = paths.map((p) => `${p}\u0000${files.get(p) ?? ''}`).join('\u0001');
  if (memo?.key === key) return memo.value;

  const helpers: HelperExports = {};
  const errors: HelperError[] = [];
  for (const path of paths) {
    const module = { exports: {} as unknown };
    try {
      new Function('module', 'exports', files.get(path) ?? '')(module, module.exports);
    } catch (err) {
      errors.push({ path, message: describeHelperError(err), line: errorLine(err) });
      continue;
    }
    const out = module.exports;
    if (out !== null && typeof out === 'object') Object.assign(helpers, out);
    else errors.push({ path, message: 'Exporta un objeto: module.exports = { nombre: función }', line: 1 });
  }
  const value = { helpers, errors };
  memo = { key, value };
  return value;
}

type Tok = { t: 'id' | 'str' | 'p'; v: string };

/** Divide el código en identificadores, cadenas y signos; descarta comentarios y números. Suficiente para leer claves. */
function tokenize(code: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (c === '/' && code[i + 1] === '*') { const e = code.indexOf('*/', i + 2); i = e < 0 ? code.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      let v = '';
      while (j < code.length && code[j] !== c) { if (code[j] === '\\') j++; v += code[j] ?? ''; j++; }
      out.push({ t: 'str', v });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < code.length && /[\w$]/.test(code[j])) j++;
      out.push({ t: 'id', v: code.slice(i, j) });
      i = j;
      continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (/\d/.test(c)) { while (i < code.length && /[\w.]/.test(code[i])) i++; continue; }
    out.push({ t: 'p', v: c });
    i++;
  }
  return out;
}

/**
 * Nombres que exportan los archivos de helpers, leídos del texto SIN ejecutarlos: `module.exports = { a, b: …, c() {} }`
 * y `exports.x = …` / `module.exports.x = …`. La app no ejecuta el JavaScript del usuario (corre solo en el Worker del
 * render, aislado); para quitar de las variables de datos lo que es un helper basta con los nombres. Lo que no se
 * reconoce (`Object.assign(module.exports, …)`, claves calculadas) no se quita: se tratará como un dato más.
 */
export function helperExportNames(files: ReadonlyMap<string, string>): Set<string> {
  const names = new Set<string>();
  for (const path of helperPaths(files.keys())) {
    const toks = tokenize(files.get(path) ?? '');
    for (let i = 0; i < toks.length; i++) {
      let at = -1;
      if (toks[i].v === 'module' && toks[i + 1]?.v === '.' && toks[i + 2]?.v === 'exports') at = i + 3;
      else if (toks[i].t === 'id' && toks[i].v === 'exports' && toks[i - 1]?.v !== '.') at = i + 1;
      if (at < 0) continue;
      if (toks[at]?.v === '.' && toks[at + 1]?.t === 'id' && toks[at + 2]?.v === '=') names.add(toks[at + 1].v);
      else if (toks[at]?.v === '=' && toks[at + 1]?.v === '{') readObjectKeys(toks, at + 2, names);
    }
  }
  return names;
}

/** Claves del primer nivel de un objeto literal cuyo «{» está justo antes de la posición indicada. */
function readObjectKeys(toks: Tok[], start: number, names: Set<string>): void {
  let depth = 1;
  let expectKey = true;
  for (let i = start; i < toks.length && depth > 0; i++) {
    const tk = toks[i];
    if (tk.t === 'p') {
      if ('{[('.includes(tk.v)) depth++;
      else if ('}])'.includes(tk.v)) depth--;
      else if (depth === 1 && tk.v === ',') expectKey = true;
      else if (depth === 1 && tk.v === '.') expectKey = false; // `...otro`: no es una clave
      continue;
    }
    if (depth !== 1 || !expectKey) continue;
    // `async`, `get` y `set` son modificadores si les sigue otro nombre.
    if (tk.t === 'id' && ['async', 'get', 'set'].includes(tk.v) && toks[i + 1]?.t !== 'p') continue;
    const next = toks[i + 1]?.v;
    if (next === ':' || next === ',' || next === '}' || next === '(') names.add(tk.v);
    expectKey = false;
  }
}

function describeHelperError(err: unknown): string {
  const e = err as { name?: string; message?: string };
  return `${e.name ?? 'Error'}: ${e.message ?? String(err)}`;
}

/** `new Function` antepone dos líneas al cuerpo: la línea del usuario es la que indica el motor menos 2. */
function errorLine(err: unknown): number {
  const m = /<anonymous>:(\d+):\d+/.exec((err as { stack?: string }).stack ?? '');
  return m ? Math.max(1, Number(m[1]) - 2) : 1;
}

/** Contenido inicial de `helpers.js` con un ejemplo. */
export const HELPERS_TEMPLATE = `// Helpers para las plantillas: funciones que el JSON de datos no puede contener.
// Exporta lo que quieras usar en Pug con module.exports. Ejemplo en una plantilla:
//   p= money(invoice.total)
//   p= utils.upper(user.name)
module.exports = {
  money: (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0),
  formatDate: (d) => new Date(d).toLocaleDateString('es-ES'),
  utils: {
    upper: (s) => String(s ?? '').toUpperCase(),
  },
};
`;
