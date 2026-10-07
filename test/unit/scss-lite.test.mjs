import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileScssLite } from './.build/units.mjs';

const norm = (s) => s.replace(/\s+/g, ' ').trim();

test('compila una regla simple', () => {
  assert.equal(norm(compileScssLite('.a { color: red; }')), '.a { color: red; }');
});

test('anida selectores', () => {
  const out = norm(compileScssLite('.a { color: red; .b { margin: 0; } }'));
  assert.match(out, /\.a \{ color: red; \}/);
  assert.match(out, /\.a \.b \{ margin: 0; \}/);
});

test('resuelve & en selectores anidados', () => {
  const out = norm(compileScssLite('.a { &:hover { color: blue; } &.on { color: green; } }'));
  assert.match(out, /\.a:hover \{ color: blue; \}/);
  assert.match(out, /\.a\.on \{ color: green; \}/);
});

test('sustituye variables $', () => {
  const out = norm(compileScssLite('$c: #123456;\n.a { color: $c; border: 1px solid $c; }'));
  assert.match(out, /color: #123456/);
  assert.match(out, /border: 1px solid #123456/);
  assert.ok(!out.includes('$c'));
});

test('elimina comentarios de linea //', () => {
  const out = compileScssLite('// hola\n.a { color: red; } // fin');
  assert.ok(!out.includes('hola') && !out.includes('fin'));
});

test('mantiene @media con reglas dentro', () => {
  const out = norm(compileScssLite('.a { color: red; @media (max-width: 600px) { color: blue; } }'));
  assert.match(out, /@media \(max-width: 600px\)/);
  assert.match(out, /color: blue/);
});

test('entrada vacia produce cadena vacia', () => {
  assert.equal(compileScssLite('').trim(), '');
});
