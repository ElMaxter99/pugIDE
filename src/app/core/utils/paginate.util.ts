/**
 * Screen emulation of CSS paged media for the PDF preview. The browser only paginates when
 * printing, so on screen the document is one long page. This pushes elements down with extra
 * top margin so that forced breaks (`break-before` / `page-break-before: always`, and the
 * `*-after` counterparts on the previous sibling) start on a page boundary and `avoid-inside`
 * blocks that would straddle one move to the next page — which is what the print layout does.
 */
const MARK = 'data-pg-orig';

const FORCED = new Set(['page', 'always', 'left', 'right', 'recto', 'verso']);

/** Undoes `paginateDocument`, restoring the original inline margins. */
export function resetPagination(doc: Document): void {
  doc.querySelectorAll<HTMLElement>(`[${MARK}]`).forEach((el) => {
    const orig = el.getAttribute(MARK) ?? '';
    if (orig) el.style.setProperty('margin-top', orig);
    else el.style.removeProperty('margin-top');
    el.removeAttribute(MARK);
  });
}

export function paginateDocument(doc: Document, pageHeight: number): void {
  const win = doc.defaultView;
  const body = doc.body;
  if (!win || !body || pageHeight <= 0) return;
  resetPagination(doc);

  const forcedAfter = new Set<Element>();
  const top = (el: Element) => el.getBoundingClientRect().top + win.scrollY;

  const push = (el: HTMLElement, cs: CSSStyleDeclaration) => {
    const into0 = top(el) % pageHeight;
    if (into0 < 0.5 || pageHeight - into0 < 0.5) return; // already on a boundary
    if (!el.hasAttribute(MARK)) el.setAttribute(MARK, el.style.getPropertyValue('margin-top'));
    let margin = (parseFloat(cs.marginTop) || 0) + (pageHeight - into0);
    // Margin collapsing can make the real shift differ from the requested one: verify and correct.
    for (let i = 0; i < 4; i++) {
      el.style.setProperty('margin-top', `${Math.max(0, margin)}px`, 'important');
      const r = top(el) % pageHeight;
      if (r < 0.5 || pageHeight - r < 0.5) break;
      margin += r < pageHeight / 2 ? -r : pageHeight - r;
    }
  };

  for (const el of Array.from(body.querySelectorAll<HTMLElement>('*'))) {
    const cs = win.getComputedStyle(el);
    if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;
    if (cs.display.startsWith('table') || cs.display === 'inline') continue; // margins don't apply

    if (FORCED.has(cs.breakAfter) || FORCED.has(cs.getPropertyValue('page-break-after'))) {
      const next = el.nextElementSibling;
      if (next) forcedAfter.add(next);
    }

    const forced = FORCED.has(cs.breakBefore) || FORCED.has(cs.getPropertyValue('page-break-before')) || forcedAfter.has(el);
    if (forced) {
      // The very first thing on the document is already at the top of page 1.
      if (top(el) > 0.5) push(el, cs);
      continue;
    }

    if (cs.breakInside === 'avoid' || cs.getPropertyValue('page-break-inside') === 'avoid') {
      const y = top(el);
      const h = el.getBoundingClientRect().height;
      if (h > 0 && h < pageHeight && Math.floor(y / pageHeight) !== Math.floor((y + h - 0.5) / pageHeight)) push(el, cs);
    }
  }
}

/** True si un bloque de alto `height` que empieza en `y` cruza un límite de página (y cabe en una página). */
export function straddlesPage(y: number, height: number, pageHeight: number): boolean {
  if (pageHeight <= 0 || height <= 0 || height >= pageHeight) return false;
  return Math.floor(y / pageHeight) !== Math.floor((y + height - 0.5) / pageHeight);
}

/** True si un encabezado termina pegado al final de una página (quedaría separado de su contenido). */
export function isOrphanHeading(y: number, height: number, pageHeight: number, slack = 40): boolean {
  if (pageHeight <= 0 || height <= 0) return false;
  const bottom = y + height;
  const page = Math.floor((bottom - 0.5) / pageHeight);
  return page === Math.floor(y / pageHeight) && (page + 1) * pageHeight - bottom < slack;
}

export interface PageBreakIssue {
  kind: 'cut' | 'orphan-heading';
  /** Número de página (1 = primera) donde ocurre. */
  page: number;
  element: string;
  text: string;
}

const CUT_TAGS = new Set(['IMG', 'SVG', 'FIGURE', 'PRE', 'BLOCKQUOTE', 'CANVAS', 'VIDEO']);

/**
 * Elementos que en la impresión quedarían mal partidos: imágenes, figuras o bloques que cruzan el
 * salto de página y encabezados al final de una página. Se llama después de `paginateDocument`.
 */
export function findPageBreakIssues(doc: Document, pageHeight: number): PageBreakIssue[] {
  const win = doc.defaultView;
  const body = doc.body;
  if (!win || !body || pageHeight <= 0) return [];
  const issues: PageBreakIssue[] = [];
  for (const el of Array.from(body.querySelectorAll<HTMLElement>('*'))) {
    const tag = el.tagName.toUpperCase();
    const isHeading = /^H[1-6]$/.test(tag);
    if (!isHeading && !CUT_TAGS.has(tag)) continue;
    const cs = win.getComputedStyle(el);
    if (cs.display === 'none' || cs.position === 'fixed' || cs.position === 'absolute') continue;
    const rect = el.getBoundingClientRect();
    const y = rect.top + win.scrollY;
    const text = (el.textContent ?? el.getAttribute('alt') ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (isHeading) {
      if (isOrphanHeading(y, rect.height, pageHeight)) {
        issues.push({ kind: 'orphan-heading', page: Math.floor(y / pageHeight) + 1, element: tag.toLowerCase(), text });
      }
    } else if (straddlesPage(y, rect.height, pageHeight)) {
      issues.push({ kind: 'cut', page: Math.floor(y / pageHeight) + 1, element: tag.toLowerCase(), text });
    }
  }
  return issues;
}
