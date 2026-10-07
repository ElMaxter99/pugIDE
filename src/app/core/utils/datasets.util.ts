/** Modelo y utilidades puras de los juegos de datos de un proyecto. */
import type { MockLocale } from './mock-data.util';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

/** `error` conserva nulos y arrays vacios al autocompletar; `empty` no rellena con mocks. */
export type DatasetKind = 'default' | 'empty' | 'full' | 'error' | 'custom';
const KINDS: DatasetKind[] = ['default', 'empty', 'full', 'error', 'custom'];

export interface Dataset {
  id: string;
  name: string;
  data: Obj;
  /** Semilla de la ultima regeneracion de mocks (para reproducirla). */
  seed?: number;
  kind?: DatasetKind;
}

export interface DatasetsFile {
  version: 1;
  activeId: string;
  locale: MockLocale;
  datasets: Dataset[];
}

/** Ruta del archivo de datasets dentro de un zip / carpeta exportada. No forma parte de los archivos del proyecto. */
export const DATASETS_PATH = '/.pugide/datasets.json';
export const DEFAULT_DATASET_NAME = 'Por defecto';

export function newDatasetId(existing: Dataset[]): string {
  const ids = new Set(existing.map((d) => d.id));
  let n = existing.length + 1;
  while (ids.has('ds-' + n)) n++;
  return 'ds-' + n;
}

/** `Lleno`, `Lleno (2)`, `Lleno (3)`... sin repetir nombres (sin distinguir mayusculas). */
export function uniqueName(base: string, existing: Dataset[], ignoreId?: string): string {
  const taken = new Set(existing.filter((d) => d.id !== ignoreId).map((d) => d.name.toLowerCase()));
  const clean = base.trim() || 'Sin nombre';
  if (!taken.has(clean.toLowerCase())) return clean;
  let i = 2;
  while (taken.has(`${clean} (${i})`.toLowerCase())) i++;
  return `${clean} (${i})`;
}

export function serializeDatasets(file: DatasetsFile): string {
  return JSON.stringify(file, null, 2) + '\n';
}

/** Valida y normaliza el contenido de `datasets.json`; devuelve null si no es utilizable. */
export function parseDatasetsFile(input: string | unknown): DatasetsFile | null {
  let raw: unknown = input;
  if (typeof input === 'string') {
    try { raw = JSON.parse(input); } catch { return null; }
  }
  if (!isObj(raw) || !Array.isArray(raw['datasets'])) return null;
  const datasets: Dataset[] = [];
  for (const d of raw['datasets']) {
    if (!isObj(d) || typeof d['name'] !== 'string' || !isObj(d['data'])) continue;
    const id = typeof d['id'] === 'string' && d['id'] && !datasets.some((x) => x.id === d['id']) ? (d['id'] as string) : newDatasetId(datasets);
    datasets.push({ id, name: uniqueName(d['name'] as string, datasets), data: d['data'] as Obj, ...(typeof d['seed'] === 'number' ? { seed: d['seed'] as number } : {}), ...(KINDS.includes(d['kind'] as DatasetKind) ? { kind: d['kind'] as DatasetKind } : {}) });
  }
  if (datasets.length === 0) return null;
  const activeId = datasets.some((d) => d.id === raw['activeId']) ? (raw['activeId'] as string) : datasets[0].id;
  return { version: 1, activeId, locale: raw['locale'] === 'en' ? 'en' : 'es', datasets };
}
