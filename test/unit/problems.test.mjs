import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unlocatedProblems, toProblemRows, countProblems, stepRow, snippetLines, formatElapsed } from './.build/units.mjs';

test('unlocatedProblems recoge los errores de compilación sin archivo y línea, sin duplicados', () => {
  const out = unlocatedProblems({
    entryPath: '/main.pug',
    compileErrors: [
      { message: 'La compilación tardó más de 15 s', source: 'pug', severity: 'error' },
      { message: 'La compilación tardó más de 15 s', source: 'pug', severity: 'error' },
      { message: 'otro', source: 'pug', severity: 'error', line: 3 },
    ],
  });
  assert.deepEqual(out.map((o) => o.message), ['La compilación tardó más de 15 s']);
});

test('toProblemRows numera localizados y sin ubicación; countProblems los cuenta', () => {
  const rows = toProblemRows(
    [{ path: '/a.pug', line: 2, message: 'm', severity: 'error', source: 'pug' }, { path: '/a.pug', line: 3, message: 'w', severity: 'warning', source: 'pug' }],
    [{ message: 'u', severity: 'error', source: 'pug' }],
  );
  assert.deepEqual(rows.map((r) => r.id), ['d0', 'd1', 'u0']);
  assert.equal(rows[2].path, undefined);
  assert.deepEqual(countProblems(rows), { errors: 2, warnings: 1, total: 3 });
});

test('stepRow avanza y retrocede dando la vuelta', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(stepRow(rows, null, 1).id, 'a');
  assert.equal(stepRow(rows, null, -1).id, 'c');
  assert.equal(stepRow(rows, 'c', 1).id, 'a');
  assert.equal(stepRow(rows, 'a', -1).id, 'c');
  assert.equal(stepRow(rows, 'zzz', 1).id, 'a');
  assert.equal(stepRow([], null, 1), null);
});

test('snippetLines marca la línea y recorta en los bordes', () => {
  const src = 'uno\ndos\ntres\ncuatro\ncinco\nseis';
  assert.deepEqual(snippetLines(src, 3).map((l) => [l.n, l.marked]), [[1, false], [2, false], [3, true], [4, false], [5, false]]);
  assert.deepEqual(snippetLines(src, 1).map((l) => l.n), [1, 2, 3]);
  assert.deepEqual(snippetLines(src, 6).map((l) => l.n), [4, 5, 6]);
  assert.deepEqual(snippetLines(src, 99), []);
  assert.deepEqual(snippetLines(src, 0), []);
});

test('formatElapsed', () => {
  assert.equal(formatElapsed(12000), 'hace 12 s');
  assert.equal(formatElapsed(125000), 'hace 2 min');
  assert.equal(formatElapsed(7300000), 'hace 2 h');
  assert.equal(formatElapsed(-5), 'hace 0 s');
});
