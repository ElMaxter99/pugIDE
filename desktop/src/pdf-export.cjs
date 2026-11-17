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

/** Lo único que puede cargar la ventana del PDF: su propio archivo (por nombre), `data:` y `blob:`. Nada de red. */
function isAllowedPdfUrl(url, fileName) {
  if (typeof url !== 'string') return false;
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  if (!url.startsWith('file:')) return false;
  try { return decodeURIComponent(new URL(url).pathname).endsWith('/' + fileName); } catch { return false; }
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
  // Nombre único: la única página que la ventana puede cargar. Se compara por el nombre, no por la ruta entera, porque
  // el sistema la reescribe (macOS: /var → /private/var; Windows: nombres cortos como RUNNER~1).
  const name = `documento-${require('node:crypto').randomUUID()}.html`;
  const file = path.join(dir, name);
  fs.writeFileSync(file, req.html, 'utf8');
  const ses = session.fromPartition('pugide-pdf-export');
  ses.webRequest.onBeforeRequest((details, cb) => cb({ cancel: !isAllowedPdfUrl(details.url, name) }));
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

/** Nombre de un PDF de un lote (`factura - Clínica Aurora.pdf`): lo propone la interfaz y aquí se limpia otra vez. */
function batchFileName(name) {
  const base = String(name ?? '').split(/[\\/]/).pop() || '';
  const clean = base.replace(/\.pdf$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').replace(/^[ .]+|[ .]+$/g, '').slice(0, 120) || 'documento';
  return `${clean}.pdf`;
}

/** `factura.pdf` → `factura (2).pdf` si ya está cogido (`taken` compara sin distinguir mayúsculas, como Windows y macOS). */
function freePdfName(name, taken) {
  const has = (n) => taken(n.toLowerCase());
  if (!has(name)) return name;
  const stem = name.replace(/\.pdf$/i, '');
  for (let i = 2; i < 10000; i++) {
    const candidate = `${stem} (${i}).pdf`;
    if (!has(candidate)) return candidate;
  }
  return `${stem} (${Date.now()}).pdf`;
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Un `.zip` sin comprimir (los PDF ya van comprimidos por dentro) con `entries`: `[{ name, data: Buffer }]`.
 * Nombres en UTF-8 (bit 11). Sin dependencias: es el formato mínimo, que abren todos los sistemas.
 */
function zipStore(entries, now = new Date()) {
  const time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const date = (((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  const parts = [];
  const central = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(String(e.name), 'utf8');
    const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(20, 6); head.writeUInt16LE(0x0800, 8); head.writeUInt16LE(0, 10);
    head.writeUInt16LE(time, 12); head.writeUInt16LE(date, 14); head.writeUInt32LE(crc, 16);
    head.writeUInt32LE(data.length, 20); head.writeUInt32LE(data.length, 24); head.writeUInt16LE(name.length, 28);
    head.writeUInt32LE(offset, 42);
    parts.push(local, name, data);
    central.push(head, name);
    offset += 30 + name.length + data.length;
  }
  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, dir, end]);
}

module.exports = { pdfOptions, countPdfPages, pdfFileName, validateRequest, isAllowedPdfUrl, renderPdf, PAPERS, batchFileName, freePdfName, zipStore };
