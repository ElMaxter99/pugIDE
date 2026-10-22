import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterCommands, normalizeSearch } from './.build/units.mjs';

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
