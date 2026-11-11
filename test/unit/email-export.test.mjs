import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCss, parseDeclarations, specificity, mergeDeclarations, cssWarnings, splitTopLevel, isDynamicSelector, emailKb } from './.build/units.mjs';

test('las declaraciones se parten bien aunque haya ; dentro de url() o comillas', () => {
  const d = parseDeclarations("color: red; background: url('a;b.png') no-repeat; font-family: \"A; B\", Arial !important");
  assert.deepEqual(d.map((x) => x.prop), ['color', 'background', 'font-family']);
  assert.equal(d[1].value, "url('a;b.png') no-repeat");
  assert.equal(d[2].important, true);
  assert.equal(d[2].value, '"A; B", Arial');
});

test('la especificidad ordena ids, clases y elementos', () => {
  assert.ok(specificity('#a') > specificity('.a.b.c'));
  assert.ok(specificity('.a') > specificity('table td p'));
  assert.equal(specificity('td.x'), 101);
  assert.equal(specificity('a[href]'), 101);
  assert.equal(specificity('*'), 0);
});

test('parseCss separa reglas, conserva @media y lo dinámico, y anota las fuentes web', () => {
  const p = parseCss("/* c */ @import 'x'; h1, .t { color: red } a:hover { color: blue } @media (max-width: 600px) { .t { width: 100% } } @font-face { font-family: 'Inter'; src: url(i.woff2) } @page { size: A4 }");
  assert.deepEqual(p.rules.map((r) => r.selector), ['h1', '.t']);
  assert.equal(p.kept.length, 2);
  assert.match(p.kept[0], /a:hover/);
  assert.match(p.kept[1], /@media/);
  assert.deepEqual(p.fontFaces, ['Inter']);
});

test('la cascada: !important gana, luego la especificidad, luego el orden; el style propio gana a lo normal', () => {
  const rules = [
    { specificity: 1, order: 0, declarations: parseDeclarations('color: red; margin: 0 !important') },
    { specificity: 100, order: 1, declarations: parseDeclarations('color: blue; padding: 4px') },
    { specificity: 100, order: 2, declarations: parseDeclarations('padding: 8px') },
  ];
  const style = mergeDeclarations(rules, parseDeclarations('color: green; margin: 10px'));
  assert.match(style, /color: green/);
  assert.match(style, /margin: 0/);
  assert.match(style, /padding: 8px/);
});

test('avisa de flexbox, position y fuentes web', () => {
  const w = cssWarnings(parseCss(".c { display: flex } .p { position: absolute } @font-face { font-family: Inter; src: url(a) }"));
  assert.equal(w.length, 3);
  assert.match(w[0].detail, /«\.c»/);
  assert.equal(cssWarnings(parseCss('p { color: red }')).length, 0);
});

test('utilidades', () => {
  assert.deepEqual(splitTopLevel('a, b:is(c, d), e', ','), ['a', 'b:is(c, d)', 'e']);
  assert.ok(isDynamicSelector('a:hover') && isDynamicSelector('p::before') && !isDynamicSelector('td.first'));
  assert.equal(emailKb(48 * 1024), '48 KB');
});
