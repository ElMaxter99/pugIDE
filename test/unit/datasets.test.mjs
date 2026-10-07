import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDatasetsFile, serializeDatasets, uniqueName, newDatasetId } from './.build/units.mjs';

test('uniqueName evita duplicados sin distinguir mayusculas', () => {
  const list = [{ id: 'a', name: 'Lleno', data: {} }, { id: 'b', name: 'lleno (2)', data: {} }];
  assert.equal(uniqueName('Vacío', list), 'Vacío');
  assert.equal(uniqueName('LLENO', list), 'LLENO (3)');
  assert.equal(uniqueName('Lleno', list, 'a'), 'Lleno');
});

test('serializar y parsear datasets.json (ida y vuelta)', () => {
  const file = { version: 1, activeId: 'ds-2', locale: 'en', datasets: [{ id: 'ds-1', name: 'Por defecto', data: { a: 1 } }, { id: 'ds-2', name: 'Error', data: { a: null }, seed: 9, kind: 'error' }] };
  assert.deepEqual(parseDatasetsFile(serializeDatasets(file)), file);
});

test('parseDatasetsFile rechaza basura y normaliza duplicados', () => {
  assert.equal(parseDatasetsFile('no json'), null);
  assert.equal(parseDatasetsFile({ datasets: [] }), null);
  assert.equal(parseDatasetsFile({ datasets: [{ name: 1, data: {} }] }), null);
  const r = parseDatasetsFile({ activeId: 'zzz', datasets: [{ id: 'x', name: 'A', data: {} }, { id: 'x', name: 'A', data: {} }] });
  assert.equal(r.datasets.length, 2);
  assert.notEqual(r.datasets[0].id, r.datasets[1].id);
  assert.notEqual(r.datasets[0].name, r.datasets[1].name);
  assert.equal(r.activeId, 'x');
  assert.equal(r.locale, 'es');
});

test('newDatasetId no repite ids', () => {
  const id = newDatasetId([{ id: 'ds-2' }, { id: 'ds-3' }]);
  assert.ok(id !== 'ds-2' && id !== 'ds-3');
});
