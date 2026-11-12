/**
 * Lectura de lo que el usuario suelta sobre el árbol de archivos: carpetas (API de entradas del sistema de archivos
 * de arrastrar y soltar) y archivos sueltos. Sin Angular ni DOM real, para poder probarlo con entradas simuladas.
 */

/** Lo que usamos de `FileSystemEntry` / `FileSystemDirectoryEntry`. */
export interface EntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?(ok: (file: File) => void, fail?: (err: unknown) => void): void;
  createReader?(): { readEntries(ok: (entries: EntryLike[]) => void, fail?: (err: unknown) => void): void };
}

export interface DroppedFile {
  /** Ruta dentro del proyecto, con `/` inicial. */
  path: string;
  file: File;
}

const MAX_FILES = 2000;

function readAll(entry: EntryLike): Promise<EntryLike[]> {
  const reader = entry.createReader?.();
  if (!reader) return Promise.resolve([]);
  // `readEntries` devuelve las entradas por tandas: hay que repetir hasta que venga una vacía.
  return new Promise((resolve, reject) => {
    const all: EntryLike[] = [];
    const next = (): void => {
      reader.readEntries((batch) => {
        if (batch.length === 0) resolve(all);
        else { all.push(...batch); next(); }
      }, reject);
    };
    next();
  });
}

/** Carpetas de las que no se importa nada (dependencias y control de versiones). */
const SKIPPED_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', '.idea', '.vscode', '.DS_Store']);

/**
 * Recorre `entries` y devuelve todos los archivos con su ruta. Cada entrada de primer nivel cuelga de `prefix`
 * (`''` = raíz del proyecto). Para «el contenido de esta carpeta» se pasa la carpeta con `{ intoRoot: true }`.
 */
export async function collectDropped(entries: EntryLike[], opts: { prefix?: string; intoRoot?: boolean; limit?: number } = {}): Promise<DroppedFile[]> {
  const out: DroppedFile[] = [];
  const limit = opts.limit ?? MAX_FILES;
  const walk = async (entry: EntryLike, base: string): Promise<void> => {
    if (out.length >= limit) return;
    if (entry.isFile && entry.file) {
      const file = await new Promise<File>((ok, fail) => entry.file!(ok, fail));
      out.push({ path: `${base}/${entry.name}`, file });
    } else if (entry.isDirectory && !SKIPPED_DIRS.has(entry.name)) {
      for (const child of await readAll(entry)) await walk(child, `${base}/${entry.name}`);
    }
  };
  for (const entry of entries) {
    if (opts.intoRoot && entry.isDirectory) {
      for (const child of await readAll(entry)) await walk(child, opts.prefix ?? '');
    } else {
      await walk(entry, opts.prefix ?? '');
    }
  }
  return out;
}

/** Una ruta que pasa por una carpeta de dependencias o de control de versiones (`node_modules/…`, `.git/…`). */
export function isSkippedPath(relPath: string): boolean {
  return relPath.replace(/\\/g, '/').split('/').slice(0, -1).some((part) => SKIPPED_DIRS.has(part));
}

/** Tope de archivos que se leen de una carpeta elegida o soltada. */
export const MAX_IMPORT_FILES = MAX_FILES;

export const isZip = (name: string): boolean => /\.zip$/i.test(name);
