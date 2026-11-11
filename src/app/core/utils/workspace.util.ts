/** Espacios de trabajo de escritorio (P-26): qué hay que escribir en disco y qué hacer con un cambio ajeno. Sin Angular ni DOM. */

export interface WorkspaceInfo { id: string; name: string; color: string; path: string; lastOpened: number; exists: boolean; }

export interface SyncState {
  /** Texto de cada archivo tal como está en disco (lo último leído o escrito). */
  texts: Map<string, string>;
  /** Assets que hay en disco (por ruta; el valor es el mismo `Uint8Array` que se leyó o escribió). */
  assets: Map<string, Uint8Array>;
  /** Juegos de datos, serializados, tal como están en disco. */
  datasets: string | null;
}

export interface WorkspaceChange {
  files: Record<string, string>;
  assets: { path: string; data: Uint8Array }[];
  deleted: string[];
  datasets?: string;
}

export function emptyChange(c: WorkspaceChange): boolean {
  return !Object.keys(c.files).length && !c.assets.length && !c.deleted.length && c.datasets === undefined;
}

/** Diferencia entre lo que hay en la app y lo que hay en disco: lo que hay que escribir y borrar. */
export function diffForDisk(
  current: { files: Record<string, string>; assets: { path: string; data: Uint8Array }[]; datasets: string | null },
  synced: SyncState,
): WorkspaceChange {
  const change: WorkspaceChange = { files: {}, assets: [], deleted: [] };
  for (const [path, text] of Object.entries(current.files)) if (synced.texts.get(path) !== text) change.files[path] = text;
  for (const path of synced.texts.keys()) if (!(path in current.files)) change.deleted.push(path);
  const now = new Set<string>();
  for (const a of current.assets) {
    now.add(a.path);
    if (synced.assets.get(a.path) !== a.data) change.assets.push({ path: a.path, data: a.data });
  }
  for (const path of synced.assets.keys()) if (!now.has(path)) change.deleted.push(path);
  if (current.datasets !== null && current.datasets !== synced.datasets) change.datasets = current.datasets;
  return change;
}

/** Da por escrito en disco lo que se acaba de enviar. */
export function markSynced(synced: SyncState, change: WorkspaceChange, failed: string[]): void {
  const bad = new Set(failed);
  for (const [path, text] of Object.entries(change.files)) if (!bad.has(path)) synced.texts.set(path, text);
  for (const a of change.assets) if (!bad.has(a.path)) synced.assets.set(a.path, a.data);
  for (const path of change.deleted) if (!bad.has(path)) { synced.texts.delete(path); synced.assets.delete(path); }
  if (change.datasets !== undefined && !bad.has('/.pugide/datasets.json')) synced.datasets = change.datasets;
}

export type ExternalAction = 'ignore' | 'apply' | 'conflict';

/**
 * Qué hacer con un archivo de texto que cambió en disco. `disk` y `app` son `null` si no existe en ese lado; `synced` es
 * lo que la app creía que había en disco.
 */
export function externalAction(disk: string | null, app: string | null, synced: string | null): ExternalAction {
  if (disk === synced) return 'ignore';          // es nuestro propio guardado, o no ha cambiado de verdad
  if (disk === app) return 'ignore';             // ya dice lo mismo
  if (app === synced) return 'apply';            // aquí no hay cambios sin guardar: se toma el del disco
  return 'conflict';                             // cambió en los dos sitios
}

/** `C:\\Trabajo\\cliente\\plantillas` → `…\\cliente\\plantillas` si es muy larga (para la barra). */
export function shortPath(path: string, max = 46): string {
  if (path.length <= max) return path;
  const sep = path.includes('\\') ? '\\' : '/';
  const parts = path.split(sep).filter(Boolean);
  let out = parts.pop() ?? path;
  while (parts.length && (out.length + parts[parts.length - 1].length + 2) <= max - 1) out = parts.pop() + sep + out;
  return '…' + sep + out;
}

/** «hoy, 10:12», «ayer», «28 oct». */
export function lastOpenedText(at: number, now = Date.now()): string {
  if (!at) return 'sin abrir';
  const day = (t: number): number => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const diff = Math.round((day(now) - day(at)) / 86400000);
  if (diff <= 0) return `hoy, ${new Date(at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  if (diff === 1) return 'ayer';
  return new Date(at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
