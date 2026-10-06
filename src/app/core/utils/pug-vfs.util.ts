/**
 * Virtual-filesystem helpers shared by the parser and the compiler so that
 * `include` / `extends` are resolved natively by Pug (blocks, mixins,
 * relative paths, extension-less names) instead of by textual splicing.
 */

const ENTRY_CANDIDATES = ['/index.pug', '/main.pug', '/app.pug'];

/** Picks the project's entry template: index.pug (or main/app) wins; otherwise the active pug file. */
export function findEntryPath(files: Map<string, string>, activePath?: string | null): string | null {
  for (const candidate of ENTRY_CANDIDATES) {
    if (files.has(candidate)) return candidate;
  }
  if (activePath && activePath.endsWith('.pug') && files.has(activePath)) return activePath;
  for (const path of files.keys()) {
    if (path.endsWith('.pug')) return path;
  }
  return null;
}

function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}

function normalize(path: string): string {
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
  const candidates = [base, base + '.pug', base + '/index.pug'];
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
      if (!found || !found.endsWith('.pug')) return line;
      return `${m[1]}${m[2]}${m[3]}${m[5]}.pug${m[6]}`;
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
