import { test } from 'node:test';
import assert from 'node:assert/strict';
import { templateContent, packTemplate, unpackTemplate, cleanTemplateName, pageTemplates, htmlNameFor, rewriteTemplateLinks } from './.build/units.mjs';

const content = {
  files: { '/main.pug': 'p hola\n', '/locales/es/translations.json': '{}', '/styles/a.css': 'p{}' },
  assets: [{ path: '/images/logo.png', mime: 'image/png', data: new Uint8Array([1, 2, 3]) }],
  datasets: { version: 1, activeId: 'x', locale: 'es', datasets: [{ id: 'x', name: 'Cliente', data: { nombre: 'Ana' } }] },
};

test('la plantilla lleva solo lo que se marcó', () => {
  const all = templateContent(content, { data: true, assets: true, locales: true });
  assert.equal(Object.keys(all.files).length, 3);
  assert.equal(all.assets.length, 1);
  assert.equal(all.datasets.datasets[0].data.nombre, 'Ana');
  const bare = templateContent(content, { data: false, assets: false, locales: false });
  assert.deepEqual(Object.keys(bare.files).sort(), ['/main.pug', '/styles/a.css']);
  assert.equal(bare.assets.length, 0);
  assert.deepEqual(bare.datasets.datasets[0].data, {});
  assert.equal(content.datasets.datasets[0].data.nombre, 'Ana', 'no toca el original');
});

test('exportar e importar una plantilla conserva archivos, imágenes, datos, nombre y descripción', () => {
  const zip = packTemplate({ name: 'Factura base', description: 'A4 con pie' }, content);
  const r = unpackTemplate(zip, 'otro');
  assert.equal(r.ok, true);
  assert.equal(r.name, 'Factura base');
  assert.equal(r.description, 'A4 con pie');
  assert.equal(r.content.files['/main.pug'], 'p hola\n');
  assert.deepEqual([...r.content.assets[0].data], [1, 2, 3]);
  assert.equal(r.content.assets[0].mime, 'image/png');
  assert.equal(r.content.datasets.datasets[0].name, 'Cliente');
});

test('un .zip que no vale se rechaza con su motivo', () => {
  assert.equal(unpackTemplate(new Uint8Array([1, 2, 3]), 'x').ok, false);
  const sinPug = packTemplate({ name: 'x', description: '' }, { files: { '/a.css': 'p{}' }, assets: [] });
  assert.match(unpackTemplate(sinPug, 'x').reason, /ninguna plantilla/);
});

test('nombre limpio', () => {
  assert.equal(cleanTemplateName('  Factura   base '), 'Factura base');
  assert.equal(cleanTemplateName('   '), null);
});

test('las páginas son las plantillas que nadie incluye ni extiende', () => {
  const files = new Map([
    ['/portada.pug', 'extends layouts/base\ninclude partials/cabecera\n'],
    ['/factura.pug', 'include ./partials/cabecera.pug\n'],
    ['/layouts/base.pug', 'html\n'],
    ['/partials/cabecera.pug', 'header\n'],
    ['/suelta.jade', 'p\n'],
  ]);
  const r = pageTemplates(files);
  assert.deepEqual(r.pages, ['/factura.pug', '/portada.pug', '/suelta.jade']);
  assert.deepEqual(r.partials, ['/layouts/base.pug', '/partials/cabecera.pug']);
  assert.equal(htmlNameFor('/facturas/abril.pug'), 'facturas/abril.html');
});

test('los enlaces entre plantillas pasan a .html al exportar; los demás no se tocan', () => {
  const files = new Map([['/portada.pug', ''], ['/docs/factura.pug', '']]);
  const html = '<a href="docs/factura.pug#total">F</a><a class="x" href=\'/docs/factura.pug\'>G</a><a href="noexiste.pug">N</a><a href="https://e.com/a.pug">E</a>';
  const out = rewriteTemplateLinks(html, '/portada.pug', files);
  assert.match(out, /href="docs\/factura\.html#total"/);
  assert.match(out, /href='\/docs\/factura\.html'/);
  assert.match(out, /href="noexiste\.pug"/);
  assert.match(out, /href="https:\/\/e\.com\/a\.pug"/);
});
