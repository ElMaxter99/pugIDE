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
}

export const DEFAULT_PDF_BATCH_CHOICES: PdfBatchChoices = { mode: 'templates', target: 'folder', pageNumbers: false };

export function sanitizePdfBatchChoices(raw: unknown): PdfBatchChoices {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    mode: r['mode'] === 'datasets' ? 'datasets' : 'templates',
    target: r['target'] === 'zip' ? 'zip' : 'folder',
    pageNumbers: r['pageNumbers'] === true,
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
