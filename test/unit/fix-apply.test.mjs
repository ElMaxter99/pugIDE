import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendMixin, insertInclude, replaceOnLine } from './.build/units.mjs';

test('appendMixin deja una línea en blanco y devuelve la línea de la definición', () => {
  const r = appendMixin('mixin a()\n  p a\n', 'b');
  assert.equal(r.content, 'mixin a()\n  p a\n\nmixin b()\n  //- TODO: contenido de b\n');
  assert.equal(r.content.split('\n')[r.line - 1], 'mixin b()');
  const sinSalto = appendMixin('mixin a()\n  p a', 'b');
  assert.equal(sinSalto.content.split('\n')[sinSalto.line - 1], 'mixin b()');
  const vacio = appendMixin('', 'x');
  assert.equal(vacio.content, 'mixin x()\n  //- TODO: contenido de x\n');
  assert.equal(vacio.line, 1);
});

test('insertInclude va al principio o debajo del doctype', () => {
  assert.equal(insertInclude('html\n  body', './mixins'), 'include ./mixins\nhtml\n  body');
  assert.equal(insertInclude('doctype html\nhtml', './mixins'), 'doctype html\ninclude ./mixins\nhtml');
  assert.equal(insertInclude('', './m'), 'include ./m\n');
});

test('replaceOnLine cambia solo esa línea y solo la primera aparición', () => {
  const src = 'a\n+uno(+uno)\n+uno';
  assert.equal(replaceOnLine(src, 2, '+uno', '+dos'), 'a\n+dos(+uno)\n+uno');
  assert.equal(replaceOnLine(src, 9, '+uno', '+dos'), null);
  assert.equal(replaceOnLine(src, 1, '+uno', '+dos'), null);
  assert.equal(replaceOnLine('x $& y', 1, 'x', '$&'), '$& $& y');
});
