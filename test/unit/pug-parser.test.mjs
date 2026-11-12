import '@angular/compiler';
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { Injector, createEnvironmentInjector, runInInjectionContext } from '@angular/core';

globalThis.self = globalThis;
vm.runInThisContext(readFileSync(new URL('../../src/assets/parser-browser.js', import.meta.url), 'utf8'));
const { PugParserService, TerminalState } = await import('./.build/units.mjs');

let parser;
before(() => {
  const env = createEnvironmentInjector(
    [TerminalState, PugParserService].map((s) => ({ provide: s, useFactory: () => new s() })),
    Injector.create({ providers: [] }),
  );
  runInInjectionContext(env, () => { parser = env.get(PugParserService); });
});

const paths = (r) => r.variables.map((v) => v.path);

test('detecta variables simples e interpolaciones', async () => {
  const r = await parser.parse('h1= title\np Hola #{user.name}\n');
  assert.deepEqual(r.errors, []);
  assert.ok(paths(r).includes('title'));
  assert.ok(paths(r).includes('user.name'));
});

test('each sobre un array lo tipa como array', async () => {
  const r = await parser.parse('ul\n  each it in items\n    li= it.label\n');
  const items = r.variables.find((v) => v.path === 'items');
  assert.ok(items);
  assert.equal(items.type, 'array');
  assert.ok(!paths(r).includes('it'));
});

test('variables locales (- var) no son datos', async () => {
  const r = await parser.parse('- var x = 5\np= x\n');
  assert.ok(!paths(r).includes('x'));
});

test('extrae mixins con su nombre', async () => {
  const r = await parser.parse('mixin card(u, extra)\n  h2= u.name\n+card(user)\n');
  assert.equal(r.mixins.length, 1);
  assert.equal(r.mixins[0].name, 'card');
});

test('extrae includes y extends (AST sin enlazar)', async () => {
  const r = await parser.parse('extends layout.pug\nblock content\n  include a.pug\n  include b\n');
  assert.equal(r.extendsPath, 'layout.pug');
  assert.ok(r.includes.includes('a.pug'));
  assert.ok(r.includes.includes('b'));
});

test("detecta claves de traduccion t('A.B')", async () => {
  const r = await parser.parse("p= t('HOME.TITLE')\n");
  assert.ok(r.translationKeys.includes('HOME.TITLE'));
});

test('un error de sintaxis se reporta en errors sin lanzar', async () => {
  const r = await parser.parse('div(\n  p\n');
  assert.ok(r.errors.length > 0);
  assert.equal(r.errors[0].severity, 'error');
});

test('parseProject sigue includes del proyecto', async () => {
  const files = new Map([
    ['/index.pug', 'html\n  body\n    include m.pug\n    +hero(t)\n'],
    ['/m.pug', 'mixin hero(x)\n  h1= x.title\n  p= site.tagline\n'],
  ]);
  const r = await parser.parseProject(files, '/index.pug');
  assert.ok(r.variables.map((v) => v.path).includes('site.tagline'));
});

test('parseProject sin entrada devuelve vacio', async () => {
  const r = await parser.parseProject(new Map(), null);
  assert.deepEqual(r, { variables: [], translationKeys: [] });
});

test('los globales estándar de ES y de la Web no se tratan como datos', async () => {
  const src = [
    "p= encodeURIComponent('a b')", "p= decodeURIComponent('a%20b')", "p= btoa('x') + atob('eA==')",
    "p= typeof Intl", "p= new Intl.NumberFormat('es').format(1)", "p= new URL('https://a.b').host",
    "p= new URLSearchParams('a=1').get('a')", "p= typeof BigInt", "p= typeof globalThis", "p= typeof structuredClone",
    "p= new Uint8Array(2).length", "p= typeof WeakRef", "p= typeof AggregateError",
  ].join('\n') + '\n';
  const r = await parser.parse(src);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(paths(r), [], `no deberían salir como datos: ${paths(r).join(', ')}`);
});

test('un dato con un nombre plausible (location, performance, name) sigue siendo un dato', async () => {
  const r = await parser.parse('p= location\np= performance\np= name\n');
  for (const n of ['location', 'performance', 'name']) assert.ok(paths(r).includes(n), `${n} debe seguir detectándose`);
});

test('`locals.a.b` es el dato `a.b` y `locals` no es un dato', async () => {
  const r = await parser.parse("each f in locals.pdfSettings.fonts\n  p= f.family\np= locals.title\n");
  assert.ok(paths(r).includes('pdfSettings.fonts'), paths(r).join(','));
  assert.ok(paths(r).includes('title'));
  assert.ok(!paths(r).some((p) => p === 'locals' || p.startsWith('locals.')), paths(r).join(','));
});

test('una clave calculada con una variable de texto del template se resuelve', async () => {
  const r = await parser.parse("- var textS = 'SINGLE'\np= t(`TEXT_${textS}`)\np= t('PIE_' + textS)\np= t(textS)\n");
  assert.deepEqual(r.errors, []);
  assert.deepEqual([...r.translationKeys].sort(), ['PIE_SINGLE', 'SINGLE', 'TEXT_SINGLE']);
});

test('un ternario de textos genera las dos claves (lo que se usa para singular y plural a mano)', async () => {
  const r = await parser.parse("- var n = items.length\n- var suf = n === 1 ? 'SINGLE' : 'PLURAL'\np= t(`ITEMS_${suf}`, { count: n })\n");
  assert.deepEqual([...r.translationKeys].sort(), ['ITEMS_PLURAL', 'ITEMS_SINGLE']);
});

test('una clave calculada con un dato no se inventa: solo las claves que se pueden saber', async () => {
  const r = await parser.parse("p= t(`TEXT_${kind}`)\np= t(`OTRO_${obj.tipo}`)\np= t('FIJA.CLAVE')\n");
  assert.deepEqual([...r.translationKeys], ['FIJA.CLAVE']);
  const r2 = await parser.parse("- var s = fn()\np= t(`X_${s}`)\n");
  assert.deepEqual([...r2.translationKeys], []);
});

import { literalStrings, resolveKeyArgument } from './.build/units.mjs';
test('literalStrings y resolveKeyArgument', () => {
  assert.deepEqual(literalStrings("'A'"), ['A']);
  assert.deepEqual(literalStrings("n === 1 ? 'A' : 'B'"), ['A', 'B']);
  assert.deepEqual(literalStrings("x ? 'A' : (y ? 'B' : 'C')"), ['A', 'B', 'C']);
  assert.equal(literalStrings('datos.nombre'), null);
  assert.equal(literalStrings("x ? 'A' : y"), null);
  const consts = new Map([['s', ['ONE', 'MANY']]]);
  assert.deepEqual(resolveKeyArgument('`T_${s}_X`', consts), ['T_ONE_X', 'T_MANY_X']);
  assert.deepEqual(resolveKeyArgument("'T_' + s", consts), ['T_ONE', 'T_MANY']);
  assert.deepEqual(resolveKeyArgument('`T_${otra}`', consts), []);
  assert.deepEqual(resolveKeyArgument('', consts), []);
});

test('un índice fijo (productos[1].name) es un elemento del array y pide al menos 2', async () => {
  const r = await parser.parse('p= productos[1].name\np= productos[0].precio\np= pedido[2].total\n');
  const productos = r.variables.find((v) => v.path === 'productos[]');
  assert.ok(productos, paths(r).join(','));
  assert.equal(productos.type, 'array');
  assert.equal(productos.minItems, 2);
  assert.ok(paths(r).includes('productos[].name'));
  assert.ok(paths(r).includes('productos[].precio'));
  assert.equal(r.variables.find((v) => v.path === 'pedido[]')?.minItems, 3);
  assert.ok(!paths(r).includes('productos'), 'no queda como texto suelto');
});

test('un índice dentro de un each se resuelve con su alias', async () => {
  const r = await parser.parse('each p in pedidos\n  p= p.lineas[2].nombre\n');
  assert.equal(r.variables.find((v) => v.path === 'pedidos[].lineas[]')?.minItems, 3);
});
