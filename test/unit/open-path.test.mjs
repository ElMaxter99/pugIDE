import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { pathsFromArgv, classifyPath, workspaceFor, isInside } = require('../../desktop/src/open-path.cjs');

const dirs = new Set(['/trabajo/aurora', '/trabajo/aurora/plantillas', '/trabajo/aurora/plantillas/partials', '/app']);
const files = new Set(['/trabajo/aurora/plantillas/factura.pug', '/trabajo/aurora/plantillas/partials/cabecera.jade', '/trabajo/informe.docx']);
const stat = (p) => {
  if (dirs.has(p)) return { isDirectory: () => true, isFile: () => false };
  if (files.has(p)) return { isDirectory: () => false, isFile: () => true };
  throw new Error('ENOENT');
};
const isDirectory = (p) => dirs.has(p);

test('del argv solo salen plantillas y carpetas, nunca opciones, enlaces ni la propia app', () => {
  const argv = ['/usr/bin/pugide', '.', '--no-sandbox', '--user-data-dir=/tmp/x', 'pugide://app/ide', '/trabajo/aurora/plantillas/factura.pug', '/trabajo/aurora', 'notas.txt', '/app'];
  assert.deepEqual(pathsFromArgv(argv, { isDirectory, appPath: '/app', cwd: '/home/ana' }), ['/trabajo/aurora/plantillas/factura.pug', '/trabajo/aurora']);
  // Una plantilla relativa se resuelve desde la carpeta en la que se lanzó.
  assert.deepEqual(pathsFromArgv(['pugide', 'factura.pug'], { isDirectory, appPath: '/app', cwd: '/trabajo/aurora/plantillas' }), ['/trabajo/aurora/plantillas/factura.pug']);
  assert.deepEqual(pathsFromArgv(undefined, { isDirectory }), []);
});

test('«dentro de» no confunde carpetas con el mismo principio', () => {
  assert.equal(isInside('/trabajo/aurora', '/trabajo/aurora/plantillas'), true);
  assert.equal(isInside('/trabajo/aurora', '/trabajo/aurora'), true);
  assert.equal(isInside('/trabajo/aurora', '/trabajo/aurora-2'), false);
  assert.equal(isInside('/trabajo/aurora/plantillas', '/trabajo/aurora'), false);
});

test('el espacio que contiene una carpeta es el más profundo', () => {
  const ws = [{ id: 'a', path: '/trabajo' }, { id: 'b', path: '/trabajo/aurora' }, { id: 'c', path: '/otro' }];
  assert.equal(workspaceFor(ws, '/trabajo/aurora/plantillas')?.id, 'b');
  assert.equal(workspaceFor(ws, '/home'), null);
});

test('una plantilla suelta: su carpeta y la ruta dentro (sin espacio que la contenga)', () => {
  const d = classifyPath('/trabajo/aurora/plantillas/factura.pug', { stat, workspaces: [] });
  assert.deepEqual(d, { kind: 'file', path: '/trabajo/aurora/plantillas/factura.pug', name: 'factura.pug', folder: '/trabajo/aurora/plantillas', folderName: 'plantillas', workspaceId: null, entry: '/factura.pug' });
});

test('una plantilla dentro de un espacio: se abre ese espacio, con la ruta relativa a él', () => {
  const d = classifyPath('/trabajo/aurora/plantillas/partials/cabecera.jade', { stat, workspaces: [{ id: 'ws-1', path: '/trabajo/aurora' }] });
  assert.equal(d.kind, 'file');
  assert.equal(d.workspaceId, 'ws-1');
  assert.equal(d.entry, '/plantillas/partials/cabecera.jade');
});

test('una carpeta, otro tipo de archivo o algo que ya no existe', () => {
  assert.deepEqual(classifyPath('/trabajo/aurora', { stat, workspaces: [{ id: 'ws-1', path: '/trabajo/aurora' }] }), { kind: 'folder', path: '/trabajo/aurora', name: 'aurora', workspaceId: 'ws-1' });
  // Una subcarpeta de un espacio no es ese espacio: se ofrece como espacio propio.
  assert.equal(classifyPath('/trabajo/aurora/plantillas', { stat, workspaces: [{ id: 'ws-1', path: '/trabajo/aurora' }] }).workspaceId, null);
  assert.equal(classifyPath('/trabajo/informe.docx', { stat, workspaces: [] }).kind, 'unsupported');
  assert.equal(classifyPath('/trabajo/borrado.pug', { stat, workspaces: [] }).kind, 'missing');
});
