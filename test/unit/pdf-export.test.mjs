import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { pdfOptions, countPdfPages, pdfFileName, validateRequest, isAllowedPdfUrl } = require('../../desktop/src/pdf-export.cjs');

test('la ventana del PDF solo carga su archivo (aunque el sistema reescriba la ruta), data: y blob:; nada de red', () => {
  const n = 'documento-1234.html';
  assert.equal(isAllowedPdfUrl('file:///private/var/folders/x/T/pugide-pdf-a/documento-1234.html', n), true);
  assert.equal(isAllowedPdfUrl('file:///C:/Users/runneradmin/AppData/Local/Temp/pugide-pdf-a/documento-1234.html', n), true);
  assert.equal(isAllowedPdfUrl('data:image/png;base64,AA', n), true);
  assert.equal(isAllowedPdfUrl('https://clinica-aurora.example/logo.png', n), false);
  assert.equal(isAllowedPdfUrl('file:///etc/passwd', n), false);
  assert.equal(isAllowedPdfUrl('file:///tmp/otro-documento-1234.html', n), false);
});

test('el tamaño del documento pasa de px a pulgadas, en vertical y con la orientación aparte', () => {
  const a4h = pdfOptions({ widthPx: 1123, heightPx: 794 });
  assert.deepEqual(a4h.pageSize, { width: 8.271, height: 11.698 });
  assert.equal(a4h.landscape, false);
  assert.equal(pdfOptions({ widthPx: 794, heightPx: 1123, orientation: 'landscape' }).landscape, true);
});

test('un papel con nombre manda sobre el tamaño en px', () => {
  assert.deepEqual(pdfOptions({ paper: 'letter', widthPx: 100, heightPx: 100 }).pageSize, { width: 8.5, height: 11 });
  assert.deepEqual(pdfOptions({ paper: 'a5' }).pageSize, { width: 5.83, height: 8.27 });
  // Un papel desconocido o valores absurdos vuelven a A4.
  assert.deepEqual(pdfOptions({ paper: 'servilleta', widthPx: -3, heightPx: 'x' }).pageSize, { width: 8.271, height: 11.698 });
});

test('márgenes del documento en pulgadas, sin márgenes o con sitio para el número de página', () => {
  const m = pdfOptions({ margins: { top: 68, right: 68, bottom: 68, left: 68 } }).margins;
  assert.ok(Math.abs(m.top - 68 / 96) < 1e-9 && Math.abs(m.left - 68 / 96) < 1e-9);
  assert.deepEqual(pdfOptions({}).margins, { top: 0, right: 0, bottom: 0, left: 0 });
  const withNumbers = pdfOptions({ pageNumbers: true });
  assert.equal(withNumbers.displayHeaderFooter, true);
  assert.ok(withNumbers.margins.bottom >= 0.4);
  assert.match(withNumbers.footerTemplate, /pageNumber.*de.*totalPages/);
  assert.equal(pdfOptions({}).displayHeaderFooter, false);
});

test('fondos por defecto, el @page del documento manda y el PDF lleva estructura (accesible)', () => {
  const o = pdfOptions({});
  assert.equal(o.printBackground, true);
  assert.equal(pdfOptions({ backgrounds: false }).printBackground, false);
  assert.equal(o.preferCSSPageSize, true);
  assert.equal(o.generateTaggedPDF, true);
});

test('cuenta las páginas del PDF (no el nodo /Pages)', () => {
  const fake = Buffer.from('%PDF-1.7\n1 0 obj <</Type /Pages /Count 3>>\n2 0 obj <</Type /Page>>\n3 0 obj <</Type/Page >>\n4 0 obj <</Type /Page /Parent 1 0 R>>', 'latin1');
  assert.equal(countPdfPages(fake), 3);
  assert.equal(countPdfPages(Buffer.from('')), 0);
});

test('nombre del PDF a partir de la plantilla', () => {
  assert.equal(pdfFileName('/plantillas/factura.pug'), 'factura.pdf');
  assert.equal(pdfFileName('/informe:anual?.jade'), 'informe-anual-.pdf');
  assert.equal(pdfFileName(''), 'documento.pdf');
});

test('rechaza peticiones sin HTML o demasiado grandes', () => {
  assert.ok(validateRequest(null));
  assert.ok(validateRequest({ html: '' }));
  assert.ok(validateRequest({ html: 'x'.repeat(60 * 1024 * 1024 + 1) }));
  assert.equal(validateRequest({ html: '<p>Hola</p>' }), null);
});

// ---- Interfaz (core/utils/pdf-export.util.ts) ----
import { buildPdfRequest, missingImages, describeDocMargins, sanitizePdfChoices, DEFAULT_PDF_CHOICES } from './.build/units.mjs';

const A4 = { width: 794, height: 1123, label: 'A4', source: 'css' };
const M18 = { top: 68, right: 68, bottom: 68, left: 68 };

test('la petición usa el tamaño y los márgenes del documento, o un papel con nombre', () => {
  const doc = buildPdfRequest('<p>x</p>', '/factura.pug', DEFAULT_PDF_CHOICES, 'portrait', A4, M18, 'ws-1');
  assert.equal(doc.widthPx, 794);
  assert.equal(doc.heightPx, 1123);
  assert.deepEqual(doc.margins, M18);
  assert.equal(doc.workspaceId, 'ws-1');
  const letter = buildPdfRequest('<p>x</p>', '/f.pug', { ...DEFAULT_PDF_CHOICES, paper: 'letter', margins: 'none' }, 'landscape', A4, M18, null);
  assert.equal(letter.paper, 'letter');
  assert.equal(letter.widthPx, undefined);
  assert.equal(letter.margins, null);
  assert.equal(letter.orientation, 'landscape');
  assert.equal('workspaceId' in letter, false);
});

test('avisa de las imágenes locales que no se verán', () => {
  assert.equal(missingImages('<img src="data:image/png;base64,AA"><img src="https://x.es/a.png"><img src="img/logo.png" alt="Logo"><img alt="x" src=\'fotos/a.jpg\'>'), 2);
  assert.equal(missingImages('<p>sin imágenes</p>'), 0);
});

test('describe los márgenes del documento en mm', () => {
  assert.equal(describeDocMargins(M18), 'Los del documento (@page: 18 mm)');
  assert.equal(describeDocMargins({ top: 0, right: 0, bottom: 0, left: 0 }), 'Los del documento (sin márgenes)');
  assert.equal(describeDocMargins({ top: 38, right: 19, bottom: 38, left: 19 }), 'Los del documento (@page: 10 / 5 / 10 / 5 mm)');
});

test('las opciones guardadas que no valen vuelven a las de partida', () => {
  assert.deepEqual(sanitizePdfChoices(null), DEFAULT_PDF_CHOICES);
  assert.deepEqual(sanitizePdfChoices({ paper: 'servilleta', margins: 'mucho', backgrounds: 'sí', pageNumbers: true }), { ...DEFAULT_PDF_CHOICES, pageNumbers: true });
});
