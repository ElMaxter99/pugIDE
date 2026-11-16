import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyName, renamesFor, moveChange, projectPaths, moveBytes } from './.build/units.mjs';

test('un nombre que ya existe pasa al primer número libre, con su extensión y en su carpeta', () => {
  assert.equal(copyName('/main.pug', new Set(['/main.pug'])), '/main (2).pug');
  assert.equal(copyName('/estilos/base.scss', new Set(['/estilos/base.scss', '/estilos/base (2).scss'])), '/estilos/base (3).scss');
  assert.equal(copyName('/LEEME', new Set(['/LEEME'])), '/LEEME (2)');
  assert.equal(copyName('/nuevo.pug', new Set(['/main.pug'])), '/nuevo.pug');
});

test('solo se renombra lo que coincide, y los nombres nuevos no chocan entre sí ni con el proyecto', () => {
  const r = renamesFor(['/main.pug', '/main (2).pug', '/estilos/base.scss', '/img/logo.png'], ['/main.pug', '/estilos/base.scss', '/notas.txt']);
  assert.deepEqual([...r.entries()], [['/main.pug', '/main (3).pug'], ['/estilos/base.scss', '/estilos/base (2).scss']]);
  assert.equal(renamesFor(['/a.pug'], []).size, 0);
});

test('lo que se escribe lleva los nombres nuevos, las imágenes y los juegos de datos; nunca borra nada', () => {
  const png = new Uint8Array([137, 80, 78, 71]);
  const content = { files: { '/main.pug': 'h1 Catálogo Aurora', '/estilos/base.scss': 'body{}' }, assets: [{ path: '/img/logo.png', mime: 'image/png', data: png }], datasets: { version: 1, activeId: 'a', locale: 'es', datasets: [] } };
  const c = moveChange(content, new Map([['/main.pug', '/main (2).pug']]));
  assert.deepEqual(Object.keys(c.files).sort(), ['/estilos/base.scss', '/main (2).pug']);
  assert.equal(c.files['/main (2).pug'], 'h1 Catálogo Aurora');
  assert.equal(c.assets[0].path, '/img/logo.png');
  assert.deepEqual(c.deleted, []);
  assert.match(c.datasets, /"activeId": "a"/);
  assert.equal('datasets' in moveChange({ files: {}, assets: [] }), false);
  assert.deepEqual(projectPaths(content), ['/main.pug', '/estilos/base.scss', '/img/logo.png']);
  assert.equal(moveBytes(content), new TextEncoder().encode('h1 Catálogo Aurora').length + 6 + 4);
});
