import { check, run, html, sleep } from '../lib.mjs';
// Importar un archivo de idioma (P-14): crea, fusiona y reemplaza
const PUG = "doctype html\nhtml\n  body\n    h1= t('HOME.TITLE')\n    p= t('HOME.INTRO')\n";
const read = (a, p) => a.EditorState.files().get(p);

{
  const a = await run({ '/index.pug': PUG }, '/index.pug');
  a.DataState.setData({ ...a.DataState.data(), translations: { HOME: { TITLE: 'Viejo' } } });
  const done = a.orch.importLocales([{ code: 'es-ES', text: '{ "HOME.TITLE": "Hola", "HOME.INTRO": "Bienvenido" }' }], 'merge');
  await sleep(400);
  check('47 importa el primer idioma', done.join() === 'es-ES' && a.orch.locales().join() === 'es-ES', done.join());
  check('47 las claves planas quedan anidadas', JSON.parse(read(a, '/locales/es-ES/translations.json')).HOME.TITLE === 'Hola', read(a, '/locales/es-ES/translations.json'));
  check('47 el preview usa el idioma importado', html(a).includes('Hola') && html(a).includes('Bienvenido'), html(a).slice(0, 200));
  check('47 con locales se quitan las traducciones de los datos', !('translations' in a.DataState.data()));

  a.orch.importLocales([{ code: 'es-ES', text: '{ "HOME": { "TITLE": "OTRO", "NEW": "n" } }' }], 'merge');
  const m = JSON.parse(read(a, '/locales/es-ES/translations.json'));
  check('47 fusionar no pisa lo traducido y añade lo nuevo', m.HOME.TITLE === 'Hola' && m.HOME.INTRO === 'Bienvenido' && m.HOME.NEW === 'n', JSON.stringify(m));

  a.orch.importLocales([{ code: 'es-ES', text: '{ "HOME": { "TITLE": "Solo esto" } }' }], 'replace');
  const r = JSON.parse(read(a, '/locales/es-ES/translations.json'));
  check('47 reemplazar sustituye el archivo', JSON.stringify(r.HOME) === '{"TITLE":"Solo esto"}' || (r.HOME.TITLE === 'Solo esto' && !r.HOME.NEW), JSON.stringify(r));

  check('47 un código inválido no importa nada', a.orch.importLocales([{ code: 'es_ES', text: '{ "A": "b" }' }], 'merge').length === 0);
  check('47 un JSON inválido no importa nada', a.orch.importLocales([{ code: 'en', text: '{ "A": ' }], 'merge').length === 0 && !a.orch.localeExists('en'));
  check('47 localeExists', a.orch.localeExists('es-ES') && !a.orch.localeExists('en'));
}
