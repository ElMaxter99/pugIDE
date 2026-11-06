import { check, openApp, previewText, previewFrame, waitUntil } from '../lib.mjs';

// El soporte de Pug que añade el render (filtro :markdown, métodos de helpers) se prueba aquí en el navegador, que ejecuta
// el bundle generado `render-sandbox.js` (el e2e de Node usa el render en línea y no vería un bundle desactualizado).
const session = {
  projectName: 'Soporte',
  files: {
    '/main.pug': "doctype html\nhtml\n  body\n    article\n      :markdown\n        # Título md\n\n        Texto con **fuerte** y [enlace](https://example.com) y [malo](javascript:alert(1)).\n\n        - uno\n        - dos\n    p#up= utils.upper(name)\n    p#money= money(total)\n",
    '/helpers.js': "module.exports = { money: (n) => n.toFixed(2) + ' EUR' };\n",
  },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
  datasets: { version: 1, activeId: 'ds-1', locale: 'es', datasets: [{ id: 'ds-1', name: 'Por defecto', data: { name: 'ana', total: 12.5 } }] },
};

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await waitUntil(async () => (await previewText(page)).includes('Título md'));
  const frame = await previewFrame(page);
  const html = await frame.evaluate(() => document.querySelector('article').innerHTML);
  check('17 :markdown genera HTML en el navegador (encabezado, negrita, enlace, lista)', html.includes('<h1') && html.includes('<strong') && html.includes('href="https://example.com"') && html.includes('<li') && html.includes('dos'), html);
  check('17 y anula los enlaces javascript:', !html.includes('href="javascript'), html);
  const text = await previewText(page);
  check('17 un método desconocido (utils.upper) devuelve su argumento', text.includes('ana'), text);
  check('17 los helpers de helpers.js se usan en la plantilla', text.includes('12.50 EUR'), text);
  check('17 sin errores en la terminal ni en la página', app.errors.length === 0 && (await page.locator('[data-testid="problem-strip"]').count()) === 0, app.errors.join(' | '));
  await app.close();
}
