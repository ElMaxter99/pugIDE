import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  listLocales, localePath, isValidLocaleCode, resolveLocale, applyFallback, parseTranslations, blankTranslations, addMissingKeys, serializeTranslations,
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

import { localeCodeFromFileName, normalizeTranslations, countTranslations, diffTranslations, mergeTranslations, looksLikeTranslations } from './.build/units.mjs';

test('el código de idioma sale del nombre del archivo', () => {
  assert.equal(localeCodeFromFileName('es-ES.json'), 'es-ES');
  assert.equal(localeCodeFromFileName('i18n/en.json'), 'en');
  assert.equal(localeCodeFromFileName('translations.json'), null);
  assert.equal(localeCodeFromFileName('messages.json'), null);
  assert.equal(localeCodeFromFileName('datos_raros.json'), null);
});

test('las claves planas se anidan y se cuentan', () => {
  const n = normalizeTranslations({ 'HOME.TITLE': 'Hola', HOME: { INTRO: 'Bien' }, 'A.B.C': 'x', X: 'y' });
  assert.deepEqual(n, { HOME: { TITLE: 'Hola', INTRO: 'Bien' }, A: { B: { C: 'x' } }, X: 'y' });
  assert.equal(countTranslations(n), 4);
});

test('diffTranslations y mergeTranslations no pisan lo que ya está traducido', () => {
  const have = { HOME: { TITLE: 'Hola', INTRO: '' }, X: 'x' };
  const inc = { HOME: { TITLE: 'Otro', INTRO: 'Bien', NEW: 'n' }, Y: 'y' };
  assert.deepEqual(diffTranslations(have, inc), { added: 3, changed: 1 });
  const m = mergeTranslations(have, inc);
  assert.deepEqual(m.value, { HOME: { TITLE: 'Hola', INTRO: 'Bien', NEW: 'n' }, X: 'x', Y: 'y' });
  assert.equal(m.touched, 3);
  assert.deepEqual(have, { HOME: { TITLE: 'Hola', INTRO: '' }, X: 'x' });
});

test('looksLikeTranslations solo acepta JSON de textos con nombre de idioma', () => {
  const txt = '{ "HOME": { "TITLE": "Hola" }, "OK": "Vale" }';
  assert.ok(looksLikeTranslations('es-ES.json', txt));
  assert.ok(looksLikeTranslations('translations.json', txt));
  assert.ok(looksLikeTranslations('es.json', '{"HOME.TITLE":"Hola"}'));
  assert.ok(!looksLikeTranslations('datos.json', txt), 'nombre que no sugiere un idioma');
  assert.ok(!looksLikeTranslations('es.json', '{ "n": 3 }'), 'hojas que no son texto');
  assert.ok(!looksLikeTranslations('es.json', '{ "a": [1] }'));
  assert.ok(!looksLikeTranslations('es.json', 'no es json'));
  assert.ok(!looksLikeTranslations('package.json', '{ "name": "x" }'));
  assert.ok(!looksLikeTranslations('locales/es/translations.json', txt));
  assert.ok(!looksLikeTranslations('en.json', ''));
});

test('resolveLocale: el elegido, si no el de por defecto del proyecto, si no el primero', () => {
  assert.equal(resolveLocale(null, ['en', 'es'], 'es'), 'es');
  assert.equal(resolveLocale('en', ['en', 'es'], 'es'), 'en');
  assert.equal(resolveLocale(null, ['en', 'es'], 'fr'), 'en');
  assert.equal(resolveLocale('fr', ['en', 'es'], 'es'), 'es');
});

test('applyFallback rellena lo que falta o está vacío con el idioma de reserva, sin tocar los originales', () => {
  const active = { HOME: { TITLE: 'Inicio', SUB: '' }, A: '  ' };
  const fallback = { HOME: { TITLE: 'Home', SUB: 'Subtitle' }, A: 'a', B: { C: 'c' }, NONE: '' };
  const r = applyFallback(active, fallback);
  assert.deepEqual(r.value, { HOME: { TITLE: 'Inicio', SUB: 'Subtitle' }, A: 'a', B: { C: 'c' } });
  assert.deepEqual(r.filled, ['A', 'B.C', 'HOME.SUB']);
  assert.deepEqual(r.missing, ['NONE']);
  assert.deepEqual(active, { HOME: { TITLE: 'Inicio', SUB: '' }, A: '  ' });
});

test('applyFallback entiende claves planas con punto', () => {
  const r = applyFallback({ 'HOME.TITLE': '' }, { HOME: { TITLE: 'Home' } });
  assert.deepEqual(r.value, { 'HOME.TITLE': 'Home' });
  assert.deepEqual(r.filled, ['HOME.TITLE']);
});
