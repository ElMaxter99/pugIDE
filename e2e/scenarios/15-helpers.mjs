import { check, run, html, sleep } from '../lib.mjs';
// Helpers del usuario: /helpers.js y /helpers/*.js
const PUG = "doctype html\nhtml\n  body\n    p= money(total)\n    p= utils.upper(name)\n    p= shout(name)\n    p= formatDate('2020-01-01')\n";
const PLAIN = PUG.replace('    p= utils.upper(name)\n', '');
const HELPERS = "module.exports = { money: (n) => n.toFixed(2) + ' EUR', utils: { upper: (s) => s.toUpperCase() } };";

{
  const a = await run({ '/index.pug': PUG, '/helpers.js': HELPERS, '/helpers/more.js': "exports.shout = (s) => s + '!';" }, '/index.pug', async (x) => {
    x.DataState.setData({ total: 12.5, name: 'ana' });
    await x.orch.manualCompile();
  });
  const h = html(a);
  check('15 una función del helpers se usa en la plantilla', h.includes('12.50 EUR'), h.slice(0, 300));
  check('15 también las anidadas (utils.upper) y las de /helpers/*.js', h.includes('ANA') && h.includes('ana!'), h.slice(0, 300));
  check('15 una función sin helper sigue devolviendo su primer argumento', h.includes('2020-01-01'), h.slice(0, 300));
  check('15 sin errores', a.PreviewState.errors().length === 0, JSON.stringify(a.PreviewState.errors()));
}
{
  // Sin helpers.js todo sigue como antes (stub que devuelve el argumento)
  const a = await run({ '/index.pug': PLAIN }, '/index.pug', async (x) => { x.DataState.setData({ total: 5, name: 'bea' }); await x.orch.manualCompile(); });
  check('15 sin helpers.js las funciones desconocidas devuelven su argumento', html(a).includes('>5</p>') && html(a).includes('>bea</p>'), html(a).slice(0, 300));
}
{
  // Un helpers.js roto se marca en su archivo y la plantilla sigue renderizando
  const a = await run({ '/index.pug': PLAIN, '/helpers.js': 'module.exports = {\n  money: (n) => n,\n  x: ,\n};' }, '/index.pug');
  const d = a.DiagnosticsState.diagnostics().filter((x) => x.path === '/helpers.js');
  check('15 un helpers.js con error de sintaxis se marca en su archivo', d.length === 1 && d[0].source === 'javascript' && d[0].message.includes('SyntaxError'), JSON.stringify(a.DiagnosticsState.diagnostics()));
  check('15 y la plantilla se renderiza igualmente', html(a).includes('<body'), html(a).slice(0, 200));
}
{
  // Un helper que lanza al ejecutarse da un error de la plantilla, no un fallo silencioso
  const a = await run({ '/index.pug': "p= boom()\n", '/helpers.js': "module.exports = { boom: () => { throw new Error('mal'); } };" }, '/index.pug');
  check('15 un helper que falla en la plantilla se informa', a.PreviewState.errors().some((e) => e.message.includes('mal')), JSON.stringify(a.PreviewState.errors()));
}
{
  // Se actualiza al editar el archivo de helpers
  const a = await run({ '/index.pug': "p= f(1)\n", '/helpers.js': 'module.exports = { f: (x) => x + 1 };' }, '/index.pug', async (x) => {
    x.EditorState.files.update((m) => { m.set('/helpers.js', 'module.exports = { f: (x) => x + 100 };'); return m; });
    await x.orch.manualCompile();
  });
  check('15 editar helpers.js cambia el resultado', html(a).includes('>101</p>'), html(a).slice(0, 200));
}
