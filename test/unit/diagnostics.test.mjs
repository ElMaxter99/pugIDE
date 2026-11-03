import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitPugMessage, buildDiagnostics, groupDiagnostics, explainUnknownFilter, explainRuntimeError } from './.build/units.mjs';

const syntax = '/index.pug:3:1\n    1| p\n    2|   a(href=\'x\'\n  > 3| \n-------^\n\nThe end of the string reached with no closing bracket ) found.';

test('splitPugMessage separa ubicación y mensaje sin contexto', () => {
  assert.deepEqual(splitPugMessage(syntax), { path: '/index.pug', line: 3, column: 1, message: 'The end of the string reached with no closing bracket ) found.' });
  assert.deepEqual(splitPugMessage('/a b/x.pug:7\n  > 7| \n\nboom'), { path: '/a b/x.pug', line: 7, column: undefined, message: 'boom' });
  assert.deepEqual(splitPugMessage('algo raro'), { message: 'algo raro' });
});

test('buildDiagnostics usa el archivo del error y quita duplicados', () => {
  const list = buildDiagnostics({
    entryPath: '/index.pug',
    compileErrors: [{ message: '/partials/x.pug:2:10\n  > 2| p\n\nSyntax Error', source: 'pug', severity: 'error', path: '/partials/x.pug', line: 2, column: 10 }],
    parseErrors: [{ message: '/partials/x.pug:2:10\n  > 2| p\n\nSyntax Error', line: 2, column: 10, filename: '/partials/x.pug', severity: 'error' }],
    styleErrors: [{ path: '/s.scss', message: 'bad', line: 4, column: 2 }, { path: '/s.scss', message: 'sin línea' }],
  });
  assert.equal(list.length, 2);
  assert.deepEqual(list[0], { path: '/partials/x.pug', line: 2, column: 10, message: 'Syntax Error', severity: 'error', source: 'pug' });
  assert.equal(list[1].path, '/s.scss');
  assert.equal(groupDiagnostics(list).size, 2);
});

test('buildDiagnostics cae al archivo de entrada y lee la línea del mensaje', () => {
  const [d] = buildDiagnostics({ entryPath: '/index.pug', compileErrors: [{ message: '/index.pug:1\n  > 1| \n\nboom', source: 'pug', severity: 'error' }] });
  assert.equal(d.path, '/index.pug');
  assert.equal(d.line, 1);
  assert.equal(d.message, 'boom');
  assert.deepEqual(buildDiagnostics({ entryPath: null, compileErrors: [{ message: 'sin ubicación', source: 'pug', severity: 'error' }] }), []);
});

test('explainUnknownFilter indica los filtros disponibles', () => {
  assert.match(explainUnknownFilter('/i.pug:1:1\n\nunknown filter ":markdown-it"'), /:markdown-it no está disponible.*:cdata/s);
  assert.equal(explainUnknownFilter('otro error'), 'otro error');
});

test('explainRuntimeError explica un mixin que no existe', () => {
  const files = new Map([['/main.pug', 'include ./mixins\n+azBody(x)'], ['/mixins.pug', 'mixin saludo(n)\n  p Hola']]);
  const hint = explainRuntimeError('pug_mixins.azBody is not a function', files);
  assert.match(hint, /ningún archivo define `mixin azBody/);
  assert.match(hint, /\+saludo/);
});

test('explainRuntimeError detecta mixin definido pero sin include y distingue mayúsculas', () => {
  const files = new Map([['/main.pug', '+card()'], ['/partials/ui.pug', 'mixin card()\n  div']]);
  assert.match(explainRuntimeError('pug_mixins.card is not a function', files), /ui\.pug.*include ui\.pug/s);
  assert.match(explainRuntimeError('pug_mixins["Card"] is not a function', files), /se llama «card»/);
  assert.match(explainRuntimeError('pug_mixins.x is not a function', new Map()), /no define ningún mixin/);
  assert.equal(explainRuntimeError('otra cosa'), undefined);
  assert.match(explainRuntimeError('foo is not defined'), /«foo»/);
});
