import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diffForDisk, markSynced, emptyChange, externalAction, shortPath, lastOpenedText } from './.build/units.mjs';

const require = createRequire(import.meta.url);
const { WorkspaceStore, readWorkspace, readPaths, writeWorkspace, watchedPath, inside } = require('../../desktop/src/workspaces.cjs');
const { compareVersions, parseLatestRelease, latestReleaseApi } = require('../../desktop/src/updates.cjs');

const synced = () => ({ texts: new Map([['/a.pug', 'A'], ['/b.pug', 'B']]), assets: new Map(), datasets: '{}' });

test('solo se escribe lo que cambió, y se borra lo que ya no está', () => {
  const img = new Uint8Array([1]);
  const s = synced();
  const c = diffForDisk({ files: { '/a.pug': 'A', '/c.pug': 'C' }, assets: [{ path: '/i.png', data: img }], datasets: '{"x":1}' }, s);
  assert.deepEqual(c.files, { '/c.pug': 'C' });
  assert.deepEqual(c.deleted, ['/b.pug']);
  assert.equal(c.assets.length, 1);
  assert.equal(c.datasets, '{"x":1}');
  markSynced(s, c, []);
  assert.ok(emptyChange(diffForDisk({ files: { '/a.pug': 'A', '/c.pug': 'C' }, assets: [{ path: '/i.png', data: img }], datasets: '{"x":1}' }, s)));
});

test('lo que falló al escribir se vuelve a intentar', () => {
  const s = synced();
  const c = diffForDisk({ files: { '/a.pug': 'A2', '/b.pug': 'B' }, assets: [], datasets: '{}' }, s);
  markSynced(s, c, ['/a.pug']);
  assert.deepEqual(diffForDisk({ files: { '/a.pug': 'A2', '/b.pug': 'B' }, assets: [], datasets: '{}' }, s).files, { '/a.pug': 'A2' });
});

test('un cambio en disco: se ignora el propio, se aplica si aquí no hay cambios y es conflicto si cambió en los dos', () => {
  assert.equal(externalAction('X', 'X', 'X'), 'ignore');
  assert.equal(externalAction('nuevo', 'viejo', 'viejo'), 'apply');
  assert.equal(externalAction('nuevo', 'mío', 'viejo'), 'conflict');
  assert.equal(externalAction('igual', 'igual', 'viejo'), 'ignore');
  assert.equal(externalAction(null, 'viejo', 'viejo'), 'apply');      // se borró fuera y aquí no se tocó
  assert.equal(externalAction(null, 'mío', 'viejo'), 'conflict');     // se borró fuera y aquí se editó
  assert.equal(externalAction('nuevo', null, null), 'apply');         // archivo creado fuera
});

test('textos de la interfaz', () => {
  assert.equal(shortPath('/home/ana/x'), '/home/ana/x');
  assert.ok(shortPath('C:\\Trabajo\\clientes\\norte-analytics\\2026\\plantillas\\facturas', 30).startsWith('…\\'));
  const now = new Date(2026, 10, 11, 12, 0).getTime();
  assert.match(lastOpenedText(new Date(2026, 10, 11, 10, 12).getTime(), now), /^hoy, 10:12$/);
  assert.equal(lastOpenedText(new Date(2026, 10, 10, 23, 0).getTime(), now), 'ayer');
  assert.equal(lastOpenedText(0, now), 'sin abrir');
});

test('escritorio: no se sale de la carpeta del espacio', () => {
  assert.equal(inside('/tmp/ws', '/../fuera.txt'), null);
  assert.equal(inside('/tmp/ws', 'relativo.txt'), null);
  assert.equal(inside('/tmp/ws', '/'), null);
  assert.ok(inside('/tmp/ws', '/a/b.pug').endsWith(join('ws', 'a', 'b.pug')));
  assert.ok(watchedPath('styles/a.scss') && watchedPath('.pugide/datasets.json'));
  assert.ok(!watchedPath('.git/HEAD') && !watchedPath('node_modules/x/index.js') && !watchedPath('notas.pdf') && !watchedPath('a.pug.pugide-12.tmp'));
});

test('escritorio: leer y escribir una carpeta real', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pugide-test-'));
  mkdirSync(join(dir, 'styles')); mkdirSync(join(dir, '.git')); mkdirSync(join(dir, 'node_modules'));
  writeFileSync(join(dir, 'main.pug'), '\uFEFFp hola\n');
  writeFileSync(join(dir, 'styles', 'a.css'), 'p{}');
  writeFileSync(join(dir, 'logo.png'), Buffer.from([137, 80]));
  writeFileSync(join(dir, '.git', 'x.pug'), 'no');
  writeFileSync(join(dir, 'node_modules', 'y.pug'), 'no');
  writeFileSync(join(dir, 'doc.pdf'), 'bin');
  const r = await readWorkspace(dir);
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.files).sort(), ['/main.pug', '/styles/a.css']);
  assert.equal(r.files['/main.pug'], 'p hola\n', 'sin BOM');
  assert.equal(r.assets[0].path, '/logo.png');
  assert.equal(r.skippedCount, 1);
  const w = await writeWorkspace(dir, { files: { '/nuevo/dentro.pug': 'p x', '/../fuera.pug': 'no' }, assets: [], deleted: ['/styles/a.css', '/../../etc'], datasets: '{"v":1}' });
  assert.ok(w.written.includes('/nuevo/dentro.pug') && w.failed.includes('/../fuera.pug'));
  assert.equal(readFileSync(join(dir, 'nuevo', 'dentro.pug'), 'utf8'), 'p x');
  assert.ok(!existsSync(join(dir, 'styles')), 'la carpeta vacía se quita');
  assert.ok(!existsSync(join(dir, '..', 'fuera.pug')));
  assert.equal(readFileSync(join(dir, '.pugide', 'datasets.json'), 'utf8'), '{"v":1}');
  assert.equal(readFileSync(join(dir, '.git', 'x.pug'), 'utf8'), 'no');
  const p = await readPaths(dir, ['/main.pug', '/ya-no.pug', '/../fuera']);
  assert.equal(p['/main.pug'].text, 'p hola\n');
  assert.equal(p['/ya-no.pug'], null);
  assert.ok(!('/../fuera' in p));
});

test('escritorio: la lista de espacios se guarda y sobrevive a un archivo dañado', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pugide-store-'));
  const file = join(dir, 'x', 'store.json');
  const a = new WorkspaceStore(file);
  const ws = a.create('  Clínica   Albor ', '#4cd7f6', dir);
  assert.equal(ws.name, 'Clínica Albor');
  assert.equal(a.create('otro nombre', '#ddb7ff', dir).id, ws.id, 'la misma carpeta no se registra dos veces');
  a.touch(ws.id);
  const b = new WorkspaceStore(file);
  assert.equal(b.list().length, 1);
  assert.equal(b.list()[0].exists, true);
  assert.equal(b.state.lastId, ws.id);
  b.update(ws.id, { color: 'rojo', name: '  ' });
  assert.equal(b.get(ws.id).color, '#4cd7f6', 'un color que no es de la lista se ignora');
  b.remove(ws.id);
  assert.equal(new WorkspaceStore(file).list().length, 0);
  writeFileSync(file, '{ roto');
  assert.equal(new WorkspaceStore(file).list().length, 0);
});

test('escritorio: versiones', () => {
  assert.ok(compareVersions('0.11.0', '0.10.9') > 0 && compareVersions('1.0.0', '1.0.0') === 0 && compareVersions('v0.9.1', '0.10.0') < 0);
  assert.equal(latestReleaseApi('https://github.com/ElMaxter99/pugIDE'), 'https://api.github.com/repos/ElMaxter99/pugIDE/releases/latest');
  assert.equal(latestReleaseApi('https://evil.example/x/y'), null);
  assert.deepEqual(parseLatestRelease({ tag_name: 'v0.12.0' }, 'https://github.com/a/b'), { version: '0.12.0', url: 'https://github.com/a/b/releases/tag/v0.12.0' });
  assert.equal(parseLatestRelease({ tag_name: 'v0.12.0', prerelease: true }, 'x'), null);
  assert.equal(parseLatestRelease({ tag_name: 'nightly' }, 'x'), null);
  assert.equal(parseLatestRelease({ html_url: 'https://evil.example' }, 'x'), null);
});
