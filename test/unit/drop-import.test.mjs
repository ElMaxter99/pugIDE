import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectDropped, isZip } from './.build/units.mjs';

const file = (name, text = '') => ({ isFile: true, isDirectory: false, name, file: (ok) => ok({ name, text: async () => text }) });
// readEntries devuelve las entradas por tandas de `batch` y una tanda vacía al final, como el navegador.
const dir = (name, children, batch = 2) => ({
  isFile: false, isDirectory: true, name,
  createReader: () => {
    let i = 0;
    return { readEntries: (ok) => { const part = children.slice(i, i + batch); i += batch; ok(part); } };
  },
});

test('collectDropped recorre carpetas anidadas leyendo todas las tandas', async () => {
  const tree = dir('proyecto', [file('main.pug'), file('b.pug'), file('c.pug'), dir('partials', [file('card.pug'), file('foot.pug'), file('x.pug')])]);
  const intoRoot = await collectDropped([tree], { intoRoot: true });
  assert.deepEqual(intoRoot.map((f) => f.path).sort(), ['/b.pug', '/c.pug', '/main.pug', '/partials/card.pug', '/partials/foot.pug', '/partials/x.pug']);
  const withFolder = await collectDropped([tree]);
  assert.ok(withFolder.every((f) => f.path.startsWith('/proyecto/')));
  assert.equal(withFolder.length, 6);
});

test('collectDropped ignora node_modules y .git y respeta el límite', async () => {
  const tree = dir('p', [file('a.pug'), dir('node_modules', [file('x.js')]), dir('.git', [file('HEAD')]), file('b.pug')]);
  assert.deepEqual((await collectDropped([tree], { intoRoot: true })).map((f) => f.path), ['/a.pug', '/b.pug']);
  assert.equal((await collectDropped([dir('p', [file('1'), file('2'), file('3')])], { intoRoot: true, limit: 2 })).length, 2);
});

test('collectDropped admite archivos sueltos y un prefijo', async () => {
  const r = await collectDropped([file('uno.pug'), file('dos.json')], { prefix: '/extra' });
  assert.deepEqual(r.map((f) => f.path), ['/extra/uno.pug', '/extra/dos.json']);
  assert.equal(isZip('Proyecto.ZIP'), true);
  assert.equal(isZip('a.zip.txt'), false);
});
