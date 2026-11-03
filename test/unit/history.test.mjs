import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addVersion, diffLines, summarizeDiff, foldContext, formatAgo, MAX_VERSIONS, AUTO_GAP_MS, MAX_VERSION_CHARS } from './.build/units.mjs';

const v = (content, at, reason = 'guardado') => ({ at, content, reason });

test('addVersion: la más reciente primero, sin duplicar el último contenido', () => {
  let list = addVersion([], v('a', 1));
  assert.deepEqual(list.map((x) => x.content), ['a']);
  assert.equal(addVersion(list, v('a', 2)), null);
  list = addVersion(list, v('b', 3));
  assert.deepEqual(list.map((x) => x.content), ['b', 'a']);
  // volver a un contenido anterior sí es una versión nueva
  assert.deepEqual(addVersion(list, v('a', 4)).map((x) => x.content), ['a', 'b', 'a']);
});

test('addVersion: las automáticas respetan el intervalo, las manuales no', () => {
  const list = [v('a', 1000)];
  assert.equal(addVersion(list, v('b', 1000 + AUTO_GAP_MS - 1, 'automático'), { auto: true }), null);
  assert.ok(addVersion(list, v('b', 1000 + AUTO_GAP_MS, 'automático'), { auto: true }));
  assert.ok(addVersion(list, v('b', 1001, 'guardado')));
});

test('addVersion: tope de versiones y de tamaño', () => {
  let list = [];
  for (let i = 0; i < MAX_VERSIONS + 5; i++) list = addVersion(list, v(`c${i}`, i));
  assert.equal(list.length, MAX_VERSIONS);
  assert.equal(list[0].content, `c${MAX_VERSIONS + 4}`);
  assert.equal(addVersion([], v('x'.repeat(MAX_VERSION_CHARS + 1), 1)), null);
});

test('diffLines marca líneas añadidas, quitadas y sin cambios', () => {
  const ops = diffLines('a\nb\nc\nd', 'a\nB\nc\nd\ne');
  assert.deepEqual(ops.map((o) => o.type[0] + ':' + o.text), ['s:a', 'd:b', 'a:B', 's:c', 's:d', 'a:e']);
  assert.deepEqual(summarizeDiff(ops), { added: 2, removed: 1 });
  assert.deepEqual(summarizeDiff(diffLines('x\ny', 'x\ny')), { added: 0, removed: 0 });
});

test('diffLines: inserciones en medio y archivos grandes', () => {
  const ops = diffLines('1\n2\n3', '1\nnuevo\n2\n3');
  assert.deepEqual(ops.map((o) => o.type[0]), ['s', 'a', 's', 's']);
  const big = Array.from({ length: 3000 }, (_, i) => `l${i}`);
  const other = big.map((l, i) => (i % 2 ? l : l + 'x'));
  const r = summarizeDiff(diffLines(big.join('\n'), other.join('\n')));
  assert.ok(r.added > 0 && r.removed > 0);
});

test('foldContext pliega los tramos largos sin cambios', () => {
  const lines = Array.from({ length: 20 }, (_, i) => `l${i}`);
  const changed = lines.slice();
  changed[10] = 'CAMBIO';
  const folded = foldContext(diffLines(lines.join('\n'), changed.join('\n')), 2);
  assert.deepEqual(folded.map((o) => o.type === 'skip' ? `skip${o.count}` : o.type[0] + ':' + o.text),
    ['skip8', 's:l8', 's:l9', 'd:l10', 'a:CAMBIO', 's:l11', 's:l12', 'skip7']);
  assert.deepEqual(foldContext([], 2), []);
});

test('formatAgo', () => {
  const now = Date.UTC(2026, 10, 3, 12);
  assert.equal(formatAgo(now - 10_000, now), 'hace unos segundos');
  assert.equal(formatAgo(now - 5 * 60_000, now), 'hace 5 min');
  assert.equal(formatAgo(now - 3 * 3_600_000, now), 'hace 3 h');
  assert.equal(formatAgo(now - 2 * 86_400_000, now), 'hace 2 d');
});
