import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterCommands, normalizeSearch, pushRecent, withRecentsFirst, highlightParts } from './.build/units.mjs';

const cmds = [
  { title: 'Compilar ahora', group: 'Proyecto' },
  { title: 'Alternar tema claro/oscuro', group: 'Ajustes', keywords: 'dark light' },
  { title: 'Preview: modo PDF', group: 'Preview' },
  { title: 'Abrir /components/card.pug', group: 'Archivos' },
  { title: 'Descompilar caché', group: 'Proyecto' },
];

test('normalizeSearch quita acentos y mayúsculas', () => {
  assert.equal(normalizeSearch('Compilación ÁÉ'), 'compilacion ae');
});

test('consulta vacía devuelve todo en el mismo orden', () => {
  assert.deepEqual(filterCommands(cmds, '  ').map((c) => c.title), cmds.map((c) => c.title));
});

test('todas las palabras deben coincidir en título, grupo o palabras clave', () => {
  assert.deepEqual(filterCommands(cmds, 'dark').map((c) => c.title), ['Alternar tema claro/oscuro']);
  assert.deepEqual(filterCommands(cmds, 'archivos card').map((c) => c.title), ['Abrir /components/card.pug']);
  assert.deepEqual(filterCommands(cmds, 'zzz'), []);
});

test('ignora acentos y prioriza el inicio del título', () => {
  assert.deepEqual(filterCommands(cmds, 'compil').map((c) => c.title), ['Compilar ahora', 'Descompilar caché']);
  assert.equal(filterCommands(cmds, 'ahora')[0].title, 'Compilar ahora');
});

test('caracteres especiales de regex no rompen la búsqueda', () => {
  assert.deepEqual(filterCommands(cmds, '(').length, 0);
  assert.deepEqual(filterCommands(cmds, '/components').map((c) => c.title), ['Abrir /components/card.pug']);
});

test('pushRecent pone el último primero, sin repetir y con tope', () => {
  assert.deepEqual(pushRecent(['a', 'b'], 'c'), ['c', 'a', 'b']);
  assert.deepEqual(pushRecent(['a', 'b', 'c'], 'b'), ['b', 'a', 'c']);
  assert.deepEqual(pushRecent(['a', 'b', 'c'], 'd', 3), ['d', 'a', 'b']);
});

test('withRecentsFirst sube los recientes en su orden y descarta los que ya no existen', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const out = withRecentsFirst(list, ['c', 'zzz', 'a']);
  assert.deepEqual(out.list.map((c) => c.id), ['c', 'a', 'b']);
  assert.equal(out.recentCount, 2);
  assert.equal(withRecentsFirst(list, []).recentCount, 0);
});

test('highlightParts resalta sin distinguir acentos ni mayúsculas', () => {
  assert.deepEqual(highlightParts('Guardar proyecto', 'guar'), [{ text: 'Guar', match: true }, { text: 'dar proyecto', match: false }]);
  assert.deepEqual(highlightParts('Instantáneas', 'tanea'), [{ text: 'Instan', match: false }, { text: 'tánea', match: true }, { text: 's', match: false }]);
  assert.deepEqual(highlightParts('Compilar', ''), [{ text: 'Compilar', match: false }]);
  assert.deepEqual(highlightParts('Abrir /a/b.pug', 'a pug'), [
    { text: 'A', match: true }, { text: 'brir /', match: false }, { text: 'a', match: true }, { text: '/b.', match: false }, { text: 'pug', match: true },
  ]);
});
