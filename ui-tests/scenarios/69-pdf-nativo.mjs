import { check, openApp, openLogTab, waitUntil } from '../lib.mjs';

// «Exportar → PDF…» con el motor nativo (P-39, solo escritorio). Se simula la app (window.pugideDesktop); el PDF de
// verdad (printToPDF) lo prueba desktop/test/smoke.mjs con Electron. Aquí: el menú, el diálogo, lo que se pide y los avisos.
const factura = `doctype html
html
  head
    style.
      @page { size: A4; margin: 18mm; }
  body
    h1 Factura FA-2026-0312
    img(src="img/logo.png" alt="Clínica Aurora")
    p Lucía Romero Vidal
`;
const session = { projectName: 'Clínica Aurora', files: { '/factura.pug': factura, '/roto.pug': 'div\n  p= cliente.nombre(\n' }, openTabPaths: ['/factura.pug'], activeTabPath: '/factura.pug', previewEntry: '/factura.pug' };

function fakeDesktop(cfg) {
  window.__calls = [];
  let resolveExport = null;
  window.__finishExport = () => resolveExport?.();
  window.pugideDesktop = Object.freeze({
    platform: 'win32', version: '0.16.0', webUrl: 'https://pug-ide.vercel.app',
    onEvent: () => () => undefined,
    invoke: async (channel, payload) => {
      window.__calls.push([channel, payload ?? null]);
      if (channel === 'ws:list') return { workspaces: [], lastId: null, colors: [] };
      if (channel === 'upd:state') return { current: '0.16.0', asked: true, enabled: false, lastCheck: 0, latest: null, dismissed: false, self: { phase: 'idle', canUpdate: true }, justUpdated: null };
      if (channel === 'pdf:export') {
        if (cfg.slow) await new Promise((r) => { resolveExport = r; });
        return { ok: true, path: 'C:\\Trabajo\\clinica-aurora\\exportados\\factura.pdf', dir: 'C:\\Trabajo\\clinica-aurora\\exportados', name: 'factura.pdf', pages: 12, bytes: 188416 };
      }
      if (channel === 'pdf:cancel' || channel === 'pdf:open' || channel === 'pdf:reveal') return { ok: true };
      return null;
    },
  });
}

async function desktop(env, cfg = {}, extra = {}) {
  const app = await openApp(env, { path: '/ide', session, storage: { 'pug-ide-workspaces-intro': '1', ...extra } });
  await app.page.addInitScript(fakeDesktop, cfg);
  await app.page.reload();
  await app.page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  return app;
}

const calls = (page, channel) => page.evaluate((c) => window.__calls.filter(([ch]) => ch === c).map(([, p]) => p), channel);
const menuItems = async (page) => { await page.locator('[data-testid="menu-exportar"]').click(); const t = await page.locator('[role="menuitem"]').allInnerTexts(); return t.join(' | '); };

export default async function (env) {
  // Web: sin cambios.
  let app = await openApp(env, { path: '/ide', session });
  let page = app.page;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  const web = await menuItems(page);
  check('69 en la web Exportar sigue con «Imprimir o guardar como PDF» y sin «PDF…»', /Imprimir o guardar como PDF/.test(web) && !/PDF…/.test(web), web);
  await app.close();

  // Escritorio.
  app = await desktop(env);
  page = app.page;
  const items = await menuItems(page);
  check('69 en escritorio: «PDF…» (nuevo) e «Imprimir…» aparte', /PDF…/.test(items) && /Imprimir…/.test(items) && !/guardar como PDF/.test(items), items);
  await page.locator('[role="menuitem"]', { hasText: 'PDF…' }).click();
  const dlg = page.locator('[data-testid="pdf-export"]');
  await dlg.waitFor({ timeout: 5000 });
  const save = page.locator('[data-testid="pdf-save"]');
  await waitUntil(async () => !(await save.isDisabled()), 8000);
  // Firefox y WebKit no incluyen en innerText la opción elegida de un <select>: se lee aparte.
  const chosen = (id) => page.locator(`[data-testid="${id}"]`).evaluate((el) => el.options[el.selectedIndex]?.text ?? '');
  const text = [await dlg.innerText(), await chosen('pdf-entry'), await chosen('pdf-paper'), await chosen('pdf-margins')].join('\n');
  check('69 el diálogo dice el archivo y la plantilla de la vista previa', /Exportar PDF · factura\.pdf/.test(text) && /factura\.pug \(la de la vista previa\)/.test(text), text);
  check('69 tamaño y márgenes del documento (@page: A4, 18 mm), vertical', /A4.*\(del documento\)/.test(text) && /@page: 18 mm/.test(text) && (await page.locator('[data-testid="pdf-orientation"]').inputValue()) === 'portrait', text);
  check('69 avisa antes de la imagen que no se encuentra', /1 imagen no se encuentra/.test(await page.locator('[data-testid="pdf-missing-images"]').innerText()));
  check('69 dice con qué datos y que el texto será seleccionable', /Datos: «/.test(text) && /Texto seleccionable y enlaces activos/.test(text));

  // Una plantilla que no compila: no se genera nada y se lleva a Problemas.
  await page.locator('[data-testid="pdf-entry"]').selectOption('/roto.pug');
  const problem = page.locator('[data-testid="pdf-problem"]');
    check('69 con una plantilla que no compila: «No se puede generar el PDF» y no deja guardar', !!(await waitUntil(async () => (await problem.count()) === 1, 6000)) && /No se puede generar el PDF: roto\.pug tiene 1 error/.test(await problem.innerText()) && (await save.isDisabled()), await problem.innerText().catch(() => ''));
  check('69 y ofrece «Ver en Problemas»', (await page.locator('[data-testid="pdf-see-problems"]').count()) === 1);
  await page.locator('[data-testid="pdf-entry"]').selectOption('/factura.pug');
  await waitUntil(async () => !(await save.isDisabled()), 8000);

  // Opciones: número de página, sin márgenes; se piden así y se recuerdan.
  await page.locator('[data-testid="pdf-page-numbers"]').check();
  await page.locator('[data-testid="pdf-margins"]').selectOption('none');
  await save.click();
  const done = page.locator('[data-testid="pdf-done"]');
  check('69 al terminar: aviso con nombre, páginas, tamaño y carpeta', !!(await waitUntil(async () => (await done.count()) === 1, 5000)) && /factura\.pdf guardado/.test(await done.innerText()) && /12 páginas · 184 KB · C:\\Trabajo\\clinica-aurora\\exportados/.test(await done.innerText()), await done.innerText().catch(() => ''));
  const [req] = await calls(page, 'pdf:export');
  check('69 pide el PDF con el HTML de la plantilla y las opciones elegidas', !!req && req.entry === '/factura.pug' && /Factura FA-2026-0312/.test(req.html) && req.pageNumbers === true && req.margins === null && req.orientation === 'portrait' && Math.round(req.widthPx) === 794, JSON.stringify({ ...req, html: req?.html?.length }));
  check('69 el diálogo se cierra al terminar', (await dlg.count()) === 0);
  await page.locator('[data-testid="pdf-done-open"]').click();
  await page.locator('[data-testid="pdf-done-reveal"]').click();
  check('69 «Abrir» y «Mostrar en la carpeta» piden ese PDF', (await calls(page, 'pdf:open'))[0]?.path?.endsWith('factura.pdf') && (await calls(page, 'pdf:reveal'))[0]?.path?.endsWith('factura.pdf'));
  await openLogTab(page);
  check('69 queda en el Registro', !!(await waitUntil(async () => /factura\.pdf \(12 páginas, 184 KB\) con el motor nativo/.test(await page.locator('#panel-log').innerText()), 4000)), await page.locator('#panel-log').innerText().catch(() => ''));
  const remembered = await page.evaluate(() => JSON.parse(localStorage.getItem('pug-ide-pdf-export') ?? 'null'));
  check('69 recuerda las opciones para la próxima vez', remembered?.pageNumbers === true && remembered?.margins === 'none', JSON.stringify(remembered));
  check('69 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // Cancelar mientras se genera: no sale el aviso.
  app = await desktop(env, { slow: true });
  page = app.page;
  await page.locator('[data-testid="menu-exportar"]').click();
  await page.locator('[role="menuitem"]', { hasText: 'PDF…' }).click();
  await page.locator('[data-testid="pdf-export"]').waitFor({ timeout: 5000 });
  await waitUntil(async () => !(await page.locator('[data-testid="pdf-save"]').isDisabled()), 8000);
  await page.locator('[data-testid="pdf-save"]').click();
  check('69 mientras se genera: «Generando factura.pdf…»', !!(await waitUntil(async () => /Generando factura\.pdf/.test(await page.locator('[data-testid="pdf-busy"]').innerText().catch(() => '')), 3000)));
  await page.locator('[data-testid="pdf-cancel"]').click();
  await page.evaluate(() => window.__finishExport());
  await page.waitForTimeout(500);
  check('69 «Cancelar» lo detiene y no sale el aviso', (await calls(page, 'pdf:cancel')).length === 1 && (await page.locator('[data-testid="pdf-done"]').count()) === 0);
  check('69 sin errores no controlados (cancelar)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
