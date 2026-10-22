import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unusedDataKeys, htmlWeightHints, newHints, formatKb, HTML_EMAIL_CLIP_BYTES, HTML_HEAVY_BYTES } from './.build/units.mjs';

test('unusedDataKeys ignora traducciones y raíces usadas', () => {
  const data = { user: { name: 'A' }, items: [], old: 1, translations: { A: 'x' } };
  assert.deepEqual(unusedDataKeys(data, ['user', 'items']), ['old']);
  assert.deepEqual(unusedDataKeys({}, []), []);
});

test('htmlWeightHints distingue recorte de Gmail y HTML pesado', () => {
  assert.deepEqual(htmlWeightHints('<p>x</p>', 100), []);
  assert.deepEqual(htmlWeightHints('', HTML_EMAIL_CLIP_BYTES + 1).map((h) => h.key), ['html-clip']);
  const heavy = htmlWeightHints('', HTML_HEAVY_BYTES + 1);
  assert.deepEqual(heavy.map((h) => [h.key, h.severity]), [['html-heavy', 'warning']]);
});

test('htmlWeightHints detecta recursos data: grandes', () => {
  const html = `<img src="data:image/png;base64,${'A'.repeat(120 * 1024)}">`;
  assert.ok(htmlWeightHints(html, 10).some((h) => h.key === 'html-embedded'));
  assert.equal(htmlWeightHints('<img src="data:image/png;base64,AAAA">', 10).length, 0);
});

test('newHints solo devuelve los avisos no vistos y formatKb da unidades', () => {
  const hints = [{ key: 'a', severity: 'info', message: 'A' }, { key: 'b', severity: 'info', message: 'B' }];
  assert.deepEqual(newHints(hints, new Set(['a'])).map((h) => h.key), ['b']);
  assert.equal(formatKb(2048), '2.0 KB');
  assert.equal(formatKb(300 * 1024), '300 KB');
});
