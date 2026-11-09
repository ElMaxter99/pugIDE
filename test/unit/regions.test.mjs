import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextRegionIndex, REGION_FOCUS, REGION_LABELS } from './.build/units.mjs';

test('F6 avanza, Mayús+F6 retrocede y ambos dan la vuelta', () => {
  assert.equal(nextRegionIndex(4, 0, false), 1);
  assert.equal(nextRegionIndex(4, 3, false), 0);
  assert.equal(nextRegionIndex(4, 0, true), 3);
  assert.equal(nextRegionIndex(4, 2, true), 1);
});

test('si el foco no está en ninguna región, F6 entra por la primera y Mayús+F6 por la última', () => {
  assert.equal(nextRegionIndex(4, -1, false), 0);
  assert.equal(nextRegionIndex(4, -1, true), 3);
  assert.equal(nextRegionIndex(0, -1, false), -1);
});

test('cada región tiene nombre y dónde poner el foco', () => {
  for (const id of Object.keys(REGION_LABELS)) assert.ok(REGION_FOCUS[id].length > 0, id);
});
