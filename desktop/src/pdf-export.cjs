'use strict';
// «Exportar → PDF…» (P-39): el PDF se genera con el Chromium de la app (printToPDF), sin diálogo de imprimir.
// La parte pura (opciones, número de páginas, nombre de archivo) se prueba sin Electron en test/unit.

const PX_PER_INCH = 96;
const MAX_HTML = 60 * 1024 * 1024; // como el tope de un proyecto con sus imágenes en data URI
const PAPERS = { a4: { w: 8.27, h: 11.69 }, a5: { w: 5.83, h: 8.27 }, letter: { w: 8.5, h: 11 }, legal: { w: 8.5, h: 14 } };
const FOOTER = '<div style="width:100%;font-family:sans-serif;font-size:9px;color:#555;text-align:center"><span class="pageNumber"></span> de <span class="totalPages"></span></div>';

const num = (v, min, max, fallback) => (Number.isFinite(v) && v >= min && v <= max ? v : fallback);

/**
 * Opciones de `webContents.printToPDF` a partir de lo que pide la interfaz.
 * - `size`: `{ widthPx, heightPx }` (el del documento, ya detectado) o un papel (`a4`, `a5`, `letter`, `legal`).
 * - `margins`: `{ top, right, bottom, left }` en px (los del documento), o `none`.
 * El `@page { size }` del documento manda siempre (`preferCSSPageSize`).
 */
function pdfOptions(req) {
  const r = req && typeof req === 'object' ? req : {};
  const landscape = r.orientation === 'landscape';
  let width;
  let height;
  if (typeof r.paper === 'string' && PAPERS[r.paper]) {
    ({ w: width, h: height } = PAPERS[r.paper]);
  } else {
    width = num(r.widthPx, 50, 20000, 794) / PX_PER_INCH;
    height = num(r.heightPx, 50, 20000, 1123) / PX_PER_INCH;
  }
  // printToPDF quiere el papel en vertical y la orientación aparte.
  if (width > height) [width, height] = [height, width];
  const m = r.margins && typeof r.margins === 'object' ? r.margins : null;
  const inch = (v) => num(v, 0, 2000, 0) / PX_PER_INCH;
  const margins = m ? { top: inch(m.top), right: inch(m.right), bottom: inch(m.bottom), left: inch(m.left) } : { top: 0, right: 0, bottom: 0, left: 0 };
  const footer = r.pageNumbers === true;
  if (footer && margins.bottom < 0.4) margins.bottom = 0.4; // sitio para «3 de 12»
  return {
    landscape,
    pageSize: { width: round(width), height: round(height) },
    margins,
    printBackground: r.backgrounds !== false,
    preferCSSPageSize: true,
    displayHeaderFooter: footer,
    headerTemplate: footer ? '<span></span>' : undefined,
    footerTemplate: footer ? FOOTER : undefined,
    generateTaggedPDF: true,
    generateDocumentOutline: true,
  };
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}

/** Páginas de un PDF (cuenta los objetos `/Type /Page`, no `/Pages`). */
function countPdfPages(buffer) {
  const text = Buffer.isBuffer(buffer) ? buffer.toString('latin1') : String(buffer ?? '');
  const m = text.match(/\/Type\s*\/Page(?![a-z])/g);
  return m ? m.length : 0;
}

/** `factura.pug` → `factura.pdf`; sin caracteres que el sistema no admite en un nombre. */
function pdfFileName(entryPath) {
  const base = String(entryPath ?? '').split('/').filter(Boolean).pop() || 'documento';
  const clean = base.replace(/\.(pug|jade)$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim() || 'documento';
  return `${clean}.pdf`;
}

/** Valida la petición que llega de la interfaz. Devuelve un mensaje de error o null. */
function validateRequest(req) {
  if (!req || typeof req !== 'object') return 'Petición no válida';
  if (typeof req.html !== 'string' || req.html.length === 0) return 'No hay HTML que convertir';
  if (req.html.length > MAX_HTML) return 'El documento es demasiado grande para generar el PDF';
  return null;
}

/**
 * Genera el PDF en una ventana oculta y aislada: sin JavaScript, sin Node y sin red (solo `data:` y el archivo
 * temporal). Devuelve el contenido del PDF.
 */
async function renderPdf(electron, req, { timeoutMs = 60000 } = {}) {
  const { BrowserWindow, session } = electron;
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pugide-pdf-'));
  const file = path.join(dir, 'documento.html');
  fs.writeFileSync(file, req.html, 'utf8');
  const ses = session.fromPartition('pugide-pdf-export');
  ses.webRequest.onBeforeRequest((details, cb) => {
    const ok = details.url.startsWith('data:') || details.url.startsWith('blob:') || details.url === require('node:url').pathToFileURL(file).href;
    cb({ cancel: !ok });
  });
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 1600,
    webPreferences: { session: ses, sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false, webSecurity: true, spellcheck: false },
  });
  try {
    const loaded = win.loadFile(file);
    const timer = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
    await Promise.race([loaded, timer]);
    // Sin JavaScript no se puede esperar a document.fonts: las fuentes van en data URI y se decodifican enseguida.
    await new Promise((r) => setTimeout(r, 300));
    return await Promise.race([win.webContents.printToPDF(pdfOptions(req)), timer]);
  } finally {
    win.destroy();
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temporal */ }
  }
}

module.exports = { pdfOptions, countPdfPages, pdfFileName, validateRequest, renderPdf, PAPERS };
