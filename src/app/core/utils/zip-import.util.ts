/**
 * Importar un `.zip`: qué entradas se ignoran (restos de macOS y Windows) y si todo viene dentro de una única carpeta
 * raíz (`Mi Proyecto/main.pug`), que se quita para que las rutas absolutas (`/partials/x.pug`) sigan valiendo.
 */

/** Restos que el explorador de archivos mete en los `.zip` y no son del proyecto. */
export function isZipJunk(name: string): boolean {
  const n = name.replace(/\\/g, '/');
  return n.startsWith('__MACOSX/') || /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i.test(n) || /(^|\/)\._[^/]+$/.test(n);
}

/** La carpeta única en la que están todos los archivos (sin barra final), o null si no la hay. */
export function singleRootFolder(names: string[]): string | null {
  const files = names.filter((n) => !n.endsWith('/') && !isZipJunk(n));
  if (!files.length) return null;
  const first = files[0].split('/')[0];
  if (!first || first.startsWith('.')) return null;
  return files.every((n) => n.includes('/') && n.split('/')[0] === first) ? first : null;
}

export interface ZipPlan {
  /** Entradas que se leen, con su ruta ya sin la carpeta raíz. */
  entries: { name: string; path: string }[];
  /** Restos ignorados (`__MACOSX`, `.DS_Store`…). */
  junk: string[];
  /** Carpeta raíz quitada, si la había. */
  stripped: string | null;
}

export function planZipImport(names: string[]): ZipPlan {
  const stripped = singleRootFolder(names);
  const entries: ZipPlan['entries'] = [];
  const junk: string[] = [];
  for (const name of names) {
    if (name.endsWith('/')) continue;
    if (isZipJunk(name)) { junk.push(name); continue; }
    entries.push({ name, path: '/' + (stripped ? name.slice(stripped.length + 1) : name) });
  }
  return { entries, junk, stripped };
}
