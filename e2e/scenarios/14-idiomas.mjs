import { check, run, html, sleep } from '../lib.mjs';
// Traducciones por idioma: /locales/<código>/translations.json
const PUG = "doctype html\nhtml\n  body\n    h1= t('HOME.TITLE')\n    p= t('HOME.INTRO')\n";
const files = {
  '/index.pug': PUG,
  '/locales/es-ES/translations.json': '{\n  "HOME": { "TITLE": "Hola", "INTRO": "Bienvenido" }\n}\n',
  '/locales/es-CAT/translations.json': '{\n  "HOME": { "TITLE": "Hola (cat)", "INTRO": "Benvingut" }\n}\n',
};
const read = (a, p) => a.EditorState.files().get(p);

{
  const a = await run(files, '/index.pug');
  check('14 el idioma por defecto es el primero (es-CAT por orden)', html(a).includes('Hola (cat)') && a.orch.activeLocale() === 'es-CAT', html(a).slice(0, 200));
  check('14 los idiomas se detectan', a.orch.locales().join() === 'es-CAT,es-ES', a.orch.locales().join());
  a.orch.setTranslationLocale('es-ES');
  await sleep(300);
  check('14 cambiar de idioma recompila con sus traducciones', html(a).includes('>Hola<') && html(a).includes('Bienvenido') && !html(a).includes('Benvingut'), html(a).slice(0, 300));
  check('14 el idioma elegido viaja en la sesión', a.DataState.snapshotDatasets().translationLocale === 'es-ES');
  check('14 con locales no se crea data.translations', !('translations' in a.DataState.data()), JSON.stringify(a.DataState.data()));
}
{
  // Clave nueva en la plantilla: se añade, vacía, a todos los idiomas
  const a = await run(files, '/index.pug', async (x) => {
    x.EditorState.files.update((f) => { f.set('/index.pug', PUG + "    p= t('HOME.NEW')\n"); return f; });
    x.EditorState.editorContent.set(PUG + "    p= t('HOME.NEW')\n");
    await x.orch.manualCompile();
  });
  for (const code of ['es-ES', 'es-CAT']) {
    const parsed = JSON.parse(read(a, `/locales/${code}/translations.json`));
    check(`14 la clave nueva se añade vacía a ${code} sin pisar lo traducido`, parsed.HOME.NEW === '' && parsed.HOME.TITLE !== '', read(a, `/locales/${code}/translations.json`));
  }
  check('14 una traducción vacía muestra la clave', html(a).includes('HOME.NEW'), html(a));
}
{
  // JSON inválido en un idioma: diagnóstico en ese archivo, el resto sigue funcionando
  const a = await run({ ...files, '/locales/es-ES/translations.json': '{\n  "HOME": { "TITLE": "Hola", \n}\n' }, '/index.pug');
  const d = a.DiagnosticsState.diagnostics().filter((x) => x.path === '/locales/es-ES/translations.json');
  check('14 un JSON inválido se marca en su archivo', d.length === 1 && d[0].message.startsWith('JSON no válido'), JSON.stringify(a.DiagnosticsState.diagnostics()));
  check('14 y no se sobrescribe', read(a, '/locales/es-ES/translations.json').includes('"TITLE": "Hola", \n}'));
}
{
  // Migración: el primer idioma recoge data.translations
  const a = await run({ '/index.pug': PUG }, '/index.pug');
  a.DataState.setData({ ...a.DataState.data(), translations: { HOME: { TITLE: 'Título', INTRO: 'Intro' } } });
  await a.orch.manualCompile();
  check('14 sin locales las traducciones siguen en los datos', html(a).includes('Título'), html(a));
  check('14 añadir idioma con código inválido falla', a.orch.addLocale('es_ES') === false && a.orch.locales().length === 0);
  check('14 añadir el primer idioma', a.orch.addLocale('es-ES') === true);
  await sleep(300);
  const text = read(a, '/locales/es-ES/translations.json');
  check('14 recoge las traducciones de los datos', JSON.parse(text).HOME.TITLE === 'Título', text);
  check('14 y las quita de los datos', !('translations' in a.DataState.data()), JSON.stringify(a.DataState.data()));
  check('14 el preview las sigue mostrando', html(a).includes('Título'), html(a).slice(0, 200));
  a.orch.addLocale('es-CAT');
  await sleep(300);
  const cat = JSON.parse(read(a, '/locales/es-CAT/translations.json'));
  check('14 el segundo idioma copia las claves vacías', cat.HOME.TITLE === '' && cat.HOME.INTRO === '', JSON.stringify(cat));
  check('14 y pasa a ser el activo', a.orch.activeLocale() === 'es-CAT' && html(a).includes('HOME.TITLE'), a.orch.activeLocale());
}
