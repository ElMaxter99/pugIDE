import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainError, closestName, includeSpecifier, includesFile, editDistance, collectMixinDefinitions } from './.build/units.mjs';

const project = new Map([
  ['/main.pug', 'include ./mixins\n+tarjeta(x)'],
  ['/mixins.pug', 'mixin saludo(n)\n  p Hola\nmixin pie-de-pagina()\n  footer'],
  ['/partials/ui.pug', 'mixin boton()\n  button'],
]);

test('collectMixinDefinitions lee los mixins de cada archivo .pug', () => {
  const defs = collectMixinDefinitions(project);
  assert.deepEqual([...defs.keys()].sort(), ['boton', 'pie-de-pagina', 'saludo']);
  assert.deepEqual(defs.get('boton'), ['/partials/ui.pug']);
});

test('mixin que no existe: lista los que hay y propone crearlo en mixins.pug', () => {
  const e = explainError('pug_mixins.tarjeta is not a function', { files: project, path: '/main.pug', line: 2 });
  assert.match(e.hint, /ningún archivo define `mixin tarjeta/);
  assert.match(e.hint, /\+saludo/);
  assert.deepEqual(e.fix, { kind: 'createMixin', label: 'Crear mixin tarjeta en mixins.pug', name: 'tarjeta', path: '/mixins.pug', includeFrom: '/main.pug' });
});

test('mixin con nombre de guiones se lee de pug_mixins["..."]', () => {
  const e = explainError('pug_mixins["otro-mixin"] is not a function', { files: new Map(), path: '/main.pug' });
  assert.match(e.hint, /El proyecto no define ningún mixin/);
  assert.equal(e.fix.kind, 'createMixin');
  assert.equal(e.fix.path, '/mixins.pug');
});

test('mixin definido en un archivo que no se incluye: propone el include relativo', () => {
  const e = explainError('pug_mixins.boton is not a function', { files: project, path: '/main.pug', line: 2 });
  assert.match(e.hint, /include \.\/partials\/ui/);
  assert.deepEqual(e.fix, { kind: 'addInclude', label: 'Añadir include ./partials/ui en main.pug', path: '/main.pug', target: '/partials/ui.pug' });
});

test('errata o mayúsculas: «¿Quisiste decir…?» con arreglo en la línea', () => {
  const caps = explainError('pug_mixins.Saludo is not a function', { files: project, path: '/main.pug', line: 7 });
  assert.match(caps.hint, /¿Quisiste decir \+saludo\?.*mayúsculas/);
  assert.deepEqual(caps.fix, { kind: 'replaceOnLine', label: 'Cambiar +Saludo por +saludo', path: '/main.pug', line: 7, from: '+Saludo', to: '+saludo' });
  const typo = explainError('pug_mixins.saluda is not a function', { files: project, path: '/main.pug', line: 3 });
  assert.match(typo.hint, /\+saludo.*errata/);
  assert.equal(typo.fix.to, '+saludo');
  assert.equal(explainError('pug_mixins.saluda is not a function', { files: project }).fix, undefined);
});

test('include que no existe: sugiere un archivo parecido', () => {
  const e = explainError('Cannot find "./mixin" (included from /main.pug)', { files: project });
  assert.match(e.hint, /«\.\/mixin» no existe.*¿Quisiste decir «mixins»\?/s);
  assert.doesNotMatch(explainError('Cannot find "./zzzzzz"', { files: project }).hint, /Quisiste decir/);
});

test('dato que falta: Chrome, Firefox y Safari', () => {
  assert.match(explainError("Cannot read properties of undefined (reading 'total')").hint, /«total» de un dato que no existe/);
  assert.match(explainError('can\'t access property "total", factura.resumen is undefined').hint, /«total» de «factura\.resumen»/);
  assert.match(explainError("undefined is not an object (evaluating 'factura.resumen.total')").hint, /«total» de «factura\.resumen»/);
});

test('variable inexistente y funciones que no son funciones', () => {
  assert.match(explainError('nombre is not defined').hint, /«nombre»/);
  assert.match(explainError("Can't find variable: nombre").hint, /«nombre»/);
  assert.match(explainError('items.map is not a function').hint, /«items» no tiene el método «map»/);
  assert.match(explainError('formatear is not a function').hint, /helpers\.js.*formatear/s);
});

test('sintaxis de Pug: indentación, paréntesis y texto suelto', () => {
  assert.match(explainError('Inconsistent indentation. Expecting either 2 or 4 spaces/tabs').hint, /2 o 4 espacios/);
  assert.match(explainError('The end of the string reached with no closing bracket ) found.').hint, /Falta cerrar un «\(» con su «\)»/);
  assert.match(explainError('unexpected text "hola"').hint, /\| texto/);
  assert.equal(explainError('algo que no se reconoce'), undefined);
});

test('rutas de include y utilidades', () => {
  assert.equal(includeSpecifier('/main.pug', '/mixins.pug'), './mixins');
  assert.equal(includeSpecifier('/partials/card.pug', '/mixins.pug'), '../mixins');
  assert.equal(includeSpecifier('/main.pug', '/partials/ui.pug'), './partials/ui');
  assert.equal(includeSpecifier('/a/b/c.pug', '/a/x/y.pug'), '../x/y');
  assert.equal(includesFile('doctype html\ninclude ./mixins\n', '/mixins.pug'), true);
  assert.equal(includesFile('include ./mixins.pug', '/mixins.pug'), true);
  assert.equal(includesFile('//- include ./mixins', '/mixins.pug'), false);
  assert.equal(includesFile('include ./otros-mixins', '/mixins.pug'), false);
  assert.equal(editDistance('gato', 'pato'), 1);
  assert.equal(closestName('boton', ['saludo', 'botón']), 'botón');
  assert.equal(closestName('zzz', ['saludo']), null);
  assert.equal(closestName('saludos', ['saludo']), 'saludo');
});
