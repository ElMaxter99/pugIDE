/** Renombrar y borrar carpetas (P-18): reglas y textos puros, sin Angular. */

/** Con más archivos que esto, borrar una carpeta pide escribir su nombre. */
export const BIG_FOLDER = 10;

export const isInsideFolder = (path: string, folder: string): boolean => path.startsWith(folder.replace(/\/+$/, '') + '/');

/** Rutas (de las dadas) que están dentro de la carpeta, ordenadas. */
export function pathsInFolder(paths: Iterable<string>, folder: string): string[] {
  return [...paths].filter((p) => isInsideFolder(p, folder)).sort();
}

/** La ruta de un archivo de `from` una vez la carpeta pasa a llamarse `to`. */
export function movedPath(path: string, from: string, to: string): string {
  return to.replace(/\/+$/, '') + path.slice(from.replace(/\/+$/, '').length);
}

export type FolderRenameCheck = { ok: true; to: string } | { ok: false; reason: string };

/** ¿Se puede renombrar `from` a `to`? `existing`: todas las rutas del proyecto (archivos y assets). */
export function checkFolderRename(from: string, rawTo: string, existing: Iterable<string>): FolderRenameCheck {
  const clean = rawTo.trim().replace(/\/+$/, '');
  const to = clean.startsWith('/') ? clean : '/' + clean;
  if (!clean || to === '/') return { ok: false, reason: 'Escribe el nuevo nombre de la carpeta.' };
  if (to.split('/').some((s) => s === '..' || s === '.')) return { ok: false, reason: 'La ruta no puede llevar «.» ni «..».' };
  if (to === from) return { ok: false, reason: 'La carpeta ya se llama así.' };
  if (isInsideFolder(to, from)) return { ok: false, reason: 'No se puede mover una carpeta dentro de sí misma.' };
  const taken = [...existing].some((p) => p === to || isInsideFolder(p, to));
  if (taken) return { ok: false, reason: `Ya existe ${to} en el proyecto.` };
  return { ok: true, to };
}

export interface FolderSummary {
  files: number;
  images: number;
  /** Las primeras rutas (archivos y luego imágenes), para enseñarlas en el diálogo. */
  sample: string[];
  /** Cuántas quedan sin enseñar. */
  more: number;
}

export function summarizeFolder(files: string[], assets: string[], max = 5): FolderSummary {
  const all = [...files, ...assets];
  return { files: files.length, images: assets.length, sample: all.slice(0, max), more: Math.max(0, all.length - max) };
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** «7 archivos y 2 imágenes» (o solo una de las dos partes; «ningún archivo» si está vacía). */
export function countsText(files: number, images: number): string {
  if (!files && !images) return 'ningún archivo';
  return [files ? plural(files, 'archivo', 'archivos') : '', images ? plural(images, 'imagen', 'imágenes') : ''].filter(Boolean).join(' y ');
}

export function needsTypedConfirm(files: number, images: number): boolean {
  return files + images > BIG_FOLDER;
}

export const folderName = (path: string): string => path.split('/').filter(Boolean).pop() ?? path;
