import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toProjectPath, defaultNewFileDir, newFileDialog, renameDialog, deleteDialog, importDialog, contextMenuFor } from './.build/units.mjs';

test('toProjectPath normaliza lo escrito y rechaza vacío', () => {
  assert.equal(toProjectPath('components/card.pug'), '/components/card.pug');
  assert.equal(toProjectPath('  /a.pug '), '/a.pug');
  assert.equal(toProjectPath('   '), null);
  assert.equal(toProjectPath(''), null);
});

test('defaultNewFileDir propone la carpeta del archivo activo', () => {
  assert.equal(defaultNewFileDir('/partials/card.pug'), '/partials/');
  assert.equal(defaultNewFileDir('/main.pug'), '/');
  assert.equal(defaultNewFileDir(undefined), '/');
});

test('diálogos: textos en español y con campo de texto donde toca', () => {
  const n = newFileDialog('/partials/');
  assert.equal(n.inputValue, '/partials/nuevo-archivo.pug');
  assert.ok(n.showInput);
  const r = renameDialog('/a.pug');
  assert.deepEqual([r.inputValue, r.showInput, r.confirmText], ['/a.pug', true, 'Renombrar']);
  const d = deleteDialog('/a.pug');
  assert.ok(!d.showInput && d.type === 'warning' && d.message.includes('/a.pug'));
  assert.match(importDialog(true).message, /una carpeta/);
  assert.match(importDialog(false).message, /archivo \.zip/);
});

test('contextMenuFor según el tipo de nodo', () => {
  assert.deepEqual(contextMenuFor({ type: 'directory' }).map((i) => i.action), ['newFile', 'rename', '', 'delete']);
  assert.deepEqual(contextMenuFor({ type: 'file', isAsset: true }).map((i) => i.action), ['rename', 'delete']);
  assert.deepEqual(contextMenuFor({ type: 'file' }).map((i) => i.action), ['rename', 'duplicate', '', 'delete']);
});
