import { isFontPath } from './asset.util';

/** Con más archivos que faltan que esto, la caja «Faltan N archivos» arranca plegada (P-50). */
export const MISSING_FOLD_THRESHOLD = 6;

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i;

/** ¿Empieza desplegada la lista de archivos que faltan? Plegada solo si son más de 6. */
export function missingStartsOpen(count: number): boolean {
  return count <= MISSING_FOLD_THRESHOLD;
}

/** `/fonts/dosis/Dosis-Bold.woff` → carpeta `/fonts/dosis/` y nombre `Dosis-Bold.woff` (el nombre nunca se corta en pantalla). */
export function splitAssetPath(path: string): { dir: string; name: string } {
  const i = path.lastIndexOf('/') + 1;
  return { dir: path.slice(0, i), name: path.slice(i) };
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** «84 fuentes · 2 imágenes»: cuenta fuentes, imágenes y otros; solo los tipos que hay. Vacío si no falta nada. */
export function summarizeMissing(paths: readonly string[]): string {
  let fonts = 0;
  let images = 0;
  let others = 0;
  for (const p of paths) {
    if (isFontPath(p)) fonts++;
    else if (IMAGE_RE.test(p)) images++;
    else others++;
  }
  const parts: string[] = [];
  if (fonts) parts.push(plural(fonts, 'fuente', 'fuentes'));
  if (images) parts.push(plural(images, 'imagen', 'imágenes'));
  if (others) parts.push(plural(others, 'otro', 'otros'));
  return parts.join(' · ');
}
