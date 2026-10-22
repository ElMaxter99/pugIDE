import type { PageMargins } from './page-rules.util';

/**
 * Screen emulation of CSS paged media for the PDF preview. The browser only paginates when
 * printing, so on screen the document is one long page. This pushes elements down with extra
 * top margin so that forced breaks (`break-before` / `page-break-before: always`, and the
 * `*-after` counterparts on the previous sibling) start on a page boundary and `avoid-inside`
 * blocks that would straddle one move to the next page — which is what the print layout does.
 *
 * With `@page { margin }` each sheet has a content area smaller than the sheet: the document gets
 * the margins as padding and everything is laid out so that nothing lands in the margin bands
 * between pages (text blocks are split line by line with a spacer, table rows and atomic
 * elements are moved whole). Orphans/widows are not emulated.
 */
const MARK = 'data-pg-orig';
const SPACER = 'data-pg-spacer';
const HTML_MARK = 'data-pg-html';
const EPS = 0.5;

const FORCED = new Set(['page', 'always', 'left', 'right', 'recto', 'verso']);
const ATOMIC_TAGS = new Set(['IMG', 'SVG', 'FIGURE', 'CANVAS', 'VIDEO', 'PRE', 'BLOCKQUOTE']);

/** Hoja y márgenes, en px CSS. Sin márgenes (todo 0) la paginación se comporta como una hoja corrida. */
export interface PageGeometry {
  pageHeight: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

export function pageGeometry(pageHeight: number, margin?: PageMargins): PageGeometry {
  return {
    pageHeight,
    marginTop: margin?.top ?? 0,
    marginRight: margin?.right ?? 0,
    marginBottom: margin?.bottom ?? 0,
    marginLeft: margin?.left ?? 0,
  };
}

export const hasVerticalMargins = (g: PageGeometry): boolean => g.marginTop + g.marginBottom > 0;
export const contentHeight = (g: PageGeometry): number => g.pageHeight - g.marginTop - g.marginBottom;
/** Índice de la hoja (0 = primera) cuya franja [k·alto, (k+1)·alto) contiene `y`. */
export const pageOf = (g: PageGeometry, y: number): number => Math.max(0, Math.floor(y / g.pageHeight));
/** `y` donde empieza el contenido de la hoja `k`. */
export const pageTop = (g: PageGeometry, k: number): number => k * g.pageHeight + g.marginTop;
/** `y` donde acaba el contenido de la hoja `k` (empieza el margen inferior). */
export const pageBottom = (g: PageGeometry, k: number): number => (k + 1) * g.pageHeight - g.marginBottom;

/**
 * `y` donde debe empezar un elemento que fuerza salto de página, o null si ya está al principio del
 * contenido de una hoja.
 */
export function nextPageStart(g: PageGeometry, y: number): number | null {
  const k = pageOf(g, y);
  if (Math.abs(y - pageTop(g, k)) < EPS) return null;
  const next = y < pageTop(g, k) ? pageTop(g, k) : pageTop(g, k + 1);
  return next - y < EPS ? null : next;
}

/**
 * `y` al que hay que mover un bloque indivisible de alto `height` que empieza en `y` (porque cruza el
 * final del contenido de la hoja o empieza dentro de un margen), o null si no hace falta moverlo.
 * Los bloques más altos que el área de contenido no se pueden evitar y se dejan.
 */
export function pushTarget(g: PageGeometry, y: number, height: number): number | null {
  if (g.pageHeight <= 0 || height <= 0) return null;
  const k = pageOf(g, y);
  if (y < pageTop(g, k) - EPS) return pageTop(g, k);
  if (height < contentHeight(g) && y + height > pageBottom(g, k) + EPS) return pageTop(g, k + 1);
  return null;
}

/** Quita el relleno de la raíz, los espaciadores y los márgenes añadidos por `paginateDocument`. */
export function resetPagination(doc: Document): void {
  doc.querySelectorAll<HTMLElement>(`[${MARK}]`).forEach((el) => {
    const orig = el.getAttribute(MARK) ?? '';
    if (orig) el.style.setProperty('margin-top', orig);
    else el.style.removeProperty('margin-top');
    el.removeAttribute(MARK);
  });
  const parents = new Set<Node>();
  doc.querySelectorAll(`[${SPACER}]`).forEach((sp) => {
    if (sp.parentNode) parents.add(sp.parentNode);
    sp.remove();
  });
  parents.forEach((p) => p.normalize()); // vuelve a unir los nodos de texto partidos
  const root = doc.documentElement;
  if (root.hasAttribute(HTML_MARK)) {
    const orig = JSON.parse(root.getAttribute(HTML_MARK) || '{}') as Record<string, string>;
    for (const prop of ['padding', 'box-sizing']) {
      if (orig[prop]) root.style.setProperty(prop, orig[prop]);
      else root.style.removeProperty(prop);
    }
    root.removeAttribute(HTML_MARK);
  }
}

function applyRootPadding(doc: Document, g: PageGeometry): void {
  const root = doc.documentElement;
  if (g.marginTop + g.marginRight + g.marginBottom + g.marginLeft <= 0) return;
  root.setAttribute(HTML_MARK, JSON.stringify({
    padding: root.style.getPropertyValue('padding'),
    'box-sizing': root.style.getPropertyValue('box-sizing'),
  }));
  root.style.setProperty('box-sizing', 'border-box');
  root.style.setProperty('padding', `${g.marginTop}px ${g.marginRight}px ${g.marginBottom}px ${g.marginLeft}px`, 'important');
}

/** Alto del documento (hasta el final del contenido más el margen inferior de la última hoja). */
export function documentContentHeight(doc: Document, g: PageGeometry): number {
  const body = doc.body;
  const win = doc.defaultView;
  if (!body) return 0;
  if (!win || g.marginTop + g.marginBottom <= 0) return Math.max(body.scrollHeight, body.offsetHeight);
  const bottom = body.getBoundingClientRect().bottom + win.scrollY + (parseFloat(win.getComputedStyle(body).marginBottom) || 0);
  return bottom + g.marginBottom;
}

function isFirstContent(el: Element, body: HTMLElement): boolean {
  for (let n: Element | null = el; n && n !== body; n = n.parentElement) {
    if (n.previousElementSibling) return false;
  }
  return true;
}

/** Bloque con solo contenido en línea (párrafo, ítem, celda de texto…): se puede partir línea a línea. */
function isLeafTextBlock(el: HTMLElement, win: Window, cs: CSSStyleDeclaration): boolean {
  if (!['block', 'list-item', 'flow-root'].includes(cs.display)) return false;
  if (!(el.textContent ?? '').trim()) return false;
  return Array.from(el.children).every((c) => c.tagName === 'BR' || win.getComputedStyle(c).display.startsWith('inline'));
}

interface TextRun {
  node: Text;
  start: number;
}

function collectText(el: HTMLElement): { runs: TextRun[]; total: number } {
  const doc = el.ownerDocument;
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('script,style,[data-pg-spacer]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const runs: TextRun[] = [];
  let total = 0;
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    if (!n.data.length) continue;
    runs.push({ node: n, start: total });
    total += n.data.length;
  }
  return { runs, total };
}

/** Rectángulo (en coordenadas de documento) del primer carácter visible desde `index`. */
function charRect(doc: Document, runs: TextRun[], total: number, index: number): { top: number; bottom: number; idx: number } | null {
  const win = doc.defaultView!;
  const range = doc.createRange();
  for (let i = index; i < total && i < index + 64; i++) {
    let r = runs.length - 1;
    while (r > 0 && runs[r].start > i) r--;
    const { node, start } = runs[r];
    const off = i - start;
    range.setStart(node, off);
    range.setEnd(node, Math.min(off + 1, node.data.length));
    const rect = Array.from(range.getClientRects()).find((x) => x.height > 0);
    if (rect) return { top: rect.top + win.scrollY, bottom: rect.bottom + win.scrollY, idx: i };
  }
  return null;
}

function insertSpacer(doc: Document, runs: TextRun[], index: number, height: number): void {
  let r = runs.length - 1;
  while (r > 0 && runs[r].start > index) r--;
  const { node, start } = runs[r];
  const off = index - start;
  const spacer = doc.createElement('span');
  spacer.setAttribute(SPACER, '');
  spacer.style.cssText = `display:block;height:${height}px;margin:0;padding:0;border:0;`;
  const target = off > 0 ? node.splitText(off) : node;
  target.parentNode?.insertBefore(spacer, target);
}

/**
 * Parte un bloque de texto que cruza el final del contenido de una hoja: el primer renglón que no
 * cabe y todos los siguientes bajan a la hoja siguiente (varias veces si el bloque es muy largo).
 */
function splitTextBlock(doc: Document, el: HTMLElement, g: PageGeometry, push: (el: HTMLElement, y: number) => void): void {
  const win = doc.defaultView!;
  let page = pageOf(g, el.getBoundingClientRect().top + win.scrollY);
  for (let guard = 0; guard < 60; guard++) {
    const limit = pageBottom(g, page) + EPS;
    if (el.getBoundingClientRect().bottom + win.scrollY <= limit) return; // cabe entero: nada que partir
    const { runs, total } = collectText(el);
    if (total === 0) return;
    const last = charRect(doc, runs, total, total - 1);
    const lastVisible = last ?? charRect(doc, runs, total, 0);
    if (!lastVisible || lastVisible.bottom <= limit) return;
    const first = charRect(doc, runs, total, 0);
    if (!first) return;
    if (first.bottom > limit) {
      // Ni el primer renglón cabe: baja el bloque entero.
      push(el, pageTop(g, page + 1));
      page++;
      continue;
    }
    // Búsqueda binaria del primer carácter cuyo renglón se pasa del límite.
    let lo = 0;
    let hi = total - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const rect = charRect(doc, runs, total, mid);
      if (rect && rect.bottom > limit) hi = mid;
      else lo = mid + 1;
    }
    const line = charRect(doc, runs, total, lo);
    if (!line) return;
    const height = pageTop(g, page + 1) - line.top;
    if (height <= 0) return;
    insertSpacer(doc, runs, line.idx, height);
    page++;
  }
}

/** Fila de tabla que cruza el final de la hoja: se baja con una fila vacía delante. */
function pushTableRow(doc: Document, row: HTMLElement, height: number): void {
  const spacer = doc.createElement('tr');
  spacer.setAttribute(SPACER, '');
  const cell = doc.createElement('td');
  cell.colSpan = 1000;
  cell.style.cssText = `height:${height}px;padding:0;border:0;background:none;`;
  spacer.appendChild(cell);
  row.parentNode?.insertBefore(spacer, row);
}

export function paginateDocument(doc: Document, geometry: PageGeometry | number): void {
  const g = typeof geometry === 'number' ? pageGeometry(geometry) : geometry;
  const win = doc.defaultView;
  const body = doc.body;
  if (!win || !body || g.pageHeight <= 0) return;
  resetPagination(doc);
  applyRootPadding(doc, g);
  const gap = hasVerticalMargins(g);

  const forcedAfter = new Set<Element>();
  const top = (el: Element) => el.getBoundingClientRect().top + win.scrollY;

  const pushTo = (el: HTMLElement, target: number) => {
    const cs = win.getComputedStyle(el);
    if (!el.hasAttribute(MARK)) el.setAttribute(MARK, el.style.getPropertyValue('margin-top'));
    let margin = (parseFloat(cs.marginTop) || 0) + (target - top(el));
    // Margin collapsing can make the real shift differ from the requested one: verify and correct.
    for (let i = 0; i < 4; i++) {
      el.style.setProperty('margin-top', `${Math.max(0, margin)}px`, 'important');
      const diff = target - top(el);
      if (Math.abs(diff) < EPS) break;
      margin += diff;
    }
  };

  for (const el of Array.from(body.querySelectorAll<HTMLElement>('*'))) {
    if (el.hasAttribute(SPACER) || el.closest(`[${SPACER}]`)) continue;
    const cs = win.getComputedStyle(el);
    if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;

    if (cs.display === 'table-row') {
      if (gap) {
        const r = el.getBoundingClientRect();
        const target = pushTarget(g, r.top + win.scrollY, r.height);
        if (target !== null) pushTableRow(doc, el, target - (r.top + win.scrollY));
      }
      continue;
    }
    if (cs.display.startsWith('table') || cs.display === 'inline') continue; // margins don't apply

    if (FORCED.has(cs.breakAfter) || FORCED.has(cs.getPropertyValue('page-break-after'))) {
      const next = el.nextElementSibling;
      if (next) forcedAfter.add(next);
    }

    const forced = FORCED.has(cs.breakBefore) || FORCED.has(cs.getPropertyValue('page-break-before')) || forcedAfter.has(el);
    if (forced) {
      // The very first thing on the document is already at the top of page 1.
      if (isFirstContent(el, body)) continue;
      const target = nextPageStart(g, top(el));
      if (target !== null) pushTo(el, target);
      continue;
    }

    const rect = el.getBoundingClientRect();
    const y = rect.top + win.scrollY;
    const avoid = cs.breakInside === 'avoid' || cs.getPropertyValue('page-break-inside') === 'avoid';
    if (avoid || ATOMIC_TAGS.has(el.tagName.toUpperCase())) {
      // Sin márgenes, un bloque indivisible solo se mueve si lo pide `break-inside: avoid`.
      if (avoid || gap) {
        const target = pushTarget(g, y, rect.height);
        if (target !== null) pushTo(el, target);
      }
      continue;
    }
    if (gap && isLeafTextBlock(el, win, cs)) {
      const target = pushTarget(g, y, 0.01); // ¿empieza dentro de un margen?
      if (target !== null) pushTo(el, target);
      splitTextBlock(doc, el, g, pushTo);
    }
  }
}

/** True si un bloque de alto `height` que empieza en `y` cruza un límite de página (y cabe en una página). */
export function straddlesPage(y: number, height: number, pageHeight: number, marginBottom = 0): boolean {
  return pushTarget(pageGeometry(pageHeight, { top: 0, right: 0, bottom: marginBottom, left: 0 }), y, height) !== null;
}

/** True si un encabezado termina pegado al final del contenido de una página (quedaría separado de lo que sigue). */
export function isOrphanHeading(y: number, height: number, pageHeight: number, slack = 40, marginBottom = 0): boolean {
  if (pageHeight <= 0 || height <= 0) return false;
  const bottom = y + height;
  const page = Math.floor((bottom - 0.5) / pageHeight);
  if (page !== Math.floor(y / pageHeight)) return false;
  const left = (page + 1) * pageHeight - marginBottom - bottom;
  return left < slack && left > -EPS;
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
export function findPageBreakIssues(doc: Document, geometry: PageGeometry | number): PageBreakIssue[] {
  const g = typeof geometry === 'number' ? pageGeometry(geometry) : geometry;
  const win = doc.defaultView;
  const body = doc.body;
  if (!win || !body || g.pageHeight <= 0) return [];
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
    const page = pageOf(g, y) + 1;
    if (isHeading) {
      if (isOrphanHeading(y, rect.height, g.pageHeight, 40, g.marginBottom)) issues.push({ kind: 'orphan-heading', page, element: tag.toLowerCase(), text });
    } else if (pushTarget(g, y, rect.height) !== null) {
      issues.push({ kind: 'cut', page, element: tag.toLowerCase(), text });
    }
  }
  return issues;
}
