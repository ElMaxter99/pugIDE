import { check, run, html, errs, sleep } from '../lib.mjs';
import { parseDatasetsFile, serializeDatasets } from '../.build/services.mjs';
// Juegos de datos, mocks realistas con semilla, importacion desde schema y persistencia con el proyecto

const TPL = [
  'html',
  '  body',
  '    h1= user.nombre',
  '    p.mail= user.email',
  '    p.tel= user.telefono',
  '    p.fecha= user.fechaAlta',
  '    img(src=user.foto)',
  '    ul',
  '      each p in productos',
  '        li #{p.titulo} #{p.precio}',
  '',
].join('\n');

// 20. datos que faltan: mocks realistas por nombre y tipo, y el template compila con ellos
{
  const a = await run({ '/index.pug': TPL }, '/index.pug');
  const d = a.DataState.data();
  check('20 email realista', /^[a-z.]+@[a-z.]+\.[a-z]+$/.test(d.user.email), JSON.stringify(d));
  check('20 telefono', /^\+34 6/.test(d.user.telefono), d.user.telefono);
  check('20 fecha', /^\d{4}-\d{2}-\d{2}$/.test(d.user.fechaAlta), d.user.fechaAlta);
  check('20 imagen embebida (sin red)', String(d.user.foto).startsWith('data:image/svg+xml'), d.user.foto);
  check('20 precio numerico', typeof d.productos[0].precio === 'number' && d.productos[0].precio > 0, JSON.stringify(d.productos));
  check('20 compila y muestra el email', !errs(a) && html(a).includes(d.user.email), errs(a));
}

// 21. crear, cambiar, renombrar, duplicar y borrar juegos de datos
{
  const a = await run({ '/index.pug': TPL }, '/index.pug');
  const D = a.DataState;
  const base = structuredClone(D.data());
  check('21 empieza con "Por defecto"', D.datasetOptions().length === 1 && D.activeDataset().name === 'Por defecto');
  D.updateValue('user.nombre', 'Editado');
  await a.orch.createDataset('full');
  check('21 "Lleno" creado y activo', D.activeDataset().name === 'Lleno' && D.datasetOptions().length === 2);
  check('21 "Lleno" amplía arrays a 3', D.data().productos.length === 3, JSON.stringify(D.data().productos));
  await a.orch.manualCompile();
  check('21 preview refleja "Lleno"', html(a).includes(D.data().productos[2].titulo) && !errs(a), errs(a));
  a.orch.switchDataset('ds-1');
  check('21 volver conserva las ediciones', D.data().user.nombre === 'Editado' && D.data().productos.length === base.productos.length, JSON.stringify(D.data()));
  await a.orch.manualCompile();
  check('21 preview refleja "Por defecto"', html(a).includes('Editado'), html(a).slice(0, 200));
  D.renameDataset('ds-1', 'Lleno');
  check('21 renombrar mantiene nombres únicos', D.datasetOptions().map((x) => x.name).join('|') === 'Lleno (2)|Lleno', D.datasetOptions().map((x) => x.name).join('|'));
  D.renameDataset('ds-1', 'Cliente VIP');
  a.orch.duplicateDataset('ds-1');
  check('21 duplicar crea copia activa', D.datasetOptions().length === 3 && D.activeDataset().name === 'Cliente VIP (copia)' && D.data().user.nombre === 'Editado');
  a.orch.deleteDataset(D.activeId());
  check('21 borrar el activo cambia a otro', D.datasetOptions().length === 2 && D.datasetOptions().some((x) => x.id === D.activeId()));
  a.orch.deleteDataset(D.datasetOptions()[0].id);
  check('21 no se puede borrar el último', a.orch.deleteDataset(D.activeId()) === false && D.datasetOptions().length === 1);
}

// 22. "Vacío" no se rellena con mocks y "Error" conserva nulos (el template falla a la vista)
{
  const a = await run({ '/index.pug': TPL }, '/index.pug');
  const D = a.DataState;
  await a.orch.createDataset('empty');
  await a.orch.manualCompile();
  check('22 vacío: hojas vacías', D.data().user.email === '' && D.data().user.nombre === '', JSON.stringify(D.data()));
  check('22 vacío compila', !errs(a), errs(a));
  a.EditorState.updateContent(TPL + '    p= user.apodo\n');
  a.EditorState.files.update((f) => { f.set('/index.pug', TPL + '    p= user.apodo\n'); return f; });
  await a.orch.manualCompile();
  check('22 vacío: campo nuevo sigue vacío', D.data().user.apodo === '', JSON.stringify(D.data().user));
  await a.orch.createDataset('error');
  check('22 error: nulos y arrays vacíos', D.data().user.email === null && Array.isArray(D.data().productos) && D.data().productos.length === 0, JSON.stringify(D.data()));
  await a.orch.manualCompile();
  check('22 error: el nulo no se "cura" y se ve el fallo', D.data().user !== undefined && D.data().user.nombre === null, JSON.stringify(D.data()));
  a.orch.switchDataset('ds-1');
  await a.orch.manualCompile();
  check('22 volver al por defecto vuelve a compilar', !errs(a), errs(a));
}

// 23. Regenerar: determinista con semilla, con undo y respetando el idioma
{
  const a = await run({ '/index.pug': TPL }, '/index.pug');
  const D = a.DataState;
  await a.orch.regenerateMocks(11);
  const one = structuredClone(D.data());
  await a.orch.regenerateMocks(12);
  const two = structuredClone(D.data());
  await a.orch.regenerateMocks(11);
  check('23 misma semilla, mismos datos', JSON.stringify(D.data()) === JSON.stringify(one));
  check('23 otra semilla, datos distintos', JSON.stringify(one) !== JSON.stringify(two));
  check('23 se guarda la semilla', D.activeDataset().seed === 11 || D.snapshotDatasets().datasets[0].seed === 11);
  D.undo();
  check('23 undo recupera lo anterior', JSON.stringify(D.data()) === JSON.stringify(two));
  a.orch.setMockLocale('en');
  await a.orch.regenerateMocks(5);
  check('23 locale en: teléfono EE. UU.', /^\+1 \(/.test(D.data().user.telefono), D.data().user.telefono);
  await a.orch.manualCompile();
  check('23 compila tras regenerar', !errs(a), errs(a));
}

// 24. importar JSON de ejemplo, JSON Schema y OpenAPI como juego nuevo
{
  const a = await run({ '/index.pug': 'p= producto.nombre\n' }, '/index.pug');
  const D = a.DataState;
  const r1 = a.orch.importDataDocument({ producto: { nombre: 'Taza' } }, 'ejemplo');
  check('24 JSON de ejemplo', r1.source === 'sample' && D.data().producto.nombre === 'Taza' && D.activeDataset().name === 'Importado: ejemplo');
  const schema = { type: 'object', properties: { producto: { $ref: '#/$defs/P' } }, $defs: { P: { allOf: [{ type: 'object', properties: { nombre: { type: 'string' } } }, { properties: { estado: { enum: ['nuevo', 'usado'] }, creado: { type: 'string', format: 'date' } } }] } } };
  const r2 = a.orch.importDataDocument(schema, 'schema', 4);
  check('24 JSON Schema ($ref, allOf, enum, format)', r2.source === 'json-schema' && ['nuevo', 'usado'].includes(D.data().producto.estado) && /^\d{4}-\d\d-\d\d$/.test(D.data().producto.creado) && D.data().producto.nombre.length > 0, JSON.stringify(D.data()));
  await a.orch.manualCompile();
  check('24 compila con datos importados', !errs(a) && html(a).includes(D.data().producto.nombre), errs(a));
  const r3 = a.orch.importDataDocument({ openapi: '3.0.0', components: { schemas: { Producto: { type: 'object', properties: { nombre: { type: 'string' } } } } } }, 'api');
  check('24 OpenAPI', r3.source === 'openapi' && typeof D.data().producto.nombre === 'string', JSON.stringify(D.data()));
  check('24 3 importados + defecto', D.datasetOptions().length === 4);
}

// 25. los juegos viajan con el proyecto (sesión y datasets.json) y los sin juegos arrancan con uno
{
  const a = await run({ '/index.pug': TPL }, '/index.pug');
  const D = a.DataState;
  await a.orch.createDataset('full');
  D.updateValue('user.nombre', 'Persistido');
  const text = serializeDatasets(D.snapshotDatasets());
  const parsed = parseDatasetsFile(text);
  check('25 datasets.json ida y vuelta', parsed && parsed.datasets.length === 2 && parsed.activeId === D.activeId() && parsed.datasets[1].data.user.nombre === 'Persistido', text.slice(0, 200));
  const b = await run({ '/index.pug': TPL }, '/index.pug');
  b.orch.loadProject(new Map([['/index.pug', TPL]]), 'importado', [], parsed);
  await sleep(800);
  check('25 importar restaura juegos y activo', b.DataState.datasetOptions().length === 2 && b.DataState.activeDataset().name === 'Lleno' && b.DataState.data().user.nombre === 'Persistido', JSON.stringify(b.DataState.datasetOptions()));
  check('25 y compila con ellos', !errs(b) && html(b).includes('Persistido'), errs(b));
  b.orch.loadProject(new Map([['/index.pug', TPL]]), 'sin-datasets', [], null);
  check('25 proyecto sin juegos: uno solo "Por defecto"', b.DataState.datasetOptions().length === 1 && b.DataState.activeDataset().name === 'Por defecto');
  check('25 datasets.json inválido se ignora', parseDatasetsFile('{"datasets":"x"}') === null);
}
