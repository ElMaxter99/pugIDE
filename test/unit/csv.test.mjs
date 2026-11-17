import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CSV_MAX_ROWS, buildCsvDatasets, cleanKeys, convertCell, csvChunks, detectDelimiter, parseCsv } from './.build/units.mjs';

const opts = (o = {}) => ({ delimiter: ';', header: true, asText: false, nameColumn: 0, offset: 0, limit: CSV_MAX_ROWS, ...o });
const aurora = 'numero;paciente.nombre;paciente.nif;total;pagada\nFA-2026-0312;Lucía Romero Vidal;48211905K;85,50;sí\nFA-2026-0313;Andrés Vidal Soto;33907412B;120;no\n';

test('detecta el separador: «;» de Excel en español, coma, tabulador, y coma por defecto', () => {
  assert.equal(detectDelimiter(aurora), ';');
  assert.equal(detectDelimiter('a,b,c\n1,2,3\n'), ',');
  assert.equal(detectDelimiter('a\tb\tc\n1\t2\t3\n'), '\t');
  assert.equal(detectDelimiter('nombre\nLucía\n'), ',');
  assert.equal(detectDelimiter('"a;b",c\n"1;2",3\n'), ',');
  assert.equal(detectDelimiter('﻿a;b\n1;2\n'), ';');
});

test('lee comillas, comillas dobles escapadas, saltos de línea dentro de una celda, CRLF y BOM', () => {
  const rows = parseCsv('﻿nota;total\r\n"Revisión; anual";85\r\n"Dijo ""hola""\ny adiós";12\r\n', ';');
  assert.deepEqual(rows, [['nota', 'total'], ['Revisión; anual', '85'], ['Dijo "hola"\ny adiós', '12']]);
});

test('ignora las filas vacías y acepta un archivo sin salto de línea final', () => {
  assert.deepEqual(parseCsv('a;b\n\n1;2\n;\n3;4', ';'), [['a', 'b'], ['1', '2'], ['3', '4']]);
  assert.deepEqual(parseCsv('', ';'), []);
});

test('reconoce números, sí/no y true/false; 00123 y los números largos se quedan como texto', () => {
  assert.equal(convertCell('85', ';', false), 85);
  assert.equal(convertCell('85,50', ';', false), 85.5);
  assert.equal(convertCell('85.5', ',', false), 85.5);
  assert.equal(convertCell('85,50', ',', false), '85,50');
  assert.equal(convertCell('-3', ';', false), -3);
  assert.equal(convertCell('0,5', ';', false), 0.5);
  assert.equal(convertCell('Sí', ';', false), true);
  assert.equal(convertCell('NO', ';', false), false);
  assert.equal(convertCell('TRUE', ';', false), true);
  assert.equal(convertCell('00123', ';', false), '00123');
  assert.equal(convertCell('1234567890123456789', ';', false), '1234567890123456789');
  assert.equal(convertCell('', ';', false), '');
  assert.equal(convertCell('12,5 €', ';', false), '12,5 €');
  assert.equal(convertCell('85', ';', true), '85');
});

test('una fila = un juego, con las claves con punto como objetos y el nombre de la columna elegida', () => {
  const r = buildCsvDatasets(aurora, opts());
  assert.equal(r.error, null);
  assert.deepEqual(r.keys, ['numero', 'paciente.nombre', 'paciente.nif', 'total', 'pagada']);
  assert.deepEqual(r.types, ['texto', 'texto', 'texto', 'número', 'sí/no']);
  assert.equal(r.total, 2);
  assert.deepEqual(r.datasets[0], { name: 'FA-2026-0312', data: { numero: 'FA-2026-0312', paciente: { nombre: 'Lucía Romero Vidal', nif: '48211905K' }, total: 85.5, pagada: true } });
  assert.equal(r.datasets[1].data.total, 120);
  assert.deepEqual(r.preview[0].slice(0, 2), ['FA-2026-0312', 'Lucía Romero Vidal']);
  assert.deepEqual(r.warnings, []);
});

test('«Todo como texto» no convierte nada y sin cabecera las claves son columna1, columna2…', () => {
  const t = buildCsvDatasets(aurora, opts({ asText: true }));
  assert.equal(t.datasets[0].data.total, '85,50');
  assert.equal(t.datasets[0].data.pagada, 'sí');
  const h = buildCsvDatasets('a;b\n1;2\n', opts({ header: false, nameColumn: -1 }));
  assert.deepEqual(h.keys, ['columna1', 'columna2']);
  assert.equal(h.total, 2);
  assert.deepEqual(h.datasets.map((d) => d.name), ['Fila 1', 'Fila 2']);
});

test('una columna con valores de varios tipos se queda como texto en todas las filas', () => {
  const r = buildCsvDatasets('id;cant\nA;5\nB;muchas\n', opts());
  assert.deepEqual(r.types, ['texto', 'texto']);
  assert.deepEqual(r.datasets.map((d) => d.data.cant), ['5', 'muchas']);
});

test('avisa de las filas con menos o más columnas, con su número de fila en el archivo', () => {
  const r = buildCsvDatasets('a;b;c\n1;2;3\n4;5\n6;7;8;9\n', opts());
  assert.deepEqual(r.datasets.map((d) => d.data), [{ a: 1, b: 2, c: 3 }, { a: 4, b: 5, c: '' }, { a: 6, b: 7, c: 8 }]);
  assert.deepEqual(r.warnings, ['1 fila (3) tiene menos columnas que la cabecera: se rellenan con vacío.', '1 fila (4) tiene más columnas que la cabecera: las sobrantes se ignoran.']);
  const many = buildCsvDatasets(`a;b\n${Array.from({ length: 5 }, (_, i) => `x${i}`).join('\n')}\n`, opts());
  assert.match(many.warnings[0], /^5 filas \(2, 3, 4…\) tienen menos columnas/);
});

test('las claves repetidas pasan a «fecha (2)» y las vacías a columnaN', () => {
  assert.deepEqual(cleanKeys(['fecha', ' importe ', 'fecha', '', 'fecha']), {
    keys: ['fecha', 'importe', 'fecha (2)', 'columna4', 'fecha (3)'],
    warnings: ['La columna fecha está repetida: la segunda pasa a fecha (2).', 'La columna fecha está repetida: la tercera pasa a fecha (3).'],
  });
});

test('una clave que choca con otra se usa tal cual, con aviso', () => {
  const r = buildCsvDatasets('a;a.b\nx;y\n', opts());
  assert.deepEqual(r.datasets[0].data, { a: 'x', 'a.b': 'y' });
  assert.match(r.warnings[0], /choca con otra/);
});

test('un archivo sin datos o con una sola columna mal separada da un error y no juegos', () => {
  assert.equal(buildCsvDatasets('', opts()).error, 'El archivo no tiene filas de datos.');
  assert.equal(buildCsvDatasets('a;b\n', opts()).error, 'El archivo no tiene filas de datos.');
  const one = buildCsvDatasets('a b c\nx y,z\n', opts({ delimiter: ';' }));
  assert.match(one.error, /una sola columna/);
  assert.equal(one.datasets.length, 0);
  assert.equal(buildCsvDatasets('nombre\nLucía\nAndrés\n', opts()).error, null);
});

test('con más filas que el tope se parte en tandas y el nombre numera desde la fila elegida', () => {
  const big = `n\n${Array.from({ length: 812 }, (_, i) => i + 1).join('\n')}\n`;
  const first = buildCsvDatasets(big, opts({ nameColumn: -1 }));
  assert.equal(first.total, 812);
  assert.equal(first.datasets.length, 500);
  const second = buildCsvDatasets(big, opts({ nameColumn: -1, offset: 500 }));
  assert.equal(second.datasets.length, 312);
  assert.equal(second.datasets[0].name, 'Fila 501');
  assert.deepEqual(csvChunks(812), [{ offset: 0, label: 'Las 500 primeras' }, { offset: 500, label: 'Las filas 501 a 812' }]);
  assert.deepEqual(csvChunks(300), [{ offset: 0, label: 'Las 500 primeras' }]);
});

test('el nombre del juego sale de la columna elegida y, si está vacío, de «Fila N»', () => {
  const r = buildCsvDatasets('cliente;total\nLibrería El Faro;10\n;20\n', opts({ nameColumn: 0 }));
  assert.deepEqual(r.datasets.map((d) => d.name), ['Librería El Faro', 'Fila 2']);
});
