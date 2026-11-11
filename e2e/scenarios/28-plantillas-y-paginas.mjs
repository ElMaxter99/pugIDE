import { check, run, html, sleep } from '../lib.mjs';
// P-24 y P-25 en los servicios: exportar cada plantilla sin tocar la vista previa, y plantillas propias.
const files = {
  '/portada.pug': "doctype html\nhtml\n  head\n    link(rel='stylesheet' href='styles/a.css')\n  body\n    include partials/cabecera\n    h1 Portada de #{cliente}\n    a(href='factura.pug') Factura\n",
  '/factura.pug': "doctype html\nhtml\n  body\n    h1 Factura de #{cliente}\n    a(href='./portada.pug#inicio') Volver\n",
  '/rota.pug': "p= (\n",
  '/partials/cabecera.pug': 'header Norte\n',
  '/styles/a.css': 'h1 { color: #333 }\n',
};
{
  const a = await run(files, '/portada.pug');
  a.DataState.setData({ cliente: 'Albor' });
  await a.orch.manualCompile();
  const pages = a.orch.templatePages();
  check('51 las páginas son las plantillas que nadie incluye', pages.pages.join() === '/factura.pug,/portada.pug,/rota.pug' && pages.partials.join() === '/partials/cabecera.pug', JSON.stringify(pages));
  const before = html(a);
  const p = await a.orch.renderStandalone('/portada.pug');
  check('51 renderStandalone compila con datos, parciales y estilos', !!p.html && p.html.includes('Portada de Albor') && p.html.includes('Norte') && /<style[^>]*>[\s\S]*#333/.test(p.html), (p.html ?? p.errors.join()));
  check('51 los enlaces entre plantillas pasan a .html', p.html.includes('href="factura.html"'), p.html);
  const f = await a.orch.renderStandalone('/factura.pug');
  check('51 otra plantilla, con su enlace relativo y su ancla', !!f.html && f.html.includes('Factura de Albor') && f.html.includes('href="./portada.html#inicio"'), f.html ?? f.errors.join());
  check('51 sin restos del editor', !/data-pugide|pugide-inspector/.test(p.html));
  const bad = await a.orch.renderStandalone('/rota.pug');
  check('51 una plantilla que no compila devuelve sus errores', bad.html === null && bad.errors.length > 0, JSON.stringify(bad));
  check('51 exportar no cambia la vista previa ni la plantilla elegida', html(a) === before && a.PreviewState.entryPath() === '/portada.pug');
  await a.orch.followTemplateLink('factura.pug#x');
  await sleep(300);
  check('51 seguir un enlace previsualiza esa plantilla', a.PreviewState.entryPath() === '/factura.pug' && html(a).includes('Factura de Albor'), a.PreviewState.entryPath());
  await a.orch.followTemplateLink('noexiste.pug');
  check('51 un enlace a algo que no existe avisa y no cambia nada', a.PreviewState.entryPath() === '/factura.pug' && a.TerminalState.entries().some((e) => /no corresponde a ninguna plantilla/.test(e.message)));
}
{
  const a = await run({ '/main.pug': 'h1 Hola #{nombre}\n', '/locales/es/translations.json': '{}\n' }, '/main.pug');
  a.DataState.setData({ nombre: 'Ana' });
  await a.orch.manualCompile();
  const r = await a.orch.saveAsTemplate('  Base   cliente ', 'con datos', { data: true, assets: true, locales: false });
  check('52 guardar como plantilla limpia el nombre y cuenta los archivos', r.ok && r.meta.name === 'Base cliente' && r.meta.fileCount === 1 && r.meta.description === 'con datos', JSON.stringify(r));
  check('52 aparece en la lista', a.UserTemplateService.items().length === 1);
  check('52 sin nombre no se guarda', (await a.orch.saveAsTemplate('   ', '', { data: true, assets: true, locales: true })).ok === false);
  a.EditorState.files.update((f) => { f.set('/main.pug', 'p cambiado\n'); return f; });
  a.EditorState.editorContent.set('p cambiado\n');
  check('52 crear un proyecto desde la plantilla', (await a.orch.createFromUserTemplate(r.meta.id)) === true);
  await sleep(300);
  check('52 trae los archivos y los datos de la plantilla, no los del proyecto de ahora', a.EditorState.files().get('/main.pug') === 'h1 Hola #{nombre}\n' && a.DataState.data().nombre === 'Ana' && !a.EditorState.files().has('/locales/es/translations.json'), JSON.stringify([...a.EditorState.files().keys()]));
  check('52 el proyecto toma el nombre de la plantilla', a.ProjectState.projectName() === 'Base cliente', a.ProjectState.projectName());
  const up = await a.orch.saveAsTemplate('Base cliente', 'v2', { data: false, assets: true, locales: true }, r.meta.id);
  check('52 actualizar no crea otra plantilla', up.ok && a.UserTemplateService.items().length === 1 && a.UserTemplateService.items()[0].description === 'v2');
  check('52 una plantilla que ya no existe no rompe nada', (await a.orch.createFromUserTemplate('no-existe')) === false);
}
