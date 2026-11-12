import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planFileImport, resolveImport, freePath, commonRootFolder, projectFolders, normalizeTarget, importSummary } from './.build/units.mjs';

const existing = new Set(['/main.pug', '/partials/cabeceras/tabla.pug', '/partials/cabeceras/colores.scss', '/img/logo.png']);
const folder = ['cabeceras/portada.pug', 'cabeceras/pie.pug', 'cabeceras/logo.svg', 'cabeceras/tabla.pug', 'cabeceras/colores.scss', 'cabeceras/boceto.psd', 'cabeceras/.DS_Store'].map((relPath) => ({ relPath }));

test('una carpeta se reconoce como raíz común; archivos sueltos no', () => {
  assert.equal(commonRootFolder(folder.map((f) => f.relPath)), 'cabeceras');
  assert.equal(commonRootFolder(['a.pug', 'b.pug']), null);
  assert.equal(commonRootFolder(['a/x.pug', 'b/y.pug']), null);
});

test('el plan separa nuevos, existentes y no admitidos, y no enseña los restos del sistema', () => {
  const plan = planFileImport(folder, existing, { target: '/partials', keepFolder: true });
  assert.deepEqual(plan.counts, { new: 3, exists: 2, unsupported: 1 });
  assert.equal(plan.junk, 1);
  assert.equal(plan.items.find((i) => i.relPath.endsWith('portada.pug')).path, '/partials/cabeceras/portada.pug');
  assert.equal(plan.items.find((i) => i.relPath.endsWith('logo.svg')).kind, 'asset');
  assert.equal(plan.items.find((i) => i.relPath.endsWith('boceto.psd')).state, 'unsupported');
  assert.equal(importSummary(plan.counts), '3 nuevos · 2 ya existen · 1 no se importa');
});

test('sin conservar la carpeta, su contenido va directo al destino', () => {
  const plan = planFileImport(folder, existing, { target: '/', keepFolder: false });
  assert.equal(plan.items.find((i) => i.relPath.endsWith('pie.pug')).path, '/pie.pug');
  assert.equal(plan.counts.exists, 0);
});

test('archivos sueltos en una carpeta de destino; los espacios pasan a guiones y no se sale del proyecto', () => {
  const plan = planFileImport([{ relPath: 'mi logo.png' }, { relPath: '../../fuera.pug' }, { relPath: 'main.pug' }], existing, { target: 'img/', keepFolder: true });
  assert.deepEqual(plan.items.map((i) => i.path), ['/img/mi-logo.png', '/img/fuera.pug', '/img/main.pug']);
  assert.equal(normalizeTarget('../x//y/'), '/x/y');
  assert.equal(normalizeTarget(''), '/');
});

test('dos elegidos que acaban en la misma ruta: el segundo cuenta como existente', () => {
  const plan = planFileImport([{ relPath: 'a b.pug' }, { relPath: 'a-b.pug' }], new Set(), { target: '/', keepFolder: true });
  assert.deepEqual(plan.items.map((i) => i.state), ['new', 'exists']);
});

test('con los que ya existen: no tocarlos, sustituirlos o conservar los dos', () => {
  const plan = planFileImport(folder, existing, { target: '/partials', keepFolder: true });
  const skip = resolveImport(plan, existing, 'skip');
  assert.equal(skip.writes.length, 3);
  assert.deepEqual(skip.skipped, ['/partials/cabeceras/tabla.pug', '/partials/cabeceras/colores.scss']);
  const replace = resolveImport(plan, existing, 'replace');
  assert.equal(replace.writes.length, 5);
  assert.equal(replace.writes.filter((w) => w.replaces).length, 2);
  const both = resolveImport(plan, existing, 'keep-both');
  assert.ok(both.writes.some((w) => w.path === '/partials/cabeceras/tabla-2.pug'));
  assert.ok(both.writes.some((w) => w.path === '/partials/cabeceras/colores-2.scss'));
  assert.equal(both.writes.filter((w) => w.replaces).length, 0);
});

test('nombre libre: -2, -3… y archivos sin extensión', () => {
  assert.equal(freePath('/a.pug', new Set()), '/a.pug');
  assert.equal(freePath('/a.pug', new Set(['/a.pug', '/a-2.pug'])), '/a-3.pug');
  assert.equal(freePath('/dir/LEEME', new Set(['/dir/LEEME'])), '/dir/LEEME-2');
});

test('las carpetas de destino salen del proyecto, con la raíz primero', () => {
  assert.deepEqual(projectFolders(['/main.pug', '/partials/cabeceras/tabla.pug', '/img/logo.png']), ['/', '/img', '/partials', '/partials/cabeceras']);
});

test('un archivo suelto con destino ya decidido va a esa ruta, sea cual sea la carpeta elegida', () => {
  const plan = planFileImport([{ relPath: 'logo.png', fixedPath: '/img/marca/logo.png' }, { relPath: 'otro.png' }], existing, { target: '/partials', keepFolder: true });
  assert.deepEqual(plan.items.map((i) => i.path), ['/img/marca/logo.png', '/partials/otro.png']);
});
