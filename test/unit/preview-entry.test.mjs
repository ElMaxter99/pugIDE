import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findEntryPath, isPugFile, listTemplates, pinnedAfterRename, pinnedAfterDelete, validPinned, normalizeIncludes, resolveVirtualPath, contextMenuFor } from './.build/units.mjs';

const files = (...paths) => new Map(paths.map((p) => [p, '']));

test('isPugFile reconoce .pug y .jade, en cualquier caso', () => {
  assert.ok(isPugFile('/a.pug') && isPugFile('/a/b.JADE') && !isPugFile('/a.pug.txt') && !isPugFile('/a.scss'));
});

test('sin elección, main/index/app ganan; un .jade también puede ser la entrada', () => {
  assert.equal(findEntryPath(files('/x.pug', '/main.pug')), '/main.pug');
  assert.equal(findEntryPath(files('/b.jade', '/index.jade')), '/index.jade');
  assert.equal(findEntryPath(files('/b.jade', '/c.pug'), '/c.pug'), '/c.pug');
  assert.equal(findEntryPath(files('/b.jade', '/c.pug'), '/b.jade'), '/b.jade');
  assert.equal(findEntryPath(files('/estilo.scss')), null);
});

test('la elección manual gana sobre main.pug mientras exista', () => {
  const f = files('/main.pug', '/factura.jade', '/informe.pug');
  assert.equal(findEntryPath(f, '/main.pug', '/factura.jade'), '/factura.jade');
  assert.equal(findEntryPath(f, '/informe.pug', '/informe.pug'), '/informe.pug');
  assert.equal(findEntryPath(f, '/main.pug', '/borrado.pug'), '/main.pug', 'una elección que no existe se ignora');
  assert.equal(findEntryPath(f, '/main.pug', '/x.scss'), '/main.pug', 'solo valen plantillas');
});

test('listTemplates ordena por ruta e ignora lo que no es plantilla', () => {
  assert.deepEqual(listTemplates(files('/z.pug', '/a.jade', '/s.scss', '/c/b.pug')), ['/a.jade', '/c/b.pug', '/z.pug']);
});

test('renombrar sigue al archivo elegido; borrar vuelve a automático', () => {
  assert.equal(pinnedAfterRename('/a.pug', '/a.pug', '/b/a.pug'), '/b/a.pug');
  assert.equal(pinnedAfterRename('/a.pug', '/otro.pug', '/x.pug'), '/a.pug');
  assert.equal(pinnedAfterRename('/a.pug', '/a.pug', '/a.txt'), null);
  assert.equal(pinnedAfterRename(null, '/a.pug', '/b.pug'), null);
  assert.equal(pinnedAfterDelete('/a.pug', '/a.pug'), null);
  assert.equal(pinnedAfterDelete('/a.pug', '/b.pug'), '/a.pug');
});

test('validPinned descarta lo que ya no existe', () => {
  assert.equal(validPinned('/a.pug', files('/a.pug')), '/a.pug');
  assert.equal(validPinned('/a.pug', files('/b.pug')), null);
  assert.equal(validPinned(undefined, files('/b.pug')), null);
  assert.equal(validPinned('/a.txt', files('/a.txt')), null);
});

test('los include sin extensión también encuentran parciales .jade', () => {
  const f = new Map([['/p/cab.jade', 'h1 hola'], ['/main.pug', 'include p/cab']]);
  assert.equal(resolveVirtualPath('p/cab', '/main.pug', f), '/p/cab.jade');
  assert.equal(normalizeIncludes('include p/cab', '/main.pug', f), 'include p/cab.jade');
});

test('el menú del árbol ofrece «Previsualizar este archivo» solo en plantillas', () => {
  const ctx = { current: '/main.pug', pinned: null, autoName: 'main.pug' };
  const labels = (node, c) => contextMenuFor(node, c).map((i) => i.label);
  assert.ok(labels({ type: 'file', path: '/b.jade' }, ctx).includes('Previsualizar este archivo'));
  assert.ok(!labels({ type: 'file', path: '/estilo.scss' }, ctx).includes('Previsualizar este archivo'));
  assert.ok(!labels({ type: 'file', path: '/b.jade' }).includes('Previsualizar este archivo'), 'sin contexto, el menú es el de siempre');
  const pinned = labels({ type: 'file', path: '/b.jade' }, { current: '/b.jade', pinned: '/b.jade', autoName: 'main.pug' });
  assert.ok(!pinned.includes('Previsualizar este archivo') && pinned.includes('Vista previa automática (main.pug)'));
});
