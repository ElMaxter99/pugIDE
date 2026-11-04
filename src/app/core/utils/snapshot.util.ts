/** Instantáneas de proyecto: límites, tamaños, diferencias entre dos estados del proyecto y textos. Sin Angular ni DOM. */
import type { SnapshotAsset, SnapshotContent, SnapshotMeta } from '../models/project-snapshot.model';
import { DiffOp, diffLines, summarizeDiff } from './history.util';

/** Instantáneas guardadas por proyecto; al llegar al tope, guardar otra elimina la más antigua (siempre avisando). */
export const MAX_SNAPSHOTS = 20;
/** Tope de tamaño de una instantánea (texto + assets + datos): el navegador guarda esto en IndexedDB. */
export const MAX_SNAPSHOT_BYTES = 25 * 1024 * 1024;
export const MAX_SNAPSHOT_NAME = 80;
/** Por encima de este tamaño de texto no se calculan las líneas cambiadas de cada archivo. */
export const COUNT_LINES_MAX_CHARS = 100_000;

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

/** Bytes de un texto en UTF-8. */
export function textBytes(text: string): number {
  return encoder ? encoder.encode(text).length : unescape(encodeURIComponent(text)).length;
}

export interface WeighedItem {
  path: string;
  bytes: number;
}

export interface SnapshotSize {
  bytes: number;
  fits: boolean;
  max: number;
  /** Lo que más pesa, de mayor a menor (para decirle a la persona qué quitar). */
  heaviest: WeighedItem[];
}

/** Tamaño de una instantánea y si cabe en el tope. */
export function measureSnapshot(content: SnapshotContent, max = MAX_SNAPSHOT_BYTES): SnapshotSize {
  const items: WeighedItem[] = [
    ...Object.entries(content.files).map(([path, text]) => ({ path, bytes: textBytes(text) })),
    ...content.assets.map((a) => ({ path: a.path, bytes: a.data.byteLength })),
  ];
  const datasets = content.datasets ? textBytes(JSON.stringify(content.datasets)) : 0;
  const bytes = items.reduce((sum, i) => sum + i.bytes, datasets);
  return { bytes, fits: bytes <= max, max, heaviest: items.sort((a, b) => b.bytes - a.bytes).slice(0, 3) };
}

/** `812 B`, `38 KB`, `1,4 MB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** «4 nov 2026, 11:55». */
export function formatSnapshotDate(at: number): string {
  return new Date(at).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Nombre limpio (espacios colapsados, recortado) o `null` si queda vacío. */
export function cleanSnapshotName(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_SNAPSHOT_NAME).trim();
  return name || null;
}

export function defaultSnapshotName(at: number): string {
  return `Instantánea ${formatSnapshotDate(at)}`;
}

/** Nombre de la copia automática que se guarda antes de restaurar. */
export function autoSnapshotName(restoredName: string): string {
  const prefix = 'Antes de restaurar «';
  const room = MAX_SNAPSHOT_NAME - prefix.length - 1;
  const name = restoredName.length > room ? restoredName.slice(0, room - 1).trimEnd() + '…' : restoredName;
  return `${prefix}${name}»`;
}

/** Instantáneas de más recientes a más antiguas. */
export function sortNewestFirst<T extends { at: number }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => b.at - a.at);
}

/** La más antigua (la que se elimina al llegar al tope). */
export function oldestSnapshot<T extends { at: number }>(list: readonly T[]): T | null {
  return list.reduce<T | null>((oldest, s) => (!oldest || s.at < oldest.at ? s : oldest), null);
}

/** Lo que sobra por encima del tope, de la más antigua a la más reciente. */
export function snapshotsOverLimit<T extends { at: number }>(list: readonly T[], max = MAX_SNAPSHOTS): T[] {
  const extra = list.length - max;
  return extra > 0 ? sortNewestFirst(list).slice(max).reverse() : [];
}

export function snapshotMeta(
  id: string, projectId: string, name: string, at: number, auto: boolean, content: SnapshotContent, bytes: number,
): SnapshotMeta {
  return { id, projectId, name, at, auto, fileCount: Object.keys(content.files).length, assetCount: content.assets.length, bytes };
}

// ---- Diferencias entre dos proyectos ----

export interface EntryChanges {
  /** Está en `current` y no en `base`. */
  added: string[];
  /** Estaba en `base` y ya no está en `current`. */
  removed: string[];
  modified: string[];
  unchanged: string[];
}

/** Compara dos mapas por clave: todo lo que cambió entre `base` (p. ej. una instantánea) y `current` (el proyecto de ahora). */
export function diffMaps<T>(base: ReadonlyMap<string, T>, current: ReadonlyMap<string, T>, equal: (a: T, b: T) => boolean): EntryChanges {
  const out: EntryChanges = { added: [], removed: [], modified: [], unchanged: [] };
  for (const [key, value] of current) {
    const before = base.get(key);
    if (before === undefined && !base.has(key)) out.added.push(key);
    else if (equal(before as T, value)) out.unchanged.push(key);
    else out.modified.push(key);
  }
  for (const key of base.keys()) if (!current.has(key)) out.removed.push(key);
  for (const list of [out.added, out.removed, out.modified, out.unchanged]) list.sort();
  return out;
}

/** Diferencias entre dos conjuntos de archivos de texto. */
export function diffFileMaps(base: ReadonlyMap<string, string>, current: ReadonlyMap<string, string>): EntryChanges {
  return diffMaps(base, current, (a, b) => a === b);
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a === b) return true;
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Diferencias entre dos conjuntos de assets (por ruta y contenido). */
export function diffAssetMaps(base: ReadonlyMap<string, SnapshotAsset>, current: ReadonlyMap<string, SnapshotAsset>): EntryChanges {
  return diffMaps(base, current, (a, b) => bytesEqual(a.data, b.data));
}

const assetMap = (list: readonly SnapshotAsset[]): Map<string, SnapshotAsset> => new Map(list.map((a) => [a.path, a]));
const fileMap = (files: Readonly<Record<string, string>>): Map<string, string> => new Map(Object.entries(files));
const datasetsText = (c: SnapshotContent): string => (c.datasets ? JSON.stringify(c.datasets, null, 2) : '');

export type ChangeKind = 'added' | 'removed' | 'modified';
export type EntryType = 'file' | 'asset' | 'data';

/** Un archivo, asset o los juegos de datos que difieren entre la instantánea y el proyecto actual. */
export interface ChangeEntry {
  /** `file:/ruta`, `asset:/ruta` o `data`. */
  key: string;
  type: EntryType;
  label: string;
  kind: ChangeKind;
  /** Líneas que hay ahora y no había (+) y líneas que había y ya no (−); solo texto y datos. */
  plus: number;
  minus: number;
  /** Tamaños antes (instantánea) y ahora; solo assets. */
  bytesBefore?: number;
  bytesAfter?: number;
}

export interface SnapshotComparison {
  entries: ChangeEntry[];
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

export const DATA_KEY = 'data';
export const DATA_LABEL = 'Juegos de datos';

/**
 * Diff de un texto entre la instantánea (`before`, null si no existía) y ahora (`after`, null si ya no existe).
 * `+` = líneas de ahora; `−` = líneas que tenía la instantánea.
 */
export function diffText(before: string | null, after: string | null): DiffOp[] {
  if (before === null && after === null) return [];
  if (before === null) return linesOf(after as string).map((text): DiffOp => ({ type: 'add', text }));
  if (after === null) return linesOf(before).map((text): DiffOp => ({ type: 'del', text }));
  return diffLines(before, after);
}

/** Líneas de un texto sin la línea vacía final que deja el último salto. */
function linesOf(text: string): string[] {
  const lines = text.split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function countLines(before: string | null, after: string | null): { plus: number; minus: number } {
  if ((before?.length ?? 0) > COUNT_LINES_MAX_CHARS || (after?.length ?? 0) > COUNT_LINES_MAX_CHARS) return { plus: 0, minus: 0 };
  const { added, removed } = summarizeDiff(diffText(before, after));
  return { plus: added, minus: removed };
}

/** Qué cambió en el proyecto `current` desde `base` (una instantánea): archivos, assets y juegos de datos. */
export function compareSnapshot(base: SnapshotContent, current: SnapshotContent): SnapshotComparison {
  const entries: ChangeEntry[] = [];
  const files = diffFileMaps(fileMap(base.files), fileMap(current.files));
  const push = (kind: ChangeKind, list: string[]): void => {
    for (const path of list) {
      const before = kind === 'added' ? null : base.files[path];
      const after = kind === 'removed' ? null : current.files[path];
      entries.push({ key: `file:${path}`, type: 'file', label: path, kind, ...countLines(before, after) });
    }
  };
  push('modified', files.modified);
  push('added', files.added);
  push('removed', files.removed);

  const baseAssets = assetMap(base.assets);
  const curAssets = assetMap(current.assets);
  const assets = diffAssetMaps(baseAssets, curAssets);
  for (const kind of ['modified', 'added', 'removed'] as const) {
    for (const path of assets[kind]) {
      entries.push({
        key: `asset:${path}`, type: 'asset', label: path, kind, plus: 0, minus: 0,
        ...(kind !== 'added' ? { bytesBefore: baseAssets.get(path)?.data.byteLength } : {}),
        ...(kind !== 'removed' ? { bytesAfter: curAssets.get(path)?.data.byteLength } : {}),
      });
    }
  }

  const beforeData = datasetsText(base);
  const afterData = datasetsText(current);
  const dataChanged = beforeData !== afterData;
  if (dataChanged) {
    entries.push({ key: DATA_KEY, type: 'data', label: DATA_LABEL, kind: 'modified', ...countLines(beforeData, afterData) });
  }

  return {
    entries,
    added: files.added.length + assets.added.length,
    removed: files.removed.length + assets.removed.length,
    modified: files.modified.length + assets.modified.length + (dataChanged ? 1 : 0),
    unchanged: files.unchanged.length + assets.unchanged.length + (!dataChanged && (base.datasets || current.datasets) ? 1 : 0),
  };
}

/** Líneas de diff de una entrada de texto o de datos (para mostrarlas). */
export function entryDiff(entry: ChangeEntry, base: SnapshotContent, current: SnapshotContent): DiffOp[] {
  if (entry.type === 'data') return diffText(datasetsText(base), datasetsText(current));
  if (entry.type !== 'file') return [];
  const path = entry.label;
  return diffText(entry.kind === 'added' ? null : (base.files[path] ?? ''), entry.kind === 'removed' ? null : (current.files[path] ?? ''));
}

export function hasChanges(c: SnapshotComparison): boolean {
  return c.entries.length > 0;
}

export const KIND_LABEL: Record<ChangeKind, string> = { added: 'añadido', removed: 'eliminado', modified: 'modificado' };
export const KIND_SYMBOL: Record<ChangeKind, string> = { added: '+', removed: '−', modified: '~' };

function names(list: string[]): string {
  return list.length <= 3 ? list.join(', ') : `${list.slice(0, 3).join(', ')}…`;
}

/** Frases de «qué cambia al restaurar» (la instantánea manda): desde el punto de vista de quien restaura. */
export function restoreSummary(c: SnapshotComparison): string[] {
  const by = (type: EntryType, kind: ChangeKind): string[] => c.entries.filter((e) => e.type === type && e.kind === kind).map((e) => e.label);
  const back = by('file', 'removed');
  const gone = by('file', 'added');
  const changed = by('file', 'modified');
  const assets = c.entries.filter((e) => e.type === 'asset');
  const data = c.entries.some((e) => e.type === 'data');
  const lines: string[] = [];
  if (back.length) lines.push(`${back.length === 1 ? 'vuelve 1 archivo que ya no está' : `vuelven ${back.length} archivos que ya no están`} (${names(back)})`);
  if (gone.length) lines.push(`${gone.length === 1 ? 'se elimina 1 archivo añadido' : `se eliminan ${gone.length} archivos añadidos`} después (${names(gone)})`);
  if (changed.length || data) {
    const parts = [changed.length ? plural(changed.length, 'archivo', 'archivos') : '', data ? 'los juegos de datos' : ''].filter(Boolean);
    lines.push(`${parts.join(' y ')} ${changed.length > 1 || (changed.length === 1 && data) || (!changed.length && data) ? 'recuperan' : 'recupera'} su contenido de entonces`);
  }
  if (assets.length) lines.push(`${plural(assets.length, 'asset cambia', 'assets cambian')} para quedar como en la instantánea`);
  return lines;
}
