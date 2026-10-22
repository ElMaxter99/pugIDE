import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextFocusIndex } from './.build/units.mjs';

test('Tab avanza y da la vuelta al final', () => {
  assert.equal(nextFocusIndex(3, 0, false), 1);
  assert.equal(nextFocusIndex(3, 2, false), 0);
});

test('Shift+Tab retrocede y da la vuelta al principio', () => {
  assert.equal(nextFocusIndex(3, 2, true), 1);
  assert.equal(nextFocusIndex(3, 0, true), 2);
});

test('con el foco fuera de la lista entra por el extremo correspondiente', () => {
  assert.equal(nextFocusIndex(3, -1, false), 0);
  assert.equal(nextFocusIndex(3, -1, true), 2);
  assert.equal(nextFocusIndex(3, 7, false), 0);
});

test('un solo elemento se queda en él y sin elementos no hay destino', () => {
  assert.equal(nextFocusIndex(1, 0, false), 0);
  assert.equal(nextFocusIndex(1, 0, true), 0);
  assert.equal(nextFocusIndex(0, -1, false), -1);
});
