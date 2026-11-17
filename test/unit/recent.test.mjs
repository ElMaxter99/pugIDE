import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { MAX_RECENT, sanitizeRecent, addRecent, removeRecent, recentLabel } = require('../../desktop/src/recent.cjs');

const f = (p, kind = 'file') => ({ path: p, kind });

test('el más reciente va arriba y lo que ya estaba sube en vez de repetirse', () => {
  let list = [];
  list = addRecent(list, f('/trabajo/aurora/factura.pug'), { now: 1, ci: false });
  list = addRecent(list, f('/trabajo/aurora', 'folder'), { now: 2, ci: false });
  list = addRecent(list, f('/trabajo/taller/presupuesto.pug'), { now: 3, ci: false });
  list = addRecent(list, f('/trabajo/aurora/factura.pug'), { now: 4, ci: false });
  assert.deepEqual(list.map((e) => e.path), ['/trabajo/aurora/factura.pug', '/trabajo/taller/presupuesto.pug', '/trabajo/aurora']);
  assert.equal(list[0].at, 4);
});

test('guarda como mucho 10', () => {
  let list = [];
  for (let i = 0; i < 15; i++) list = addRecent(list, f(`/trabajo/doc${i}.pug`), { now: i, ci: false });
  assert.equal(list.length, MAX_RECENT);
  assert.equal(list[0].path, '/trabajo/doc14.pug');
  assert.equal(list.at(-1).path, '/trabajo/doc5.pug');
});

test('en Windows y macOS no se distingue entre mayúsculas; en Linux sí', () => {
  const a = addRecent([f('/Trabajo/Factura.pug')], f('/trabajo/factura.pug'), { now: 1, ci: true });
  assert.equal(a.length, 1);
  const b = addRecent([f('/Trabajo/Factura.pug')], f('/trabajo/factura.pug'), { now: 1, ci: false });
  assert.equal(b.length, 2);
});

test('una ruta relativa, un tipo raro o basura no entran, y no estropean lo que había', () => {
  const base = [f('/trabajo/a.pug')];
  assert.deepEqual(addRecent(base, f('relativa/a.pug'), { ci: false }).map((e) => e.path), ['/trabajo/a.pug']);
  assert.deepEqual(addRecent(base, { path: '/trabajo/b.pug', kind: 'otro' }, { ci: false }).map((e) => e.path), ['/trabajo/a.pug']);
  assert.deepEqual(addRecent(base, null, { ci: false }).map((e) => e.path), ['/trabajo/a.pug']);
  assert.deepEqual(addRecent(null, f('/trabajo/b.pug'), { ci: false }).map((e) => e.path), ['/trabajo/b.pug']);
});

test('lo guardado o escrito a mano se limpia: sin rutas relativas, sin repetidos y con tipo válido', () => {
  const raw = [f('/a/uno.pug'), { path: 'rel.pug', kind: 'file' }, f('/a/uno.pug'), { path: '/a/dos', kind: 'x' }, null, 'texto', { path: '/a/tres', kind: 'folder', at: 'ayer' }];
  assert.deepEqual(sanitizeRecent(raw, false), [{ path: '/a/uno.pug', kind: 'file', at: 0 }, { path: '/a/tres', kind: 'folder', at: 0 }]);
  assert.deepEqual(sanitizeRecent('no es una lista'), []);
  assert.deepEqual(sanitizeRecent(undefined), []);
});

test('quitar un reciente solo quita ese', () => {
  const list = [f('/a/uno.pug'), f('/a/dos.pug')];
  assert.deepEqual(removeRecent(list, '/a/uno.pug', false).map((e) => e.path), ['/a/dos.pug']);
  assert.equal(removeRecent(list, '/a/otro.pug', false).length, 2);
});

test('el texto del menú lleva el nombre y la carpeta, para distinguir dos factura.pug', () => {
  assert.equal(recentLabel(f('/trabajo/aurora/plantillas/factura.pug')), 'factura.pug — /trabajo/aurora/plantillas');
  assert.equal(recentLabel(f('/trabajo/aurora', 'folder')), 'aurora — /trabajo/aurora');
});
