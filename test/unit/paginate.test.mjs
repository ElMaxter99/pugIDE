import { test } from 'node:test';
import assert from 'node:assert/strict';
import { straddlesPage, isOrphanHeading } from './.build/units.mjs';

const PAGE = 1000;

test('straddlesPage detecta bloques que cruzan el salto de página', () => {
  assert.equal(straddlesPage(100, 200, PAGE), false);
  assert.equal(straddlesPage(900, 200, PAGE), true);
  assert.equal(straddlesPage(1000, 200, PAGE), false); // empieza justo en el salto
  assert.equal(straddlesPage(800, 200, PAGE), false); // termina justo en el salto
  assert.equal(straddlesPage(500, 1200, PAGE), false); // más alto que una página: no se puede evitar
  assert.equal(straddlesPage(0, 0, PAGE), false);
  assert.equal(straddlesPage(10, 10, 0), false);
});

test('isOrphanHeading detecta encabezados pegados al final de la página', () => {
  assert.equal(isOrphanHeading(940, 40, PAGE), true);   // termina a 20px del final
  assert.equal(isOrphanHeading(100, 40, PAGE), false);
  assert.equal(isOrphanHeading(1940, 40, PAGE), true);  // segunda página
  assert.equal(isOrphanHeading(960, 40, PAGE), true);   // termina justo en el salto
  assert.equal(isOrphanHeading(960, 80, PAGE), false);  // cruza el salto: es otro caso (cut)
  assert.equal(isOrphanHeading(0, 40, 0), false);
});
