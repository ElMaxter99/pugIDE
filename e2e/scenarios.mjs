import { makeApp } from './harness.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + extra)); if (!ok) fails++; };
async function run(files, open, mutate) {
  const app = await makeApp(files, open);
  await app.orch.initialize();
  await app.orch.manualCompile();
  if (mutate) await mutate(app);
  return app;
}
const html = (a) => a.PreviewState.compiledHtml();
const errs = (a) => a.PreviewState.errors().map((e) => e.message).join(' | ');

// 1. index + mixin with args, include with .pug
{
  const a = await run({
    '/index.pug': 'doctype html\nhtml\n  body\n    include mixins/card.pug\n    +card(user)\n',
    '/mixins/card.pug': 'mixin card(u)\n  .card\n    h2= u.name\n    p= u.bio\n',
  }, '/index.pug');
  check('1 include .pug + mixin compiles', !errs(a), errs(a));
  check('1 data has user.name & bio', a.DataState.data().user?.name !== undefined && a.DataState.data().user?.bio !== undefined, JSON.stringify(a.DataState.data()));
}
// 2. include without extension
{
  const a = await run({
    '/index.pug': 'html\n  body\n    include mixins/card\n    +card(user)\n',
    '/mixins/card.pug': 'mixin card(u)\n  h2= u.name\n',
  }, '/index.pug');
  check("2 include without extension", !errs(a) && html(a).includes("<h2"), errs(a) + " " + html(a).slice(0, 200) + JSON.stringify(a.TerminalState.entries().slice(-3)));
}
// 3. mixin uses global var directly (not an argument)
{
  const a = await run({
    '/index.pug': 'html\n  body\n    include m.pug\n    +hero()\n',
    '/m.pug': 'mixin hero()\n  h1= siteTitle\n  p= site.tagline\n',
  }, '/index.pug');
  check('3 global vars used inside mixin are in data', 'siteTitle' in a.DataState.data() && a.DataState.data().site?.tagline !== undefined, JSON.stringify(a.DataState.data()) + errs(a));
}
// 4. active tab is the mixin file (user edits the mixin) -> preview should still render index
{
  const a = await run({
    '/index.pug': 'html\n  body\n    include m.pug\n    +hero(t)\n',
    '/m.pug': 'mixin hero(x)\n  h1= x.title\n',
  }, '/m.pug');
  check('4 editing mixin file still renders index', html(a).includes('<body'), 'html=' + JSON.stringify(html(a).slice(0, 80)));
}
// 5. mixin with each over arg and nested mixin call
{
  const a = await run({
    '/index.pug': 'html\n  body\n    include c.pug\n    +list(menu)\n',
    '/c.pug': 'mixin item(i)\n  li= i.label\nmixin list(items)\n  ul\n    each it in items\n      +item(it)\n',
  }, '/index.pug');
  check('5 mixin each+nested', !errs(a), errs(a));
  check('5 data.menu is array w/ label', Array.isArray(a.DataState.data().menu) && a.DataState.data().menu[0] && 'label' in a.DataState.data().menu[0], JSON.stringify(a.DataState.data()));
}
// 6. variable referenced only in mixin default/attrs and mixin called with literal
{
  const a = await run({
    '/index.pug': 'html\n  body\n    include c.pug\n    +btn("Go")\n',
    '/c.pug': 'mixin btn(label)\n  a(href=cfg.url class=cfg.cls)= label\n',
  }, '/index.pug');
  check('6 cfg vars inside mixin defined', a.DataState.data().cfg && 'url' in a.DataState.data().cfg, JSON.stringify(a.DataState.data()) + errs(a));
}
// 7. extends/block layout
{
  const a = await run({
    '/index.pug': 'extends layout.pug\nblock content\n  h1= title\n',
    '/layout.pug': 'html\n  head\n    title= pageTitle\n  body\n    block content\n',
  }, '/index.pug');
  check('7 extends layout', !errs(a) && html(a).includes('<h1'), errs(a) + html(a).slice(0, 100));
  check('7 data has title,pageTitle', 'title' in a.DataState.data() && 'pageTitle' in a.DataState.data(), JSON.stringify(a.DataState.data()));
}
// 8. rapid change during compile is not lost (paste)
{
  const a = await run({ '/index.pug': 'p= a\n' }, '/index.pug');
  const p1 = a.orch.manualCompile();
  a.orch.onCodeChange('p= a\np bb\np cc\n');
  await p1;
  await sleep(800);
  check('8 latest content compiled after overlap', html(a).includes('bb'), html(a));
}

import { readFileSync, readdirSync } from 'node:fs';
// 9. demo project, starting from EMPTY data: must compile with no errors
{
  const d = new URL('../src/assets/demo/', import.meta.url).pathname;
  const files = { '/main.pug': readFileSync(d + 'main.pug', 'utf8') };
  for (const f of readdirSync(d + 'components')) files['/components/' + f] = readFileSync(d + 'components/' + f, 'utf8');
  const a = await run(files, '/main.pug');
  check('9 demo compiles with empty data', !errs(a), errs(a));
  check('9 demo html non-empty', html(a).includes('<body'));
}
// 10. mixin with interpolation, conditional, default arg, block, attrs; empty data must not throw
{
  const a = await run({
    '/index.pug': 'html\n  body\n    include m\n    +panel(info)\n      p inside\n    +badge(info.status, "x")\n',
    '/m.pug': 'mixin panel(d, cls="a")\n  .panel(class=cls)\n    h3 #{d.heading} - #{d.sub.deep}\n    if d.flag\n      span= d.note\n    else\n      span none\n    block\nmixin badge(text, kind)\n  b(title=kind)= text\n',
  }, '/index.pug');
  check('10 mixin interp/cond/block/default', !errs(a), errs(a));
  const d = a.DataState.data();
  check('10 data shape', d.info && 'heading' in d.info && d.info.sub && 'deep' in d.info.sub && 'flag' in d.info && 'note' in d.info && 'status' in d.info, JSON.stringify(d));
}
// 11. user pastes whole file into index when mixin tab is active, then edits data
{
  const a = await run({ '/index.pug': 'p x\n', '/m.pug': 'mixin a(v)\n  p= v.t\n' }, '/index.pug');
  a.orch.addFile('/n.pug', 'n.pug', '');
  await a.orch.manualCompile();
  check('11 empty new file active does not blank preview', html(a).includes('<p'), JSON.stringify(html(a).slice(0, 60)));
}
// 12. data overrides: user-set data wins, not clobbered by skeleton
{
  const a = await run({ '/index.pug': 'h1= site.title\nul\n  each u in users\n    li= u.name\n' }, '/index.pug');
  a.DataState.setData({ site: { title: 'Hola' }, users: [{ name: 'Ana' }] });
  await a.orch.manualCompile();
  check('12 user data rendered', html(a).includes('Hola') && html(a).includes('Ana'), html(a).slice(0, 120));
}

// 13. deleting an include and saving the entry regenerates it (and shows in the tree)
{
  const a = await run({
    '/main.pug': 'html\n  body\n    include a/_mixins.pug\n    each u in us\n      +card(u)\n',
    '/a/_mixins.pug': 'mixin card(u)\n  p= u.name\n',
  }, '/main.pug');
  a.orch.deleteFile('/a/_mixins.pug');
  await a.orch.manualCompile();
  const inTree = JSON.stringify(a.ProjectState.fileTree()).includes('_mixins.pug');
  check('13 missing include regenerated on compile', a.EditorState.files().has('/a/_mixins.pug') && inTree, 'files=' + [...a.EditorState.files().keys()] + ' tree=' + inTree);
}

// 14. user's usuarioCard example: typed, sensible empty data
{
  const a = await run({
    '/main.pug': 'html\n  body\n    h1 Usuarios\n    include a/_mixins.pug\n    each usuario in usuarios\n      +usuarioCard(usuario)\n',
    '/a/_mixins.pug': `mixin usuarioCard(usuario)
  article.usuario
    h2= usuario.nombre
    p
      strong Edad:
      |  #{usuario.edad} años
    p
      if usuario.activo
        |  Activo
      else
        |  Inactivo
    .direccion
      p Ciudad: #{usuario.direccion.ciudad}
      p País: #{usuario.direccion.pais}
    ul
      each habilidad in usuario.habilidades
        li= habilidad
`,
  }, '/main.pug');
  const want = { usuarios: [{ nombre: '', edad: 0, activo: false, direccion: { ciudad: '', pais: '' }, habilidades: [''] }] };
  check('14 skeleton', JSON.stringify(a.DataState.data()) === JSON.stringify(want) || JSON.stringify(Object.entries(a.DataState.data().usuarios[0]).sort()) === JSON.stringify(Object.entries(want.usuarios[0]).sort()), JSON.stringify(a.DataState.data()));
  check('14 compiles', !errs(a), errs(a));
  // adding a new field in the mixin extends existing items instead of being ignored
  a.DataState.setData({ usuarios: [{ nombre: 'Ana', edad: 3, activo: true, direccion: { ciudad: 'X', pais: 'Y' }, habilidades: ['js'] }, { nombre: 'Luis' }] });
  a.EditorState.files.update((f) => { f.set('/a/_mixins.pug', f.get('/a/_mixins.pug') + '    p= usuario.email\n'); return f; });
  await a.orch.manualCompile();
  const us = a.DataState.data().usuarios;
  check('14 new field added to every item, values kept', us.every((u) => 'email' in u) && us[0].nombre === 'Ana', JSON.stringify(us));
}

// 15. extension-less include of a missing file is created on save (not while auto-compiling), ./ is normalized
{
  const a = await run({
    '/main.pug': 'html\n  body\n    include ./mixins\n    include ./asdqwe\n    include ./\n',
    '/mixins.pug': 'mixin a()\n  p x\n',
  }, '/main.pug');
  const keys = [...a.EditorState.files().keys()].sort();
  check('15 missing ./asdqwe created as /asdqwe.pug, junk paths ignored', JSON.stringify(keys) === JSON.stringify(['/asdqwe.pug', '/main.pug', '/mixins.pug']), keys.join(','));
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
