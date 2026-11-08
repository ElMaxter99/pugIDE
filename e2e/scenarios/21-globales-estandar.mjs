import { check, run, html, errs } from '../lib.mjs';
// Los globales estándar (encodeURIComponent, btoa, Intl, URL…) no los tapan los datos de ejemplo
const MAIN = [
  'doctype html', 'html', '  body',
  "    p#a= encodeURIComponent('hola mundo & más')",
  "    p#b= decodeURIComponent('a%20b')",
  "    p#c= btoa('hola')",
  "    p#d= atob('aG9sYQ==')",
  '    p#e= typeof Intl',
  "    p#f= new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(1234.5)",
  "    p#g= new URL('https://ejemplo.es/ruta?x=1').host",
  "    p#h= new URLSearchParams('a=1&b=2').get('b')",
  '    p#i= typeof structuredClone',
  '    p#j= typeof BigInt',
  '    p#k= location',
  '',
].join('\n');

{
  const a = await run({ '/main.pug': MAIN }, '/main.pug');
  const out = html(a);
  const text = (id) => new RegExp(`<p[^>]*\\sid="${id}"[^>]*>([^<]*)</p>`).exec(out)?.[1];
  check('45 encodeURIComponent codifica de verdad', text('a') === 'hola%20mundo%20%26%20m%C3%A1s', String(text('a')));
  check('45 decodeURIComponent decodifica', text('b') === 'a b', String(text('b')));
  check('45 btoa y atob funcionan', text('c') === 'aG9sYQ==' && text('d') === 'hola', `${text('c')} ${text('d')}`);
  check('45 Intl es el objeto estándar y formatea moneda', text('e') === 'object' && /1\.?234,50\s*€/.test(text('f') ?? ''), `${text('e')} ${text('f')}`);
  check('45 URL y URLSearchParams funcionan', text('g') === 'ejemplo.es' && text('h') === '2', `${text('g')} ${text('h')}`);
  check('45 structuredClone y BigInt existen', text('i') === 'function' && text('j') === 'function', `${text('i')} ${text('j')}`);
  check('45 ninguno de ellos aparece como dato inventado', !('Intl' in a.DataState.data()) && !('encodeURIComponent' in a.DataState.data()) && !('btoa' in a.DataState.data()), JSON.stringify(Object.keys(a.DataState.data())));
  check('45 un dato plausible como «location» sigue siendo un dato', 'location' in a.DataState.data(), JSON.stringify(Object.keys(a.DataState.data())));
  check('45 sin errores', !errs(a), errs(a));
}
