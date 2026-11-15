import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getValueType, parseDataJson, stringifyData, insertIndent } from './.build/units.mjs';

const kinds = (rows) => rows.map((r) => `${r.kind}:${r.path || '·'}@${r.depth}`);

test('getValueType', () => {
  assert.deepEqual([null, true, 3, 'x', undefined].map(getValueType), ['null', 'boolean', 'number', 'string', 'string']);
});




test('parseDataJson exige un objeto en la raíz', () => {
  assert.deepEqual(parseDataJson('{"a":1}'), { ok: true, value: { a: 1 } });
  assert.equal(parseDataJson('[1]').rootNotObject, true);
  assert.equal(parseDataJson('3').ok, false);
  const bad = parseDataJson('{');
  assert.ok(!bad.ok && bad.error && !bad.rootNotObject);
});

test('stringifyData e insertIndent', () => {
  assert.equal(stringifyData({ a: [1] }), '{\n  "a": [\n    1\n  ]\n}');
  assert.deepEqual(insertIndent('abcd', 1, 3), { value: 'a  d', cursor: 3 });
  assert.deepEqual(insertIndent('', 0, 0), { value: '  ', cursor: 2 });
});

test('el esqueleto rellena hasta los elementos que pide la plantilla (padArray)', async () => {
  const { buildDataSkeleton, padArray } = await import('./.build/units.mjs');
  const data = buildDataSkeleton([
    { name: 'productos', path: 'productos[]', type: 'array', defaultValue: [], isLeaf: false, minItems: 3 },
    { name: 'name', path: 'productos[].name', type: 'string', defaultValue: '', isLeaf: true, parentPath: 'productos[]' },
  ]);
  assert.equal(data.productos.length, 3);
  const existing = { productos: [{ name: 'Licencia' }] };
  assert.equal(padArray(existing, 'productos[]', 2), true);
  assert.deepEqual(existing.productos, [{ name: 'Licencia' }, { name: 'Licencia' }]);
  assert.equal(padArray(existing, 'productos[]', 2), false, 'no toca lo que ya llega');
  const nested = { pedidos: [{ lineas: [{ a: 1 }] }, { lineas: [] }] };
  padArray(nested, 'pedidos[].lineas[]', 2);
  assert.equal(nested.pedidos[0].lineas.length, 2);
  assert.equal(nested.pedidos[1].lineas.length, 0, 'un array vacío se deja (no hay forma que copiar)');
});

// ---- Tabla CLAVE / VALOR (P-38) ----
{
  const { dataTable, foldText, findFolded } = await import('./.build/units.mjs');
  const data = {
    nombre: 'Carlos', email: 'carlos@email.com', edad: 28, activo: true, nulo: null,
    hobbies: ['Programar', 'Leer'],
    usuarios: [{ nombre: 'Ana', email: 'ana@norte.example' }, { nombre: 'Luis', email: 'luis@sur.example' }],
    noticia: { titulo: 'Nueva sede en Valencia', dirección: 'Calle Mayor 3' },
  };
  const line = (r) => `${'  '.repeat(r.depth)}${r.key}${r.kind === 'group' ? ` ${r.count}${r.open ? '' : ' ›'}` : `=${r.value}`}${r.hit ? ' *' : ''}${r.unused ? ' !' : ''}`;

  test('dataTable: grupos con su tamaño, cerrados salvo los de `expanded`', () => {
    const t = dataTable(data, new Set(['hobbies']));
    assert.deepEqual(t.rows.map(line), ['nombre=Carlos', 'email=carlos@email.com', 'edad=28', 'activo=true', 'nulo=null', 'hobbies [2]', '  0=Programar', '  1=Leer', 'usuarios [2] ›', 'noticia {2} ›']);
    assert.deepEqual([t.total, t.matches], [13, 13]);
    assert.deepEqual(t.groups, ['hobbies', 'usuarios', 'usuarios.0', 'usuarios.1', 'noticia']);
    assert.equal(t.rows.find((r) => r.key === 'edad').valueType, 'number');
  });

  test('dataTable: los elementos de una lista se pueden editar por su ruta', () => {
    const t = dataTable(data, new Set(['usuarios', 'usuarios.1']));
    assert.equal(t.rows.find((r) => r.path === 'usuarios.1.email').value, 'luis@sur.example');
  });

  test('dataTable: el filtro busca en claves y valores y abre los grupos con coincidencias', () => {
    const t = dataTable(data, new Set(), 'mail');
    assert.deepEqual(t.rows.map(line), ['email=carlos@email.com *', 'usuarios [2]', '  0 {2}', '    email=ana@norte.example *', '  1 {2}', '    email=luis@sur.example *']);
    assert.deepEqual([t.total, t.matches], [13, 3]);
  });

  test('dataTable: sin tildes ni mayúsculas; un grupo cuya clave coincide enseña todo lo suyo', () => {
    assert.deepEqual(dataTable(data, new Set(), 'DIRECCION').rows.map(line), ['noticia {2}', '  dirección=Calle Mayor 3 *']);
    assert.deepEqual(dataTable(data, new Set(), 'notic').rows.map(line), ['noticia {2} *', '  titulo=Nueva sede en Valencia', '  dirección=Calle Mayor 3']);
    assert.deepEqual(dataTable(data, new Set(), 'no hay nada así').rows, []);
    assert.equal(foldText('Dirección'), 'direccion');
  });

  test('dataTable: marca las claves de primer nivel que la plantilla no usa', () => {
    const t = dataTable(data, new Set(), '', ['nulo', 'noticia']);
    assert.deepEqual(t.rows.filter((r) => r.unused).map((r) => r.key), ['nulo', 'noticia']);
  });

  test('dataTable: datos vacíos o que no son un objeto', () => {
    assert.deepEqual(dataTable({}, new Set()).rows, []);
    assert.deepEqual(dataTable(null, new Set()).total, 0);
  });

  test('findFolded: posiciones del texto original aunque antes haya tildes', () => {
    const text = '{ "nombre": "Clínica Aurora", "dirección": "Calle Mayor", "importe": 45, "IMPORTE2": 1 }';
    const a = findFolded(text, 'importe');
    assert.equal(text.slice(a.start, a.end), 'importe');
    const b = findFolded(text, 'importe', a.start + 1);
    assert.equal(text.slice(b.start, b.end), 'IMPORTE');
    const c = findFolded(text, 'direccion');
    assert.equal(text.slice(c.start, c.end), 'dirección');
    assert.equal(findFolded(text, 'importe', b.start + 1).start, a.start);
    assert.equal(findFolded(text, 'no está'), null);
  });
}
