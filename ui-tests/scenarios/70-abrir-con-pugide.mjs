import { check, openApp, waitUntil } from '../lib.mjs';

// Abrir archivos .pug y carpetas con PugIDE (P-40, solo escritorio). Se simula la app (window.pugideDesktop); el
// recorrido de verdad (argv, segunda instancia, crear el espacio) lo prueba desktop/test/smoke.mjs con Electron.
const session = { projectName: 'Norte', files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Proyecto Norte\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };
const factura = { kind: 'file', path: '/trabajo/aurora/factura.pug', name: 'factura.pug', folder: '/trabajo/aurora', folderName: 'aurora', workspaceId: null, entry: '/factura.pug', token: 't-1' };

function fakeDesktop(cfg) {
  const listeners = new Set();
  window.__calls = [];
  window.__pending = cfg.pending ?? [];
  window.__emit = (p) => listeners.forEach((cb) => cb(p));
  window.pugideDesktop = Object.freeze({
    platform: 'linux', version: '0.16.0', webUrl: 'https://pug-ide.vercel.app',
    onEvent: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    pathForFile: () => null,
    invoke: async (channel, payload) => {
      window.__calls.push([channel, payload ?? null]);
      if (channel === 'ws:list') return { workspaces: [], lastId: null, colors: ['#ddb7ff'] };
      if (channel === 'upd:state') return { current: '0.16.0', asked: true, enabled: false, lastCheck: 0, latest: null, dismissed: false, self: { phase: 'idle', canUpdate: true }, justUpdated: null };
      if (channel === 'open:pending') return window.__pending.splice(0);
      if (channel === 'open:read-file') return payload?.token === 't-1' ? { name: 'factura.pug', text: 'doctype html\nhtml\n  body\n    h1 Factura de Clínica Aurora\n' } : { name: 'presupuesto.pug', text: 'p Presupuesto 2026\n' };
      return null;
    },
  });
}

async function desktop(env, cfg, storage = {}, opts = { session }) {
  const app = await openApp(env, { path: '/ide', ...opts, storage: { 'pug-ide-workspaces-intro': '1', ...storage } });
  await app.page.addInitScript(fakeDesktop, cfg);
  // Primer uso: se borra lo que dejó la primera carga (la web guarda la sesión enseguida) para arrancar de cero como escritorio.
  if (opts.welcome) await app.page.evaluate(async () => { localStorage.clear(); for (const d of await indexedDB.databases()) if (d.name) indexedDB.deleteDatabase(d.name); });
  await app.page.reload();
  await app.page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  return app;
}

const previewHas = async (page, re) => {
  for (const f of page.frames()) { const t = await f.evaluate(() => document.body?.innerText ?? '').catch(() => ''); if (re.test(t)) return true; }
  return false;
};

export default async function (env) {
  // 1 · Una plantilla suelta llega al arrancar: se pregunta.
  let app = await desktop(env, { pending: [factura] });
  let page = app.page;
  const dlg = page.locator('[data-testid="open-with"]');
  check('70 al abrir un .pug suelto pregunta qué hacer', !!(await waitUntil(async () => (await dlg.count()) === 1, 8000)) && /Abrir factura\.pug/.test(await dlg.innerText()) && /\/trabajo\/aurora/.test(await dlg.innerText()));
  check('70 por defecto, abrir la carpeta como espacio (recomendado)', await page.locator('[data-testid="open-with-folder"]').isChecked() && /Recomendado/.test(await dlg.innerText()));
  await page.locator('[data-testid="open-with-file"]').check();
  await page.locator('[data-testid="open-with-remember"]').check();
  await page.locator('[data-testid="open-with-go"]').click();
  const toast = page.locator('[data-testid="open-toast"]');
  check('70 «Solo este archivo» lo abre como proyecto nuevo y lo dice', !!(await waitUntil(async () => /factura\.pug abierto como proyecto nuevo/.test(await toast.innerText().catch(() => '')), 8000)) && /no se guardan en el disco/.test(await toast.innerText()));
  check('70 y la vista previa enseña la plantilla abierta', !!(await waitUntil(() => previewHas(page, /Factura de Clínica Aurora/), 10000)));
  check('70 lee el archivo con su permiso (token), no por ruta', (await page.evaluate(() => window.__calls.filter(([c]) => c === 'open:read-file').map(([, p]) => p?.token))).join() === 't-1');
  check('70 «Hacer siempre esto» se recuerda', (await page.evaluate(() => localStorage.getItem('pug-ide-open-file-choice'))) === 'file');

  // 2 · Con la elección recordada, otro archivo que llega con la app abierta no pregunta.
  await page.locator('[data-testid="open-toast-close"]').click();
  await page.evaluate(() => { window.__pending.push({ kind: 'file', path: '/trabajo/presupuesto.pug', name: 'presupuesto.pug', folder: '/trabajo', folderName: 'trabajo', workspaceId: null, entry: '/presupuesto.pug', token: 't-2' }); window.__emit({ type: 'open-pending' }); });
  check('70 con la elección recordada, el siguiente se abre sin preguntar', !!(await waitUntil(async () => /presupuesto\.pug abierto como proyecto nuevo/.test(await toast.innerText().catch(() => '')), 8000)) && (await dlg.count()) === 0);

  // 3 · Algo que no es una plantilla: aviso de error, sin tocar nada.
  await page.evaluate(() => { window.__pending.push({ kind: 'unsupported', path: '/trabajo/informe.docx', name: 'informe.docx' }); window.__emit({ type: 'open-pending' }); });
  check('70 un archivo que no es una plantilla: «No se puede abrir informe.docx» y qué se puede abrir', !!(await waitUntil(async () => /No se puede abrir informe\.docx/.test(await toast.innerText().catch(() => '')), 8000)) && /\.pug, \.jade, carpetas/.test(await toast.innerText()));
  // 3a · Un reciente que ya no existe (P-46): se avisa, con su ruta, y se puede quitar de la lista.
  await page.evaluate(() => { window.__pending.push({ kind: 'missing', path: '/trabajo/aurora/factura.pug', name: 'factura.pug', recent: true }); window.__emit({ type: 'open-pending' }); });
  const forget = page.locator('[data-testid="open-toast-forget"]');
  check('70 un reciente que ya no existe dice cuál, dónde estaba y ofrece «Quitar de la lista»', !!(await waitUntil(async () => (await forget.count()) === 1, 8000)) && /No se encuentra factura\.pug/.test(await toast.innerText()) && /\/trabajo\/aurora\/factura\.pug · puede que se haya movido o borrado/.test(await toast.innerText()), await toast.innerText().catch(() => ''));
  await forget.click();
  check('70 «Quitar de la lista» lo pide al proceso principal con esa ruta y cierra el aviso', (await page.evaluate(() => window.__calls.filter(([c]) => c === 'open:forget').map(([, p]) => p?.path))).join() === '/trabajo/aurora/factura.pug' && !!(await waitUntil(async () => (await toast.count()) === 0, 3000)));
  // Lo que no es un reciente sigue con el aviso de siempre, sin botón.
  await page.evaluate(() => { window.__pending.push({ kind: 'missing', path: '/trabajo/otro.pug', name: 'otro.pug' }); window.__emit({ type: 'open-pending' }); });
  check('70 un archivo que no existe y no era reciente no ofrece quitarlo', !!(await waitUntil(async () => /No se encuentra otro\.pug/.test(await toast.innerText().catch(() => '')), 6000)) && (await forget.count()) === 0);
  check('70 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // 3b · Primer uso de la app (sin sesión ni bienvenida vista) abriendo un .pug: la bienvenida no tapa la pregunta.
  app = await desktop(env, { pending: [factura] }, {}, { welcome: true });
  page = app.page;
  const first = page.locator('[data-testid="open-with"]');
  check('70 en el primer uso, abrir un .pug pregunta y la bienvenida no lo tapa', !!(await waitUntil(async () => (await first.count()) === 1, 8000)) && (await page.locator('app-welcome-dialog .card').count()) === 0);
  await page.locator('[data-testid="open-with-file"]').check();
  await page.locator('[data-testid="open-with-go"]').click({ timeout: 5000 });
  check('70 y la bienvenida queda para otro día (no se da por vista)', !!(await waitUntil(async () => /factura\.pug abierto como proyecto nuevo/.test(await page.locator('[data-testid="open-toast"]').innerText().catch(() => '')), 8000)) && (await page.evaluate(() => localStorage.getItem('pug-ide-welcome'))) === null);
  check('70 sin errores no controlados (primer uso)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // 4 · Arrastrar archivos sobre la ventana: la zona «Suelta para abrir» y, al soltar, «Importar archivos».
  app = await desktop(env, {});
  page = app.page;
  const dt = await page.evaluateHandle(() => { const d = new DataTransfer(); d.items.add(new File(['p Condiciones generales\n'], 'condiciones.pug', { type: 'text/plain' })); return d; });
  await page.dispatchEvent('body', 'dragenter', { dataTransfer: dt });
  const drop = page.locator('[data-testid="open-drop"]');
  check('70 al arrastrar archivos sobre la ventana sale «Suelta para abrir»', !!(await waitUntil(async () => (await drop.count()) === 1, 3000)) && /Una carpeta.*espacio de trabajo/s.test(await drop.innerText()) && /se añaden al proyecto abierto/.test(await drop.innerText()));
  await page.dispatchEvent('body', 'dragleave', { dataTransfer: dt });
  check('70 y desaparece al salir', !!(await waitUntil(async () => (await drop.count()) === 0, 3000)));
  await page.dispatchEvent('body', 'dragenter', { dataTransfer: dt });
  await page.dispatchEvent('body', 'drop', { dataTransfer: dt });
  check('70 soltar archivos los lleva a «Importar archivos» (como en el árbol)', !!(await waitUntil(async () => /condiciones\.pug/.test(await page.locator('body').innerText()) && (await drop.count()) === 0, 5000)));
  check('70 sin errores no controlados (arrastrar)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // 5 · En la web no hay nada de esto.
  app = await openApp(env, { path: '/ide', session });
  page = app.page;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  const dt2 = await page.evaluateHandle(() => { const d = new DataTransfer(); d.items.add(new File(['x'], 'a.pug')); return d; });
  await page.dispatchEvent('body', 'dragenter', { dataTransfer: dt2 });
  await page.waitForTimeout(300);
  check('70 en la web no sale la zona de soltar de escritorio', (await page.locator('[data-testid="open-drop"]').count()) === 0);
  await app.close();
}
