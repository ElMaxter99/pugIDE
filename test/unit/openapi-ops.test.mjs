import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listOperations, missingKeys, operationData, parseDocumentText, previewLines, summarizeOpenApi } from './.build/units.mjs';

const doc = {
  openapi: '3.0.3',
  info: { title: 'API de Clínica Aurora', version: '2.3' },
  paths: {
    '/facturas': {
      get: { tags: ['Facturas'], summary: 'Lista de facturas de un paciente', responses: { 200: { description: 'ok', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Factura' } } } } } } },
      post: { tags: ['Facturas'], summary: 'Crear una factura', responses: { 201: { description: 'creada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Factura' } } } }, 400: { description: 'mal', content: { 'application/problem+json': { schema: { type: 'object' } } } } } },
    },
    '/facturas/{id}': {
      get: {
        tags: ['Facturas'], summary: 'Una factura con sus líneas',
        responses: {
          404: { description: 'no existe', content: { 'application/json': { schema: { type: 'object', properties: { mensaje: { type: 'string' } } } } } },
          200: { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/Factura' }, examples: { aurora: { value: { numero: 'FA-2026-0312', total: 212.5, paciente: { nombre: 'Lucía Romero Vidal' } } } } } } },
        },
      },
      delete: { tags: ['Facturas'], summary: 'Borrar', responses: { 204: { description: 'sin contenido' } } },
    },
    '/informes/{id}/pdf': { get: { summary: 'Informe en PDF', responses: { 200: { description: 'ok', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } } } } },
  },
  components: {
    schemas: {
      Factura: { type: 'object', properties: { numero: { type: 'string', example: 'FA-0001' }, fecha: { type: 'string', format: 'date' }, total: { type: 'number' }, paciente: { $ref: '#/components/schemas/Paciente' }, lineas: { type: 'array', items: { type: 'object', properties: { concepto: { type: 'string' }, importe: { type: 'number' } } } } } },
      Paciente: { type: 'object', properties: { nombre: { type: 'string' }, nif: { type: 'string' } } },
    },
  },
};

test('lista las operaciones del documento con su respuesta propuesta (la primera 2xx con JSON, aunque la 404 vaya antes)', () => {
  const ops = listOperations(doc);
  assert.deepEqual(ops.map((o) => o.id), ['GET /facturas', 'POST /facturas', 'GET /facturas/{id}', 'DELETE /facturas/{id}', 'GET /informes/{id}/pdf']);
  const one = ops.find((o) => o.id === 'GET /facturas/{id}');
  assert.equal(one.tag, 'Facturas');
  assert.equal(one.responses[one.defaultResponse].status, '200');
  assert.equal(one.responses[one.defaultResponse].label, '200 · application/json · Factura');
  assert.equal(ops[0].responses[0].label, '200 · application/json · lista de Factura');
  // application/problem+json no es una respuesta con datos.
  assert.deepEqual(ops[1].responses.map((r) => r.status), ['201']);
});

test('las operaciones que no sirven salen con el motivo', () => {
  const ops = listOperations(doc);
  assert.equal(ops.find((o) => o.method === 'DELETE').unusable, 'sin respuesta con datos (204)');
  assert.equal(ops.find((o) => o.path === '/informes/{id}/pdf').unusable, 'responde application/pdf, no JSON');
  assert.equal(ops[0].unusable, null);
});

test('con «ejemplos del documento» sale el ejemplo de la respuesta; el resto de la forma lo pone el esquema', () => {
  const op = listOperations(doc).find((o) => o.id === 'GET /facturas/{id}');
  const r = operationData(doc, op.responses[op.defaultResponse], 'examples', { seed: 7 });
  assert.equal(r.usedExample, true);
  assert.equal(r.data.numero, 'FA-2026-0312');
  assert.equal(r.data.paciente.nombre, 'Lucía Romero Vidal');
});

test('sin ejemplo en la respuesta se usan los del esquema y se genera lo demás, con la forma de la respuesta', () => {
  const op = listOperations(doc).find((o) => o.id === 'POST /facturas');
  const r = operationData(doc, op.responses[0], 'examples', { seed: 7 });
  assert.equal(r.usedExample, false);
  assert.equal(r.data.numero, 'FA-0001'); // example del esquema
  assert.deepEqual(Object.keys(r.data), ['numero', 'fecha', 'total', 'paciente', 'lineas']);
  assert.equal(typeof r.data.paciente.nombre, 'string');
  assert.ok(Array.isArray(r.data.lineas) && r.data.lineas.length > 0 && 'concepto' in r.data.lineas[0]);
});

test('«generados» ignora los ejemplos y es repetible con la misma semilla', () => {
  const op = listOperations(doc).find((o) => o.id === 'POST /facturas');
  const a = operationData(doc, op.responses[0], 'generated', { seed: 3 });
  const b = operationData(doc, op.responses[0], 'generated', { seed: 3 });
  assert.notEqual(a.data.numero, 'FA-0001');
  assert.deepEqual(a.data, b.data);
});

test('una lista en la raíz va bajo «items»', () => {
  const op = listOperations(doc)[0];
  const r = operationData(doc, op.responses[0], 'generated', { seed: 1 });
  assert.deepEqual(Object.keys(r.data), ['items']);
  assert.ok(Array.isArray(r.data.items) && r.data.items.length > 0);
});

test('Swagger 2: schema y examples en la respuesta, y produces', () => {
  const swagger = {
    swagger: '2.0', info: { title: 'Citas', version: '1' }, produces: ['application/json'],
    paths: { '/citas/{id}': { get: { responses: { 200: { description: 'ok', schema: { $ref: '#/definitions/Cita' }, examples: { 'application/json': { id: 'c-1', motivo: 'Revisión anual' } } } } } } },
    definitions: { Cita: { type: 'object', properties: { id: { type: 'string' }, motivo: { type: 'string' } } } },
  };
  const [op] = listOperations(swagger);
  assert.equal(op.responses[0].label, '200 · application/json · Cita');
  assert.deepEqual(operationData(swagger, op.responses[0], 'examples').data, { id: 'c-1', motivo: 'Revisión anual' });
  assert.deepEqual(Object.keys(operationData(swagger, op.responses[0], 'generated', { seed: 2 }).data), ['id', 'motivo']);
});

test('un $ref a otro archivo no se sigue y se avisa; los de dentro del documento sí', () => {
  const d = { openapi: '3.0.0', paths: { '/x': { get: { responses: { 200: { description: 'ok', content: { 'application/json': { schema: { type: 'object', properties: { a: { $ref: './paciente.yaml' }, b: { $ref: '#/components/schemas/B' } } } } } } } } } }, components: { schemas: { B: { type: 'object', properties: { c: { type: 'integer' } } } } } };
  const [op] = listOperations(d);
  const r = operationData(d, op.responses[0], 'generated', { seed: 1 });
  assert.deepEqual(r.warnings, ['Referencia a otro archivo, no se sigue: ./paciente.yaml']);
  assert.equal(r.data.a, null);
  assert.equal(typeof r.data.b.c, 'number');
});

test('un documento sin operaciones se resume sin ellas', () => {
  const d = { openapi: '3.0.0', info: { title: 'Solo esquemas', version: '1' }, components: { schemas: { A: { type: 'object' }, B: { type: 'object' } } } };
  assert.deepEqual(listOperations(d), []);
  assert.deepEqual(summarizeOpenApi(d), { title: 'Solo esquemas', version: '1', operations: 0, schemas: 2 });
  assert.deepEqual(summarizeOpenApi(doc), { title: 'API de Clínica Aurora', version: '2.3', operations: 5, schemas: 2 });
});

test('lee YAML y JSON, también un OpenAPI en YAML con otra extensión; un texto roto da error', async () => {
  const yaml = 'openapi: 3.0.3\ninfo:\n  title: API de Clínica Aurora\n  version: "2.3"\npaths:\n  /citas:\n    get:\n      responses:\n        "200":\n          description: ok\n          content:\n            application/json:\n              schema: { type: object, properties: { motivo: { type: string } } }\n';
  const fromYaml = await parseDocumentText(yaml, 'clinica-api.yaml');
  assert.equal(listOperations(fromYaml)[0].responses[0].status, '200');
  assert.equal((await parseDocumentText(yaml, 'api.txt')).info.title, 'API de Clínica Aurora');
  assert.equal((await parseDocumentText('﻿{"a":1}', 'datos.json')).a, 1);
  await assert.rejects(() => parseDocumentText('{no es json', 'datos.json'));
});

test('avisa de las claves que la plantilla lee y la respuesta no trae', () => {
  const data = { numero: 'x', paciente: { nombre: 'Lucía' }, lineas: [{ concepto: 'Revisión' }] };
  assert.deepEqual(missingKeys(data, ['numero', 'paciente.nombre', 'cliente.email', 'lineas[].concepto', 'lineas[].precio', 'cliente.email']), ['cliente.email', 'lineas.precio']);
  assert.deepEqual(missingKeys({}, []), []);
});

test('la vista previa enseña dos niveles, con el primer elemento de cada lista', () => {
  const { lines, keys, more } = previewLines({ numero: 'FA-1', paciente: { nombre: 'Lucía', nif: '48211905K' }, lineas: [{ concepto: 'Revisión', importe: 85 }, { concepto: 'Limpieza', importe: 40 }], pagada: false });
  assert.deepEqual(lines.map((l) => `${'-'.repeat(l.depth)}${l.key}=${l.value}`), ['numero="FA-1"', 'paciente={ 2 claves }', '-nombre="Lucía"', '-nif="48211905K"', 'lineas=[ 2 elementos ]', '-0.concepto="Revisión"', '-0.importe=85', 'pagada=false']);
  assert.equal(keys, 6);
  assert.equal(more, 0);
});
