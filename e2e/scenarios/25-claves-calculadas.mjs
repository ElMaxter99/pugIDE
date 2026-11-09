import { check, run, html, sleep } from '../lib.mjs';
// Claves de traducción calculadas con una variable del template: `t(`TEXT_${s}`)`
const PUG = "doctype html\nhtml\n  body\n    - var textS = 'SINGLE'\n    - var n = 3\n    - var suf = n === 1 ? 'ONE' : 'MANY'\n    p= t(`TEXT_${textS}`)\n    p= t(`ITEMS_${suf}`, { count: n })\n";
{
  const a = await run({ '/index.pug': PUG }, '/index.pug');
  const t = a.DataState.data().translations ?? {};
  check('49 la clave calculada con una variable de texto entra en las traducciones', 'TEXT_SINGLE' in t, JSON.stringify(t));
  check('49 un ternario de textos genera las dos claves', 'ITEMS_ONE' in t && 'ITEMS_MANY' in t, JSON.stringify(t));
  check('49 y se rellena con un texto de ejemplo, como el resto de claves', typeof t.TEXT_SINGLE === 'string' && t.TEXT_SINGLE.length > 0 && html(a).includes(t.TEXT_SINGLE.slice(0, 20)), JSON.stringify(html(a).slice(0, 300)));
  a.DataState.setData({ ...a.DataState.data(), translations: { ...t, TEXT_SINGLE: 'Solo uno' } });
  await a.orch.manualCompile();
  check('49 al traducirla se usa', html(a).includes('Solo uno'), html(a).slice(0, 200));
}
{
  const a = await run({ '/index.pug': PUG, '/locales/es-ES/translations.json': '{}\n' }, '/index.pug');
  await sleep(300);
  const j = JSON.parse(a.EditorState.files().get('/locales/es-ES/translations.json'));
  check('49 con idiomas, las claves calculadas se añaden vacías al archivo', j.TEXT_SINGLE === '' && j.ITEMS_ONE === '' && j.ITEMS_MANY === '', JSON.stringify(j));
}
{
  const a = await run({ '/index.pug': "doctype html\nhtml\n  body\n    p= t(`TEXT_${dato}`)\n" }, '/index.pug');
  const t = a.DataState.data().translations ?? {};
  check('49 una clave calculada con un dato no inventa claves', Object.keys(t).length === 0, JSON.stringify(t));
}
