import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupReminderDays, BACKUP_REMINDER_DAYS } from './.build/units.mjs';

const DAY = 24 * 60 * 60 * 1000;
const now = 100 * DAY;

test('no avisa a un usuario nuevo ni sin contenido', () => {
  assert.equal(backupReminderDays({ lastBackup: null, firstUse: now - 2 * DAY }, now, true), null);
  assert.equal(backupReminderDays({ lastBackup: null, firstUse: null }, now, true), null);
  assert.equal(backupReminderDays({ lastBackup: null, firstUse: now - 40 * DAY }, now, false), null);
});

test('avisa pasados los días sin exportar, contando desde la última exportación', () => {
  assert.equal(backupReminderDays({ lastBackup: null, firstUse: now - 20 * DAY }, now, true), 20);
  assert.equal(backupReminderDays({ lastBackup: now - BACKUP_REMINDER_DAYS * DAY, firstUse: now - 90 * DAY }, now, true), BACKUP_REMINDER_DAYS);
  assert.equal(backupReminderDays({ lastBackup: now - 3 * DAY, firstUse: now - 90 * DAY }, now, true), null);
});
