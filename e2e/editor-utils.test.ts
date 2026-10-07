import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectMixins,
  findDefinition,
  formatPug,
  resolveIncludePath,
  searchProject,
} from '../src/app/core/utils/pug-editor.util.ts';

const files = new Map<string, string>([
  ['/main.pug', 'extends layout\nblock content\n  include components/card\n  +card(title)\n'],
  ['/layout.pug', 'html\n  block content\n'],
  ['/components/card.pug', 'mixin card(title, body)\n  .card= title\n'],
  ['/data.json', '{"title":"card"}'],
]);

test('resolveIncludePath adds extension and handles relative paths', () => {
  assert.deepEqual(resolveIncludePath('layout', '/main.pug', files), { path: '/layout.pug', exists: true });
  assert.deepEqual(resolveIncludePath('../layout', '/components/card.pug', files), { path: '/layout.pug', exists: true });
  assert.equal(resolveIncludePath('nope', '/main.pug', files).exists, false);
});

test('collectMixins finds project mixins with args', () => {
  assert.deepEqual(collectMixins(files), [
    { name: 'card', args: 'title, body', path: '/components/card.pug', line: 1 },
  ]);
});

test('findDefinition resolves include, extends and mixin calls', () => {
  const inc = findDefinition(files, '/main.pug', '  include components/card', 14);
  assert.equal(inc?.path, '/components/card.pug');
  assert.equal(findDefinition(files, '/main.pug', 'extends layout', 10)?.path, '/layout.pug');
  const mx = findDefinition(files, '/main.pug', '  +card(title)', 5);
  assert.equal(mx?.path, '/components/card.pug');
  assert.equal(mx?.line, 1);
  assert.equal(findDefinition(files, '/main.pug', '  +card(title)', 12), null);
  assert.equal(findDefinition(files, '/main.pug', 'block content', 3), null);
});

test('searchProject returns file/line/column and honours options', () => {
  const r = searchProject(files, 'card');
  assert.ok(r.some((m) => m.path === '/main.pug' && m.line === 3));
  assert.ok(r.every((m) => m.column >= 1));
  assert.equal(searchProject(files, 'CARD', { caseSensitive: true }).length, 0);
  assert.equal(searchProject(files, 'car', { wholeWord: true }).length, 0);
  assert.ok(searchProject(files, 'mixin\\s+\\w+', { regex: true }).length === 1);
  assert.deepEqual(searchProject(files, '(', { regex: true }), []);
});

test('formatPug normalises indentation, whitespace and blank lines', () => {
  const src = 'div\n    p hi   \n\n\n    ul\n\t\t\tli a\n';
  assert.equal(formatPug(src), 'div\n  p hi\n\n  ul\n    li a\n');
});

test('formatPug keeps relative indentation inside raw blocks', () => {
  const src = 'script.\n    if (a) {\n        b()\n    }\np x\n';
  assert.equal(formatPug(src), 'script.\n  if (a) {\n      b()\n  }\np x\n');
});

test('formatPug is idempotent', () => {
  const once = formatPug('div\n      a\n         b\n   c\n');
  assert.equal(formatPug(once), once);
});
