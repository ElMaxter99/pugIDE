import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseNotes, releaseBody, previousVersion } from './.build/units.mjs';

const changelog = '# Changelog\n\n## [Sin publicar]\n\n## [0.9.0] - 2026-11-20\n\nNueva.\n\n### Añadido\n- a\n\n## [0.8.0] - 2026-11-09\n\nAntigua.\n\n### Corregido\n- b\n';
test('releaseNotes saca la sección de la versión, sin la cabecera ni las demás', () => {
  assert.equal(releaseNotes('0.9.0', changelog), 'Nueva.\n\n### Añadido\n- a\n');
  assert.equal(releaseNotes('0.8.0', changelog), 'Antigua.\n\n### Corregido\n- b\n');
  assert.equal(releaseNotes('0.7.0', changelog), null);
});

test('releaseBody añade «Cambios completos» con el CHANGELOG y la comparación con la anterior', () => {
  assert.equal(previousVersion('0.9.0', changelog), '0.8.0');
  assert.equal(previousVersion('0.8.0', changelog), null);
  const body = releaseBody('0.9.0', changelog, 'https://github.com/acme/app');
  assert.ok(body.startsWith('Nueva.\n\n### Añadido\n- a\n'));
  assert.ok(body.includes('**Cambios completos:** [CHANGELOG](https://github.com/acme/app/blob/v0.9.0/CHANGELOG.md) · [todos los cambios desde la 0.8.0](https://github.com/acme/app/compare/v0.8.0...v0.9.0)'));
  assert.ok(!releaseBody('0.8.0', changelog, 'https://github.com/acme/app').includes('compare/'));
  assert.equal(releaseBody('0.7.0', changelog), null);
});
