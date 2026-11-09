import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInsideFolder, pathsInFolder, movedPath, checkFolderRename, summarizeFolder, countsText, needsTypedConfirm, folderName } from './.build/units.mjs';

test('qué rutas están dentro de una carpeta', () => {
  const all = ['/partials/a.pug', '/partials/ui/b.pug', '/partialsX/c.pug', '/main.pug'];
  assert.deepEqual(pathsInFolder(all, '/partials'), ['/partials/a.pug', '/partials/ui/b.pug']);
  assert.ok(isInsideFolder('/a/b', '/a') && !isInsideFolder('/ab/c', '/a') && !isInsideFolder('/a', '/a'));
});

test('movedPath cambia solo el prefijo', () => {
  assert.equal(movedPath('/partials/ui/b.pug', '/partials', '/componentes'), '/componentes/ui/b.pug');
  assert.equal(movedPath('/a/x.pug', '/a/', '/b/'), '/b/x.pug');
});

test('checkFolderRename: lo que no se puede renombrar', () => {
  const ex = ['/partials/a.pug', '/otra/b.pug', '/main.pug'];
  assert.deepEqual(checkFolderRename('/partials', 'componentes', ex), { ok: true, to: '/componentes' });
  assert.deepEqual(checkFolderRename('/partials', ' /nuevo/sub/ ', ex), { ok: true, to: '/nuevo/sub' });
  assert.equal(checkFolderRename('/partials', '', ex).ok, false);
  assert.equal(checkFolderRename('/partials', '/', ex).ok, false);
  assert.equal(checkFolderRename('/partials', '/partials', ex).ok, false);
  assert.match(checkFolderRename('/partials', '/partials/dentro', ex).reason, /dentro de sí misma/);
  assert.match(checkFolderRename('/partials', '/otra', ex).reason, /Ya existe/);
  assert.match(checkFolderRename('/partials', '/main.pug', ex).reason, /Ya existe/);
  assert.equal(checkFolderRename('/partials', '/a/../b', ex).ok, false);
});

test('resumen y textos del borrado', () => {
  const s = summarizeFolder(['/p/1', '/p/2', '/p/3', '/p/4'], ['/p/i1', '/p/i2', '/p/i3']);
  assert.equal(s.files, 4); assert.equal(s.images, 3); assert.equal(s.sample.length, 5); assert.equal(s.more, 2);
  assert.equal(countsText(7, 2), '7 archivos y 2 imágenes');
  assert.equal(countsText(1, 0), '1 archivo');
  assert.equal(countsText(0, 1), '1 imagen');
  assert.equal(countsText(0, 0), 'ningún archivo');
  assert.ok(!needsTypedConfirm(7, 2) && needsTypedConfirm(8, 3));
  assert.equal(folderName('/a/b/partials'), 'partials');
});
