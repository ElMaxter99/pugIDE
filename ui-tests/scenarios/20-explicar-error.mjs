import { check, openApp, waitUntil } from '../lib.mjs';

// Un mixin que se llama pero no existe: el aviso lo explica y un botón lleva a la línea del error
export default async function (env) {
  const app = await openApp(env, {
    path: '/ide',
    session: {
      projectName: 'Mixin ausente',
      files: {
        '/main.pug': 'html\n  body\n    include ./mixins\n' + '    //- relleno\n'.repeat(60) + '    .report\n      +azBody(1)\n',
        '/mixins.pug': 'mixin saludo(nombre)\n  p Hola, #{nombre}\n',
      },
      openTabPaths: ['/mixins.pug'],
      activeTabPath: '/mixins.pug',
    },
  });
  const { page } = app;
  const banner = page.locator('.compile-error');
  await banner.waitFor({ timeout: 10000 });
  const text = await banner.innerText();
  check('20 el aviso no arrastra la ruta ni el fragmento de código', !text.includes('|') && !text.includes('/main.pug:'), text);
  check('20 el aviso explica que el mixin azBody no está definido', /azBody/.test(text) && /ningún archivo define/.test(text), text);
  check('20 el aviso lista los mixins que sí existen', text.includes('+saludo'), text);
  const btn = banner.getByRole('button', { name: /Ir al error \(main\.pug:65\)/ });
  check('20 hay un botón que apunta a main.pug:65', (await btn.count()) === 1, text);
  await btn.click();
  const active = await waitUntil(async () => {
    const r = await page.evaluate(() => {
      const ed = window.monaco.editor.getEditors?.()[0];
      return ed ? { path: ed.getModel()?.uri.path, line: ed.getPosition()?.lineNumber, top: ed.getVisibleRanges()[0]?.startLineNumber, bottom: ed.getVisibleRanges().at(-1)?.endLineNumber } : null;
    });
    return r?.path === '/main.pug' && r.top <= 65 && r.bottom >= 65 ? r : null;
  }, 6000);
  check('20 el botón abre main.pug', !!active, JSON.stringify(active));
  check('20 y deja la línea del error a la vista', !!active && active.top <= 65 && active.bottom >= 65, JSON.stringify(active));
  check('20 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
