import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHelperPath, helperPaths, loadHelpers, HELPERS_TEMPLATE } from './.build/units.mjs';

test('isHelperPath: /helpers.js y /helpers/*.js', () => {
  for (const ok of ['/helpers.js', '/helpers/dates.js', '/helpers/a/b.js', '/Helpers.JS']) assert.ok(isHelperPath(ok), ok);
  for (const bad of ['/helper.js', '/lib/helpers.js', '/helpers.json', '/helpers/', '/helpers/x.ts', '/main.pug']) assert.ok(!isHelperPath(bad), bad);
  assert.deepEqual(helperPaths(['/main.pug', '/helpers/b.js', '/helpers.js', '/helpers/a.js']), ['/helpers.js', '/helpers/a.js', '/helpers/b.js']);
});

test('loadHelpers reúne module.exports y exports.x de varios archivos', () => {
  const files = new Map([
    ['/helpers.js', 'module.exports = { upper: (s) => String(s).toUpperCase(), n: 3 };'],
    ['/helpers/extra.js', 'exports.double = (x) => x * 2; exports.utils = { id: (x) => x };'],
    ['/main.pug', 'p x'],
  ]);
  const { helpers, errors } = loadHelpers(files);
  assert.deepEqual(errors, []);
  assert.equal(helpers.upper('a'), 'A');
  assert.equal(helpers.double(4), 8);
  assert.equal(helpers.utils.id(7), 7);
  assert.equal(helpers.n, 3);
});

test('un archivo roto se informa con su ruta y no impide cargar el resto', () => {
  const files = new Map([
    ['/helpers.js', 'module.exports = { ok: () => 1 };'],
    ['/helpers/bad.js', 'const = ;'],
    ['/helpers/throws.js', 'const a = 1;\nconst b = 2;\nthrow new Error("boom");'],
    ['/helpers/notobj.js', 'module.exports = 5;'],
  ]);
  const { helpers, errors } = loadHelpers(files);
  assert.equal(helpers.ok(), 1);
  const by = Object.fromEntries(errors.map((e) => [e.path, e]));
  assert.match(by['/helpers/bad.js'].message, /SyntaxError/);
  assert.match(by['/helpers/throws.js'].message, /boom/);
  assert.equal(by['/helpers/throws.js'].line, 3);
  assert.match(by['/helpers/notobj.js'].message, /Exporta un objeto/);
});

test('sin archivos de helpers no hay nada que cargar; la plantilla de ejemplo es válida', () => {
  assert.deepEqual(loadHelpers(new Map([['/main.pug', 'p']])), { helpers: {}, errors: [] });
  const { helpers, errors } = loadHelpers(new Map([['/helpers.js', HELPERS_TEMPLATE]]));
  assert.deepEqual(errors, []);
  assert.equal(helpers.utils.upper('hola'), 'HOLA');
  assert.match(helpers.money(1234.5), /1234,50|1\.234,50/);
});
