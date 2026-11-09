import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeShare, decodeShare, encryptShare, decryptShare, buildShareUrl, payloadFromHash, encryptedFromHash,
  ShareExpiredError, ShareWrongPasswordError, ShareDecodeError, SHARE_MIN_PASSWORD,
} from './.build/units.mjs';

const files = new Map([['/main.pug', 'p Hola\n'], ['/a/b.pug', 'p b\n']]);
const data = { nombre: 'Ana' };
const DAY = 86_400_000;

test('v3: caducidad y nota viajan y se leen', () => {
  const now = 1_700_000_000_000;
  const p = encodeShare('Informe', files, data, [], { expiresAt: now + DAY, note: '  Revisa el T3  ' });
  const r = decodeShare(p, now);
  assert.equal(r.expiresAt, now + DAY);
  assert.equal(r.note, 'Revisa el T3');
  assert.equal(r.projectName, 'Informe');
  assert.deepEqual([...r.files.keys()], ['/main.pug', '/a/b.pug']);
});

test('un enlace caducado no se abre y dice cuándo caducó', () => {
  const now = 1_700_000_000_000;
  const p = encodeShare('X', files, data, [], { expiresAt: now - 1000 });
  assert.throws(() => decodeShare(p, now), (e) => e instanceof ShareExpiredError && e.expiresAt === now - 1000);
  assert.doesNotThrow(() => decodeShare(p, now - 2000));
});

test('sin caducidad ni nota el enlace sigue como antes', () => {
  const r = decodeShare(encodeShare('X', files, data));
  assert.equal(r.expiresAt, undefined);
  assert.equal(r.note, undefined);
});

test('con contraseña: ida y vuelta, y la contraseña mala falla', async () => {
  const payload = encodeShare('Secreto', files, data, [], { note: 'hola' });
  const enc = await encryptShare(payload, 'correcto-caballo');
  assert.ok(!enc.includes('Secreto'));
  const back = await decryptShare(enc, 'correcto-caballo');
  assert.equal(decodeShare(back).projectName, 'Secreto');
  await assert.rejects(() => decryptShare(enc, 'incorrecta-123'), ShareWrongPasswordError);
});

test('cifrar dos veces da textos distintos (sal e IV aleatorios)', async () => {
  const payload = encodeShare('X', files, data);
  assert.notEqual(await encryptShare(payload, 'misma-clave-1'), await encryptShare(payload, 'misma-clave-1'));
});

test('manipular el texto cifrado se detecta', async () => {
  const enc = await encryptShare(encodeShare('X', files, data), 'clave-larga-1');
  const i = Math.floor(enc.length / 2);
  const tampered = enc.slice(0, i) + (enc[i] === 'A' ? 'B' : 'A') + enc.slice(i + 1);
  await assert.rejects(() => decryptShare(tampered, 'clave-larga-1'), ShareWrongPasswordError);
  await assert.rejects(() => decryptShare('abc', 'clave-larga-1'), ShareDecodeError);
});

test('la contraseña tiene un mínimo', async () => {
  await assert.rejects(() => encryptShare(encodeShare('X', files, data), 'corta'), ShareDecodeError);
  assert.equal(SHARE_MIN_PASSWORD, 8);
});

test('la caducidad dentro de un enlace con contraseña se respeta tras descifrar', async () => {
  const now = 1_700_000_000_000;
  const enc = await encryptShare(encodeShare('X', files, data, [], { expiresAt: now - 5 }), 'clave-larga-1');
  const plain = await decryptShare(enc, 'clave-larga-1');
  assert.throws(() => decodeShare(plain, now), ShareExpiredError);
});

test('los hashes #p= y #e= se distinguen', () => {
  assert.equal(buildShareUrl('https://x/ide#viejo', 'AAA'), 'https://x/ide#p=AAA');
  assert.equal(buildShareUrl('https://x/ide', 'BBB', true), 'https://x/ide#e=BBB');
  assert.equal(payloadFromHash('#e=BBB'), null);
  assert.equal(encryptedFromHash('#e=BBB'), 'BBB');
  assert.equal(encryptedFromHash('#p=AAA'), null);
});
