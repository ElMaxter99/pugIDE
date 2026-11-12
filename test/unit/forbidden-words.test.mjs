import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findForbidden, sha256, normalize } from '../../scripts/check-forbidden-words.mjs';

// Palabra inventada para la prueba: la lista real solo guarda hashes.
const entries = [{ sha256: sha256('zorrolandia'), length: 'zorrolandia'.length }];

test('encuentra la palabra sin distinguir mayúsculas ni tildes', () => {
  assert.deepEqual(findForbidden('p hola\np ZorroLándia S.A.', entries).map((h) => h.line), [2]);
});

test('también dentro de otra palabra', () => {
  assert.equal(findForbidden('const clienteZorrolandiaSeguros = 1;', entries).length, 1);
});

test('no da falsos positivos', () => {
  assert.deepEqual(findForbidden('zorro landia, zorrolandi, zorros', entries), []);
  assert.deepEqual(findForbidden('cualquier cosa', []), []);
});

test('normaliza como se guarda el hash', () => {
  assert.equal(normalize('ÑANDÚ'), 'nandu');
  assert.equal(sha256('Ñandú'), sha256('nandu'));
});
