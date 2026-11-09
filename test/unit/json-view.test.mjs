import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildViewTree, flattenView, pendingCount, pathOf, jsonLines, parseJsonText, findKeyUsage, containerIds, idOf, nodeJson, isPending } from './.build/units.mjs';

const doc = { HOME: { TITLE: 'Hola', INTRO: 'Bienvenido a tu informe', CTA: '' }, ITEMS: ['Informe', 'Factura', ''], LIMIT: 50, ACTIVE: true, NOTES: null };
const tree = buildViewTree(doc);
const keys = (rows) => rows.map((r) => pathOf(r.node));

test('el árbol se aplana con sus recuentos y profundidades', () => {
  const { rows } = flattenView(tree, new Set());
  assert.deepEqual(keys(rows), ['HOME', 'HOME.TITLE', 'HOME.INTRO', 'HOME.CTA', 'ITEMS', 'ITEMS.0', 'ITEMS.1', 'ITEMS.2', 'LIMIT', 'ACTIVE', 'NOTES']);
  assert.equal(rows[0].count, 3);
  assert.equal(rows[4].count, 3);
  assert.equal(rows[1].depth, 1);
  assert.deepEqual(rows.slice(8).map((r) => r.node.kind), ['number', 'boolean', 'null']);
});

test('plegar un objeto oculta sus hijos', () => {
  const { rows } = flattenView(tree, new Set([idOf(['HOME'])]));
  assert.deepEqual(keys(rows), ['HOME', 'ITEMS', 'ITEMS.0', 'ITEMS.1', 'ITEMS.2', 'LIMIT', 'ACTIVE', 'NOTES']);
  assert.equal(rows[0].expanded, false);
});

test('el filtro deja las coincidencias con sus padres y las cuenta', () => {
  const { rows, matches } = flattenView(tree, new Set(), { filter: 'inf' });
  assert.deepEqual(keys(rows), ['HOME', 'HOME.INTRO', 'ITEMS', 'ITEMS.0']);
  assert.equal(matches, 2);
  assert.equal(rows[1].matchValue, true);
  const byKey = flattenView(tree, new Set(), { filter: 'tit' });
  assert.deepEqual(keys(byKey.rows), ['HOME', 'HOME.TITLE']);
  assert.equal(byKey.rows[1].matchKey, true);
});

test('si coincide el nombre de un objeto se enseña entero, y el filtro ignora los plegados', () => {
  const { rows } = flattenView(tree, new Set([idOf(['HOME'])]), { filter: 'home' });
  assert.deepEqual(keys(rows), ['HOME', 'HOME.TITLE', 'HOME.INTRO', 'HOME.CTA']);
});

test('«solo sin traducir» enseña los textos vacíos con sus padres', () => {
  assert.equal(pendingCount(tree), 2);
  const { rows, matches } = flattenView(tree, new Set(), { onlyPending: true });
  assert.deepEqual(keys(rows), ['HOME', 'HOME.CTA', 'ITEMS', 'ITEMS.2']);
  assert.equal(matches, 2);
});

test('las claves que faltan respecto a otro idioma salen como «falta»', () => {
  const en = { HOME: { TITLE: 'Hello', CTA: 'Go', SIGNATURE: 'Bye' }, EXTRA: { A: 'a' } };
  const mine = buildViewTree({ HOME: { TITLE: 'Hola' } }, en);
  const { rows } = flattenView(mine, new Set());
  assert.deepEqual(keys(rows), ['HOME', 'HOME.TITLE', 'HOME.CTA', 'HOME.SIGNATURE', 'EXTRA', 'EXTRA.A']);
  assert.equal(rows[2].node.status, 'missing');
  assert.equal(rows[4].node.status, 'missing');
  assert.equal(pendingCount(mine), 3);
  assert.ok(isPending(rows[2].node));
  assert.deepEqual(nodeJson(mine[0]), JSON.stringify({ TITLE: 'Hola' }, null, 2), 'copiar no incluye lo que falta');
});

test('containerIds y nodeJson', () => {
  assert.deepEqual(containerIds(tree), ['HOME', 'ITEMS']);
  assert.equal(nodeJson(tree[1]), JSON.stringify(['Informe', 'Factura', ''], null, 2));
});

test('jsonLines localiza claves y elementos en el texto', () => {
  const text = '{\n  "HOME": {\n    "TITLE": "Hola",\n    "CTA": ""\n  },\n  "ITEMS": [\n    "a",\n    { "x": 1 },\n    "c"\n  ],\n  "LIMIT": 50\n}\n';
  const m = jsonLines(text);
  assert.equal(m.get(idOf(['HOME'])), 2);
  assert.equal(m.get(idOf(['HOME', 'TITLE'])), 3);
  assert.equal(m.get(idOf(['HOME', 'CTA'])), 4);
  assert.equal(m.get(idOf(['ITEMS'])), 6);
  assert.equal(m.get(idOf(['ITEMS', '0'])), 7);
  assert.equal(m.get(idOf(['ITEMS', '1'])), 8);
  assert.equal(m.get(idOf(['ITEMS', '1', 'x'])), 8);
  assert.equal(m.get(idOf(['ITEMS', '2'])), 9);
  assert.equal(m.get(idOf(['LIMIT'])), 11);
});

test('parseJsonText da el mensaje y la línea del error', () => {
  assert.equal(parseJsonText('{ "a": 1 }').ok, true);
  assert.equal(parseJsonText('').ok, true);
  const bad = parseJsonText('{\n  "a": 1,\n  "b": \n}\n');
  assert.equal(bad.ok, false);
  assert.ok(bad.line >= 3);
});

test('findKeyUsage encuentra la primera plantilla que usa la clave', () => {
  const files = new Map([['/a.json', '"HOME.TITLE"'], ['/main.pug', "h1\n  p= t('HOME.INTRO')\n  h2= t(\"HOME.TITLE\")\n"], ['/otra.pug', "p= t('HOME.TITLE')"]]);
  assert.deepEqual(findKeyUsage(files, 'HOME.TITLE'), { path: '/main.pug', line: 3 });
  assert.equal(findKeyUsage(files, 'NO.EXISTE'), null);
});

import { highlightMatches, jsonViewModeFor, sanitizeJsonView, DEFAULT_JSON_VIEW, isLocaleFile } from './.build/units.mjs';

test('highlightMatches marca cada coincidencia sin distinguir mayúsculas', () => {
  assert.deepEqual(highlightMatches('Subtítulo TIT', 'tit'), [{ text: 'Subtítulo ', match: false }, { text: 'TIT', match: true }]);
  assert.deepEqual(highlightMatches('aXbX', 'x').map((p) => p.match), [false, true, false, true]);
  assert.deepEqual(highlightMatches('hola', ''), [{ text: 'hola', match: false }]);
  assert.deepEqual(highlightMatches('hola', 'zzz'), [{ text: 'hola', match: false }]);
});

test('la vista de un .json: árbol en los de idioma, código en el resto, y se recuerda por tipo', () => {
  assert.equal(jsonViewModeFor('/locales/es-ES/translations.json', DEFAULT_JSON_VIEW), 'tree');
  assert.equal(jsonViewModeFor('/data.json', DEFAULT_JSON_VIEW), 'code');
  assert.equal(jsonViewModeFor('/main.pug', DEFAULT_JSON_VIEW), null);
  assert.equal(jsonViewModeFor('/data.json', { translations: 'code', other: 'tree' }), 'tree');
  assert.ok(isLocaleFile('/locales/en/translations.json') && !isLocaleFile('/translations.json'));
});

test('sanitizeJsonView corrige lo no válido de las preferencias', () => {
  assert.deepEqual(sanitizeJsonView(undefined), DEFAULT_JSON_VIEW);
  assert.deepEqual(sanitizeJsonView({ translations: 'x', other: 'tree' }), { translations: 'tree', other: 'tree' });
  assert.deepEqual(sanitizeJsonView('raro'), DEFAULT_JSON_VIEW);
});
