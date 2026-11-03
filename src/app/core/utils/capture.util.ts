/**
 * Captura de un HTML autocontenido como PNG, sin librerías ni red: el documento se maqueta en un iframe oculto
 * (sin scripts), se serializa dentro de un `<foreignObject>` de un SVG y se dibuja en un canvas. Necesita DOM.
 *
 * Limitaciones: no se ejecuta el JavaScript de la página (se ve el HTML renderizado) y todo recurso debe ir
 * incrustado (`data:`), como en «Exportar HTML».
 */

export interface CaptureOptions {
  /** Ancho CSS del documento (el del dispositivo o el de la hoja). */
  width: number;
  /** Píxeles por píxel CSS (2 = nítido en pantallas retina). */
  scale?: number;
  /** Alto del viewport con el que se maqueta (para `vh`, `min-height: 100vh`…): el del dispositivo o la hoja. */
  viewportHeight?: number;
}

export interface CaptureResult {
  blob: Blob;
  /** Tamaño del PNG en píxeles. */
  width: number;
  height: number;
  /** Alto CSS del documento. */
  cssHeight: number;
  /** True si hubo que bajar la escala para no pasar el límite de tamaño del canvas. */
  scaleReduced: boolean;
}

/** Límites prudentes de un canvas en navegadores de escritorio. */
export const MAX_CANVAS_SIDE = 16384;
export const MAX_CANVAS_PIXELS = 100_000_000;

/** Escala efectiva: la pedida, reducida lo justo para que el canvas quepa. */
export function limitScale(requested: number, width: number, height: number): number {
  const bySide = MAX_CANVAS_SIDE / Math.max(width, height, 1);
  const byArea = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(width * height, 1));
  return Math.max(0.1, Math.min(requested, bySide, byArea));
}

export async function captureHtmlToPng(html: string, opts: CaptureOptions): Promise<CaptureResult> {
  const width = Math.max(1, Math.round(opts.width));
  const frame = document.createElement('iframe');
  // Sin `allow-scripts`: el documento se maqueta pero no se ejecuta.
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;height:${Math.max(1, Math.round(opts.viewportHeight ?? 800))}px;border:0;visibility:hidden;`;
  document.body.appendChild(frame);
  try {
    await new Promise<void>((resolve, reject) => {
      frame.onload = () => resolve();
      frame.onerror = () => reject(new Error('No se pudo maquetar el documento.'));
      frame.srcdoc = html;
    });
    const doc = frame.contentDocument;
    if (!doc?.documentElement) throw new Error('No se pudo leer el documento maquetado.');
    await settle(doc);

    const cssHeight = Math.max(1, Math.ceil(Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0)));
    const requested = opts.scale ?? 2;
    const scale = limitScale(requested, width, cssHeight);
    const background = pageBackground(doc);

    flattenStyles(doc);
    doc.querySelectorAll('script').forEach((s) => s.remove());
    const xhtml = new XMLSerializer().serializeToString(doc.documentElement);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${cssHeight}">` +
      `<foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject></svg>`;

    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('El navegador no pudo dibujar el documento como imagen.'));
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(cssHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear el canvas.');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0, width, cssHeight);

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar el PNG.'))), 'image/png'));
    return { blob, width: canvas.width, height: canvas.height, cssHeight, scaleReduced: scale < requested };
  } finally {
    frame.remove();
  }
}

/** Espera a tipografías e imágenes (con tope) para no capturar a medias. */
async function settle(doc: Document): Promise<void> {
  const images = Array.from(doc.images).filter((img) => !img.complete);
  const loads = images.map((img) => new Promise<void>((r) => { img.onload = img.onerror = () => r(); }));
  const limit = new Promise<void>((r) => setTimeout(r, 4000));
  await Promise.race([Promise.all([doc.fonts?.ready, ...loads]), limit]);
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

/** El fondo que ve el usuario: el de `html`, si no el de `body`, si no blanco. */
function pageBackground(doc: Document): string {
  const view = doc.defaultView;
  for (const el of [doc.documentElement, doc.body]) {
    const bg = el && view ? view.getComputedStyle(el).backgroundColor : '';
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
  }
  return '#ffffff';
}

/**
 * Sustituye las hojas de estilo por una sola con las reglas que se aplican en este ancho: las `@media` y
 * `@supports` ya resueltas por el iframe de medida. Así la imagen no depende de cómo cada navegador evalúa las
 * media queries dentro de un SVG (Firefox las evalúa con otro viewport y la captura salía con el diseño de escritorio).
 */
export function flattenStyles(doc: Document): void {
  const win = doc.defaultView;
  if (!win) return;
  const out: string[] = [];
  const walk = (rules: CSSRuleList): void => {
    for (const rule of Array.from(rules)) {
      if (rule.type === win.CSSRule.MEDIA_RULE) {
        if (win.matchMedia((rule as CSSMediaRule).media.mediaText).matches) walk((rule as CSSMediaRule).cssRules);
      } else if (rule.type === win.CSSRule.SUPPORTS_RULE) {
        if (win.CSS.supports((rule as CSSSupportsRule).conditionText)) walk((rule as CSSSupportsRule).cssRules);
      } else if (rule.type !== win.CSSRule.IMPORT_RULE) {
        out.push(rule.cssText);
      }
    }
  };
  for (const sheet of Array.from(doc.styleSheets)) {
    try { walk(sheet.cssRules); } catch { /* hoja de otro origen: no se puede leer */ }
  }
  doc.querySelectorAll('style, link[rel~="stylesheet"]').forEach((n) => n.remove());
  const style = doc.createElement('style');
  style.textContent = out.join('\n');
  doc.head.appendChild(style);
}
