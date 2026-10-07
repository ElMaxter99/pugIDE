import { check, run, html, errs, sleep } from '../lib.mjs';
// Hojas de estilo y preprocesadores
// 22. External / local stylesheet references
{
  const a = await run({
    '/index.pug': "doctype html\nhtml\n  head\n    link(rel='stylesheet' href='https://cdn.example.com/lib.css')\n    link(rel='stylesheet' href='styles/main.css')\n    link(rel='stylesheet' href='nope.css')\n  body\n    p hi\n",
    '/styles/main.css': "@import url('https://fonts.example.com/f.css');\n@import 'base';\n.a { color: red; }\n",
    '/styles/_base.scss': '.base { margin: 0; }\n',
    '/other.css': '.other { color: blue; }\n',
  }, '/index.pug');
  const h = html(a);
  check('22 remote link kept', h.includes('href="https://cdn.example.com/lib.css"'), h);
  check('22 local link inlined', !h.includes('href="styles/main.css"') && h.includes('data-href="/styles/main.css"') && h.includes('.a {') && h.includes('.base {'), h);
  check('22 remote @import hoisted first', h.indexOf('@import url("https://fonts.example.com/f.css")') !== -1 && h.indexOf('@import') < h.indexOf('.a {'), h);
  check('22 imported partial not duplicated', h.split('.base {').length === 2, h);
  check('22 unlinked project css still injected', h.includes('.other {'), h);
}
// 23. Real preprocessors: SCSS (@use/@import/mixins/math), indented Sass, Less (@import, vars, mixins)
{
  const a = await run({
    '/index.pug': "doctype html\nhtml\n  head\n    link(rel='stylesheet' href='styles/app.scss')\n    link(rel='stylesheet' href='styles/legacy.sass')\n    link(rel='stylesheet' href='styles/theme.less')\n  body\n    p hi\n",
    '/styles/app.scss': "@use 'sass:math';\n@import 'vars';\n@mixin pad($n) { padding: $n * 2px; }\n.s { @include pad(3); width: math.div(10px, 2); color: $c; &:hover { color: blue; } }\n",
    '/styles/_vars.scss': '$c: red;\n',
    '/styles/legacy.sass': '$x: 4px\n.ind\n  margin: $x\n  .deep\n    top: $x * 2\n',
    '/styles/theme.less': "@import 'colors';\n.mix(@a) { border: @a solid; }\n.l { .mix(1px); color: @brand; .n { width: (2px + 3px); } }\n",
    '/styles/colors.less': '@brand: #123456;\n',
  }, '/index.pug');
  const h = html(a);
  check('23 scss compiled (use/import/mixin/math)', h.includes('padding: 6px') && h.includes('width: 5px') && h.includes('color: red') && h.includes('.s:hover'), h + errs(a) + JSON.stringify(a.TerminalState.entries().slice(-3)));
  check('23 sass indented compiled', h.includes('.ind .deep') && h.includes('top: 8px'), h);
  check('23 less compiled (import/var/mixin)', h.includes('border: 1px solid') && h.includes('#123456') && h.includes('.l .n') && h.includes('width: 5px'), h);
  check('23 no <link> to local preprocessors left', !h.includes('<link'), h);
}
// 24. Uploading a stylesheet and an image (demo flow)
{
  const a = await run({
    '/index.pug': "doctype html\nhtml\n  head\n    link(rel='stylesheet' href='styles/up.css')\n  body\n    img(src='images/pic.png')\n",
  }, '/index.pug');
  check('24 missing stylesheet reported', errs(a).includes('up.css') || JSON.stringify(a.TerminalState.entries()).includes('up.css'), errs(a));
  await a.orch.addAssets([new File(['.up { color: teal; }'], 'up.css', { type: 'text/css' }), new File([new Uint8Array([137, 80, 78, 71])], 'pic.png', { type: 'image/png' })]);
  await sleep(500);
  const h = html(a);
  check('24 uploaded css inlined via <link>', h.includes('data-href="/styles/up.css"') && h.includes('.up {'), h);
  check('24 uploaded image served', h.includes('src="blob:') , h);
}
