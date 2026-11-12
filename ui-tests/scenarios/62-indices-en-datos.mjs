import { check, openApp, previewText, waitUntil } from '../lib.mjs';

// Una plantilla que lee un elemento por su índice (`productos[1].name`) no puede fallar porque los datos de ejemplo solo
// traigan un elemento: los datos generados y los que ya había se completan hasta los elementos que pide la plantilla.
const files = {
  '/main.pug': 'doctype html\nhtml\n  body\n    h1= cliente.nombre\n    p.primero= productos[0].name\n    p.segundo= productos[1].name\n    p.tercero= productos[2].name\n',
};

export default async function (env) {
  // 1. Proyecto nuevo: los datos se generan solos con 3 productos.
  const fresh = await openApp(env, { path: '/ide', session: { projectName: 'Índices', files, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' } });
  await fresh.page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  const stored = () => fresh.page.evaluate(() => { try { return JSON.parse(localStorage.getItem('pug-ide-project')); } catch { return null; } });
  check('62 los datos generados traen los 3 productos que lee la plantilla', !!(await waitUntil(async () => {
    const s = await stored();
    const list = s?.datasets?.datasets?.find((d) => d.id === s.datasets.activeId)?.data?.productos;
    return Array.isArray(list) && list.length >= 3;
  }, 10000)), JSON.stringify((await stored())?.datasets ?? null).slice(0, 300));
  check('62 la vista previa compila sin el error de «undefined»', !!(await waitUntil(async () => { const t = await previewText(fresh.page); return t.trim().length > 0 && !/Cannot read properties/.test(t); }, 10000)), await previewText(fresh.page));
  check('62 sin errores no controlados (proyecto nuevo)', fresh.errors.length === 0, fresh.errors.join(' | '));
  await fresh.close();

  // 2. Datos que ya existían con un solo producto: se completan, sin tocar el que había.
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Índices', files, datasets: { version: 1, activeId: 'ds-1', locale: 'es', datasets: [{ id: 'ds-1', name: 'Por defecto', data: { cliente: { nombre: 'Norte Analytics' }, productos: [{ name: 'Licencia anual' }] } }] }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  check('62 con datos previos de un solo producto, la vista previa no falla', !!(await waitUntil(async () => (await previewText(page)).includes('Norte Analytics') && !/Cannot read properties/.test(await previewText(page)), 10000)), await previewText(page));
  check('62 el producto que había se conserva', (await previewText(page)).includes('Licencia anual'), await previewText(page));
  check('62 sin errores no controlados (datos previos)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
