import { check, openApp, openLogTab, waitUntil } from '../lib.mjs';

// «Exportar → Varios PDF…» (P-42, solo escritorio). Se simula la app (window.pugideDesktop); los PDF de verdad los
// prueba desktop/test/smoke.mjs con Electron. Aquí: el menú, los dos modos, lo que se pide, los choques de nombre y los avisos.
const page1 = (title) => `doctype html\nhtml\n  head\n    style.\n      @page { size: A4; margin: 18mm; }\n  body\n    h1 ${title}\n    p= cliente.nombre\n`;
const session = {
  projectName: 'Clínica Aurora',
  files: {
    '/factura.pug': page1('Factura FA-2026-0312'),
    '/presupuesto.pug': page1('Presupuesto'),
    '/informes/trimestral.pug': page1('Informe trimestral'),
    '/borrador.pug': 'div\n  p= cliente.nombre(\n',
    '/partials/cabecera.pug': 'header Clínica Aurora\n',
    '/con-cabecera.pug': 'doctype html\nhtml\n  body\n    include partials/cabecera.pug\n    p Recibo\n',
  },
  openTabPaths: ['/factura.pug'], activeTabPath: '/factura.pug', previewEntry: '/factura.pug',
};
session.datasets = {
  version: 1, activeId: 'ds-1', locale: 'es',
  datasets: [
    { id: 'ds-1', name: 'Clínica Aurora', data: { cliente: { nombre: 'Lucía Romero Vidal' } } },
    { id: 'ds-2', name: 'Taller Hermanos Vidal', data: { cliente: { nombre: 'Andrés Vidal Soto' } } },
    { id: 'ds-3', name: 'Importado: citas', data: { cliente: { nombre: 'Marta Gil Peña' } } },
  ],
};

function fakeDesktop(cfg) {
  window.__calls = [];
  let n = 0;
  let release = null;
  window.__release = () => release?.();
  window.pugideDesktop = Object.freeze({
    platform: 'win32', version: '0.17.0', webUrl: 'https://pug-ide.vercel.app',
    onEvent: () => () => undefined,
    invoke: async (channel, payload) => {
      window.__calls.push([channel, payload ?? null]);
      if (channel === 'ws:list') return { workspaces: [], lastId: null, colors: [] };
      if (channel === 'upd:state') return { current: '0.17.0', asked: true, enabled: false, lastCheck: 0, latest: null, dismissed: false, self: { phase: 'idle', canUpdate: true }, justUpdated: null };
      if (channel === 'pdf:batch-target') {
        const dir = payload.pick ? 'D:\\Entregas\\aurora' : 'C:\\Trabajo\\clinica-aurora\\exportados';
        return { token: `t-${++n}`, path: payload.kind === 'zip' ? `${dir}\\Clínica Aurora-pdf.zip` : dir };
      }
      if (channel === 'pdf:batch-existing') return cfg.existing ?? [];
      if (channel === 'pdf:batch-item') {
        if (cfg.slow) await new Promise((r) => { release = r; });
        if (cfg.canceled) return { ok: false, reason: 'canceled' };
        return { ok: true, name: payload.name, pages: 3, bytes: 51200 };
      }
      if (channel === 'pdf:batch-finish') return cfg.zip ? { ok: true, dir: 'C:\\Trabajo\\clinica-aurora\\exportados', reveal: 'C:\\Trabajo\\clinica-aurora\\exportados\\Clínica Aurora-pdf.zip', zip: 'Clínica Aurora-pdf.zip', bytes: 153900 } : { ok: true, dir: 'C:\\Trabajo\\clinica-aurora\\exportados', reveal: 'C:\\Trabajo\\clinica-aurora\\exportados\\factura.pdf', bytes: 0 };
      if (channel === 'pdf:cancel') { cfg.canceled = true; return { ok: true }; }
      return { ok: true };
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
const openMenu = async (page) => {
  await page.locator('[data-testid="menu-exportar"]').click();
  await page.locator('[role="menuitem"]').first().waitFor({ timeout: 5000 });
};
const openDialog = async (page) => {
  await openMenu(page);
  await page.locator('[role="menuitem"]', { hasText: 'Varios PDF…' }).click();
  await page.locator('[data-testid="pdf-batch"]').waitFor({ timeout: 5000 });
};

export default async function (env) {
  // Web: no aparece.
  let app = await openApp(env, { path: '/ide', session });
  let page = app.page;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  await openMenu(page);
  const web = (await page.locator('[role="menuitem"]').allInnerTexts()).join(' | ');
  check('73 en la web no hay «Varios PDF…»', !/Varios PDF/.test(web), web);
  await app.close();

  // Escritorio · un PDF por plantilla.
  app = await desktop(env);
  page = app.page;
  await openMenu(page);
  const items = await page.locator('[role="menuitem"]').allInnerTexts();
  const at = (re) => items.findIndex((t) => re.test(t));
  check('73 en escritorio, «Varios PDF…» va justo debajo de «PDF…»', at(/Varios PDF…/) === at(/^\s*(picture_as_pdf)?\s*PDF…/) + 1 && at(/Varios PDF…/) > 0, items.join(' | '));
  await page.keyboard.press('Escape');
  await openDialog(page);
  const dlg = page.locator('[data-testid="pdf-batch"]');
  const go = page.locator('[data-testid="pdf-batch-go"]');
  // La plantilla que no compila se marca sola (se comprueba al abrir).
  check('73 la plantilla que no compila se avisa antes y no se puede elegir', !!(await waitUntil(async () => /borrador\.pug\s*tiene 1 error: no se puede generar/.test((await dlg.innerText()).replace(/\n/g, ' ')), 10000)) && await page.locator('[data-testid="pdf-batch-/borrador.pug"]').isDisabled(), await dlg.innerText());
  const text = (await dlg.innerText()).replace(/\n/g, ' ');
  check('73 cada página dice el PDF que saldrá; la carpeta va en el nombre', /factura\.pug\s*→ factura\.pdf/.test(text) && /informes\/trimestral\.pug\s*→ informes-trimestral\.pdf/.test(text), text);
  check('73 los parciales se listan como «no se exporta»', /partials\/cabecera\.pug\s*parcial, no se exporta/.test(text));
  check('73 dice con qué datos y propone la carpeta', /con los datos actuales \(«Clínica Aurora»\)/.test(text) && (await page.locator('[data-testid="pdf-batch-path"]').inputValue()) === 'C:\\Trabajo\\clinica-aurora\\exportados');
  check('73 el botón cuenta los PDF que se van a generar', !!(await waitUntil(async () => /Generar 4 PDF/.test(await go.innerText()), 4000)), await go.innerText());
  await page.locator('[data-testid="pdf-batch-/con-cabecera.pug"]').uncheck();
  await page.locator('[data-testid="pdf-batch-page-numbers"]').check();
  await page.locator('[data-testid="pdf-batch-pick"]').click();
  check('73 «Elegir…» cambia la carpeta', !!(await waitUntil(async () => (await page.locator('[data-testid="pdf-batch-path"]').inputValue()) === 'D:\\Entregas\\aurora', 4000)));
  await go.click();
  const done = page.locator('[data-testid="pdf-batch-done"]');
  check('73 al terminar: «3 PDF guardados», carpeta, páginas y tamaño', !!(await waitUntil(async () => (await done.count()) === 1, 15000)) && /3 PDF guardados/.test(await done.innerText()) && /exportados · 9 páginas · 150 KB/.test(await done.innerText()), await done.innerText().catch(() => ''));
  const reqs = await calls(page, 'pdf:batch-item');
  check('73 pide un PDF por plantilla elegida, con su HTML y sus opciones', reqs.length === 3 && reqs.map((r) => r.name).join() === 'factura.pdf,informes-trimestral.pdf,presupuesto.pdf' && /Informe trimestral/.test(reqs[1].req.html) && reqs.every((r) => r.req.pageNumbers === true && r.req.openAfter === false && Math.round(r.req.widthPx) === 794 && r.token === reqs[0].token), JSON.stringify(reqs.map((r) => ({ ...r, req: { ...r.req, html: r.req.html.length } }))));
  check('73 usa el permiso de la carpeta elegida y cierra el lote', reqs[0]?.token === (await calls(page, 'pdf:batch-finish'))[0]?.token && (await calls(page, 'pdf:batch-target')).some((t) => t.pick === true));
  check('73 el diálogo se cierra al terminar', (await dlg.count()) === 0);
  await page.locator('[data-testid="pdf-batch-reveal"]').click();
  check('73 «Mostrar en la carpeta» pide enseñar lo guardado', /factura\.pdf$/.test((await calls(page, 'pdf:reveal'))[0]?.path ?? ''));
  await openLogTab(page);
  check('73 queda en el Registro con las páginas de cada PDF', !!(await waitUntil(async () => /3 PDF con el motor nativo en .*: factura\.pdf \(3 págs\.\), informes-trimestral\.pdf \(3\), presupuesto\.pdf \(3\)/.test(await page.locator('#panel-log').innerText()), 4000)), await page.locator('#panel-log').innerText().catch(() => ''));
  const remembered = await page.evaluate(() => JSON.parse(localStorage.getItem('pug-ide-pdf-batch') ?? 'null'));
  check('73 recuerda las opciones', remembered?.pageNumbers === true && remembered?.mode === 'templates' && remembered?.target === 'folder', JSON.stringify(remembered));
  check('73 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // Escritorio · un PDF por juego de datos, en un .zip, con un archivo que ya existe.
  app = await desktop(env, { zip: true, existing: ['Clínica Aurora-pdf.zip'] });
  page = app.page;
  await openDialog(page);
  await page.locator('[data-testid="pdf-batch-mode-datasets"]').click();
  await page.locator('[data-testid="pdf-batch-target"]').selectOption('zip');
  const dlg2 = page.locator('[data-testid="pdf-batch"]');
  const text2 = async () => (await dlg2.innerText()).replace(/\n/g, ' ');
  check('73 por juego de datos: la plantilla de la vista previa y el nombre del juego en el archivo', (await page.locator('[data-testid="pdf-batch-entry"]').inputValue()) === '/factura.pug' && /Taller Hermanos Vidal\s*→ factura - Taller Hermanos Vidal\.pdf/.test(await text2()) && /Importado: citas\s*→ factura - Importado citas\.pdf/.test(await text2()), await text2());
  check('73 con «Un .zip» se propone el archivo', !!(await waitUntil(async () => /Clínica Aurora-pdf\.zip$/.test(await page.locator('[data-testid="pdf-batch-path"]').inputValue()), 4000)));
  await page.locator('[data-testid="pdf-batch-ds-Importado: citas"]').uncheck();
  const go2 = page.locator('[data-testid="pdf-batch-go"]');
  check('73 el botón cuenta los juegos elegidos', !!(await waitUntil(async () => /Generar 2 PDF/.test(await go2.innerText()), 4000)), await go2.innerText());
  await go2.click();
  const conflict = page.locator('[data-testid="pdf-batch-conflict"]');
  check('73 si el .zip ya existe se pregunta antes de generar nada', !!(await waitUntil(async () => (await conflict.count()) === 1, 4000)) && /Clínica Aurora-pdf\.zip ya existe/.test(await conflict.innerText()) && (await calls(page, 'pdf:batch-item')).length === 0);
  await page.locator('[data-testid="pdf-batch-replace"]').click();
  const done2 = page.locator('[data-testid="pdf-batch-done"]');
  check('73 al terminar dice el .zip', !!(await waitUntil(async () => (await done2.count()) === 1, 15000)) && /2 PDF guardados/.test(await done2.innerText()) && /Clínica Aurora-pdf\.zip · 6 páginas · 150 KB/.test(await done2.innerText()), await done2.innerText().catch(() => ''));
  const reqs2 = await calls(page, 'pdf:batch-item');
  check('73 cada PDF lleva los datos de su juego', reqs2.length === 2 && /Lucía Romero Vidal/.test(reqs2[0].req.html) && /Andrés Vidal Soto/.test(reqs2[1].req.html) && reqs2[1].name === 'factura - Taller Hermanos Vidal.pdf' && reqs2[0].onExist === 'replace', JSON.stringify(reqs2.map((r) => ({ name: r.name, onExist: r.onExist }))));
  await page.locator('[data-testid="pdf-batch-done-close"]').click();
  await openDialog(page);
  await page.locator('[data-testid="pdf-batch-mode-templates"]').click();
  check('73 el juego de datos activo sigue siendo el mismo', !!(await waitUntil(async () => /con los datos actuales \(«Clínica Aurora»\)/.test((await page.locator('[data-testid="pdf-batch"]').innerText()).replace(/\n/g, ' ')), 4000)));
  check('73 sin errores no controlados (juegos de datos)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // Cancelar a mitad.
  app = await desktop(env, { slow: true });
  page = app.page;
  await openDialog(page);
  await waitUntil(async () => /Generar 4 PDF/.test(await page.locator('[data-testid="pdf-batch-go"]').innerText()), 10000);
  await page.locator('[data-testid="pdf-batch-go"]').click();
  const busy = page.locator('[data-testid="pdf-batch-busy"]');
  check('73 mientras se genera: «Generando con-cabecera.pdf · 1 de 4»', !!(await waitUntil(async () => /Generando con-cabecera\.pdf · 1 de 4/.test((await busy.innerText().catch(() => '')).replace(/\s+/g, ' ')), 5000)), await busy.innerText().catch(() => ''));
  await page.locator('[data-testid="pdf-batch-cancel"]').click();
  await page.evaluate(() => window.__release());
  check('73 «Cancelar» detiene el lote y no sale el aviso de guardado', !!(await waitUntil(async () => (await busy.count()) === 0, 5000)) && (await calls(page, 'pdf:cancel')).length === 1 && (await calls(page, 'pdf:batch-item')).length === 1 && (await page.locator('[data-testid="pdf-batch-done"]').count()) === 0);
  check('73 el diálogo sigue abierto para repetir', (await page.locator('[data-testid="pdf-batch"]').count()) === 1);
  check('73 sin errores no controlados (cancelar)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // Nombre por patrón (P-45).
  app = await desktop(env);
  page = app.page;
  await openDialog(page);
  await page.locator('[data-testid="pdf-batch-mode-datasets"]').click();
  const text3 = async () => (await page.locator('[data-testid="pdf-batch"]').innerText()).replace(/\n/g, ' ');
  const pattern = page.locator('[data-testid="pdf-batch-pattern"]');
  check('73 el campo «Nombre del archivo» ofrece las claves de los datos', !!(await waitUntil(async () => (await pattern.count()) === 1 && (await page.locator('[data-testid="pdf-batch-key-cliente.nombre"]').count()) === 1, 4000)), await text3());
  await pattern.fill('factura - ');
  await page.locator('[data-testid="pdf-batch-key-cliente.nombre"]').click();
  check('73 pulsar una clave la añade al patrón donde está el cursor', (await pattern.inputValue()) === 'factura - {cliente.nombre}', await pattern.inputValue());
  const preview = page.locator('[data-testid="pdf-batch-preview"]');
  check('73 la vista previa enseña los nombres que saldrán', !!(await waitUntil(async () => /→ factura - Lucía Romero Vidal\.pdf/.test(await preview.innerText().catch(() => '')) && /→ factura - Andrés Vidal Soto\.pdf/.test(await preview.innerText()), 4000)), await preview.innerText().catch(() => ''));
  check('73 los juegos de la lista dicen su nombre por patrón', /Taller Hermanos Vidal\s*→ factura - Andrés Vidal Soto\.pdf/.test(await text3()), await text3());
  await pattern.fill('factura {cliente.nif} {cliente.nombre}');
  const warn = page.locator('[data-testid="pdf-batch-pattern-warning"]');
  check('73 una clave que no existe en los datos se avisa con las que sí hay', !!(await waitUntil(async () => /La clave \{cliente\.nif\} no existe en los datos\. Claves que sí hay: cliente\.nombre/.test(await warn.first().innerText().catch(() => '')), 4000)), await warn.first().innerText().catch(() => ''));
  check('73 y como falta en todos se usa el nombre del juego', /Clínica Aurora\s*→ factura - Clínica Aurora\.pdf/.test(await text3()), await text3());
  await pattern.fill('factura {cliente.nombre}');
  await page.locator('[data-testid="pdf-batch-ds-Taller Hermanos Vidal"]').uncheck();
  await page.locator('[data-testid="pdf-batch-go"]').click();
  const done3 = page.locator('[data-testid="pdf-batch-done"]');
  check('73 al generar, cada PDF lleva el nombre del patrón', !!(await waitUntil(async () => (await done3.count()) === 1, 15000)) && (await calls(page, 'pdf:batch-item')).map((r) => r.name).join() === 'factura Lucía Romero Vidal.pdf,factura Marta Gil Peña.pdf', JSON.stringify((await calls(page, 'pdf:batch-item')).map((r) => r.name)));
  const remembered3 = await page.evaluate(() => JSON.parse(localStorage.getItem('pug-ide-pdf-batch') ?? 'null'));
  check('73 recuerda el último patrón', remembered3?.pattern === 'factura {cliente.nombre}' && remembered3?.mode === 'datasets', JSON.stringify(remembered3));
  check('73 sin errores no controlados (patrón)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
