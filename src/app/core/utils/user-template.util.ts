/** Plantillas propias (P-25): un proyecto guardado como punto de partida. Utilidades puras, sin Angular ni DOM. */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { SnapshotAsset, SnapshotContent, SnapshotMeta } from '../models/project-snapshot.model';
import { DATASETS_PATH, parseDatasetsFile, DEFAULT_DATASET_NAME } from './datasets.util';

export const MAX_USER_TEMPLATES = 30;
export const MAX_USER_TEMPLATE_BYTES = 25 * 1024 * 1024;
/** Las plantillas se guardan con este «proyecto» en el almacén (el mismo formato que las instantáneas). */
export const USER_TEMPLATES_KEY = 'plantillas';
const META_PATH = '.pugide/plantilla.json';

export interface UserTemplateMeta extends SnapshotMeta { description: string; }
export interface TemplateIncludes { data: boolean; assets: boolean; locales: boolean; }

const isLocalePath = (path: string): boolean => /^\/locales\//.test(path);

/** Lo que entra en la plantilla según lo que se marcó al guardarla. Sin datos, queda un juego vacío. */
export function templateContent(content: SnapshotContent, include: TemplateIncludes): SnapshotContent {
  const files: Record<string, string> = {};
  for (const [path, text] of Object.entries(content.files)) if (include.locales || !isLocalePath(path)) files[path] = text;
  const datasets = content.datasets && !include.data
    ? { ...content.datasets, activeId: 'ds-1', datasets: [{ id: 'ds-1', name: DEFAULT_DATASET_NAME, data: {} }] }
    : content.datasets;
  return { files, assets: include.assets ? content.assets : [], ...(datasets ? { datasets: structuredClone(datasets) } : {}) };
}

export function cleanTemplateName(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, 80);
  return name || null;
}

const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
};
const mimeOf = (path: string): string | null => MIME[path.split('.').pop()?.toLowerCase() ?? ''] ?? null;

/** Empaqueta una plantilla como `.zip` (los archivos tal cual, más `.pugide/plantilla.json` y los datos). */
export function packTemplate(meta: { name: string; description: string }, content: SnapshotContent): Uint8Array {
  const input: Record<string, Uint8Array> = {};
  for (const [path, text] of Object.entries(content.files)) input[path.replace(/^\//, '')] = strToU8(text);
  for (const a of content.assets) input[a.path.replace(/^\//, '')] = a.data;
  if (content.datasets) input[DATASETS_PATH.replace(/^\//, '')] = strToU8(JSON.stringify(content.datasets, null, 2));
  input[META_PATH] = strToU8(JSON.stringify({ pugideTemplate: 1, name: meta.name, description: meta.description }, null, 2));
  return zipSync(input, { level: 6 });
}

export type UnpackedTemplate =
  | { ok: true; name: string; description: string; content: SnapshotContent }
  | { ok: false; reason: string };

/** Lee un `.zip` de plantilla. Vale también un `.zip` de proyecto normal (toma el nombre que se le pase). */
export function unpackTemplate(zip: Uint8Array, fallbackName: string): UnpackedTemplate {
  let entries: Record<string, Uint8Array>;
  try { entries = unzipSync(zip); } catch { return { ok: false, reason: 'El archivo no es un .zip válido.' }; }
  const files: Record<string, string> = {};
  const assets: SnapshotAsset[] = [];
  let name = fallbackName, description = '';
  let datasets: SnapshotContent['datasets'];
  for (const [raw, data] of Object.entries(entries)) {
    if (raw.endsWith('/') || raw.includes('..') || raw.startsWith('__MACOSX/')) continue;
    const path = '/' + raw.replace(/^\/+/, '');
    if (raw === META_PATH) {
      try { const m = JSON.parse(strFromU8(data)); if (typeof m.name === 'string' && m.name.trim()) name = m.name; if (typeof m.description === 'string') description = m.description; } catch { /* se queda el nombre del archivo */ }
    } else if (path === DATASETS_PATH) {
      datasets = parseDatasetsFile(strFromU8(data)) ?? undefined;
    } else if (path.startsWith('/.pugide/')) {
      continue;
    } else {
      const mime = mimeOf(path);
      if (mime) assets.push({ path, mime, data });
      else files[path] = strFromU8(data);
    }
  }
  if (!Object.keys(files).some((p) => /\.(pug|jade)$/i.test(p))) return { ok: false, reason: 'El .zip no contiene ninguna plantilla .pug.' };
  return { ok: true, name: cleanTemplateName(name) ?? fallbackName, description: description.slice(0, 200), content: { files, assets, ...(datasets ? { datasets } : {}) } };
}
