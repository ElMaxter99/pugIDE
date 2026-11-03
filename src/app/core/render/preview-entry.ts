/**
 * Programa que corre DENTRO del iframe del preview (origen opaco, sin acceso al almacenamiento de la app).
 * Hace lo que antes hacía la app tocando el DOM del iframe —paginar para el modo PDF, medir el documento e
 * imprimir— y se comunica con ella por `postMessage`. Se empaqueta con `npm run bundle:runtime` en
 * `src/assets/preview-runtime.js` y la app lo inyecta en el documento del preview.
 *
 * También recibe el documento (`pugide-doc`) y lo escribe en su propia ventana con `document.open/write/close`, de
 * modo que el programa y los assets sobreviven a las compilaciones: la app envía los assets (`pugide-assets`, objetos
 * `Blob` que se transfieren sin copiar ni codificar en base64) solo cuando cambian. El HTML trae las URL `blob:` de
 * la app como marcador y aquí se sustituyen por URL `blob:` propias del iframe (texto plano, así que valen en
 * `src`, `srcset`, `style` inline, `<style>` y `@font-face`).
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


/** URL `blob:` de la app -> URL `blob:` creada dentro de este iframe a partir del mismo Blob. */
const localUrls = new Map<string, string>();
const stats = ((window as unknown as { __pugideStats?: { assetMessages: number; docs: number } }).__pugideStats ??=
  { assetMessages: 0, docs: 0 });
let retired: string[] = [];
let observer: ResizeObserver | null = null;

function setAssets(files: unknown): void {
  stats.assetMessages++;
  const wanted = new Set<string>();
  for (const f of Array.isArray(files) ? files : []) {
    const url = (f as { url?: unknown })?.url;
    const blob = (f as { blob?: unknown })?.blob;
    if (typeof url !== 'string' || !url.startsWith('blob:') || !(blob instanceof Blob)) continue;
    wanted.add(url);
    if (!localUrls.has(url)) localUrls.set(url, URL.createObjectURL(blob));
  }
  // El documento actual aún puede usar los antiguos: se revocan al escribir el siguiente.
  for (const [url, local] of [...localUrls]) {
    if (!wanted.has(url)) { retired.push(local); localUrls.delete(url); }
  }
}

function mapUrls(html: string): string {
  let out = html;
  for (const [from, to] of localUrls) if (out.includes(from)) out = out.split(from).join(to);
  return out;
}

function onMessage(e: MessageEvent): void {
  if (e.source !== window.parent) return;
  const d = e.data as { source?: string; pdf?: boolean; geometry?: PageGeometry; css?: string | null; html?: unknown; files?: unknown } | null;
  if (!d) return;
  if (d.source === 'pugide-layout' && d.geometry) {
    pdf = !!d.pdf;
    geometry = d.geometry;
    reflow();
  } else if (d.source === 'pugide-print') {
    print(typeof d.css === 'string' ? d.css : null);
  } else if (d.source === 'pugide-assets') {
    setAssets(d.files);
  } else if (d.source === 'pugide-doc' && typeof d.html === 'string') {
    writeDocument(d.html);
  }
}

/** Observa el cuerpo del documento actual: imágenes o tipografías que cargan después mueven todo lo de debajo. */
function observeBody(): void {
  if (!document.body) return;
  observer ??= new ResizeObserver(() => {
    if (document.body.scrollHeight !== paginatedHeight) reflow();
    else measure();
  });
  observer.disconnect();
  observer.observe(document.body);
  // Las tipografías web cambian las métricas del texto al cargar.
  void document.fonts?.ready.then(() => reflow());
}

/** Sustituye el documento por `html` sin recargar el iframe (conserva este programa y los assets). */
function writeDocument(html: string): void {
  try {
    stats.docs++;
    const out = mapUrls(html);
    document.open();
    document.write(out);
    document.close();
    // `document.open()` borra los listeners de la ventana.
    window.addEventListener('message', onMessage);
    for (const u of retired) URL.revokeObjectURL(u);
    retired = [];
    paginatedHeight = -1;
    issues = [];
    observeBody();
    post({ source: 'pugide-runtime-ready', hasDoc: true });
  } catch {
    // La app vuelve a cargar el iframe entero con los assets incrustados.
    post({ source: 'pugide-doc-error' });
  }
}

window.addEventListener('message', onMessage);
observeBody();
post({ source: 'pugide-runtime-ready', hasDoc: false });
