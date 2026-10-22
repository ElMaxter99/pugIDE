import { check, run, sleep } from '../lib.mjs';
// Biblioteca de proyectos: varios proyectos guardados, abrir, crear, renombrar, duplicar y borrar
// 40. Library
{
  const { MemoryLibraryBackend, uniqueProjectName } = await import('../.build/services.mjs');
  const mem = new Map();
  const hadStorage = 'localStorage' in globalThis;
  if (!hadStorage) globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const a = await run({ '/a.pug': 'h1 Proyecto A\n', '/b.pug': 'p b\n' }, '/a.pug', (app) => {
    app.ProjectLibraryService.backend = new MemoryLibraryBackend();
    app.orch.markAssetsReady();
    app.orch.adoptProjectId();
    app.AssetState.add('/img/a.png', new Uint8Array([1, 2, 3]), 'image/png');
  });
  const lib = a.ProjectLibraryService;
  const idA = a.ProjectState.projectId();
  await a.orch.saveToLibrary();
  let list = await lib.list();
  check('40 el proyecto activo se guarda en la biblioteca', list.length === 1 && list[0].id === idA && list[0].fileCount === 2 && list[0].assetCount === 1, JSON.stringify(list));
  check('40 el id activo se recuerda', a.PersistenceService.loadCurrentProjectId() === idA);

  await a.orch.createProject('Segundo');
  const idB = a.ProjectState.projectId();
  check('40 crear proyecto usa otro id, nombre y plantilla', idB !== idA && a.ProjectState.projectName() === 'Segundo' && a.EditorState.files().has('/main.pug') && !a.EditorState.files().has('/a.pug'));
  check('40 el proyecto nuevo no hereda assets', a.AssetState.assets().size === 0);
  list = await lib.list();
  check('40 el proyecto anterior sigue guardado', list.some((p) => p.id === idA));

  a.EditorState.files.update((m) => { const n = new Map(m); n.set('/extra.pug', 'p extra'); return n; });
  await a.orch.saveToLibrary();
  check('40 los cambios del activo se guardan', (await lib.list()).find((p) => p.id === idB).fileCount === 3);

  const ok = await a.orch.openProject(idA);
  await sleep(50);
  check('40 abrir restaura archivos, nombre, id y assets', ok && a.ProjectState.projectId() === idA && a.EditorState.files().has('/a.pug') && !a.EditorState.files().has('/main.pug') && a.AssetState.has('/img/a.png'));
  check('40 abrir guardó antes el proyecto que se dejó', (await lib.load(idB)).session.files['/extra.pug'] === 'p extra');
  check('40 abre la pestaña activa', a.EditorState.activeTab()?.path === '/a.pug' || a.EditorState.activeTab()?.path === '/b.pug');

  await a.orch.renameProject(idA, 'Renombrado');
  await a.orch.renameProject(idB, 'Otro nombre');
  check('40 renombrar el activo y otro', a.ProjectState.projectName() === 'Renombrado' && (await lib.list()).find((p) => p.id === idB).name === 'Otro nombre');

  const copyId = await a.orch.duplicateProject(idB);
  const copy = (await lib.list()).find((p) => p.id === copyId);
  check('40 duplicar crea copia con nombre único', !!copy && copy.name === 'Otro nombre (copia)' && copy.fileCount === 3, JSON.stringify(copy));

  await a.orch.deleteProject(idB);
  check('40 borrar quita el proyecto', !(await lib.list()).some((p) => p.id === idB));
  await a.orch.deleteProject(idA); // era el activo
  await sleep(50);
  check('40 borrar el activo abre otro', a.ProjectState.projectId() === copyId && a.EditorState.files().size === 3);
  check('40 el proyecto borrado no reaparece', !(await lib.list()).some((p) => p.id === idA || p.id === idB));
  await a.orch.deleteProject(copyId);
  await sleep(50);
  check('40 tras borrar el último solo queda el nuevo', (await lib.list()).length === 1 && (await lib.list())[0].id === a.ProjectState.projectId(), JSON.stringify(await lib.list()));
  check('40 borrar el último crea uno nuevo', !!a.ProjectState.projectId() && a.ProjectState.projectId() !== copyId && a.EditorState.files().has('/main.pug'));

  check('40 nombres únicos sin distinguir mayúsculas', uniqueProjectName('Demo', ['demo', 'DEMO (2)']) === 'Demo (3)' && uniqueProjectName('Nuevo', []) === 'Nuevo');

  // Importar/cargar otro proyecto no pisa el anterior de la biblioteca
  const before = a.ProjectState.projectId();
  a.orch.loadProject(new Map([['/z.pug', 'p z']]), 'Importado', []);
  await sleep(50);
  const ids = (await lib.list()).map((p) => p.id);
  check('40 cargar un proyecto externo conserva el anterior', ids.includes(before) && ids.includes(a.ProjectState.projectId()) && before !== a.ProjectState.projectId());

  // Fallo de almacenamiento: no es fatal
  lib.backend = { put: async () => { throw new Error('cuota'); }, getAllMeta: async () => { throw new Error('x'); }, getData: async () => { throw new Error('x'); }, remove: async () => { throw new Error('x'); } };
  check('40 un backend que falla no lanza (list vacío, save false, load null)', (await lib.list()).length === 0 && (await lib.save('x', { session: { projectName: 'x', files: {}, openTabPaths: [], activeTabPath: null }, assets: [] })) === false && (await lib.load('x')) === null);
  if (!hadStorage) delete globalThis.localStorage;
}
