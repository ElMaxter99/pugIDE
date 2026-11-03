import { check, run, html, sleep } from '../lib.mjs';
// Historial local por archivo: versiones al guardar, automáticas, restaurar, renombrar
const reasons = async (a, path) => (await a.orch.fileHistory(path)).map((v) => v.reason);
const contents = async (a, path) => (await a.orch.fileHistory(path)).map((v) => v.content);

{
  const a = await run({ '/index.pug': 'p uno\n', '/other.pug': 'p otro\n' }, '/index.pug', async (x) => { x.orch.adoptProjectId('p-test'); x.orch.saveSession(); });
  await sleep(50);
  check('16 al abrir no se guarda ninguna versión (solo se toma como base)', (await a.orch.fileHistory('/index.pug')).length === 0);

  a.EditorState.updateContent('p dos\n');
  a.orch.saveFile();
  await sleep(100);
  check('16 guardar crea la versión «guardado» y conserva el contenido con el que se abrió (inicial)', (await reasons(a, '/index.pug')).join() === 'guardado,inicial', (await reasons(a, '/index.pug')).join());
  check('16 con el contenido de cada momento', (await contents(a, '/index.pug')).join('|') === 'p dos\n|p uno\n', (await contents(a, '/index.pug')).join('|'));

  a.orch.saveFile();
  await sleep(50);
  check('16 guardar sin cambios no duplica la versión', (await a.orch.fileHistory('/index.pug')).length === 2);

  // Cambios sin guardar: la versión automática respeta el intervalo (la inicial es de hace un instante)
  a.EditorState.updateContent('p tres\n');
  a.orch.saveSession();
  await sleep(100);
  check('16 una versión automática demasiado pronto no se guarda', (await a.orch.fileHistory('/index.pug')).length === 2);

  // Restaurar la inicial
  const versions = await a.orch.fileHistory('/index.pug');
  const initial = versions.find((v) => v.reason === 'inicial');
  await a.orch.restoreVersion('/index.pug', initial.content);
  await sleep(300);
  check('16 restaurar devuelve el contenido en el archivo y en el editor', a.EditorState.files().get('/index.pug') === 'p uno\n' && a.EditorState.editorContent() === 'p uno\n');
  check('16 y se recompila con él', html(a).includes('>uno<'), html(a).slice(0, 200));
  const after = await a.orch.fileHistory('/index.pug');
  check('16 antes de restaurar se guarda el estado que había (para poder volver)', after[0].reason === 'antes de restaurar' && after[0].content === 'p tres\n', JSON.stringify(after.map((v) => [v.reason, v.content])));

  // Renombrar: el historial sigue al archivo
  a.orch.renameFile('/index.pug', '/home.pug');
  await sleep(100);
  check('16 al renombrar el historial pasa al nuevo nombre', (await a.orch.fileHistory('/home.pug')).length === after.length && (await a.orch.fileHistory('/index.pug')).length === 0);

  // Reemplazo en proyecto
  a.orch.snapshotFiles(['/other.pug'], 'antes de reemplazar');
  await sleep(100);
  check('16 snapshotFiles guarda el estado previo de otros archivos', (await reasons(a, '/other.pug')).join() === 'antes de reemplazar');
}
{
  // Sin proyecto activo no se guarda nada y nada falla
  const a = await run({ '/index.pug': 'p uno\n' }, '/index.pug');
  a.orch.saveFile();
  await sleep(50);
  check('16 sin id de proyecto no hay historial pero guardar funciona', (await a.orch.fileHistory('/index.pug')).length === 0);
}
{
  // Los proyectos no mezclan sus historiales
  const a = await run({ '/index.pug': 'p uno\n' }, '/index.pug', async (x) => { x.orch.adoptProjectId('p-uno'); x.orch.saveSession(); });
  a.EditorState.updateContent('p cambio\n');
  a.orch.saveFile();
  await sleep(100);
  check('16 el historial es del proyecto', (await a.orch.fileHistory('/index.pug')).length === 2);
  a.orch.adoptProjectId('p-dos');
  check('16 otro proyecto con el mismo nombre de archivo empieza vacío', (await a.orch.fileHistory('/index.pug')).length === 0);
  const svc = a.FileHistoryService;
  await svc.removeProject('p-uno');
  check('16 borrar un proyecto borra su historial', (await svc.list('p-uno', '/index.pug')).length === 0);
}
