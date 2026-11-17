/**
 * «Exportar → Varios PDF…» (P-42, solo escritorio). Utilidades puras: nombres de los PDF de un lote, opciones que se
 * recuerdan y textos del resumen. Los PDF los genera `desktop/src/main.cjs` (`pdf:batch-*`) con el motor de P-39.
 */
export type PdfBatchMode = 'templates' | 'datasets';
export type PdfBatchTarget = 'folder' | 'zip';

/** Lo que se recuerda entre una vez y otra (la carpeta no: su permiso es de un solo uso y la propone la app). */
export interface PdfBatchChoices {
  mode: PdfBatchMode;
  target: PdfBatchTarget;
  pageNumbers: boolean;
  /** Patrón del nombre de los PDF por juego de datos (P-45): `factura {numero} - {paciente.nombre}`. Vacío = «plantilla - juego». */
  pattern: string;
}

export const DEFAULT_PDF_BATCH_CHOICES: PdfBatchChoices = { mode: 'templates', target: 'folder', pageNumbers: false, pattern: '' };

export function sanitizePdfBatchChoices(raw: unknown): PdfBatchChoices {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    mode: r['mode'] === 'datasets' ? 'datasets' : 'templates',
    target: r['target'] === 'zip' ? 'zip' : 'folder',
    pageNumbers: r['pageNumbers'] === true,
    pattern: typeof r['pattern'] === 'string' ? r['pattern'].slice(0, 150) : '',
  };
}

/** Quita lo que un sistema de archivos no admite en un nombre (y los espacios repetidos). */
function cleanName(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').replace(/^[ .]+|[ .]+$/g, '');
}

const stem = (path: string): string => path.replace(/^\/+/, '').replace(/\.(pug|jade)$/i, '');

/** `/informes/trimestral.pug` → `informes-trimestral.pdf`: la carpeta va en el nombre para que dos `index.pug` no choquen. */
export function templatePdfName(path: string): string {
  return `${cleanName(stem(path).split('/').join('-')) || 'documento'}.pdf`;
}

/** `/factura.pug` con el juego «Clínica Aurora» → `factura - Clínica Aurora.pdf`. */
export function datasetPdfName(path: string, dataset: string): string {
  const base = cleanName(stem(path).split('/').pop() ?? '') || 'documento';
  return `${base} - ${cleanName(dataset) || 'datos'}.pdf`;
}

/** Nombres sin repetir (sin distinguir mayúsculas, como Windows y macOS): el segundo igual pasa a `nombre (2).pdf`. */
export function uniquePdfNames(names: string[]): string[] {
  const taken = new Set<string>();
  return names.map((name) => {
    let candidate = name;
    for (let i = 2; taken.has(candidate.toLowerCase()); i++) candidate = `${name.replace(/\.pdf$/i, '')} (${i}).pdf`;
    taken.add(candidate.toLowerCase());
    return candidate;
  });
}

export interface PdfBatchDone { name: string; pages: number; bytes: number }

export const pdfCount = (n: number): string => `${n} PDF`;
export const pageCount = (n: number): string => (n === 1 ? '1 página' : `${n} páginas`);

/** Línea del Registro al terminar: `factura.pdf (12 págs.), presupuesto.pdf (3)`. */
export function describeBatch(done: PdfBatchDone[]): string {
  return done.map((d, i) => `${d.name} (${d.pages}${i === 0 ? ' págs.' : ''})`).join(', ');
}

// ---- Nombre por patrón (P-45) ----

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const isLeaf = (v: unknown): boolean => ['string', 'number', 'boolean'].includes(typeof v);

/** Valor de `paciente.nombre` dentro de unos datos (solo a través de objetos, no de listas); `undefined` si no está. */
export function lookupKey(data: unknown, key: string): unknown {
  let node: unknown = data;
  for (const seg of key.split('.')) {
    if (!isObj(node) || !(seg in node)) return undefined;
    node = node[seg];
  }
  return node;
}

/** Claves ofrecidas para el patrón: hojas de texto, número o sí/no (hasta 3 niveles de objetos, sin listas), por orden de aparición. */
export function dataKeys(sets: unknown[], max = 40): string[] {
  const out: string[] = [];
  const walk = (node: unknown, prefix: string, depth: number): void => {
    if (!isObj(node) || depth > 3) return;
    for (const [k, v] of Object.entries(node)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (isLeaf(v)) { if (!out.includes(key) && out.length < max) out.push(key); } else walk(v, key, depth + 1);
    }
  };
  for (const d of sets) walk(d, '', 1);
  return out;
}

/** Claves `{…}` que usa un patrón, sin repetir. */
export function patternKeys(pattern: string): string[] {
  return [...new Set([...pattern.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1].trim()).filter(Boolean))];
}

const asText = (v: unknown): string => (typeof v === 'boolean' ? (v ? 'sí' : 'no') : String(v));

/**
 * Nombre del PDF de un juego de datos con el patrón. Si una clave no existe en esos datos (o su valor no es un texto,
 * número o sí/no, o queda vacío), no hay nombre por patrón: `name` es null y `missing` dice qué faltó.
 */
export function patternPdfName(pattern: string, data: unknown): { name: string | null; missing: string[] } {
  const missing: string[] = [];
  const text = pattern.replace(/\{([^{}]+)\}/g, (_m, raw: string) => {
    const key = raw.trim();
    const v = lookupKey(data, key);
    if (!isLeaf(v) || asText(v).trim() === '') { if (!missing.includes(key)) missing.push(key); return ''; }
    return asText(v);
  });
  const name = cleanName(text.replace(/\.pdf$/i, ''));
  return missing.length || !name ? { name: null, missing } : { name: `${name}.pdf`, missing };
}
