/**
 * Virtual-filesystem helpers shared by the parser and the compiler so that
 * `include` / `extends` are resolved natively by Pug (blocks, mixins,
 * relative paths, extension-less names) instead of by textual splicing.
 */

const ENTRY_CANDIDATES = ['/index.pug', '/main.pug', '/app.pug', '/index.jade', '/main.jade', '/app.jade'];

/** Plantilla de Pug: `.pug` o el antiguo `.jade`. */
export const PUG_FILE_RE = /\.(pug|jade)$/i;

export function isPugFile(path: string): boolean {
  return PUG_FILE_RE.test(path);
}

/**
 * Picks the template that is rendered. `preferred` (the file the person chose to preview) wins when it still exists;
 * otherwise index.pug (or main/app) wins; otherwise the active pug file; otherwise the first one.
 */
export function findEntryPath(files: Map<string, string>, activePath?: string | null, preferred?: string | null): string | null {
  if (preferred && isPugFile(preferred) && files.has(preferred)) return preferred;
  for (const candidate of ENTRY_CANDIDATES) {
    if (files.has(candidate)) return candidate;
  }
  if (activePath && isPugFile(activePath) && files.has(activePath)) return activePath;
  for (const path of files.keys()) {
    if (isPugFile(path)) return path;
  }
  return null;
}

/** Plantillas del proyecto que se pueden previsualizar, ordenadas por ruta. */
export function listTemplates(files: Map<string, string>): string[] {
  return [...files.keys()].filter(isPugFile).sort((a, b) => a.localeCompare(b));
}

/** El archivo elegido sigue a su archivo cuando este se renombra o se mueve. */
export function pinnedAfterRename(pinned: string | null, oldPath: string, newPath: string): string | null {
  if (!pinned) return null;
  if (pinned === oldPath) return isPugFile(newPath) ? newPath : null;
  return pinned;
}

/** Si se borra el archivo elegido, la vista previa vuelve a ser automática. */
export function pinnedAfterDelete(pinned: string | null, deletedPath: string): string | null {
  return pinned === deletedPath ? null : pinned;
}

/** La elección solo vale si el archivo existe y es una plantilla; si no, se descarta. */
export function validPinned(pinned: string | null | undefined, files: Map<string, string>): string | null {
  return pinned && isPugFile(pinned) && files.has(pinned) ? pinned : null;
}

function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}

export function normalize(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return '/' + out.join('/');
}

export function resolveVirtualPath(
  target: string,
  from: string | undefined,
  files: Map<string, string>,
): string | null {
  const base = target.startsWith('/') ? target : normalize(dirname(from ?? '/') + '/' + target);
  const candidates = [base, base + '.pug', base + '.jade', base + '/index.pug', base + '/index.jade'];
  for (const c of candidates) {
    if (files.has(c)) return c;
  }
  return null;
}

const DIRECTIVE_RE = /^(\s*)(include|extends)(\s+)(['"]?)([^'"\s]+)\4(\s*)$/;

/**
 * Real Pug treats `include foo` (no extension) as a raw text include. In an IDE
 * that's almost never what's meant, so extension-less includes that match a
 * project `.pug` file are rewritten to `include foo.pug` (line numbers preserved).
 */
export function normalizeIncludes(code: string, from: string, files: Map<string, string>): string {
  if (!code.includes('include') && !code.includes('extends')) return code;
  return code
    .split('\n')
    .map((line) => {
      const m = line.match(DIRECTIVE_RE);
      if (!m || /\.[A-Za-z0-9]+$/.test(m[5])) return line;
      const found = resolveVirtualPath(m[5], from, files);
      if (!found || !isPugFile(found)) return line;
      return `${m[1]}${m[2]}${m[3]}${m[5]}.${found.slice(found.lastIndexOf('.') + 1)}${m[6]}`;
    })
    .join('\n');
}

/** Pug plugin (resolve + read) backed by the in-memory project files. */
export function createPugFilePlugin(files: Map<string, string>) {
  return {
    resolve(filename: string, source: string | undefined): string {
      const found = resolveVirtualPath(filename, source, files);
      if (!found) {
        throw new Error(`Cannot find "${filename}"${source ? ` (included from ${source})` : ''}`);
      }
      return found;
    },
    read(filename: string): string {
      const content = files.get(filename);
      if (content === undefined) throw new Error(`Cannot read "${filename}"`);
      return normalizeIncludes(content, filename, files);
    },
  };
}
