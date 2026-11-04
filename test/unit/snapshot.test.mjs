import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SNAPSHOTS, MAX_SNAPSHOT_BYTES, MAX_SNAPSHOT_NAME, autoSnapshotName, bytesEqual, cleanSnapshotName, compareSnapshot, diffAssetMaps, diffFileMaps,
  diffText, entryDiff, formatBytes, measureSnapshot, oldestSnapshot, plural, restoreSummary, snapshotsOverLimit, sortNewestFirst, textBytes,
} from './.build/units.mjs';

const asset = (path, bytes) => ({ path, mime: 'image/png', data: new Uint8Array(bytes) });
const content = (files, assets = [], datasets) => ({ files, assets, ...(datasets ? { datasets } : {}) });
const datasets = (name) => ({ version: 1, activeId: 'ds-1', locale: 'es', datasets: [{ id: 'ds-1', name, data: { titulo: name } }] });

test('diffFileMaps: añadidos, eliminados, modificados y sin cambios (ordenados)', () => {
  const base = new Map([['/b.pug', '1'], ['/a.pug', '1'], ['/gone.pug', 'x'], ['/same.pug', 's']]);
  const current = new Map([['/b.pug', '2'], ['/a.pug', '1'], ['/new.pug', 'n'], ['/same.pug', 's'], ['/also.pug', 'a']]);
  const d = diffFileMaps(base, current);
  assert.deepEqual(d.added, ['/also.pug', '/new.pug']);
  assert.deepEqual(d.removed, ['/gone.pug']);
  assert.deepEqual(d.modified, ['/b.pug']);
  assert.deepEqual(d.unchanged, ['/a.pug', '/same.pug']);
});

test('diffFileMaps: un archivo vacío no es lo mismo que un archivo que no existe', () => {
  const d = diffFileMaps(new Map([['/a.pug', '']]), new Map([['/a.pug', ''], ['/b.pug', '']]));
  assert.deepEqual(d.added, ['/b.pug']);
  assert.deepEqual(d.unchanged, ['/a.pug']);
  assert.deepEqual(diffFileMaps(new Map(), new Map()), { added: [], removed: [], modified: [], unchanged: [] });
});

test('diffAssetMaps: compara por contenido, no solo por ruta', () => {
  const a = new Map([['/i.png', asset('/i.png', [1, 2, 3])], ['/j.png', asset('/j.png', [9])]]);
  const b = new Map([['/i.png', asset('/i.png', [1, 2, 4])], ['/j.png', asset('/j.png', [9])], ['/k.png', asset('/k.png', [0])]]);
  const d = diffAssetMaps(a, b);
  assert.deepEqual([d.modified, d.unchanged, d.added, d.removed], [['/i.png'], ['/j.png'], ['/k.png'], []]);
  assert.ok(bytesEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2])));
  assert.ok(!bytesEqual(new Uint8Array([1, 2]), new Uint8Array([1])));
});

test('compareSnapshot: archivos, assets y datos con recuentos', () => {
  const base = content({ '/main.pug': 'a\nb\n', '/old.pug': 'x\ny\n', '/same.pug': 's' }, [asset('/logo.png', [1]), asset('/gone.png', [1, 2])], datasets('uno'));
  const current = content({ '/main.pug': 'a\nB\nc\n', '/new.pug': 'n1\nn2\nn3\n', '/same.pug': 's' }, [asset('/logo.png', [1, 1, 1]), asset('/new.png', [5])], datasets('dos'));
  const c = compareSnapshot(base, current);
  assert.equal(c.added, 2); // new.pug + new.png
  assert.equal(c.removed, 2); // old.pug + gone.png
  assert.equal(c.modified, 3); // main.pug + logo.png + datos
  assert.equal(c.unchanged, 1); // same.pug
  const byKey = Object.fromEntries(c.entries.map((e) => [e.key, e]));
  assert.deepEqual([byKey['file:/main.pug'].plus, byKey['file:/main.pug'].minus], [2, 1]);
  assert.deepEqual([byKey['file:/new.pug'].plus, byKey['file:/new.pug'].minus], [3, 0]); // sin línea vacía fantasma
  assert.deepEqual([byKey['file:/old.pug'].plus, byKey['file:/old.pug'].minus], [0, 2]);
  assert.equal(byKey['asset:/logo.png'].bytesBefore, 1);
  assert.equal(byKey['asset:/logo.png'].bytesAfter, 3);
  assert.equal(byKey['data'].kind, 'modified');
});

test('compareSnapshot: proyectos iguales no tienen cambios', () => {
  const same = content({ '/a.pug': 'p' }, [asset('/i.png', [1])], datasets('x'));
  const c = compareSnapshot(structuredClone(same), same);
  assert.equal(c.entries.length, 0);
  assert.equal(c.unchanged, 3); // archivo + asset + datos
});

test('entryDiff: + es lo de ahora y − lo que tenía la instantánea', () => {
  const base = content({ '/a.pug': 'uno\ndos\n' });
  const current = content({ '/a.pug': 'uno\ntres\n', '/n.pug': 'nuevo\n' });
  const c = compareSnapshot(base, current);
  const mod = c.entries.find((e) => e.label === '/a.pug');
  const ops = entryDiff(mod, base, current).filter((o) => o.type !== 'same');
  assert.deepEqual(ops, [{ type: 'del', text: 'dos' }, { type: 'add', text: 'tres' }]);
  const added = entryDiff(c.entries.find((e) => e.label === '/n.pug'), base, current);
  assert.deepEqual(added, [{ type: 'add', text: 'nuevo' }]);
  assert.deepEqual(diffText(null, null), []);
  assert.deepEqual(diffText('a\n', null), [{ type: 'del', text: 'a' }]);
});

test('restoreSummary: describe qué pasa al restaurar y concuerda en número', () => {
  const base = content({ '/m.pug': 'a', '/back.pug': 'b' }, [asset('/i.png', [1])], datasets('uno'));
  const current = content({ '/m.pug': 'z', '/x.pug': 'x', '/y.pug': 'y' }, [], datasets('dos'));
  const lines = restoreSummary(compareSnapshot(base, current));
  assert.deepEqual(lines, [
    'vuelve 1 archivo que ya no está (/back.pug)',
    'se eliminan 2 archivos añadidos después (/x.pug, /y.pug)',
    '1 archivo y los juegos de datos recuperan su contenido de entonces',
    '1 asset cambia para quedar como en la instantánea',
  ]);
  assert.deepEqual(restoreSummary(compareSnapshot(base, structuredClone(base))), []);
});

test('measureSnapshot: cuenta UTF-8, assets y datos, y avisa de lo que más pesa', () => {
  assert.equal(textBytes('añ'), 3);
  const c = content({ '/a.pug': 'x'.repeat(100) }, [asset('/big.png', new Array(500).fill(0))]);
  const m = measureSnapshot(c);
  assert.equal(m.bytes, 600);
  assert.ok(m.fits);
  assert.equal(m.heaviest[0].path, '/big.png');
  const big = { files: {}, assets: [{ path: '/huge.bin', mime: 'x', data: new Uint8Array(MAX_SNAPSHOT_BYTES + 1) }] };
  const over = measureSnapshot(big);
  assert.ok(!over.fits);
  assert.equal(over.max, MAX_SNAPSHOT_BYTES);
  assert.ok(measureSnapshot(c, 599).fits === false);
});

test('tope de instantáneas: la más antigua es la que sobra', () => {
  const list = Array.from({ length: MAX_SNAPSHOTS + 2 }, (_, i) => ({ id: `s${i}`, at: 1000 + i * 10 }));
  assert.equal(oldestSnapshot(list).id, 's0');
  assert.deepEqual(snapshotsOverLimit(list).map((s) => s.id), ['s0', 's1']);
  assert.deepEqual(snapshotsOverLimit(list.slice(0, MAX_SNAPSHOTS)), []);
  assert.equal(oldestSnapshot([]), null);
  assert.equal(sortNewestFirst(list)[0].id, `s${MAX_SNAPSHOTS + 1}`);
  assert.equal(list[0].id, 's0'); // no muta
});

test('nombres: limpios, recortados y el de la copia automática', () => {
  assert.equal(cleanSnapshotName('  Cierre   de\n septiembre '), 'Cierre de septiembre');
  assert.equal(cleanSnapshotName('   '), null);
  assert.equal(cleanSnapshotName('x'.repeat(200)).length, MAX_SNAPSHOT_NAME);
  assert.equal(autoSnapshotName('Cierre de septiembre'), 'Antes de restaurar «Cierre de septiembre»');
  const long = autoSnapshotName('y'.repeat(200));
  assert.ok(long.length <= MAX_SNAPSHOT_NAME && long.endsWith('…»'));
});

test('formatBytes y plural', () => {
  assert.equal(formatBytes(812), '812 B');
  assert.equal(formatBytes(38 * 1024), '38 KB');
  assert.equal(formatBytes(300), '300 B');
  assert.equal(formatBytes(Math.round(1.4 * 1024 * 1024)), '1,4 MB');
  assert.equal(plural(1, 'archivo', 'archivos'), '1 archivo');
  assert.equal(plural(0, 'asset', 'assets'), '0 assets');
});
