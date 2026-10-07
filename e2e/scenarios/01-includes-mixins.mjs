import { check, run, html, errs, sleep } from '../lib.mjs';
// Includes, mixins y extends
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
