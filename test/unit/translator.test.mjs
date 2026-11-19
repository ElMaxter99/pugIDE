import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTranslator, buildTranslationSkeleton } from './.build/units.mjs';

const tr = (translations, extra = {}) => createTranslator({ translations, ...extra });

test('clave anidada, plana con puntos y clave que falta', () => {
  const t = tr({ HOME: { TITLE: 'Hola' }, 'FLAT.KEY': 'Plana' });
  assert.equal(t('HOME.TITLE'), 'Hola');
  assert.equal(t('FLAT.KEY'), 'Plana');
  assert.equal(t('NO.EXISTE'), 'NO.EXISTE');
});

test('valor por defecto: 2.º argumento, defaultValue y lista de claves de reserva', () => {
  const t = tr({ B: 'Segunda' });
  assert.equal(t('NO', 'Valor por defecto'), 'Valor por defecto');
  assert.equal(t('NO', { defaultValue: 'Otro' }), 'Otro');
  assert.equal(t(['A', 'B']), 'Segunda');
  assert.equal(t('B', 'No se usa'), 'Segunda');
});

test('espacios de nombres: ns:clave y { ns }, un nivel más dentro del idioma', () => {
  const t = tr({ common: { HOME: { TITLE: 'Hola' } }, SOLO: 'Sin espacio' });
  assert.equal(t('common:HOME.TITLE'), 'Hola');
  assert.equal(t('HOME.TITLE', { ns: 'common' }), 'Hola');
  assert.equal(t('common:SOLO'), 'Sin espacio', 'si el espacio no está cargado se busca la clave sola');
});

test('parámetros: {{x}}, {{- x}}, {x}, %{x}; lo que falta se deja', () => {
  const t = tr({ A: 'Hola {{n}}', B: 'Hola {{- n}}', C: 'Hola {n}', D: 'Hola %{n}', E: 'Hola {{n}} {{otro}}' });
  assert.equal(t('A', { n: 'Lucía' }), 'Hola Lucía');
  assert.equal(t('B', { n: '<b>Lucía</b>' }), 'Hola <b>Lucía</b>');
  assert.equal(t('C', { n: 'Lucía' }), 'Hola Lucía');
  assert.equal(t('D', { n: 'Lucía' }), 'Hola Lucía');
  assert.equal(t('E', { n: 'Lucía' }), 'Hola Lucía {{otro}}');
});

test('$t(otra.clave) dentro de un texto', () => {
  const t = tr({ A: 'Hola', B: '$t(A), mundo' });
  assert.equal(t('B'), 'Hola, mundo');
});

test('plurales de i18next: _one/_other, _zero y _plural (v3)', () => {
  const t = tr({ items_one: '{{count}} elemento', items_other: '{{count}} elementos', n_zero: 'ninguno', n_one: 'uno', n_other: 'varios', old: '{{count}} cosa', old_plural: '{{count}} cosas' });
  assert.equal(t('items', { count: 1 }), '1 elemento');
  assert.equal(t('items', { count: 2 }), '2 elementos');
  assert.equal(t('n', { count: 0 }), 'ninguno');
  assert.equal(t('old', { count: 1 }), '1 cosa');
  assert.equal(t('old', { count: 3 }), '3 cosas');
});

test('plural con las reglas del idioma de los datos (en: one/other)', () => {
  const t = tr({ f_one: 'one {{count}}', f_other: 'many {{count}}' }, { locale: 'en-GB' });
  assert.equal(t('f', { count: 1 }), 'one 1');
  assert.equal(t('f', { count: 5 }), 'many 5');
});

test('plurales ICU y de vue-i18n', () => {
  const t = tr({ icu: '{count, plural, one {# elemento} other {# elementos}}', vue: 'ningún elemento | un elemento | {count} elementos', dos: 'manzana | manzanas' });
  assert.equal(t('icu', { count: 1 }), '1 elemento');
  assert.equal(t('icu', { count: 2 }), '2 elementos');
  assert.equal(t('vue', { count: 0 }), 'ningún elemento');
  assert.equal(t('vue', { count: 1 }), 'un elemento');
  assert.equal(t('vue', { count: 4 }), '4 elementos');
  assert.equal(t('dos', { count: 1 }), 'manzana');
  assert.equal(t('dos', { count: 2 }), 'manzanas');
});

test('contexto: clave_contexto', () => {
  const t = tr({ amigo: 'Amigo/a', amigo_vip: 'Amigo VIP' });
  assert.equal(t('amigo', { context: 'vip' }), 'Amigo VIP');
  assert.equal(t('amigo', { context: 'otro' }), 'Amigo/a');
});

test('sin traducciones: la clave (o su valor por defecto)', () => {
  const t = createTranslator({});
  assert.equal(t('A.B'), 'A.B');
  assert.equal(t('A.B', 'Texto'), 'Texto');
});

test('el esqueleto de claves con espacio de nombres lo deja como un nivel más', () => {
  assert.deepEqual(buildTranslationSkeleton(['common:A.B', 'C']), { common: { A: { B: '' } }, C: '' });
});

test('ICU dentro de un texto y con varios plurales', () => {
  const t = tr({
    a: 'Tienes {count, plural, one {# aviso} other {# avisos}} nuevos.',
    b: '{count, plural, =0 {Nada} one {# cosa} other {# cosas}} y {count, plural, one {un día} other {# días}}',
  });
  assert.equal(t('a', { count: 1 }), 'Tienes 1 aviso nuevos.');
  assert.equal(t('a', { count: 3 }), 'Tienes 3 avisos nuevos.');
  assert.equal(t('b', { count: 0 }), 'Nada y 0 días');
  assert.equal(t('b', { count: 1 }), '1 cosa y un día');
});
