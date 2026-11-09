import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseNotes } from './.build/units.mjs';

const changelog = '# Changelog\n\n## [Sin publicar]\n\n## [0.9.0] - 2026-11-20\n\nNueva.\n\n### Añadido\n- a\n\n## [0.8.0] - 2026-11-09\n\nAntigua.\n\n### Corregido\n- b\n';
test('releaseNotes saca la sección de la versión, sin la cabecera ni las demás', () => {
  assert.equal(releaseNotes('0.9.0', changelog), 'Nueva.\n\n### Añadido\n- a\n');
  assert.equal(releaseNotes('0.8.0', changelog), 'Antigua.\n\n### Corregido\n- b\n');
  assert.equal(releaseNotes('0.7.0', changelog), null);
});
