import { check, openApp, waitUntil } from '../lib.mjs';

// Actualizar dentro de la app de escritorio (P-35/P-36). Se simula la app (window.pugideDesktop): el proceso principal
// (electron-updater) tiene sus pruebas unitarias en test/unit/self-update.test.mjs; aquí, lo que se ve y lo que se pide.
const session = { projectName: 'Norte', files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Hola\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };

/** `self`: estado inicial de la actualización; `script`: eventos que llegan al pulsar «Actualizar». */
function fakeDesktop(cfg) {
  const listeners = new Set();
  const emit = (payload) => listeners.forEach((cb) => cb(payload));
  window.__calls = [];
  const base = { phase: 'idle', version: null, percent: 0, transferred: 0, total: 0, error: null, installOnQuit: false, canUpdate: true, cannotReason: null, linuxPackage: null, ...cfg.self };
  let self = base;
  let justUpdated = cfg.justUpdated ?? null;
  const state = () => ({ current: '0.14.0', asked: true, enabled: true, lastCheck: Date.now(), latest: cfg.latest === false ? null : { version: '0.15.0', url: 'https://github.com/ElMaxter99/pugIDE/releases/tag/v0.15.0' }, dismissed: false, self, justUpdated });
  const push = (patch) => { self = { ...self, ...patch }; emit({ type: 'upd-progress', update: self }); };
  window.pugideDesktop = Object.freeze({
    platform: 'win32', version: '0.14.0', webUrl: 'https://pug-ide.vercel.app',
    onEvent: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    invoke: async (channel, payload) => {
      window.__calls.push([channel, payload ?? null]);
      if (channel === 'ws:list') return { workspaces: [], lastId: null, colors: [] };
      if (channel === 'upd:state') return state();
      if (channel === 'upd:update') {
        push({ phase: 'downloading', version: '0.15.0', percent: 0, error: null });
        const total = 112 * 1024 * 1024;
        [25, 50, 75].forEach((p, i) => setTimeout(() => push({ percent: p, transferred: (total * p) / 100, total }), 120 * (i + 1)));
        setTimeout(() => push(cfg.end === 'offline' ? { phase: 'error', error: 'offline' } : { phase: 'ready', percent: 100 }), 600);
        return { ok: true };
      }
      if (channel === 'upd:cancel') { push({ phase: 'idle', percent: 0 }); return { ok: true }; }
      if (channel === 'upd:install') { if (payload?.when === 'quit') push({ installOnQuit: true }); return { ok: true }; }
      if (channel === 'upd:ack-updated') { justUpdated = null; return state(); }
      if (channel === 'upd:open-release' || channel === 'upd:dismiss') return channel === 'upd:dismiss' ? { ...state(), dismissed: true } : { ok: true };
      return null;
    },
  });
}

async function desktop(env, cfg) {
  const app = await openApp(env, { path: '/ide', session, storage: { 'pug-ide-workspaces-intro': '1' } });
  await app.page.addInitScript(fakeDesktop, cfg);
  await app.page.reload();
  await app.page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  return app;
}

const calls = (page, channel) => page.evaluate((c) => window.__calls.filter(([ch]) => ch === c).map(([, p]) => p), channel);

export default async function (env) {
  // 1 · Hay versión nueva y esta instalación se actualiza sola.
  let app = await desktop(env, {});
  let page = app.page;
  const bar = page.locator('[data-testid="update-bar"]');
  await bar.waitFor({ timeout: 8000 });
  check('64 la barra dice la versión nueva y la instalada', /0\.15\.0/.test(await bar.innerText()) && /tienes la 0\.14\.0/.test(await bar.innerText()));
  check('64 ofrece «Ver novedades», «Ahora no» y «Actualizar» (ya no «Descargar»)', (await bar.locator('[data-testid="update-notes"]').count()) === 1 && (await bar.locator('[data-testid="update-later"]').count()) === 1 && (await bar.locator('[data-testid="update-now"]').count()) === 1 && (await bar.locator('[data-testid="update-download"]').count()) === 0);
  await bar.locator('[data-testid="update-notes"]').click();
  check('64 «Ver novedades» abre la página de la versión', (await calls(page, 'upd:open-release')).length === 1);

  // 2 · Descargando, con progreso y sin cerrar nada.
  await bar.locator('[data-testid="update-now"]').click();
  check('64 «Actualizar» pide la descarga', !!(await waitUntil(async () => (await calls(page, 'upd:update')).length === 1, 3000)));
  check('64 se ve el progreso (porcentaje, MB y barra accesible)', !!(await waitUntil(async () => (await bar.getAttribute('data-phase')) === 'downloading' && /50 %/.test(await bar.innerText()) && /56 de 112 MB/.test(await bar.innerText()) && (await bar.locator('[role="progressbar"]').getAttribute('aria-valuenow')) === '50', 3000)), await bar.innerText().catch(() => ''));
  check('64 mientras descarga se puede seguir trabajando (el editor sigue ahí)', (await page.locator('.monaco-editor').count()) > 0 && (await page.locator('.overlay').count()) === 0);

  // 3 · Lista para instalar.
  check('64 al terminar: «PugIDE 0.15.0 está lista» con sus dos opciones', !!(await waitUntil(async () => (await bar.getAttribute('data-phase')) === 'ready', 3000)) && /0\.15\.0.*está lista/.test(await bar.innerText()) && (await bar.locator('[data-testid="update-on-quit"]').count()) === 1);
  check('64 dice que tus proyectos se guardan antes', /se guardan antes/.test(await bar.innerText()));
  await bar.locator('[data-testid="update-restart"]').click();
  check('64 «Reiniciar y actualizar» instala ahora', !!(await waitUntil(async () => (await calls(page, 'upd:install')).some((p) => p?.when === 'now'), 3000)));
  check('64 y antes guarda la sesión', (await page.evaluate(() => localStorage.getItem('pug-ide-project') ?? '')).includes('Hola'));
  await app.close();

  // 3b · «Al cerrar PugIDE»: se oculta la barra y se instalará al cerrar.
  app = await desktop(env, { self: { phase: 'ready', version: '0.15.0', percent: 100 } });
  page = app.page;
  await page.locator('[data-testid="update-on-quit"]').click();
  check('64 «Al cerrar PugIDE» la deja para el cierre y oculta la barra', !!(await waitUntil(async () => (await page.locator('[data-testid="update-bar"]').count()) === 0, 3000)) && (await calls(page, 'upd:install')).some((p) => p?.when === 'quit'));
  await app.close();

  // 6 · macOS o portable: «Descargar», con la explicación.
  app = await desktop(env, { self: { canUpdate: false, cannotReason: 'portable' } });
  page = app.page;
  const dl = page.locator('[data-testid="update-download"]');
  await dl.waitFor({ timeout: 8000 });
  check('64 en el portable (o macOS) se ofrece «Descargar» con la explicación', (await page.locator('[data-testid="update-now"]').count()) === 0 && /portable.*a mano/.test(await dl.getAttribute('title')));
  await dl.click();
  check('64 «Descargar» abre la página de la versión', (await calls(page, 'upd:open-release')).length === 1);
  await app.close();

  // 7 · Linux .deb/.rpm: el sistema pedirá la contraseña.
  app = await desktop(env, { self: { phase: 'ready', version: '0.15.0', percent: 100, linuxPackage: 'deb' } });
  page = app.page;
  await page.locator('[data-testid="update-bar"]').waitFor({ timeout: 8000 });
  check('64 con .deb/.rpm avisa de que el sistema pedirá la contraseña', /pedirá tu contraseña/.test(await page.locator('[data-testid="update-bar"]').innerText()));
  await app.close();

  // 8 · Error: no cambia nada, Reintentar y Descargar desde GitHub.
  app = await desktop(env, { end: 'offline' });
  page = app.page;
  await page.locator('[data-testid="update-now"]').click();
  const err = page.locator('[data-testid="update-bar"][data-phase="error"]');
  check('64 si la descarga se corta: lo dice y que sigues con tu versión', !!(await waitUntil(async () => (await err.count()) === 1, 4000)) && /se cortó.*sigues con la 0\.14\.0/.test(await err.innerText()), await page.locator('[data-testid="update-bar"]').innerText().catch(() => ''));
  check('64 ofrece «Reintentar» y «Descargar desde GitHub»', (await err.locator('[data-testid="update-retry"]').count()) === 1 && (await err.locator('[data-testid="update-github"]').count()) === 1);
  await err.locator('[data-testid="update-retry"]').click();
  check('64 «Reintentar» vuelve a descargar', !!(await waitUntil(async () => (await calls(page, 'upd:update')).length === 2, 3000)));
  await app.close();

  // 4 · Después de actualizar, y el diálogo «Buscar actualizaciones».
  app = await desktop(env, { latest: false, justUpdated: '0.14.0' });
  page = app.page;
  const done = page.locator('[data-testid="update-done"]');
  await done.waitFor({ timeout: 8000 });
  check('64 al abrir tras actualizar: «PugIDE se ha actualizado a 0.14.0»', /se ha actualizado a 0\.14\.0/.test(await done.innerText()) && (await done.locator('[data-testid="update-done-notes"]').count()) === 1);
  await done.locator('[data-testid="update-done-close"]').click();
  check('64 el aviso se cierra y no vuelve', !!(await waitUntil(async () => (await done.count()) === 0, 3000)) && (await calls(page, 'upd:ack-updated')).length === 1);
  await app.close();

  app = await desktop(env, {});
  page = app.page;
  await page.locator('[data-testid="update-bar"]').waitFor({ timeout: 8000 });
  await page.keyboard.press(process.env.PUGIDE_BROWSER === 'webkit' ? 'Meta+k' : 'Control+k');
  await page.keyboard.type('Buscar actualizaciones');
  await page.keyboard.press('Enter');
  const dlg = page.locator('[data-testid="updates-dialog"]');
  const opened = await dlg.waitFor({ timeout: 4000 }).then(() => true).catch(() => false);
  if (opened) {
    check('64 el diálogo ofrece «Ver novedades en GitHub» y «Actualizar»', (await dlg.locator('[data-testid="updates-notes"]').count()) === 1 && (await dlg.locator('[data-testid="updates-update"]').count()) === 1);
    await dlg.locator('[data-testid="updates-update"]').click();
    check('64 «Actualizar» desde el diálogo empieza la descarga y la sigue la barra', !!(await waitUntil(async () => (await calls(page, 'upd:update')).length === 1 && (await page.locator('[data-testid="update-bar"][data-phase="downloading"]').count()) === 1, 3000)));
  } else {
    check('64 la paleta abre «Buscar actualizaciones»', false, 'no se abrió el diálogo');
  }
  check('64 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
