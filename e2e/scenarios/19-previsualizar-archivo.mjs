import { check, run, html, errs, sleep } from '../lib.mjs';
// Previsualizar cada plantilla importada (.pug y .jade) y recordar la elección
const FILES = {
  '/main.pug': 'doctype html\nhtml\n  body\n    h1 Portada\n    p= titulo\n',
  '/factura.jade': 'doctype html\nhtml\n  body\n    include partes/cabecera\n    h2 Factura\n    p= cliente.nombre\n',
  '/informe.pug': 'doctype html\nhtml\n  body\n    include partes/cabecera.jade\n    h2 Informe\n    ul\n      each v in ventas\n        li= v.region\n',
  '/partes/cabecera.jade': 'header\n  h3 Cabecera compartida\n',
};
// Renombrar y borrar recompilan en segundo plano: se espera a que el render termine.
const settle = async (a) => { await sleep(30); for (let i = 0; i < 100 && a.PreviewState.isLoading(); i++) await sleep(20); await sleep(10); };

{
  const a = await run(FILES, '/main.pug');
  const o = a.orch;
  check('19 sin elección se renderiza main.pug, como siempre', html(a).includes('Portada') && a.PreviewState.entryPath() === '/main.pug' && a.PreviewState.pinnedEntry() === null, html(a).slice(0, 120));

  // Un .jade con un include sin extensión que apunta a otro .jade
  await o.setPreviewEntry('/factura.jade');
  check('19 elegir un .jade lo renderiza, con su include .jade sin extensión', !errs(a) && html(a).includes('Factura') && html(a).includes('Cabecera compartida') && !html(a).includes('Portada'), errs(a) + html(a).slice(0, 200));
  check('19 los datos que usa la plantilla elegida se crean al compilarla', a.DataState.data().cliente?.nombre !== undefined, JSON.stringify(a.DataState.data()));
  check('19 el Registro lo anota', a.TerminalState.entries().some((e) => e.source === 'Vista previa' && e.message === 'Vista previa: /factura.jade'));
  check('19 la elección no cambia la pestaña activa', a.EditorState.activeTab()?.path === '/main.pug');

  await o.setPreviewEntry('/informe.pug');
  check('19 otra plantilla con include .jade explícito y bucle', !errs(a) && html(a).includes('Informe') && html(a).includes('Cabecera compartida') && html(a).includes('<li'), errs(a) + html(a).slice(0, 400) + JSON.stringify(a.DataState.data()));

  // Un archivo que no es plantilla o no existe no cambia nada
  await o.setPreviewEntry('/no-existe.pug');
  await o.setPreviewEntry('/main.scss');
  check('19 una elección inválida se ignora', a.PreviewState.pinnedEntry() === '/informe.pug');

  // La elección viaja con la sesión (y las sesiones antiguas no la tienen)
  const saved = o.buildSession();
  check('19 la elección se guarda con la sesión', saved?.previewEntry === '/informe.pug', JSON.stringify(saved && Object.keys(saved)));

  // Renombrar sigue al archivo
  o.renameFile('/informe.pug', '/informes/q3.pug');
  await settle(a);
  check('19 renombrar el archivo elegido sigue al archivo', a.PreviewState.pinnedEntry() === '/informes/q3.pug');
  await settle(a);
  check('19 y la vista previa sigue siendo la misma plantilla', a.PreviewState.entryPath() === '/informes/q3.pug' && html(a).includes('Informe'), a.PreviewState.entryPath());
  o.undoFileOp();
  await settle(a);
  check('19 deshacer el renombrado también lo devuelve', a.PreviewState.pinnedEntry() === '/informe.pug');

  // Borrar vuelve a automático
  o.deleteFile('/informe.pug');
  await settle(a);
  check('19 borrar el archivo elegido vuelve a la vista automática', a.PreviewState.pinnedEntry() === null && a.PreviewState.entryPath() === '/main.pug' && html(a).includes('Portada'), String(a.PreviewState.entryPath()));
  check('19 y el Registro lo explica', a.TerminalState.entries().some((e) => e.source === 'Vista previa' && /vuelve a ser automática/.test(e.message)));

  // Volver a automático a mano
  await o.setPreviewEntry('/factura.jade');
  await o.setPreviewEntry(null);
  check('19 «automático» vuelve a main.pug', a.PreviewState.pinnedEntry() === null && html(a).includes('Portada'));

  const choices = o.previewChoices();
  check('19 previewChoices lista las plantillas (también .jade) y el automático', choices.templates.includes('/factura.jade') && choices.templates.includes('/main.pug') && choices.templates.every((t) => /\.(pug|jade)$/.test(t)) && choices.auto === '/main.pug' && choices.pinned === null, choices.templates.join() + ' | ' + choices.auto);
}

// Sin main/index: lo importado se previsualiza igualmente, y un .jade puede ser la entrada
{
  const a = await run({ '/uno.jade': 'p Uno\n', '/dos.jade': 'p Dos\n' }, '/uno.jade');
  check('19 sin main ni index, un .jade abierto se previsualiza', html(a).includes('Uno'), html(a) + errs(a));
  await a.orch.setPreviewEntry('/dos.jade');
  check('19 y se puede elegir el otro aunque no esté abierto', html(a).includes('Dos') && a.EditorState.activeTab()?.path === '/uno.jade', html(a));
}

// Una sesión guardada con una elección que ya no existe no se rompe
{
  const a = await run({ '/main.pug': 'p Principal\n', '/otra.pug': 'p Otra\n' }, '/main.pug');
  a.orch.restorePreviewEntry('/fantasma.pug');
  check('19 restaurar una elección inexistente la descarta', a.PreviewState.pinnedEntry() === null);
  a.orch.restorePreviewEntry('/otra.pug');
  await a.orch.manualCompile();
  check('19 restaurar una elección válida la aplica', html(a).includes('Otra'));
  // Abrir otro proyecto de la biblioteca no arrastra la elección
  a.orch.loadProject(new Map([['/main.pug', 'p Nuevo\n'], ['/otra.pug', 'p Otra nueva\n']]), 'Otro');
  await sleep(50);
  check('19 cargar otro proyecto empieza en automático', a.PreviewState.pinnedEntry() === null);
  a.orch.loadProject(new Map([['/main.pug', 'p Nuevo\n'], ['/otra.pug', 'p Otra nueva\n']]), 'Otro', [], null, null, { previewEntry: '/otra.pug' });
  await sleep(50);
  check('19 y un proyecto guardado con elección la recupera', a.PreviewState.pinnedEntry() === '/otra.pug');
}
