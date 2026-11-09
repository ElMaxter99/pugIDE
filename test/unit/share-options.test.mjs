import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPIRY_CHOICES, expiryFrom, formatShareDate } from './.build/units.mjs';

test('la caducidad se calcula desde ahora; «nunca» no caduca', () => {
  const now = 1_700_000_000_000;
  assert.equal(expiryFrom('1h', now), now + 3_600_000);
  assert.equal(expiryFrom('7d', now), now + 7 * 86_400_000);
  assert.equal(expiryFrom('30d', now), now + 30 * 86_400_000);
  assert.equal(expiryFrom('never', now), undefined);
  assert.deepEqual(EXPIRY_CHOICES.map((c) => c.id), ['1h', '1d', '7d', '30d', 'never']);
});

test('la fecha se escribe en español y con hora solo si es hoy', () => {
  const now = new Date('2026-11-09T10:00:00').getTime();
  assert.match(formatShareDate(new Date('2026-11-16T10:00:00').getTime(), now), /16 nov\.? 2026$/);
  assert.match(formatShareDate(new Date('2026-11-09T11:30:00').getTime(), now), /9 nov\.? 2026, 11:30/);
});
