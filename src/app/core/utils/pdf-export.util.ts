/**
 * «Exportar → PDF…» con el motor nativo (P-39, solo escritorio). Utilidades puras: qué se pide al proceso principal
 * y qué se avisa antes de generar. El PDF lo genera `desktop/src/pdf-export.cjs` con `printToPDF`.
 */
import type { PageMargins } from './page-rules.util';
import type { PageSize } from './page-size.util';

export type PdfPaper = 'doc' | 'a4' | 'a5' | 'letter';
export type PdfOrientation = 'portrait' | 'landscape';

/** Lo que la persona elige en el diálogo (y se recuerda para la próxima vez, salvo la plantilla). */
export interface PdfChoices {
  paper: PdfPaper;
  margins: 'doc' | 'none';
  backgrounds: boolean;
  pageNumbers: boolean;
  openAfter: boolean;
}

export const DEFAULT_PDF_CHOICES: PdfChoices = { paper: 'doc', margins: 'doc', backgrounds: true, pageNumbers: false, openAfter: true };

/** Opciones guardadas o escritas a mano: lo que no sea válido vuelve a su valor de partida. */
export function sanitizePdfChoices(raw: unknown): PdfChoices {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const papers: PdfPaper[] = ['doc', 'a4', 'a5', 'letter'];
  return {
    paper: papers.includes(r['paper'] as PdfPaper) ? (r['paper'] as PdfPaper) : DEFAULT_PDF_CHOICES.paper,
    margins: r['margins'] === 'none' ? 'none' : 'doc',
    backgrounds: typeof r['backgrounds'] === 'boolean' ? r['backgrounds'] : DEFAULT_PDF_CHOICES.backgrounds,
    pageNumbers: typeof r['pageNumbers'] === 'boolean' ? r['pageNumbers'] : DEFAULT_PDF_CHOICES.pageNumbers,
    openAfter: typeof r['openAfter'] === 'boolean' ? r['openAfter'] : DEFAULT_PDF_CHOICES.openAfter,
  };
}

export interface PdfRequest {
  html: string;
  entry: string;
  workspaceId?: string;
  paper?: Exclude<PdfPaper, 'doc'>;
  widthPx?: number;
  heightPx?: number;
  orientation: PdfOrientation;
  margins: PageMargins | null;
  backgrounds: boolean;
  pageNumbers: boolean;
  openAfter: boolean;
}

/** La petición al proceso principal. `size` y `docMargins` salen del `@page` del documento. */
export function buildPdfRequest(html: string, entry: string, choices: PdfChoices, orientation: PdfOrientation, size: PageSize, docMargins: PageMargins, workspaceId?: string | null): PdfRequest {
  const req: PdfRequest = {
    html,
    entry,
    orientation,
    margins: choices.margins === 'none' ? null : { ...docMargins },
    backgrounds: choices.backgrounds,
    pageNumbers: choices.pageNumbers,
    openAfter: choices.openAfter,
  };
  if (choices.paper === 'doc') { req.widthPx = size.width; req.heightPx = size.height; } else req.paper = choices.paper;
  if (workspaceId) req.workspaceId = workspaceId;
  return req;
}

/** Imágenes del HTML exportado que no se podrán ver en el PDF (rutas locales que no se incrustaron). */
export function missingImages(html: string): number {
  let n = 0;
  for (const m of html.matchAll(/<img\b[^>]*?\bsrc\s*=\s*(["'])(.*?)\1/gi)) {
    const src = m[2].trim();
    if (src && !/^(data:|https?:|blob:)/i.test(src)) n++;
  }
  return n;
}

/** «Márgenes» del diálogo: dice cuánto mide el del documento. */
export function describeDocMargins(m: PageMargins): string {
  const mm = (px: number) => Math.round((px * 25.4) / 96);
  const values = [m.top, m.right, m.bottom, m.left].map(mm);
  if (values.every((v) => v === 0)) return 'Los del documento (sin márgenes)';
  return values.every((v) => v === values[0]) ? `Los del documento (@page: ${values[0]} mm)` : `Los del documento (@page: ${values.join(' / ')} mm)`;
}
