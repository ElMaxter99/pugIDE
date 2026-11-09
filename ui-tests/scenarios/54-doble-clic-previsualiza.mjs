import { check, openApp, previewText, waitUntil } from '../lib.mjs';

// Doble clic en una plantilla Pug/Jade del árbol = «Previsualizar este archivo» del menú contextual.
const session = {
  projectName: 'Plantillas',
  files: {
    '/main.pug': 'doctype html\nhtml\n  body\n    h1 Portada principal\n',
    '/factura.pug': 'doctype html\nhtml\n  body\n    h1 Factura 2026\n',
    '/vieja.jade': 'doctype html\nhtml\n  body\n    h1 Plantilla jade\n',
    '/estilos.css': 'body { color: red; }\n',
  },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};
const row = (page, name) => page.locator('app-file-tree .file-item', { hasText: name });
const pinned = (page) => page.evaluate(() => document.querySelector('app-file-tree [data-testid="preview-mark"].pinned')?.closest('[data-path]')?.getAttribute('data-path') ?? null);

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await waitUntil(async () => /Portada principal/.test(await previewText(page)), 15000);

  await row(page, 'factura.pug').dblclick();
  const ok = await waitUntil(async () => /Factura 2026/.test(await previewText(page)), 8000);
  check('54 doble clic en un .pug lo previsualiza', !!ok, await previewText(page));
  check('54 queda elegido (marca «Vista previa» en el árbol)', (await pinned(page)) === '/factura.pug', String(await pinned(page)));

  await row(page, 'vieja.jade').dblclick();
  const jade = await waitUntil(async () => /Plantilla jade/.test(await previewText(page)), 8000);
  check('54 también con un .jade', !!jade, await previewText(page));

  await row(page, 'estilos.css').dblclick();
  await page.waitForTimeout(600);
  check('54 un archivo que no es plantilla no cambia la vista previa', (await pinned(page)) === '/vieja.jade' && /Plantilla jade/.test(await previewText(page)));

  // Lo mismo que el menú contextual
  await row(page, 'main.pug').click({ button: 'right' });
  await page.locator('app-context-menu .context-label', { hasText: 'Previsualizar este archivo' }).click();
  const menu = await waitUntil(async () => /Portada principal/.test(await previewText(page)), 8000);
  check('54 el menú «Previsualizar este archivo» sigue funcionando igual', !!menu && (await pinned(page)) === '/main.pug');
  await app.close();
}
