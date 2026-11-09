import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planZipImport, isZipJunk, singleRootFolder } from './.build/units.mjs';

test('una carpeta raíz única se quita de las rutas', () => {
  const plan = planZipImport(['Mi Proyecto/', 'Mi Proyecto/main.pug', 'Mi Proyecto/partials/a.pug', '__MACOSX/Mi Proyecto/._main.pug', 'Mi Proyecto/.DS_Store']);
  assert.equal(plan.stripped, 'Mi Proyecto');
  assert.deepEqual(plan.entries.map((k) => k.path), ['/main.pug', '/partials/a.pug']);
  assert.equal(plan.junk.length, 2);
});

test('sin carpeta única las rutas se conservan', () => {
  assert.equal(singleRootFolder(['main.pug', 'partials/a.pug']), null);
  assert.equal(singleRootFolder(['a/x.pug', 'b/y.pug']), null);
  assert.equal(singleRootFolder(['.pugide/datasets.json']), null);
  assert.deepEqual(planZipImport(['main.pug', 'p/a.pug']).entries.map((k) => k.path), ['/main.pug', '/p/a.pug']);
});

test('restos de macOS y Windows', () => {
  for (const n of ['__MACOSX/x', 'a/.DS_Store', 'Thumbs.db', 'a/._b.pug', 'desktop.ini']) assert.ok(isZipJunk(n), n);
  assert.ok(!isZipJunk('a/b.pug'));
});
