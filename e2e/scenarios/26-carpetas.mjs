import { check, run, sleep } from '../lib.mjs';
// Renombrar y borrar carpetas (P-18), también las que solo tienen assets (fuentes, imágenes)
const a = await run({ '/main.pug': 'p hola\n', '/partials/card.pug': 'p card\n' }, '/main.pug', async (x) => {
  x.AssetState.add('/fonts/neo/Bold.woff', new Uint8Array([1, 2, 3]), 'font/woff');
  x.AssetState.add('/fonts/neo/Regular.woff', new Uint8Array([4, 5]), 'font/woff');
  x.AssetState.add('/img/logo.png', new Uint8Array([9]), 'image/png');
});
const c = a.orch.folderContents('/fonts');
check('50b folderContents cuenta los assets de una carpeta sin archivos de texto', c.files.length === 0 && c.assets.length === 2, JSON.stringify(c));
check('50b borrar una carpeta de solo assets los borra todos', a.orch.deleteFolder('/fonts') === true && !a.AssetState.has('/fonts/neo/Bold.woff') && !a.AssetState.has('/fonts/neo/Regular.woff') && a.AssetState.has('/img/logo.png'));
a.orch.undoFileOp();
await sleep(100);
check('50b deshacer los recupera de una vez', a.AssetState.has('/fonts/neo/Bold.woff') && a.AssetState.has('/fonts/neo/Regular.woff'));
check('50b renombrar una carpeta de solo assets los mueve', a.orch.renameFolder('/fonts', '/tipografias') === true && a.AssetState.has('/tipografias/neo/Bold.woff') && !a.AssetState.has('/fonts/neo/Bold.woff'));
a.orch.undoFileOp();
await sleep(100);
check('50b y se deshace', a.AssetState.has('/fonts/neo/Bold.woff') && !a.AssetState.has('/tipografias/neo/Bold.woff'));
check('50b una carpeta mixta (texto y assets) se borra entera y se recupera', (() => {
  a.AssetState.add('/partials/icono.png', new Uint8Array([7]), 'image/png');
  const ok = a.orch.deleteFolder('/partials') && !a.EditorState.files().has('/partials/card.pug') && !a.AssetState.has('/partials/icono.png');
  a.orch.undoFileOp();
  return ok && a.EditorState.files().has('/partials/card.pug') && a.AssetState.has('/partials/icono.png');
})());
check('50b borrar una carpeta que no existe no hace nada', a.orch.deleteFolder('/nada') === false);
check('50b no se renombra sobre una carpeta que ya existe', a.orch.renameFolder('/fonts', '/partials') === false && a.AssetState.has('/fonts/neo/Bold.woff'));
