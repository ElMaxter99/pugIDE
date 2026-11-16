/**
 * «Pasar a una carpeta…» (P-41, solo escritorio): llevar un proyecto de «Mis proyectos» a una carpeta del disco y
 * abrirla como espacio de trabajo. Utilidades puras: nunca se sobrescribe nada de la carpeta; si un nombre coincide,
 * el del proyecto se guarda como «main (2).pug».
 */
import type { SnapshotContent } from '../models/project-snapshot.model';
import type { WorkspaceChange } from './workspace.util';

/** `/estilos/base.scss` y lo que ya existe → `/estilos/base (2).scss` (o el primer número libre). */
export function copyName(path: string, taken: ReadonlySet<string>): string {
  if (!taken.has(path)) return path;
  const slash = path.lastIndexOf('/');
  const dir = path.slice(0, slash + 1);
  const name = path.slice(slash + 1);
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let n = 2; ; n++) {
    const candidate = `${dir}${base} (${n})${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Nombre nuevo para cada ruta del proyecto que ya existe en la carpeta (sin chocar tampoco entre ellas). */
export function renamesFor(projectPaths: readonly string[], existing: readonly string[]): Map<string, string> {
  const taken = new Set([...existing, ...projectPaths]);
  const out = new Map<string, string>();
  for (const p of projectPaths) {
    if (!existing.includes(p)) continue;
    const next = copyName(p, taken);
    taken.add(next);
    out.set(p, next);
  }
  return out;
}

/** Lo que se escribe en la carpeta: archivos, imágenes y fuentes (con los nombres nuevos) y los juegos de datos. */
export function moveChange(content: SnapshotContent, renames: ReadonlyMap<string, string> = new Map()): WorkspaceChange {
  const to = (p: string) => renames.get(p) ?? p;
  const files: Record<string, string> = {};
  for (const [p, text] of Object.entries(content.files)) files[to(p)] = text;
  return {
    files,
    assets: content.assets.map((a) => ({ path: to(a.path), data: a.data })),
    deleted: [],
    ...(content.datasets ? { datasets: JSON.stringify(content.datasets, null, 2) } : {}),
  };
}

/** Rutas del proyecto (texto, imágenes y fuentes) que se escriben en la carpeta. */
export function projectPaths(content: SnapshotContent): string[] {
  return [...Object.keys(content.files), ...content.assets.map((a) => a.path)];
}

/** Lo que pesa lo que se va a escribir (texto en UTF-8 y binarios). */
export function moveBytes(content: SnapshotContent): number {
  const enc = new TextEncoder();
  let n = 0;
  for (const t of Object.values(content.files)) n += enc.encode(t).length;
  for (const a of content.assets) n += a.data.byteLength;
  return n;
}
