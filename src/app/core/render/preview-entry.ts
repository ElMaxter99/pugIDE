/**
 * Programa que corre DENTRO del iframe del preview (origen opaco, sin acceso al almacenamiento de la app).
 * Hace lo que antes hacía la app tocando el DOM del iframe —paginar para el modo PDF, medir el documento e
 * imprimir— y se comunica con ella por `postMessage`. Se empaqueta con `npm run bundle:runtime` en
 * `src/assets/preview-runtime.js` y la app lo inyecta en el documento del preview.
 */
import {
  PageBreakIssue, PageGeometry, documentContentHeight, findPageBreakIssues, paginateDocument, resetPagination,
} from '../utils/paginate.util';

let pdf = false;
let geometry: PageGeometry | null = null;
let paginatedHeight = -1;
let issues: PageBreakIssue[] = [];

const post = (message: Record<string, unknown>): void => window.parent.postMessage(message, '*');

function measure(): void {
  if (!document.body || !geometry) return;
  post({ source: 'pugide-layout-result', contentHeight: documentContentHeight(document, geometry), issues });
}

/** PDF: emula los saltos de página dentro del documento; en el resto de dispositivos se ve el flujo normal. */
function reflow(): void {
  if (!document.body || !geometry) return;
  resetPagination(document);
  if (pdf) {
    paginateDocument(document, geometry);
    issues = findPageBreakIssues(document, geometry);
  } else {
    issues = [];
  }
  paginatedHeight = document.body.scrollHeight;
  measure();
}

/** Imprime solo este documento. `css` fija la hoja cuando la plantilla no declara `@page { size }`. */
function print(css: string | null): void {
  let injected: HTMLStyleElement | null = null;
  if (css) {
    injected = document.createElement('style');
    injected.textContent = css;
    document.head.appendChild(injected);
  }
  // La emulación de saltos en pantalla añade márgenes que se sumarían a los saltos reales de la impresión.
  resetPagination(document);
  window.addEventListener('afterprint', () => {
    injected?.remove();
    reflow();
  }, { once: true });
  window.focus();
  window.print();
}

window.addEventListener('message', (e: MessageEvent) => {
  if (e.source !== window.parent) return;
  const d = e.data as { source?: string; pdf?: boolean; geometry?: PageGeometry; css?: string | null } | null;
  if (!d) return;
  if (d.source === 'pugide-layout' && d.geometry) {
    pdf = !!d.pdf;
    geometry = d.geometry;
    reflow();
  } else if (d.source === 'pugide-print') {
    print(typeof d.css === 'string' ? d.css : null);
  }
});

if (document.body) {
  // Imágenes o tipografías que terminan de cargar mueven todo lo que hay debajo: se pagina de nuevo si cambió el alto.
  new ResizeObserver(() => {
    if (document.body.scrollHeight !== paginatedHeight) reflow();
    else measure();
  }).observe(document.body);
  // Las tipografías web cambian las métricas del texto al cargar.
  void document.fonts?.ready.then(() => reflow());
}

post({ source: 'pugide-runtime-ready' });
