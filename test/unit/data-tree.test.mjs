import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenTree, getValueType, parseDataJson, stringifyData, insertIndent } from './.build/units.mjs';

const kinds = (rows) => rows.map((r) => `${r.kind}:${r.path || '·'}@${r.depth}`);

test('getValueType', () => {
  assert.deepEqual([null, true, 3, 'x', undefined].map(getValueType), ['null', 'boolean', 'number', 'string', 'string']);
});

test('flattenTree: hojas, objetos plegados y abiertos', () => {
  const data = { title: 'Hola', user: { name: 'Ana', age: 3 } };
  assert.deepEqual(kinds(flattenTree(data, new Set())), ['leaf:title@0', 'object-open:user@0']);
  assert.deepEqual(kinds(flattenTree(data, new Set(['user']))), ['leaf:title@0', 'object-open:user@0', 'leaf:user.name@1', 'leaf:user.age@1', 'object-close:user@0']);
  const leaf = flattenTree(data, new Set(['user']))[2];
  assert.deepEqual([leaf.value, leaf.valueType], ['Ana', 'string']);
});

test('flattenTree: arrays de primitivos en una fila y arrays de objetos expandibles', () => {
  const data = { tags: ['a', null, 3], items: [{ id: 1 }, { id: 2 }] };
  const rows = flattenTree(data, new Set());
  assert.deepEqual(rows[0].inlineItems, ['a', 'null', '3']);
  assert.equal(rows[1].kind, 'array-open');
  assert.equal(rows[1].itemCount, 2);
  const open = flattenTree(data, new Set(['items', 'items.1']));
  assert.deepEqual(kinds(open).slice(1), [
    'array-open:items@0', 'object-open:items.0@1', 'object-open:items.1@1', 'leaf:items.1.id@2', 'object-close:items.1@1', 'array-close:items@0',
  ]);
});

test('flattenTree: entradas que no son objetos no dan filas', () => {
  for (const v of [null, undefined, 3, 'x']) assert.deepEqual(flattenTree(v, new Set()), []);
});

test('parseDataJson exige un objeto en la raíz', () => {
  assert.deepEqual(parseDataJson('{"a":1}'), { ok: true, value: { a: 1 } });
  assert.equal(parseDataJson('[1]').rootNotObject, true);
  assert.equal(parseDataJson('3').ok, false);
  const bad = parseDataJson('{');
  assert.ok(!bad.ok && bad.error && !bad.rootNotObject);
});

test('stringifyData e insertIndent', () => {
  assert.equal(stringifyData({ a: [1] }), '{\n  "a": [\n    1\n  ]\n}');
  assert.deepEqual(insertIndent('abcd', 1, 3), { value: 'a  d', cursor: 3 });
  assert.deepEqual(insertIndent('', 0, 0), { value: '  ', cursor: 2 });
});
