import { check, openApp, waitUntil } from '../lib.mjs';

const markers = (page) => page.evaluate(() => window.monaco.editor.getModelMarkers({}).map((m) => ({ path: m.resource.path, line: m.startLineNumber, sev: m.severity, msg: m.message })));

// Los errores de compilación se subrayan en el editor y desaparecen al corregirlos
export default async function (env) {
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Errores', files: { '/main.pug': "doctype html\nhtml\n  body\n    p\n      a(href='x'\n" }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  const { page } = app;
  const found = await waitUntil(async () => (await markers(page)).length > 0 && (await markers(page)));
  check('07 el error de Pug aparece como marcador en el editor', !!found && found[0].path === '/main.pug' && found[0].sev === 8 && found[0].msg.includes('no closing bracket'), JSON.stringify(found));
  check('07 el marcador no arrastra el fragmento de código', !!found && !found[0].msg.includes('|'), JSON.stringify(found));
  check('07 el HTML de la página declara el idioma español', (await page.evaluate(() => document.documentElement.lang)) === 'es');

  // Corregir el error: se teclea el cierre al final del archivo
  await page.evaluate(() => {
    const model = window.monaco.editor.getModels().find((m) => m.uri.path === '/main.pug');
    model.setValue("doctype html\nhtml\n  body\n    p\n      a(href='x') ok\n");
  });
  const cleared = await waitUntil(async () => (await markers(page)).length === 0, 8000);
  check('07 al corregir el error el marcador desaparece', !!cleared, JSON.stringify(await markers(page)));
  check('07 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
