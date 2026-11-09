import { check, run, html, sleep } from '../lib.mjs';
// P-22: idioma por defecto y de reserva.
const PUG = "doctype html\nhtml\n  body\n    h1= t('HOME.TITLE')\n    p= t('HOME.INTRO')\n    p= t('HOME.EXTRA')\n";
const files = {
  '/index.pug': PUG,
  '/locales/en/translations.json': '{\n  "HOME": { "TITLE": "Home", "INTRO": "Welcome", "EXTRA": "Extra" }\n}\n',
  '/locales/es-CAT/translations.json': '{\n  "HOME": { "TITLE": "Inici", "INTRO": "", "EXTRA": "" }\n}\n',
  '/locales/es-ES/translations.json': '{\n  "HOME": { "TITLE": "Inicio", "INTRO": "Bienvenido", "EXTRA": "" }\n}\n',
};

{
  const a = await run(files, '/index.pug');
  check('27 sin ajustes se abre el primero por orden (en)', a.orch.activeLocale() === 'en');
  a.orch.setLocaleSettings({ defaultLocale: 'es-ES', fallbackLocale: null });
  await sleep(400);
  check('27 el idioma por defecto manda cuando no se eligió otro', a.orch.activeLocale() === 'es-ES' && html(a).includes('Inicio'), a.orch.activeLocale());
  check('27 sin reserva, una clave vacía muestra la clave', html(a).includes('HOME.EXTRA'), html(a));
  a.orch.setLocaleSettings({ defaultLocale: 'es-ES', fallbackLocale: 'en' });
  await sleep(400);
  check('27 con reserva, la clave vacía usa el texto del otro idioma', html(a).includes('Extra') && !html(a).includes('HOME.EXTRA') && html(a).includes('Inicio'), html(a));
  const warn = a.TerminalState.entries().filter((e) => e.source === 'Idiomas' && /usa el texto de en|usan el texto de en/.test(e.message));
  check('27 el Registro avisa de qué claves usan la reserva', warn.length === 1 && /HOME\.EXTRA/.test(warn[0].message), JSON.stringify(a.TerminalState.entries().map((e) => e.message)));
  a.orch.setTranslationLocale('es-CAT');
  await sleep(400);
  check('27 elegir otro idioma gana al de por defecto y se rellena desde la reserva', html(a).includes('Inici') && html(a).includes('Welcome') && html(a).includes('Extra'), html(a));
  check('27 los archivos de idioma no se tocan al aplicar la reserva', JSON.parse(a.EditorState.files().get('/locales/es-CAT/translations.json')).HOME.INTRO === '');
  const snap = a.DataState.snapshotDatasets();
  check('27 los ajustes viajan en la sesión', snap.defaultLocale === 'es-ES' && snap.fallbackLocale === 'en', JSON.stringify(snap));
}
{
  // Un idioma de reserva que ya no existe se ignora sin romper
  const a = await run(files, '/index.pug');
  a.orch.setLocaleSettings({ defaultLocale: 'fr', fallbackLocale: 'zz' });
  await sleep(400);
  check('27 ajustes que apuntan a idiomas que no existen no rompen nada', a.orch.activeLocale() === 'en' && html(a).includes('Home'), html(a));
}
