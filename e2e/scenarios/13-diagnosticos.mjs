import { check, run, sleep } from '../lib.mjs';
// Errores localizados por archivo (marcadores del editor) y filtros de Pug
const diag = (a) => a.DiagnosticsState.diagnostics();

{
  const a = await run({ '/index.pug': "p\n  a(href='x'\n" }, '/index.pug');
  const d = diag(a);
  check('13 error de sintaxis localizado en el archivo', d.length === 1 && d[0].path === '/index.pug' && d[0].line === 3 && d[0].severity === 'error', JSON.stringify(d));
  check('13 mensaje limpio, sin el fragmento de código', !d[0]?.message.includes('|') && d[0]?.message.includes('no closing bracket'), JSON.stringify(d));
}
{
  const a = await run({ '/index.pug': 'include partials/x.pug\n', '/partials/x.pug': 'div\n  p= a.b(\n' }, '/index.pug');
  const d = diag(a);
  check('13 el error de un parcial se marca en el parcial', d.length >= 1 && d.every((x) => x.path === '/partials/x.pug') && d[0].line === 2, JSON.stringify(d));
}
{
  const a = await run({ '/index.pug': "doctype html\nhtml\n  head\n    link(rel='stylesheet' href='s.scss')\n  body\n    p hi\n", '/s.scss': '.a {\n  color: red;\n}\n.b { width: ;\n' }, '/index.pug');
  const d = diag(a);
  check('13 error de SCSS con línea', d.length === 1 && d[0].path === '/s.scss' && d[0].line >= 4 && d[0].source === 'scss', JSON.stringify(d));
}
{
  const a = await run({ '/index.pug': "doctype html\nhtml\n  head\n    link(rel='stylesheet' href='t.less')\n  body\n    p hi\n", '/t.less': '.a {\n  color: @missing;\n}\n' }, '/index.pug');
  const d = diag(a);
  check('13 error de Less con línea', d.length === 1 && d[0].path === '/t.less' && d[0].line === 2, JSON.stringify(d));
}
{
  const a = await run({ '/index.pug': 'p ok\n' }, '/index.pug', async (x) => {
    x.EditorState.files.update((f) => { f.set('/index.pug', 'p\n  a(href=\n'); return f; });
    await x.orch.manualCompile();
    await sleep(50);
    x.EditorState.files.update((f) => { f.set('/index.pug', 'p ok\n'); return f; });
    await x.orch.manualCompile();
  });
  check('13 al corregir el error desaparecen los marcadores', diag(a).length === 0, JSON.stringify(diag(a)));
}
{
  const a = await run({ '/index.pug': 'p ok\n:markdown-it\n  # hi\n' }, '/index.pug');
  const d = diag(a);
  check('13 filtro desconocido: marcador con ayuda', d.length === 1 && d[0].line === 2 && d[0].message.includes(':cdata'), JSON.stringify(d));
}
{
  const a = await run({ '/index.pug': 'script\n  :cdata\n    a < b\n' }, '/index.pug');
  check('13 :cdata funciona', a.PreviewState.compiledHtml().includes('<![CDATA[a < b]]>') && diag(a).length === 0, a.PreviewState.compiledHtml().slice(0, 200) + JSON.stringify(diag(a)));
}
