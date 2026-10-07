import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, mockValue, mockifyData, errorifyData, nameTokens, mockFormat } from './.build/units.mjs';

const val = (name, extra = {}) => mockValue(name, { rng: createRng(7), locale: 'es', ...extra });

test('PRNG: misma semilla, misma secuencia', () => {
  const a = createRng(42), b = createRng(42), c = createRng(43);
  const sa = [a(), a(), a()], sb = [b(), b(), b()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, [c(), c(), c()]);
  assert.ok(sa.every((x) => x >= 0 && x < 1));
});

test('nameTokens separa camelCase, snake y acentos', () => {
  assert.deepEqual(nameTokens('correoElectrónico'), ['correo', 'electronico']);
  assert.deepEqual(nameTokens('user_email-address'), ['user', 'email', 'address']);
});

test('campos por nombre: email, telefono, fecha, precio, imagen', () => {
  assert.match(val('email'), /^[a-z.]+@[a-z.]+\.[a-z]+$/);
  assert.match(val('correoElectronico'), /@/);
  assert.match(val('telefono'), /^\+34 6/);
  assert.match(val('phone', { locale: 'en' }), /^\+1 \(/);
  assert.match(val('fechaNacimiento'), /^\d{4}-\d{2}-\d{2}$/);
  const price = val('precio');
  assert.equal(typeof price, 'number');
  assert.ok(price > 0);
  assert.match(val('foto'), /^data:image\/svg\+xml/);
  assert.match(val('avatar'), /^data:image\/svg\+xml/);
  assert.match(val('sitioWeb'), /^https:\/\//);
});

test('nombre/apellido/titulo/descripcion y locale', () => {
  assert.ok(val('apellido').length > 2);
  const es = val('nombre'), en = val('firstName', { locale: 'en' });
  assert.ok(typeof es === 'string' && typeof en === 'string');
  assert.ok(val('descripcion').endsWith('.'));
  assert.ok(val('titulo').length > 5);
});

test('pistas de tipo: numero y booleano, sin pista de nombre', () => {
  assert.equal(typeof val('zzz', { hint: 'number' }), 'number');
  assert.equal(typeof val('activo', { hint: 'boolean' }), 'boolean');
  assert.equal(typeof val('zzz', { hint: 'string' }), 'string');
});

test('mockifyData: reproducible, misma forma y estable al anadir campos', () => {
  const shape = { user: { nombre: '', email: '', edad: 0 }, items: [{ titulo: '', precio: 0 }], translations: { HOME: { TITLE: '' } } };
  const a = mockifyData(shape, { seed: 5 }), b = mockifyData(shape, { seed: 5 }), c = mockifyData(shape, { seed: 6 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(typeof a.user.edad, 'number');
  assert.match(a.user.email, /@/);
  assert.equal(typeof a.items[0].precio, 'number');
  assert.ok(a.translations.HOME.TITLE.length > 0);
  const grown = mockifyData({ ...shape, user: { ...shape.user, ciudad: '' } }, { seed: 5 });
  assert.equal(grown.user.email, a.user.email);
});

test('mockifyData: arrayLength amplia y mode=empty respeta valores del usuario', () => {
  const out = mockifyData({ items: [{ nombre: '' }], titulo: 'Mio', precio: 0 }, { seed: 1, arrayLength: 3, mode: 'empty' });
  assert.equal(out.items.length, 3);
  assert.equal(out.titulo, 'Mio');
  assert.ok(out.precio > 0);
});

test('errorifyData: hojas a null y arrays vacios', () => {
  assert.deepEqual(errorifyData({ a: 'x', b: { c: 1 }, d: [{ e: 1 }] }), { a: null, b: { c: null }, d: [] });
});

test('mockFormat conoce formatos de JSON Schema', () => {
  const rng = createRng(1);
  assert.match(mockFormat('uuid', rng, 'es'), /^[0-9a-f-]{36}$/);
  assert.match(mockFormat('date-time', rng, 'es'), /T.*Z$/);
  assert.equal(mockFormat('desconocido', rng, 'es'), undefined);
});
