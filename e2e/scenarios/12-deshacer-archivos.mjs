import { check, run } from '../lib.mjs';
// Deshacer el borrado y el renombrado de archivos y assets
// 42. File undo
{
  const a = await run({ '/main.pug': 'p main\n', '/x.pug': 'p x\n', '/s.css': 'p{color:red}' }, '/main.pug', (app) => {
    app.AssetState.add('/img/a.png', new Uint8Array([9, 9]), 'image/png');
  });
  const o = a.orch;
  check('42 sin operaciones no hay deshacer', o.fileUndoLabel() === null);

  o.deleteFile('/x.pug');
  check('42 borrar ofrece deshacer', !a.EditorState.files().has('/x.pug') && o.fileUndoLabel() === 'Deshacer borrar /x.pug');
  o.undoFileOp();
  check('42 deshacer borrado restaura el contenido', a.EditorState.files().get('/x.pug') === 'p x\n' && o.fileUndoLabel() === null);

  o.renameFile('/s.css', '/styles/s.css');
  check('42 renombrar mueve el archivo', a.EditorState.files().has('/styles/s.css') && !a.EditorState.files().has('/s.css'));
  o.undoFileOp();
  check('42 deshacer renombrado lo devuelve', a.EditorState.files().get('/s.css') === 'p{color:red}' && !a.EditorState.files().has('/styles/s.css') && o.fileUndoLabel() === null);

  o.deleteFile('/img/a.png');
  check('42 borrar asset', !a.AssetState.has('/img/a.png'));
  o.undoFileOp();
  check('42 deshacer borrado de asset lo restaura', a.AssetState.has('/img/a.png') && a.AssetState.assets().get('/img/a.png').data.length === 2);

  o.deleteFile('/x.pug'); o.deleteFile('/s.css');
  o.undoFileOp();
  check('42 se deshace en orden inverso', a.EditorState.files().has('/s.css') && !a.EditorState.files().has('/x.pug') && o.fileUndoLabel() === 'Deshacer borrar /x.pug');
  o.undoFileOp(); o.undoFileOp();
  check('42 deshacer sin nada pendiente no falla', a.EditorState.files().has('/x.pug') && o.fileUndoLabel() === null);

  o.deleteFile('/x.pug');
  o.loadProject(new Map([['/n.pug', 'p n']]), 'Otro', []);
  check('42 cargar otro proyecto limpia el historial', o.fileUndoLabel() === null);
}
