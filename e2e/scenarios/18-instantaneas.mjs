import { check, run, sleep, html } from '../lib.mjs';
// Instantáneas del proyecto: guardar, tope de 20, tamaño, restaurar (con copia automática) y que nada se pierda
const MB = 1024 * 1024;
const names = (a) => a.SnapshotState.items().map((s) => s.name);

{
  const a = await run({ '/main.pug': 'include partials/pie\np uno\n', '/partials/pie.pug': 'footer pie\n', '/extra.pug': 'p extra\n' }, '/main.pug', async (x) => {
    x.orch.adoptProjectId('p-snap');
    x.AssetState.add('/img/logo.png', new Uint8Array([1, 2, 3]), 'image/png');
    x.orch.saveSession();
  });
  const o = a.orch;
  await o.refreshSnapshots();
  check('18 un proyecto nuevo no tiene instantáneas', a.SnapshotState.count() === 0 && !a.SnapshotState.isFull());

  // Estado A: se guarda con nombre
  const dataA = structuredClone(a.DataState.data());
  const first = await o.saveSnapshot('  Estado   A ');
  check('18 guardar devuelve la instantánea con el nombre limpio', first.ok && first.meta.name === 'Estado A' && !first.meta.auto && first.meta.fileCount === 3 && first.meta.assetCount === 1, JSON.stringify(first));
  check('18 y aparece en la lista del estado', names(a).join() === 'Estado A' && a.SnapshotState.totalBytes() > 0);
  const unnamed = await o.saveSnapshot('   ');
  check('18 sin nombre se le pone uno por defecto', unnamed.ok && unnamed.meta.name.startsWith('Instantánea '), JSON.stringify(unnamed));
  await o.deleteSnapshot(unnamed.meta.id);
  check('18 eliminar la quita de la lista', names(a).join() === 'Estado A');
  check('18 renombrar la cambia', (await o.renameSnapshot(first.meta.id, 'Cierre A')) && names(a).join() === 'Cierre A');

  // Cambios: archivo modificado (sin guardar), uno borrado, uno nuevo, asset nuevo y datos distintos
  a.EditorState.updateContent('include partials/pie\np dos\n');
  o.deleteFile('/extra.pug');
  o.addFile('/nuevo.pug', 'nuevo.pug', 'p nuevo\n');
  a.EditorState.selectTab(a.EditorState.openTabs().find((t) => t.path === '/main.pug').id);
  a.AssetState.add('/img/otro.png', new Uint8Array([9]), 'image/png');
  a.DataState.setData({ ...dataA, titulo: 'Cambiado' });
  await sleep(50);

  const now = o.currentSnapshotContent();
  check('18 el contenido actual incluye lo que se está escribiendo', now.files['/main.pug'].includes('p dos') && now.assets.length === 2 && now.datasets.datasets[0].data.titulo === 'Cambiado');

  // Restaurar
  const restored = await o.restoreSnapshot(first.meta.id);
  await sleep(300);
  check('18 restaurar tiene éxito y guarda antes una copia automática', restored.ok && restored.safety.auto && restored.safety.name === 'Antes de restaurar «Cierre A»', JSON.stringify(restored));
  const files = a.EditorState.files();
  check('18 los archivos vuelven a la instantánea (modificado, borrado y añadido)', files.get('/main.pug').includes('p uno') && files.has('/extra.pug') && !files.has('/nuevo.pug') && files.size === 3, [...files.keys()].join());
  check('18 el editor muestra el contenido restaurado', a.EditorState.editorContent().includes('p uno'));
  check('18 la pestaña del archivo borrado después ya no está', !a.EditorState.openTabs().some((t) => t.path === '/nuevo.pug') && !!a.EditorState.activeTab());
  check('18 los assets vuelven a como estaban', a.AssetState.has('/img/logo.png') && !a.AssetState.has('/img/otro.png'));
  check('18 los datos vuelven a como estaban', a.DataState.data().titulo === dataA.titulo, JSON.stringify(a.DataState.data()));
  check('18 el preview se recompila con el proyecto restaurado', html(a).includes('>uno<') && html(a).includes('pie'), html(a).slice(0, 200));
  check('18 el nombre del proyecto no cambia', a.ProjectState.projectName() === 't');
  check('18 la copia automática aparece en la lista, la más reciente primero', names(a).join('|') === 'Antes de restaurar «Cierre A»|Cierre A', names(a).join('|'));

  // La copia automática tiene el estado de antes y se puede volver a él
  const auto = a.SnapshotState.items()[0];
  const autoContent = await o.loadSnapshotContent(auto.id);
  check('18 la copia automática conserva lo que había antes de restaurar', autoContent.files['/main.pug'].includes('p dos') && autoContent.files['/nuevo.pug'] === 'p nuevo\n' && autoContent.assets.length === 2 && autoContent.datasets.datasets[0].data.titulo === 'Cambiado');
  const hist = await o.fileHistory('/main.pug');
  check('18 el historial por archivo conserva el contenido anterior', hist.some((v) => v.reason === 'antes de restaurar' && v.content.includes('p dos')), JSON.stringify(hist.map((v) => v.reason)));
  const back = await o.restoreSnapshot(auto.id);
  await sleep(300);
  check('18 se puede volver al estado anterior desde la copia automática', back.ok && a.EditorState.files().get('/main.pug').includes('p dos') && a.EditorState.files().has('/nuevo.pug') && !a.EditorState.files().has('/extra.pug') && a.AssetState.has('/img/otro.png'));

  // Restaurar algo que ya no existe
  const gone = await o.restoreSnapshot('no-existe');
  check('18 restaurar una instantánea inexistente no toca nada', !gone.ok && gone.reason === 'missing' && a.EditorState.files().has('/nuevo.pug'));
}

{
  // Tope de 20: nunca se sustituye la más antigua sin permiso
  const a = await run({ '/main.pug': 'p v0\n' }, '/main.pug', async (x) => { x.orch.adoptProjectId('p-tope'); });
  const o = a.orch;
  for (let i = 1; i <= 20; i++) {
    a.EditorState.updateContent(`p v${i}\n`);
    const r = await o.saveSnapshot(`S${i}`);
    if (!r.ok) check(`18 guardar la ${i} cabe`, false, JSON.stringify(r));
    await sleep(3);
  }
  check('18 se pueden guardar 20 instantáneas', a.SnapshotState.count() === 20 && a.SnapshotState.isFull() && a.SnapshotState.oldest().name === 'S1');
  const refused = await o.saveSnapshot('S21');
  check('18 con 20, guardar otra sin confirmar no guarda nada y dice cuál sería la más antigua', !refused.ok && refused.reason === 'full' && refused.oldest.name === 'S1' && a.SnapshotState.count() === 20 && names(a).includes('S1') && !names(a).includes('S21'), JSON.stringify(refused));
  const replaced = await o.saveSnapshot('S21', { replaceOldest: true });
  check('18 confirmando, guarda la nueva y elimina solo la más antigua', replaced.ok && replaced.replaced.name === 'S1' && a.SnapshotState.count() === 20 && !names(a).includes('S1') && names(a)[0] === 'S21' && names(a).includes('S2'), JSON.stringify(replaced));
  // Restaurar con el tope alcanzado: la copia automática también necesita permiso para sustituir
  const noPerm = await o.restoreSnapshot(a.SnapshotState.items()[5].id);
  check('18 restaurar con 20 sin permiso para sustituir no restaura nada', !noPerm.ok && noPerm.reason === 'full' && a.EditorState.files().get('/main.pug') === 'p v20\n', JSON.stringify(noPerm));
  const withPerm = await o.restoreSnapshot(a.SnapshotState.items()[5].id, { replaceOldest: true });
  await sleep(200);
  check('18 con permiso restaura y mantiene 20', withPerm.ok && withPerm.replaced?.name === 'S2' && a.SnapshotState.count() === 20 && a.EditorState.files().get('/main.pug') !== 'p v20\n');
  // Borrar el proyecto borra sus instantáneas
  await o.refreshSnapshots();
  await o.deleteProject('p-tope');
  a.ProjectState.projectId.set('p-tope');
  check('18 borrar el proyecto elimina sus instantáneas', (await o.refreshSnapshots()).length === 0);
}

{
  // Tope de tamaño: no cabe → no se guarda, se explica y restaurar no toca nada
  const a = await run({ '/main.pug': 'p uno\n' }, '/main.pug', async (x) => { x.orch.adoptProjectId('p-grande'); });
  const o = a.orch;
  const ok = await o.saveSnapshot('Pequeña');
  a.AssetState.add('/img/fondo.png', new Uint8Array(26 * MB), 'image/png');
  const big = await o.saveSnapshot('Grande');
  check('18 un proyecto de más de 25 MB no se guarda y se explica qué pesa', !big.ok && big.reason === 'too-big' && big.heaviest[0].path === '/img/fondo.png' && big.bytes > 25 * MB, JSON.stringify(big).slice(0, 200));
  check('18 y no deja nada a medias', a.SnapshotState.count() === 1 && ok.ok);
  const blocked = await o.restoreSnapshot(ok.meta.id);
  check('18 si la copia de seguridad no cabe, restaurar no cambia nada', !blocked.ok && blocked.reason === 'too-big' && a.AssetState.has('/img/fondo.png') && a.SnapshotState.count() === 1);
  check('18 el aviso queda en la terminal', a.TerminalState.entries().some((e) => e.source === 'Instantáneas' && e.type === 'warning' && e.message.includes('25')));
}
