import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { unzipSync } from 'fflate';
import {
  DEFAULT_PDF_BATCH_CHOICES, dataKeys, datasetPdfName, describeBatch, lookupKey, patternKeys, patternPdfName, sanitizePdfBatchChoices, templatePdfName, uniquePdfNames,
} from './.build/units.mjs';

const require = createRequire(import.meta.url);
const { batchFileName, freePdfName, zipStore } = require('../../desktop/src/pdf-export.cjs');

// ---- Proceso principal (desktop/src/pdf-export.cjs) ----
test('el .zip de un lote se abre con cualquier descompresor y conserva nombres con tildes y contenido', () => {
  const zip = zipStore([
    { name: 'factura - Clínica Aurora.pdf', data: Buffer.from('%PDF-1.7 uno') },
    { name: 'informes-trimestral.pdf', data: Buffer.from('%PDF-1.7 dos, más largo') },
  ], new Date(2026, 10, 17, 10, 42, 8));
  const out = unzipSync(new Uint8Array(zip));
  assert.deepEqual(Object.keys(out), ['factura - Clínica Aurora.pdf', 'informes-trimestral.pdf']);
  assert.equal(Buffer.from(out['informes-trimestral.pdf']).toString(), '%PDF-1.7 dos, más largo');
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.equal(Object.keys(unzipSync(new Uint8Array(zipStore([])))).length, 0);
});

test('el nombre que propone la interfaz se limpia otra vez: sin rutas ni caracteres que el sistema no admite', () => {
  assert.equal(batchFileName('factura - Clínica Aurora.pdf'), 'factura - Clínica Aurora.pdf');
  assert.equal(batchFileName('../../etc/passwd'), 'passwd.pdf');
  assert.equal(batchFileName('C:\\Windows\\system32\\a<b>.pdf'), 'a-b-.pdf');
  assert.equal(batchFileName('  ..  '), 'documento.pdf');
  assert.equal(batchFileName(null), 'documento.pdf');
  assert.ok(batchFileName('x'.repeat(400)).length <= 124);
});

test('un nombre ya cogido pasa a «nombre (2).pdf», sin distinguir mayúsculas', () => {
  const taken = new Set(['factura.pdf', 'factura (2).pdf']);
  assert.equal(freePdfName('recibo.pdf', (n) => taken.has(n)), 'recibo.pdf');
  assert.equal(freePdfName('Factura.pdf', (n) => taken.has(n)), 'Factura (3).pdf');
});

// ---- Interfaz (core/utils/pdf-batch.util.ts) ----
test('una plantilla en una carpeta lleva la carpeta en el nombre del PDF', () => {
  assert.equal(templatePdfName('/factura.pug'), 'factura.pdf');
  assert.equal(templatePdfName('/informes/trimestral.pug'), 'informes-trimestral.pdf');
  assert.equal(templatePdfName('/a/b/index.jade'), 'a-b-index.pdf');
  assert.equal(templatePdfName('/.pug'), 'documento.pdf');
});

test('un PDF por juego de datos: «plantilla - juego.pdf», sin dos puntos ni barras', () => {
  assert.equal(datasetPdfName('/factura.pug', 'Clínica Aurora'), 'factura - Clínica Aurora.pdf');
  assert.equal(datasetPdfName('/docs/factura.pug', 'Importado: citas'), 'factura - Importado citas.pdf');
  assert.equal(datasetPdfName('/factura.pug', 'GET /facturas/{id}'), 'factura - GET facturas {id}.pdf');
  assert.equal(datasetPdfName('/factura.pug', ' :: '), 'factura - datos.pdf');
});

test('dos PDF no salen con el mismo nombre', () => {
  assert.deepEqual(uniquePdfNames(['a.pdf', 'b.pdf', 'A.pdf', 'a.pdf']), ['a.pdf', 'b.pdf', 'A (2).pdf', 'a (3).pdf']);
});

test('las opciones guardadas que no valen vuelven a su valor de partida', () => {
  assert.deepEqual(sanitizePdfBatchChoices(null), DEFAULT_PDF_BATCH_CHOICES);
  assert.deepEqual(sanitizePdfBatchChoices({ mode: 'datasets', target: 'zip', pageNumbers: true, pattern: 'factura {numero}' }), { mode: 'datasets', target: 'zip', pageNumbers: true, pattern: 'factura {numero}' });
  assert.equal(sanitizePdfBatchChoices({ pattern: 'x'.repeat(400) }).pattern.length, 150);
  assert.equal(sanitizePdfBatchChoices({ pattern: 42 }).pattern, '');
  assert.deepEqual(sanitizePdfBatchChoices({ mode: 'todo', target: 7, pageNumbers: 'sí' }), DEFAULT_PDF_BATCH_CHOICES);
});

test('el Registro resume el lote con las páginas de cada PDF', () => {
  assert.equal(describeBatch([{ name: 'factura.pdf', pages: 12, bytes: 1 }, { name: 'recibo.pdf', pages: 2, bytes: 1 }]), 'factura.pdf (12 págs.), recibo.pdf (2)');
});

// ---- Nombre por patrón (P-45) ----
const aurora = { numero: 'FA-2026-0312', paciente: { nombre: 'Lucía Romero Vidal', nif: '48211905K' }, total: 212.5, pagada: true, lineas: [{ concepto: 'Revisión' }] };

test('una clave con puntos se busca a través de los objetos, no de las listas', () => {
  assert.equal(lookupKey(aurora, 'paciente.nombre'), 'Lucía Romero Vidal');
  assert.equal(lookupKey(aurora, 'paciente.email'), undefined);
  assert.equal(lookupKey(aurora, 'lineas.concepto'), undefined);
  assert.equal(lookupKey(null, 'a'), undefined);
});

test('las claves ofrecidas son las hojas de texto, número o sí/no, sin listas y sin repetir', () => {
  assert.deepEqual(dataKeys([aurora, { numero: 'x', extra: 'y' }]), ['numero', 'paciente.nombre', 'paciente.nif', 'total', 'pagada', 'extra']);
  assert.deepEqual(dataKeys([]), []);
  assert.equal(dataKeys([Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`k${i}`, i]))]).length, 40);
});

test('las claves de un patrón salen sin repetir y sin espacios', () => {
  assert.deepEqual(patternKeys('factura {numero} - { paciente.nombre } ({numero})'), ['numero', 'paciente.nombre']);
  assert.deepEqual(patternKeys('sin claves'), []);
});

test('el nombre por patrón sustituye las claves y limpia lo que un sistema de archivos no admite', () => {
  assert.deepEqual(patternPdfName('factura {numero} - {paciente.nombre}', aurora), { name: 'factura FA-2026-0312 - Lucía Romero Vidal.pdf', missing: [] });
  assert.equal(patternPdfName('{numero}.pdf', aurora).name, 'FA-2026-0312.pdf');
  assert.equal(patternPdfName('{total} € {pagada}', aurora).name, '212.5 € sí.pdf');
  assert.equal(patternPdfName('a/b:{numero}?', { numero: 'x*y' }).name, 'a b x y.pdf');
});

test('si falta una clave (o es una lista, o está vacía) no hay nombre por patrón y se dice cuál', () => {
  assert.deepEqual(patternPdfName('factura {numero} {cliente.email}', aurora), { name: null, missing: ['cliente.email'] });
  assert.deepEqual(patternPdfName('{lineas}', aurora), { name: null, missing: ['lineas'] });
  assert.deepEqual(patternPdfName('{numero}', { numero: '  ' }), { name: null, missing: ['numero'] });
  assert.deepEqual(patternPdfName('{ }', aurora).name, null);
});
