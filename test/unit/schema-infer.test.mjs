import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferData, detectSource, resolveRef } from './.build/units.mjs';

test('detectSource distingue ejemplo, JSON Schema y OpenAPI', () => {
  assert.equal(detectSource({ nombre: 'Ana' }), 'sample');
  assert.equal(detectSource({ properties: { a: 1 } }), 'sample');
  assert.equal(detectSource({ type: 'object', properties: { a: { type: 'string' } } }), 'json-schema');
  assert.equal(detectSource({ openapi: '3.0.0', components: {} }), 'openapi');
});

test('JSON de ejemplo: se usa tal cual; array en la raiz va bajo items', () => {
  assert.deepEqual(inferData({ a: 1 }).data, { a: 1 });
  assert.deepEqual(inferData([{ a: 1 }]).data, { items: [{ a: 1 }] });
});

test('JSON Schema vacio tipado: tipos, enum, default, array', () => {
  const r = inferData({
    type: 'object',
    properties: {
      nombre: { type: 'string' }, edad: { type: 'integer' }, activo: { type: 'boolean' },
      rol: { enum: ['admin', 'user'] }, pais: { type: 'string', default: 'ES' },
      tags: { type: 'array', items: { type: 'string' } },
      maybe: { type: ['null', 'string'] },
    },
  });
  assert.deepEqual(r.data, { nombre: '', edad: 0, activo: false, rol: 'admin', pais: 'ES', tags: [''], maybe: '' });
});

test('$ref local, allOf, format y relleno con mocks', () => {
  const schema = {
    $defs: { Base: { type: 'object', properties: { id: { type: 'integer' }, creado: { type: 'string', format: 'date-time' } } } },
    type: 'object',
    properties: {
      usuario: { allOf: [{ $ref: '#/$defs/Base' }, { type: 'object', properties: { email: { type: 'string', format: 'email' }, nombre: { type: 'string' } } }] },
      estado: { type: 'string', enum: ['a', 'b', 'c'] },
    },
  };
  const { data } = inferData(schema, { fill: true, seed: 3 });
  assert.equal(typeof data.usuario.id, 'number');
  assert.match(data.usuario.creado, /^\d{4}-\d\d-\d\dT/);
  assert.match(data.usuario.email, /@/);
  assert.ok(data.usuario.nombre.length > 0);
  assert.ok(['a', 'b', 'c'].includes(data.estado));
  assert.deepEqual(inferData(schema, { fill: true, seed: 3 }).data, data);
});

test('referencias circulares y no resueltas no se cuelgan y avisan', () => {
  const schema = { $defs: { Nodo: { type: 'object', properties: { nombre: { type: 'string' }, hijos: { type: 'array', items: { $ref: '#/$defs/Nodo' } } } } }, type: 'object', properties: { raiz: { $ref: '#/$defs/Nodo' }, x: { $ref: '#/$defs/NoExiste' } } };
  const r = inferData(schema);
  assert.deepEqual(r.data.raiz, { nombre: '', hijos: [] });
  assert.ok(r.warnings.some((w) => w.includes('NoExiste')));
  assert.ok(r.warnings.some((w) => w.includes('circular')));
});

test('OpenAPI: una clave por schema de components.schemas', () => {
  const doc = {
    openapi: '3.0.1',
    components: { schemas: {
      Producto: { type: 'object', properties: { nombre: { type: 'string' }, precio: { type: 'number' }, categoria: { $ref: '#/components/schemas/Categoria' } } },
      Categoria: { type: 'object', properties: { id: { type: 'integer' }, etiqueta: { type: 'string' } } },
    } },
  };
  const { source, data } = inferData(doc, { fill: true, seed: 2 });
  assert.equal(source, 'openapi');
  assert.deepEqual(Object.keys(data).sort(), ['categoria', 'producto']);
  assert.equal(typeof data.producto.precio, 'number');
  assert.equal(typeof data.producto.categoria.id, 'number');
});

test('resolveRef decodifica ~1 y ~0', () => {
  assert.equal(resolveRef({ a: { 'b/c': { d: 1 } } }, '#/a/b~1c/d'), 1);
  assert.equal(resolveRef({}, '#/nope'), undefined);
  assert.equal(resolveRef({}, 'http://x/y'), undefined);
});
