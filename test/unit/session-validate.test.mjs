import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSession } from './.build/units.mjs';

test('una sesión correcta se lee tal cual', () => {
  const r = readSession(JSON.stringify({ projectName: 'P', files: { '/a.pug': 'p' }, openTabPaths: ['/a.pug'], activeTabPath: '/a.pug' }));
  assert.equal(r.problem, null);
  assert.equal(r.state.projectName, 'P');
});

test('sin sesión no hay problema', () => assert.deepEqual(readSession(null), { state: null, problem: null, dropped: [] }));

test('un JSON truncado o sin archivos es un problema', () => {
  assert.match(readSession('{"projectName":"P","files":{"/a.pug":"p').problem, /truncado/);
  assert.ok(readSession('[]').problem);
  assert.ok(readSession('{"projectName":"P"}').problem);
  assert.ok(readSession('{"files":{"/a.pug":3}}').problem);
});

test('se rescatan los archivos de texto y se limpian pestañas rotas', () => {
  const r = readSession(JSON.stringify({ files: { '/a.pug': 'p', '/b.pug': 5 }, openTabPaths: ['/a.pug', '/b.pug', 7], activeTabPath: '/b.pug' }));
  assert.deepEqual(r.dropped, ['/b.pug']);
  assert.match(r.problem, /1 archivo/);
  assert.deepEqual(r.state.files, { '/a.pug': 'p' });
  assert.deepEqual(r.state.openTabPaths, ['/a.pug']);
  assert.equal(r.state.activeTabPath, null);
  assert.equal(r.state.projectName, 'Proyecto');
});
