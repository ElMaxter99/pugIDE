import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAiSettings, DEFAULT_AI_SETTINGS, reachableTemplates, mixinNames, dataShape, buildContextItems, buildPrompt,
  parseAiResponse, applyEdits, lineDiff, estimateTokens, usageLine,
} from './.build/units.mjs';

const files = new Map([
  ['/main.pug', 'extends layout\nblock content\n  include mixins/lista\n  +lista(productos)\n'],
  ['/layout.pug', 'html\n  body\n    block content\n'],
  ['/mixins/lista.pug', 'mixin lista(items)\n  p.segundo= items[1].name\n'],
  ['/otra.pug', 'p no se usa\n'],
]);

test('ajustes: valores por defecto y nada que la CLI no acepte', () => {
  assert.deepEqual(normalizeAiSettings(null), DEFAULT_AI_SETTINGS);
  const s = normalizeAiSettings({ provider: 'copilot', models: { claude: 'opus', copilot: '$(id)' }, maxOutputTokens: 10, log: false });
  assert.equal(s.provider, 'copilot');
  assert.equal(s.models.claude, 'opus');
  assert.equal(s.models.copilot, DEFAULT_AI_SETTINGS.models.copilot, 'un nombre peligroso vuelve al de por defecto');
  assert.equal(s.maxOutputTokens, 256);
  assert.equal(s.log, false);
});

test('solo se ofrecen las plantillas que alcanza la de entrada (include y extends)', () => {
  assert.deepEqual(reachableTemplates(files, '/main.pug').sort(), ['/layout.pug', '/main.pug', '/mixins/lista.pug']);
  assert.deepEqual(mixinNames(files.get('/mixins/lista.pug')), ['lista']);
});

test('la forma de los datos lleva tipos, no valores', () => {
  assert.deepEqual(dataShape({ a: 'x', n: 2, ok: true, l: [{ b: 'y' }, { b: 'z' }], v: null }), { a: 'texto', n: 'número', ok: 'booleano', l: [{ b: 'texto' }], v: 'null' });
});

test('qué se envía: por defecto plantillas, forma y error; los valores solo al arreglar un error', () => {
  const data = { productos: [{ name: 'Licencia' }], translations: { HOLA: 'Hola' } };
  const forData = buildContextItems({ task: 'data', files, entryPath: '/main.pug', data, datasetName: 'Por defecto' });
  assert.deepEqual(forData.filter((i) => i.checked).map((i) => i.kind), ['template', 'template', 'template', 'shape']);
  assert.ok(forData.some((i) => i.kind === 'translations' && !i.checked));
  assert.ok(forData.find((i) => i.path === '/mixins/lista.pug').label.includes('mixin lista'));
  assert.ok(!forData.find((i) => i.kind === 'shape').content.includes('HOLA'), 'los textos no van en la forma');
  const forFix = buildContextItems({ task: 'fix', files, entryPath: '/main.pug', data, datasetName: 'X', error: { message: "Cannot read properties of undefined (reading 'name')", path: '/mixins/lista.pug', line: 2 } });
  assert.ok(forFix.find((i) => i.kind === 'data').checked);
  assert.match(forFix.find((i) => i.kind === 'error').content, /lista\.pug:2/);
});

test('el texto que se envía lleva solo lo marcado y pide el formato de respuesta', () => {
  const items = buildContextItems({ task: 'data', files, entryPath: '/main.pug', data: { a: 1 }, datasetName: 'X' });
  items.find((i) => i.path === '/layout.pug').checked = false;
  const prompt = buildPrompt('data', items, 'Al menos 3 productos');
  assert.match(prompt, /Archivo \/main\.pug/);
  assert.ok(!prompt.includes('Archivo /layout.pug'));
  assert.match(prompt, /Indicaciones de la persona: Al menos 3 productos/);
  assert.match(prompt, /"proposals"/);
  assert.match(prompt, /No tienes herramientas/);
  assert.ok(estimateTokens(prompt) > 50);
});

test('lee las propuestas del bloque json (y descarta lo que no se puede aplicar)', () => {
  const text = 'Aquí va:\n```json\n{"summary":"falta un producto","proposals":[{"title":"A","explanation":"lista.pug:2","data":{"productos":[{"name":"a"},{"name":"b"}]}},{"title":"vacía"},{"title":"B","edits":[{"path":"mixins/lista.pug","find":"p.segundo= items[1].name","replace":"if items[1]\\n    p.segundo= items[1].name"}]}]}\n```';
  const r = parseAiResponse(text);
  assert.equal(r.ok, true);
  assert.equal(r.value.proposals.length, 2);
  assert.equal(r.value.proposals[1].edits[0].path, '/mixins/lista.pug', 'la ruta se normaliza');
  assert.equal(parseAiResponse('sin json').ok, false);
  assert.match(parseAiResponse('```json\n{"proposals": [}\n```').reason, /no es un JSON válido/);
  assert.equal(parseAiResponse('{"proposals":[{"title":"x"}]}').ok, false);
});

test('aplicar cambios: exactos, y si el texto no está o está repetido, no se aplica nada', () => {
  const ok = applyEdits(files, [{ path: '/mixins/lista.pug', find: 'p.segundo= items[1].name', replace: 'if items[1]\n    p.segundo= items[1].name' }]);
  assert.equal(ok.ok, true);
  assert.match(ok.changed.get('/mixins/lista.pug'), /if items\[1\]/);
  assert.equal(files.get('/mixins/lista.pug').includes('if items'), false, 'no toca el original');
  assert.match(applyEdits(files, [{ path: '/mixins/lista.pug', find: 'no está', replace: '' }]).reason, /no está/);
  assert.match(applyEdits(new Map([['/a.pug', 'p x\np x\n']]), [{ path: '/a.pug', find: 'p x', replace: 'p y' }]).reason, /más de una vez/);
  assert.match(applyEdits(files, [{ path: '/nada.pug', find: 'a', replace: 'b' }]).reason, /No existe/);
});

test('diferencias y línea del Registro', () => {
  const d = lineDiff('a\nb\nc\nd', 'a\nb\nX\nd');
  assert.deepEqual(d.filter((l) => l.sign !== ' ').map((l) => l.sign + l.text), ['-c', '+X']);
  assert.match(usageLine({ provider: 'claude', model: 'sonnet', input: 1238, output: 1106, ms: 8000 }), /^Claude Code · sonnet · 1238 entrada · 1106 salida · 8 s$/);
});
