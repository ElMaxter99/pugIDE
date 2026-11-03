import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  listLocales, localePath, isValidLocaleCode, resolveLocale, parseTranslations, blankTranslations, addMissingKeys, serializeTranslations,
} from './.build/units.mjs';

test('listLocales encuentra solo /locales/<código>/translations.json, ordenados', () => {
  const files = ['/locales/es-ES/translations.json', '/locales/en/translations.json', '/locales/es-CAT/translations.json',
    '/locales/en/other.json', '/locales/en/sub/translations.json', '/translations.json', '/data.json'];
  assert.deepEqual(listLocales(files), ['en', 'es-CAT', 'es-ES']);
  assert.deepEqual(listLocales([]), []);
  assert.equal(localePath('es-CAT'), '/locales/es-CAT/translations.json');
});

test('isValidLocaleCode', () => {
  for (const ok of ['es', 'en', 'es-ES', 'es-CAT', 'zh-Hans-CN', 'fil']) assert.ok(isValidLocaleCode(ok), ok);
  for (const bad of ['', 'e', 'español', 'es_ES', 'es-', '../x', 'es/ES', 'es ES', 'es-ES-x-y-z']) assert.ok(!isValidLocaleCode(bad), bad);
});

test('resolveLocale cae al primero si el elegido ya no existe', () => {
  assert.equal(resolveLocale('en', ['en', 'es']), 'en');
  assert.equal(resolveLocale('fr', ['en', 'es']), 'en');
  assert.equal(resolveLocale(null, ['es']), 'es');
  assert.equal(resolveLocale('en', []), null);
});

test('parseTranslations: vacío, válido, inválido y no objeto', () => {
  assert.deepEqual(parseTranslations('  \n'), { value: {} });
  assert.deepEqual(parseTranslations('{"A":{"B":"x"}}').value, { A: { B: 'x' } });
  const bad = parseTranslations('{\n  "A": "x",\n  "B": \n}');
  assert.ok(bad.error && /JSON no válido/.test(bad.error.message));
  assert.equal(bad.error.line, 4);
  assert.ok(parseTranslations('[1]').error);
});

test('blankTranslations y addMissingKeys', () => {
  assert.deepEqual(blankTranslations({ A: { B: 'x', C: 'y' }, D: 'z' }), { A: { B: '', C: '' }, D: '' });
  const t = { A: { B: 'hola' } };
  assert.equal(addMissingKeys(t, { A: { B: '', C: '' }, D: '' }), true);
  assert.deepEqual(t, { A: { B: 'hola', C: '' }, D: '' });
  assert.equal(addMissingKeys(t, { A: { B: '' } }), false);
  assert.equal(serializeTranslations({ a: 1 }), '{\n  "a": 1\n}\n');
});

import { tabLabels } from './.build/units.mjs';

test('tabLabels añade la carpeta solo cuando dos pestañas se llaman igual', () => {
  const tabs = [
    { id: 'a', name: 'main.pug', path: '/main.pug' },
    { id: 'b', name: 'translations.json', path: '/locales/es-ES/translations.json' },
    { id: 'c', name: 'translations.json', path: '/locales/es-CAT/translations.json' },
  ];
  const labels = tabLabels(tabs);
  assert.equal(labels.get('a'), 'main.pug');
  assert.equal(labels.get('b'), 'es-ES/translations.json');
  assert.equal(labels.get('c'), 'es-CAT/translations.json');
  assert.equal(tabLabels(tabs.slice(0, 2)).get('b'), 'translations.json');
});
