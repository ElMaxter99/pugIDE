import { TRANSLATIONS_KEY } from './i18n.util';

/** Gmail recorta los correos cuyo HTML pasa de ~102 KB. */
export const HTML_EMAIL_CLIP_BYTES = 102 * 1024;
/** A partir de aquí el HTML renderizado se considera pesado. */
export const HTML_HEAVY_BYTES = 500 * 1024;

export interface QualityHint {
  /** Identificador estable: sirve para no repetir el mismo aviso en cada recompilación. */
  key: string;
  severity: 'info' | 'warning';
  message: string;
}

export function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
}

/**
 * Claves de primer nivel de los datos que ninguna variable de la plantilla lee
 * (se ignoran las traducciones, que se leen con `t('CLAVE')`).
 */
export function unusedDataKeys(data: Record<string, unknown>, variableRoots: Iterable<string>): string[] {
  const used = new Set(variableRoots);
  return Object.keys(data).filter((k) => k !== TRANSLATIONS_KEY && !used.has(k));
}

/** Avisos sobre el HTML renderizado: tamaño total y recursos incrustados como `data:`. */
export function htmlWeightHints(html: string, byteLength: number): QualityHint[] {
  const hints: QualityHint[] = [];
  if (byteLength > HTML_HEAVY_BYTES) {
    hints.push({ key: 'html-heavy', severity: 'warning', message: `El HTML renderizado pesa ${formatKb(byteLength)}: puede tardar en cargarse. Revisa imágenes incrustadas y estilos repetidos.` });
  } else if (byteLength > HTML_EMAIL_CLIP_BYTES) {
    hints.push({ key: 'html-clip', severity: 'info', message: `El HTML renderizado pesa ${formatKb(byteLength)}: Gmail recorta los correos de más de 102 KB.` });
  }
  let embedded = 0;
  for (const m of html.matchAll(/data:[a-z]+\/[\w.+-]+;base64,[A-Za-z0-9+/=]+/g)) embedded += m[0].length;
  if (embedded > 100 * 1024) {
    hints.push({ key: 'html-embedded', severity: 'info', message: `Hay ${formatKb(embedded)} de recursos incrustados como data: URI en el HTML.` });
  }
  return hints;
}

/** Compara con los avisos de la compilación anterior y devuelve solo los nuevos. */
export function newHints(hints: QualityHint[], previousKeys: ReadonlySet<string>): QualityHint[] {
  return hints.filter((h) => !previousKeys.has(h.key));
}
