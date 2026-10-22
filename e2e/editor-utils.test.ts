import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectMixins,
  findDefinition,
  formatPug,
  resolveIncludePath,
  searchProject,
} from '../src/app/core/utils/pug-editor.util.ts';

const files = new Map<string, string>([
  ['/main.pug', 'extends layout\nblock content\n  include components/card\n  +card(title)\n'],
  ['/layout.pug', 'html\n  block content\n'],
  ['/components/card.pug', 'mixin card(title, body)\n  .card= title\n'],
  ['/data.json', '{"title":"card"}'],
]);

test('resolveIncludePath adds extension and handles relative paths', () => {
  assert.deepEqual(resolveIncludePath('layout', '/main.pug', files), { path: '/layout.pug', exists: true });
  assert.deepEqual(resolveIncludePath('../layout', '/components/card.pug', files), { path: '/layout.pug', exists: true });
  assert.equal(resolveIncludePath('nope', '/main.pug', files).exists, false);
});

test('collectMixins finds project mixins with args', () => {
  assert.deepEqual(collectMixins(files), [
    { name: 'card', args: 'title, body', path: '/components/card.pug', line: 1 },
  ]);
});

test('findDefinition resolves include, extends and mixin calls', () => {
  const inc = findDefinition(files, '/main.pug', '  include components/card', 14);
  assert.equal(inc?.path, '/components/card.pug');
  assert.equal(findDefinition(files, '/main.pug', 'extends layout', 10)?.path, '/layout.pug');
  const mx = findDefinition(files, '/main.pug', '  +card(title)', 5);
  assert.equal(mx?.path, '/components/card.pug');
  assert.equal(mx?.line, 1);
  assert.equal(findDefinition(files, '/main.pug', '  +card(title)', 12), null);
  assert.equal(findDefinition(files, '/main.pug', 'block content', 3), null);
});

test('searchProject returns file/line/column and honours options', () => {
  const r = searchProject(files, 'card');
  assert.ok(r.some((m) => m.path === '/main.pug' && m.line === 3));
  assert.ok(r.every((m) => m.column >= 1));
  assert.equal(searchProject(files, 'CARD', { caseSensitive: true }).length, 0);
  assert.equal(searchProject(files, 'car', { wholeWord: true }).length, 0);
  assert.ok(searchProject(files, 'mixin\\s+\\w+', { regex: true }).length === 1);
  assert.deepEqual(searchProject(files, '(', { regex: true }), []);
});

test('formatPug normalises indentation, whitespace and blank lines', () => {
  const src = 'div\n    p hi   \n\n\n    ul\n\t\t\tli a\n';
  assert.equal(formatPug(src), 'div\n  p hi\n\n  ul\n    li a\n');
});

test('formatPug keeps relative indentation inside raw blocks', () => {
  const src = 'script.\n    if (a) {\n        b()\n    }\np x\n';
  assert.equal(formatPug(src), 'script.\n  if (a) {\n      b()\n  }\np x\n');
});

test('formatPug is idempotent', () => {
  const once = formatPug('div\n      a\n         b\n   c\n');
  assert.equal(formatPug(once), once);
});

test('formatPug normaliza atributos simples (comillas y espacios)', () => {
  assert.equal(formatPug('a(href = "x",  title="y"  disabled) hola\n'), "a(href='x' title='y' disabled) hola\n");
  assert.equal(formatPug('p(title="it\'s")\n'), "p(title=\"it's\")\n");
  assert.equal(formatPug('.card(data-id=5 class="a")\n'), ".card(data-id=5 class='a')\n");
});

test('formatPug no toca atributos con expresiones, mixins ni condicionales', () => {
  for (const src of [
    'a(href="/x/" + id)\n', 'a(class={ on: x })\n', 'a(href=fn(1))\n', '+card(1, "a")\n', 'if(a && b)\n  p x\n',
    'p(title=`t ${x}`)\n', 'a(href=a ? "b" : "c")\n', 'p Texto (sin cerrar\n  b x\n',
  ]) assert.equal(formatPug(src), src);
});

test('formatPug reparte las etiquetas largas en varias líneas y es idempotente', () => {
  const src = 'div\n  a(href="https://ejemplo.com/una/ruta/bastante/larga" class="boton boton-primario" target="_blank" rel="noopener noreferrer") Ir\n';
  const out = formatPug(src);
  assert.equal(
    out,
    "div\n  a(\n    href='https://ejemplo.com/una/ruta/bastante/larga'\n    class='boton boton-primario'\n    target='_blank'\n    rel='noopener noreferrer'\n  ) Ir\n",
  );
  assert.equal(formatPug(out), out);
});

test('formatPug junta atributos multilínea y conserva los complejos', () => {
  assert.equal(formatPug('a(\n      href="x"\n  title="y"\n) hi\n  b z\n'), "a(href='x' title='y') hi\n  b z\n");
  const complex = 'a(\n  href="/a/" + id\n  title="y"\n) hi\np after\n';
  assert.equal(formatPug(complex), complex);
  assert.equal(formatPug(formatPug(complex)), complex);
});

test('formatPug sigue reconociendo bloques de texto con atributos', () => {
  const src = "script(type='module' src='x').\n    let a = 1\np x\n";
  assert.equal(formatPug(src), "script(type='module' src='x').\n  let a = 1\np x\n");
});

test('formatPug ordena los atributos solo si se pide', () => {
  const src = "a(title='t' data-x='1' href='/x' aria-label='l' class='b' id='i' disabled) hi\n";
  assert.equal(formatPug(src), src);
  assert.equal(
    formatPug(src, '  ', { sortAttributes: true }),
    "a(id='i' class='b' disabled href='/x' title='t' data-x='1' aria-label='l') hi\n",
  );
});

test('ordenar atributos: estable con repetidos, no toca expresiones y es idempotente', () => {
  const opts = { sortAttributes: true };
  assert.equal(formatPug("p(class='b' title='x' class='a' title='y')\n", '  ', opts), "p(class='b' class='a' title='x' title='y')\n");
  assert.equal(formatPug("a(title='z' href=base + '/x')\n", '  ', opts), "a(title='z' href=base + '/x')\n");
  assert.equal(formatPug("input(@click='go' type='text' [value]='v' name='n')\n", '  ', opts), "input(name='n' type='text' @click='go' [value]='v')\n");
  const once = formatPug("a(z='1' b='2' id='i')\n", '  ', opts);
  assert.equal(formatPug(once, '  ', opts), once);
});

test('ordenar atributos también ordena los repartidos en varias líneas', () => {
  const src = 'div\n  a(\n    href="https://ejemplo.com/una/ruta/bastante/larga" title="un titulo largo para el enlace" class="boton boton-primario" id="a1"\n  ) Ir\n';
  assert.equal(
    formatPug(src, '  ', { sortAttributes: true }),
    "div\n  a(\n    id='a1'\n    class='boton boton-primario'\n    href='https://ejemplo.com/una/ruta/bastante/larga'\n    title='un titulo largo para el enlace'\n  ) Ir\n",
  );
});
