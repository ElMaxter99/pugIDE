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

// ---- Campos de negocio (0.19): valores que parecen de verdad y pasan sus comprobaciones ----
import { mockIban, mockNif, mockCif, mockEan13, mockLeaf as leaf, createRng as rngOf } from './.build/units.mjs';

const mod97 = (iban) => {
  const s = iban.replace(/\s+/g, '');
  const moved = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const d of moved) rem = (rem * 10 + Number(d)) % 97;
  return rem;
};

test('el IBAN que sale pasa la comprobación mod 97, con 24 caracteres y en grupos de 4', () => {
  for (let i = 0; i < 200; i++) {
    const iban = mockIban(rngOf(i));
    assert.match(iban, /^ES\d{2}( \d{4}){5}$/, iban);
    assert.equal(mod97(iban), 1, iban);
  }
  assert.equal(mod97('ES91 2100 0418 4502 0005 1332'), 1); // el IBAN de ejemplo que usa la propia banca
});

test('el NIF lleva la letra que le toca y el CIF su dígito de control', () => {
  for (let i = 0; i < 200; i++) {
    const nif = mockNif(rngOf(i));
    assert.match(nif, /^\d{8}[A-Z]$/);
    assert.equal(nif[8], 'TRWAGMYFPDXBNJZSQVHLCKE'[Number(nif.slice(0, 8)) % 23], nif);
    const cif = mockCif(rngOf(i));
    assert.match(cif, /^[AB]\d{8}$/);
    const d = [...cif.slice(1, 8)].map(Number);
    const odd = [d[0], d[2], d[4], d[6]].reduce((n, x) => n + Math.floor((x * 2) / 10) + ((x * 2) % 10), 0);
    assert.equal(Number(cif[8]), (10 - ((d[1] + d[3] + d[5] + odd) % 10)) % 10, cif);
  }
});

test('el EAN-13 tiene 13 cifras y su dígito de control', () => {
  for (let i = 0; i < 200; i++) {
    const ean = mockEan13(rngOf(i));
    assert.match(ean, /^84\d{11}$/);
    const sum = [...ean.slice(0, 12)].reduce((n, d, k) => n + Number(d) * (k % 2 ? 3 : 1), 0);
    assert.equal(Number(ean[12]), (10 - (sum % 10)) % 10, ean);
  }
});

test('los campos de negocio salen con su forma por el nombre, en español y en inglés', () => {
  const es = (name) => leaf(name, name, { seed: 3, locale: 'es' });
  const en = (name) => leaf(name, name, { seed: 3, locale: 'en' });
  assert.equal(es('moneda'), 'EUR');
  assert.equal(en('currency'), 'USD');
  assert.match(es('numeroFactura'), /^FA-2026-\d{4}$/);
  assert.match(en('invoiceNumber'), /^INV-2026-\d{4}$/);
  assert.match(es('invoice_number'), /^FA-2026-\d{4}$/);
  assert.equal(es('lang'), 'es');
  assert.equal(en('language'), 'en');
  assert.equal(es('locale'), 'es-ES');
  assert.equal(en('locale'), 'en-GB');
  assert.ok(Number.isInteger(es('totalPages')) && es('totalPages') >= 2 && es('totalPages') <= 24);
  assert.ok(new Date(es('fechaNacimiento')) < new Date('2008-12-31') && new Date(es('birthDate')) > new Date('1940-01-01'));
  assert.ok(typeof es('peso') === 'number' && es('peso') > 0 && Number.isInteger(es('altura')));
  assert.match(es('provincia'), /^[A-ZÁÉÍÓÚ]/);
  assert.match(en('province'), /^[A-Z]/);
  assert.equal(typeof es('razonSocial'), 'string');
  assert.match(en('iban'), /^GB\d{2}/);
});

test('lo que ya funcionaba no cambia: un número a secas sigue siendo una cantidad y el total, un importe', () => {
  assert.ok(Number.isInteger(leaf('numero', 'numero', { seed: 1, locale: 'es' })) || typeof leaf('numero', 'numero', { seed: 1, locale: 'es' }) === 'number');
  assert.equal(typeof leaf('total', 'total', { seed: 1, locale: 'es' }), 'number');
  assert.match(String(leaf('email', 'email', { seed: 1, locale: 'es' })), /@/);
});

test('URL y slug salen en ASCII aunque el vocabulario lleve acentos', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rng = createRng(seed);
    assert.match(mockFormat('uri', rng, 'es'), /^https:\/\/[\x21-\x7e]+$/);
    assert.match(mockValue('slug', { rng: createRng(seed), locale: 'es' }), /^[\x21-\x7e]+$/);
  }
});
