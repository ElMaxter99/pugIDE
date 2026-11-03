import { check, run, html } from '../lib.mjs';
// El preview anota cada etiqueta con data-pugide-line: se ignora al comparar.
const plain = (a) => html(a).replace(/ data-pugide-line="\d+"/g, '');
// Filtro :markdown y llamadas a métodos que no son de los datos (helpers de objeto)
{
  const a = await run({ '/index.pug': "article\n  :markdown\n    # Título\n\n    Texto con **fuerte** y [enlace](https://example.com).\n\n    - uno\n    - dos\n" }, '/index.pug');
  const h = plain(a);
  check('17 :markdown genera HTML', h.includes('<h1>Título</h1>') && h.includes('<strong>fuerte</strong>') && h.includes('<a href="https://example.com">enlace</a>') && h.includes('<li>dos</li>'), h.slice(0, 400));
  check('17 sin errores', a.PreviewState.errors().length === 0, JSON.stringify(a.PreviewState.errors()));
}
{
  for (const name of ['markdown-it', 'marked']) {
    const a = await run({ '/index.pug': `:${name}\n  *hola*\n` }, '/index.pug');
    check(`17 :${name} es un alias`, plain(a).includes('<em>hola</em>'), plain(a).slice(0, 200));
  }
}
{
  const a = await run({ '/index.pug': ":markdown\n  <script>alert(1)</script> [x](javascript:alert(1))\n" }, '/index.pug');
  check('17 :markdown no deja pasar HTML ni javascript:', !plain(a).includes('<script>alert') && plain(a).includes('&lt;script&gt;') && !plain(a).includes('href="javascript'), plain(a).slice(0, 300));
}
{
  const a = await run({ '/index.pug': ":scss\n  a { b: c }\n" }, '/index.pug');
  check('17 un filtro desconocido lista ahora los disponibles', a.DiagnosticsState.diagnostics()[0]?.message.includes(':markdown'), JSON.stringify(a.DiagnosticsState.diagnostics()));
}
{
  // utils.upper(name) sin helpers: ya no falla, devuelve el argumento, y no crea un dato "utils"
  const a = await run({ '/index.pug': "p= utils.upper(name)\np= price.toFixed(2)\np= tags.join(', ')\n" }, '/index.pug', async (x) => {
    x.DataState.setData({ name: 'ana', price: 3, tags: ['a', 'b'] });
    await x.orch.manualCompile();
  });
  const h = html(a);
  check('17 un método desconocido (utils.upper) devuelve su argumento en vez de fallar', h.includes('>ana</p>') && a.PreviewState.errors().length === 0, h.slice(0, 300) + JSON.stringify(a.PreviewState.errors()));
  check('17 los métodos reales de los datos siguen funcionando', h.includes('>3.00</p>') && h.includes('>a, b</p>'), h.slice(0, 300));
  check('17 no se crea un dato "utils"', !('utils' in a.DataState.data()), JSON.stringify(a.DataState.data()));
}
{
  // Con helpers.js, el método de objeto es el real
  const a = await run({ '/index.pug': "p= utils.upper(name)\n", '/helpers.js': "module.exports = { utils: { upper: (s) => String(s).toUpperCase() } };" }, '/index.pug', async (x) => {
    x.DataState.setData({ name: 'ana' }); await x.orch.manualCompile();
  });
  check('17 con helpers.js se usa el helper real', html(a).includes('>ANA</p>'), html(a).slice(0, 200));
}
