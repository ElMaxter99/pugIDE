import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingStartsOpen, splitAssetPath, summarizeMissing, MISSING_FOLD_THRESHOLD } from './.build/units.mjs';

test('la lista arranca plegada solo si faltan más de 6', () => {
  assert.equal(MISSING_FOLD_THRESHOLD, 6);
  assert.equal(missingStartsOpen(1), true);
  assert.equal(missingStartsOpen(6), true);
  assert.equal(missingStartsOpen(7), false);
  assert.equal(missingStartsOpen(86), false);
});

test('la ruta se parte en carpeta y nombre; el nombre lleva la extensión', () => {
  assert.deepEqual(splitAssetPath('/fonts/dosis/Dosis-Bold.woff'), { dir: '/fonts/dosis/', name: 'Dosis-Bold.woff' });
  assert.deepEqual(splitAssetPath('/logo.svg'), { dir: '/', name: 'logo.svg' });
  assert.deepEqual(splitAssetPath('sin-barra.png'), { dir: '', name: 'sin-barra.png' });
});

test('el resumen cuenta fuentes, imágenes y otros; solo los tipos que hay', () => {
  const fuentes = Array.from({ length: 84 }, (_, i) => `/fonts/f${i}.woff2`);
  assert.equal(summarizeMissing([...fuentes, '/img/logo.svg', '/img/firma.png']), '84 fuentes · 2 imágenes');
  assert.equal(summarizeMissing(['/fonts/a.ttf']), '1 fuente');
  assert.equal(summarizeMissing(['/img/a.jpg']), '1 imagen');
  assert.equal(summarizeMissing(['/fonts/a.eot', '/x/dato.bin']), '1 fuente · 1 otro');
  assert.equal(summarizeMissing([]), '');
});
