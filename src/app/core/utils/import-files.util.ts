/**
 * «Importar archivos» (P-28): qué se añade al proyecto abierto, en qué ruta y qué pasa con lo que ya existe.
 * Funciones puras: el diálogo enseña el plan antes de aplicar nada y el orquestador lo ejecuta tal cual.
 */
import { ASSET_EXT_RE, TEXT_FILE_RE } from './asset.util';
import { isZipJunk } from './zip-import.util';

/** Un archivo elegido: su ruta relativa dentro de lo elegido (`cabeceras/pie.pug`, o solo `pie.pug`). */
export interface PickedFile {
  relPath: string;
  /** Destino ya decidido (un archivo suelto que una plantilla echa en falta va a la ruta que esa plantilla pide). */
  fixedPath?: string;
}

/** Qué hacer con los archivos cuya ruta ya existe en el proyecto. */
export type ImportConflict = 'skip' | 'replace' | 'keep-both';

export type ImportItemState = 'new' | 'exists' | 'unsupported';

export interface ImportPlanItem {
  /** Posición en la lista de entrada (para recuperar el `File`). */
  index: number;
  /** Ruta relativa tal como se eligió. */
  relPath: string;
  /** Ruta de destino en el proyecto (vacía si no se importa por su tipo). */
  path: string;
  state: ImportItemState;
  kind: 'text' | 'asset' | null;
}

export interface ImportPlan {
  items: ImportPlanItem[];
  /** Carpeta común de todo lo elegido (`cabeceras`), o null si son archivos sueltos o hay varias. */
  rootFolder: string | null;
  /** Restos del sistema ignorados (`.DS_Store`, `__MACOSX`…): no se enseñan uno a uno. */
  junk: number;
  counts: { new: number; exists: number; unsupported: number };
}

export interface ImportPlanOptions {
  /** Carpeta de destino dentro del proyecto: `/` o `/partials`. */
  target: string;
  /** Si lo elegido es una carpeta, conservarla como subcarpeta del destino. */
  keepFolder: boolean;
}

/** Normaliza una carpeta de destino: siempre empieza por `/` y no acaba en `/` (salvo la raíz). */
export function normalizeTarget(target: string): string {
  const parts = cleanSegments(target);
  return parts.length ? '/' + parts.join('/') : '/';
}

/** Trozos de ruta seguros: sin `.`, `..`, vacíos ni barras invertidas; los espacios pasan a guiones como en el resto de la app. */
function cleanSegments(path: string): string[] {
  return path
    .replace(/\\/g, '/')
    .split('/')
    .map((s) => s.trim().replace(/\s+/g, '-'))
    .filter((s) => s && s !== '.' && s !== '..');
}

/** La carpeta única que contiene todo lo elegido, o null. */
export function commonRootFolder(relPaths: string[]): string | null {
  const real = relPaths.filter((p) => !isZipJunk(p));
  if (!real.length) return null;
  const first = cleanSegments(real[0]);
  if (first.length < 2) return null;
  return real.every((p) => { const s = cleanSegments(p); return s.length >= 2 && s[0] === first[0]; }) ? first[0] : null;
}

/** Las carpetas del proyecto que se ofrecen como destino, con la raíz primero. */
export function projectFolders(paths: Iterable<string>): string[] {
  const out = new Set<string>(['/']);
  for (const p of paths) {
    const parts = p.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) out.add('/' + parts.slice(0, i).join('/'));
  }
  return [...out].sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
}

/** Plan de importación: a dónde va cada archivo y si es nuevo, ya existe o no se admite. */
export function planFileImport(picked: PickedFile[], existing: ReadonlySet<string>, options: ImportPlanOptions): ImportPlan {
  const target = normalizeTarget(options.target);
  const rootFolder = commonRootFolder(picked.map((p) => p.relPath));
  const items: ImportPlanItem[] = [];
  const counts = { new: 0, exists: 0, unsupported: 0 };
  const planned = new Set<string>();
  let junk = 0;
  picked.forEach((file, index) => {
    if (isZipJunk(file.relPath)) { junk++; return; }
    let segments = cleanSegments(file.relPath);
    if (!segments.length) return;
    if (rootFolder && !options.keepFolder) segments = segments.slice(1);
    const name = segments[segments.length - 1];
    const kind = TEXT_FILE_RE.test(name) ? 'text' : ASSET_EXT_RE.test(name) ? 'asset' : null;
    if (!kind) {
      items.push({ index, relPath: file.relPath, path: '', state: 'unsupported', kind: null });
      counts.unsupported++;
      return;
    }
    const path = file.fixedPath ?? (target === '/' ? '' : target) + '/' + segments.join('/');
    // Dos archivos elegidos que acaban en la misma ruta (p. ej. «a b.pug» y «a-b.pug»): el segundo cuenta como existente.
    const state: ImportItemState = existing.has(path) || planned.has(path) ? 'exists' : 'new';
    planned.add(path);
    items.push({ index, relPath: file.relPath, path, state, kind });
    counts[state]++;
  });
  return { items, rootFolder, junk, counts };
}

/** Nombre libre para «conservar los dos»: `tabla.pug` → `tabla-2.pug`, `tabla-3.pug`… */
export function freePath(path: string, taken: ReadonlySet<string>): string {
  if (!taken.has(path)) return path;
  const slash = path.lastIndexOf('/');
  const dir = path.slice(0, slash + 1);
  const name = path.slice(slash + 1);
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let n = 2; ; n++) {
    const candidate = `${dir}${stem}-${n}${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export interface ImportWrite {
  index: number;
  path: string;
  kind: 'text' | 'asset';
  /** Sustituye a un archivo que ya estaba en el proyecto. */
  replaces: boolean;
}

/** Lo que de verdad se escribe según lo que se eligió hacer con los que ya existen. */
export function resolveImport(plan: ImportPlan, existing: ReadonlySet<string>, conflict: ImportConflict): { writes: ImportWrite[]; skipped: string[] } {
  const taken = new Set(existing);
  const writes: ImportWrite[] = [];
  const skipped: string[] = [];
  for (const item of plan.items) {
    if (item.state === 'unsupported' || !item.kind) continue;
    if (item.state === 'new') {
      writes.push({ index: item.index, path: item.path, kind: item.kind, replaces: false });
      taken.add(item.path);
    } else if (conflict === 'skip') {
      skipped.push(item.path);
    } else if (conflict === 'replace') {
      writes.push({ index: item.index, path: item.path, kind: item.kind, replaces: existing.has(item.path) });
    } else {
      const path = freePath(item.path, taken);
      taken.add(path);
      writes.push({ index: item.index, path, kind: item.kind, replaces: false });
    }
  }
  return { writes, skipped };
}

/** Texto corto del resumen: «6 nuevos · 2 ya existen · 1 no se importa». */
export function importSummary(counts: ImportPlan['counts']): string {
  const parts: string[] = [];
  if (counts.new) parts.push(`${counts.new} nuevo${counts.new === 1 ? '' : 's'}`);
  if (counts.exists) parts.push(`${counts.exists} ya existe${counts.exists === 1 ? '' : 'n'}`);
  if (counts.unsupported) parts.push(`${counts.unsupported} no se importa${counts.unsupported === 1 ? '' : 'n'}`);
  return parts.join(' · ') || 'Nada que importar';
}
