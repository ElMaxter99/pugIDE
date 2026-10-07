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
