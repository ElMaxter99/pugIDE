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
