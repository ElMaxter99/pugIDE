import { check } from '../lib.mjs';
// Herramientas de preview: mapeo a codigo Pug, script inyectado, presets de dispositivo
// 25. Preview tooling
{
  const { findPugSource, INSPECTOR_SCRIPT, DEVICE_PRESETS } = await import('../.build/services.mjs');
  const files = new Map([
    ['/index.pug', 'doctype html\nhtml\n  body\n    include parts/nav.pug\n    ul.list\n      each i in [1,2]\n        li.item= i\n    p.last text\n'],
    ['/parts/nav.pug', 'nav#main\n  a.link(href="/") Home\n'],
  ]);
  const code = files.get('/index.pug');
  const nav = findPugSource(code, files, '/index.pug', { tag: 'nav', id: 'main', classes: [], ordinal: 0, total: 1 });
  check('25 element inside include maps to included file', nav?.path === '/parts/nav.pug' && nav.line === 1 && !nav.approximate, JSON.stringify(nav));
  const p = findPugSource(code, files, '/index.pug', { tag: 'p', classes: ['last'], ordinal: 0, total: 1 });
  check('25 later element maps to its line', p?.path === '/index.pug' && p.line === 8, JSON.stringify(p));
  const li = findPugSource(code, files, '/index.pug', { tag: 'li', classes: ['item'], ordinal: 1, total: 2 });
  check('25 loop element maps to loop line, flagged approximate', li?.line === 7 && li.approximate === true, JSON.stringify(li));
  check('25 unknown tag has no origin', findPugSource(code, files, '/index.pug', { tag: 'table', classes: [], ordinal: 0, total: 1 }) === null);
  let parsed = true; try { new Function(INSPECTOR_SCRIPT); } catch (e) { parsed = false; }
  check('25 injected script is valid JS', parsed);
  check('25 presets include real phone/tablet/desktop sizes', ['mobile', 'tablet', 'desktop'].every((k) => DEVICE_PRESETS.some((d) => d.kind === k)));
}
