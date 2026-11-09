import { check, run } from '../lib.mjs';
// Errores de Pug y de JavaScript con explicación y, cuando se puede, con línea
const first = async (src) => { const a = await run({ '/main.pug': src }, '/main.pug'); return a.PreviewState.errors()[0]; };

{
  const e = await first('p ok\n- var a = 1\n- var x = ;\np= a\n');
  check('48 un error de JavaScript sin línea se localiza', e?.line === 3, JSON.stringify(e));
  check('48 y se explica', /JavaScript con errores/.test(e?.hint ?? ''), JSON.stringify(e));
}
{
  const e = await first('div\n\tp a\n  p b\n');
  check('48 tabuladores y espacios mezclados se explican', /tabuladores y espacios/.test(e?.hint ?? ''), JSON.stringify(e));
}
{
  const e = await first('p a\nelse\n  p b\n');
  check('48 else sin if se explica', /sin su `if`/.test(e?.hint ?? ''), JSON.stringify(e));
}
{
  const e = await first('mixin m()\n  +m()\n+m()\n');
  check('48 la recursión infinita de un mixin se explica', /se llama a sí mismo/.test(e?.hint ?? ''), JSON.stringify(e));
}
{
  const e = await first('p(a=)\n');
  check('48 un atributo sin valor se explica', /atributo mal escrito/.test(e?.hint ?? ''), JSON.stringify(e));
}
