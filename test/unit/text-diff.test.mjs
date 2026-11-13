import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sideBySideDiff } from './.build/units.mjs';

const cells = (d) => d.rows.map((r) => `${r.left ? r.left.n + ':' + r.left.text : '·'} | ${r.right ? r.right.n + ':' + r.right.text : '·'}${r.change === null ? '' : ' #' + r.change}`);

test('textos iguales: ninguna diferencia', () => {
  const d = sideBySideDiff('a\nb\n', 'a\nb\n');
  assert.deepEqual([d.changes, d.added, d.removed], [0, 0, 0]);
  assert.ok(d.rows.every((r) => r.change === null && r.left.text === r.right.text));
});

test('una línea cambiada y otra añadida: dos cambios, con sus números de línea', () => {
  const d = sideBySideDiff('table\n  td= l.concepto\n  td= l.total\np Pago a 30 días.\nfooter', 'table\n  td= l.concepto + "x"\n  td= l.total\np Pago a 15 días.\np.iban ES12\nfooter');
  assert.deepEqual([d.changes, d.added, d.removed], [2, 3, 2]);
  assert.deepEqual(cells(d), [
    '1:table | 1:table',
    '2:  td= l.concepto | 2:  td= l.concepto + "x" #0',
    '3:  td= l.total | 3:  td= l.total',
    '4:p Pago a 30 días. | 4:p Pago a 15 días. #1',
    '· | 5:p.iban ES12 #1',
    '5:footer | 6:footer',
  ]);
});

test('líneas quitadas: el lado derecho queda vacío', () => {
  const d = sideBySideDiff('a\nb\nc\nd', 'a\nd');
  assert.deepEqual(cells(d), ['1:a | 1:a', '2:b | · #0', '3:c | · #0', '4:d | 2:d']);
  assert.deepEqual([d.changes, d.added, d.removed], [1, 0, 2]);
});

test('un bloque movido no desalinea el resto', () => {
  const d = sideBySideDiff('uno\ndos\ntres\ncuatro', 'cero\nuno\ndos\ntres\ncuatro\ncinco');
  assert.deepEqual([d.changes, d.added, d.removed], [2, 2, 0]);
  assert.equal(d.rows.filter((r) => r.change === null).length, 4);
});

test('CRLF frente a LF no cuenta como diferencia', () => {
  assert.equal(sideBySideDiff('a\r\nb\r\n', 'a\nb\n').changes, 0);
});

test('archivos enormes y muy distintos: no se cuelga, lo enseña como un solo cambio', () => {
  const big = (p) => Array.from({ length: 3000 }, (_, i) => `${p}${i}`).join('\n');
  const t0 = Date.now();
  const d = sideBySideDiff(big('a'), big('b'));
  assert.equal(d.changes, 1);
  assert.equal(d.rows.length, 3000);
  assert.ok(Date.now() - t0 < 2000);
});
