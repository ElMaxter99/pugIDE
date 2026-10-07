import { check, run, html, errs, sleep } from '../lib.mjs';
import { readFileSync, readdirSync } from 'node:fs';
// Compilacion, datos y regeneracion de includes
// 8. rapid change during compile is not lost (paste)
{
  const a = await run({ '/index.pug': 'p= a\n' }, '/index.pug');
  const p1 = a.orch.manualCompile();
  a.orch.onCodeChange('p= a\np bb\np cc\n');
  await p1;
  await sleep(800);
  check('8 latest content compiled after overlap', html(a).includes('bb'), html(a));
}

// 9. demo project, starting from EMPTY data: must compile with no errors
{
  const d = new URL('../../src/assets/demo/', import.meta.url).pathname;
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
  // Los datos que faltan se crean con mocks realistas por nombre y tipo (nombre/edad/activo/ciudad...).
  const u0 = a.DataState.data().usuarios?.[0] ?? {};
  check('14 skeleton typed with mocks', typeof u0.nombre === 'string' && u0.nombre !== '' && typeof u0.edad === 'number' && typeof u0.activo === 'boolean' && typeof u0.direccion?.ciudad === 'string' && u0.direccion.ciudad !== '' && Array.isArray(u0.habilidades) && u0.habilidades.length === 1, JSON.stringify(a.DataState.data()));
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


// 18. cada edición sube contentVersion (el autoguardado depende de él: `files` se muta en sitio y no notifica)
{
  const a = await run({ '/index.pug': 'p x\n' }, '/index.pug');
  const v0 = a.EditorState.contentVersion();
  a.orch.onCodeChange('p x\np y\n');
  a.orch.onCodeChange('p x\np y\np z\n');
  check('18 contentVersion sube en cada edicion', a.EditorState.contentVersion() === v0 + 2, String(a.EditorState.contentVersion()));
}
