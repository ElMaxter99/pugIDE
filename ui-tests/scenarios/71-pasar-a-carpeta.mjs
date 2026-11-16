import { check, chooseMenu, openApp, waitUntil } from '../lib.mjs';

// «Pasar a una carpeta…» (P-41, solo escritorio). Se simula la app (window.pugideDesktop); escribir de verdad en disco
// (y no pisar un archivo que ya existe) lo prueba desktop/test/smoke.mjs con Electron.
const session = { projectName: 'Catálogo Aurora', files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Catálogo Aurora\n', '/estilos/base.scss': 'body { margin: 0; }\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };

function fakeDesktop(cfg) {
  window.__calls = [];
  window.pugideDesktop = Object.freeze({
    platform: 'linux', version: '0.16.0', webUrl: 'https://pug-ide.vercel.app',
    onEvent: () => () => undefined,
    pathForFile: () => null,
    invoke: async (channel, payload) => {
      window.__calls.push([channel, payload ?? null]);
      if (channel === 'ws:list') return { workspaces: [], lastId: null, colors: ['#4cd7f6'] };
      if (channel === 'upd:state') return { current: '0.16.0', asked: true, enabled: false, lastCheck: 0, latest: null, dismissed: false, self: { phase: 'idle', canUpdate: true }, justUpdated: null };
      if (channel === 'open:pending') return [];
      if (channel === 'ws:pick-folder') return { token: 'tok-1', path: '/trabajo/aurora/catalogo', pugCount: 0, tooBig: false };
      if (channel === 'ws:folder-check') return { path: '/trabajo/aurora/catalogo', fileCount: cfg.existing ?? 0, conflicts: cfg.conflicts ?? [] };
      if (channel === 'ws:create') return { id: 'ws-9' };
      if (channel === 'ws:write') return cfg.failWrite ? { written: ['/main.pug'], failed: ['/estilos/base.scss'] } : { written: Object.keys(payload.change.files), failed: [] };
      if (channel === 'ws:open') return { ok: true, files: payload.id === 'ws-9' ? { '/main.pug': 'h1 Catálogo Aurora en disco\n' } : {}, assets: [], workspace: { id: 'ws-9', name: 'Catálogo Aurora', color: '#4cd7f6', path: '/trabajo/aurora/catalogo' } };
      if (channel === 'ws:remove' || channel === 'ws:reveal') return { ok: true };
      return null;
    },
  });
}

async function desktop(env, cfg = {}) {
  const app = await openApp(env, { path: '/ide', session, storage: { 'pug-ide-workspaces-intro': '1' } });
  await app.page.addInitScript(fakeDesktop, cfg);
  await app.page.reload();
  await app.page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  await app.page.waitForTimeout(1500); // el autoguardado deja el proyecto en «Mis proyectos»
  return app;
}

const calls = (page, channel) => page.evaluate((c) => window.__calls.filter(([ch]) => ch === c).map(([, p]) => p), channel);

async function openMove(page) {
  await chooseMenu(page, 'proyecto', 'projects');
  const row = page.locator('[aria-label="Mis proyectos"] [data-testid="move-to-folder"]').first();
  await row.waitFor({ timeout: 8000 });
  await row.click();
  const dlg = page.locator('[data-testid="move-to-folder-dialog"]');
  await dlg.waitFor({ timeout: 5000 });
  return dlg;
}

export default async function (env) {
  // En la web no existe.
  let app = await openApp(env, { path: '/ide', session });
  let page = app.page;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await chooseMenu(page, 'proyecto', 'projects');
  await page.locator('[aria-label="Mis proyectos"]').waitFor();
  check('71 en la web «Mis proyectos» no ofrece «Pasar a una carpeta…»', (await page.locator('[data-testid="move-to-folder"]').count()) === 0);
  await app.close();

  // 1 · Carpeta con archivos que coinciden; se quita la copia de «Mis proyectos».
  app = await desktop(env, { existing: 4, conflicts: ['/main.pug', '/estilos/base.scss'] });
  page = app.page;
  let dlg = await openMove(page);
  check('71 el diálogo se llama como el proyecto y propone su nombre para el espacio', /Pasar «Catálogo Aurora» a una carpeta/.test(await dlg.innerText()) && (await page.locator('[data-testid="move-name"]').inputValue()) === 'Catálogo Aurora');
  check('71 dice lo que se escribe (2 archivos) y que los datos van a .pugide/datasets.json', !!(await waitUntil(async () => /Se escriben 2 archivos/.test(await page.locator('[data-testid="move-summary"]').innerText()), 5000)) && /\.pugide\/datasets\.json/.test(await page.locator('[data-testid="move-summary"]').innerText()));
  check('71 sin carpeta no deja pasar', await page.locator('[data-testid="move-go"]').isDisabled());
  check('71 por defecto conserva la copia en «Mis proyectos»', await page.locator('[data-testid="move-keep"]').isChecked());
  await page.locator('[data-testid="move-pick"]').click();
  const conflicts = page.locator('[data-testid="move-conflicts"]');
  check('71 avisa de los nombres que ya existen, y de que se guardan con otro (main (2).pug)', !!(await waitUntil(async () => (await conflicts.count()) === 1, 5000)) && /La carpeta ya tiene 4 archivos/.test(await conflicts.innerText()) && /coinciden 2 nombres/.test(await conflicts.innerText()) && /main \(2\)\.pug/.test(await conflicts.innerText()), await conflicts.innerText().catch(() => ''));
  await page.locator('[data-testid="move-remove"]').check();
  await page.locator('[data-testid="move-go"]').click();
  const done = page.locator('[data-testid="move-done"]');
  check('71 al terminar: «está ahora en el disco» y abierto como espacio', !!(await waitUntil(async () => (await done.count()) === 1, 8000)) && /«Catálogo Aurora» está ahora en el disco/.test(await done.innerText()) && /\/trabajo\/aurora\/catalogo/.test(await done.innerText()));
  const [write] = await calls(page, 'ws:write');
  check('71 escribe con los nombres nuevos, nunca encima de lo que había', !!write && Object.keys(write.change.files).sort().join() === '/estilos/base (2).scss,/main (2).pug' && write.change.deleted.length === 0, JSON.stringify(Object.keys(write?.change?.files ?? {})));
  check('71 crea el espacio en la carpeta elegida (con su permiso) y lo abre', (await calls(page, 'ws:create'))[0]?.token === 'tok-1' && (await calls(page, 'ws:open')).some((p) => p?.id === 'ws-9'));
  await chooseMenu(page, 'proyecto', 'projects');
  await page.locator('[aria-label="Mis proyectos"]').waitFor();
  // El espacio recién abierto también se llama «Catálogo Aurora» (es el proyecto abierto); la copia que se quita es la otra.
  const leftover = page.locator('[aria-label="Mis proyectos"] .list').first().locator('.row:not(.current)', { hasText: 'Catálogo Aurora' });
  check('71 «Quitarla de Mis proyectos» quita la copia de la app (solo queda el espacio abierto)', !!(await waitUntil(async () => (await leftover.count()) === 0, 5000)), await page.locator('[aria-label="Mis proyectos"] .list').first().innerText());
  check('71 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // 2 · No se puede escribir: lo dice, el proyecto sigue en «Mis proyectos» y el espacio a medias no queda en la lista.
  app = await desktop(env, { failWrite: true });
  page = app.page;
  dlg = await openMove(page);
  await waitUntil(async () => /Se escriben/.test(await page.locator('[data-testid="move-summary"]').innerText()), 5000);
  await page.locator('[data-testid="move-pick"]').click();
  await waitUntil(async () => !(await page.locator('[data-testid="move-go"]').isDisabled()), 5000);
  check('71 una carpeta vacía no muestra avisos de coincidencias', (await page.locator('[data-testid="move-conflicts"]').count()) === 0);
  await page.locator('[data-testid="move-go"]').click();
  const err = page.locator('[data-testid="move-error"]');
  check('71 si no se puede escribir: «No se pudo terminar» y que «Mis proyectos» no cambia', !!(await waitUntil(async () => (await err.count()) === 1, 8000)) && /No se pudo terminar/.test(await err.innerText()) && /No se ha cambiado nada en «Mis proyectos»/.test(await err.innerText()));
  check('71 y ofrece «Elegir otra carpeta»', (await page.locator('[data-testid="move-repick"]').count()) === 1);
  check('71 y quita de la lista el espacio que no se terminó de crear', (await calls(page, 'ws:remove')).some((p) => p?.id === 'ws-9') && (await calls(page, 'ws:open')).every((p) => p?.id !== 'ws-9'));
  check('71 sin errores no controlados (fallo al escribir)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
