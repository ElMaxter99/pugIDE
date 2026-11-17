import { check, openApp, waitUntil } from '../lib.mjs';

// Versión y actualizaciones (P-47 a P-49): el número de versión es un botón que abre el panel con el canal
// (estable / pruebas), cómo está instalada la copia y qué pasará al actualizar. Web: solo la versión.
const session = { projectName: 'Norte', files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Hola\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };

function fakeDesktop(cfg) {
  const listeners = new Set();
  window.__calls = [];
  let channel = cfg.channel ?? 'stable';
  const self = { phase: 'idle', version: null, percent: 0, transferred: 0, total: 0, error: cfg.error ?? null, installOnQuit: false, canUpdate: cfg.install !== 'mac', cannotReason: null, linuxPackage: cfg.install === 'deb' ? 'deb' : null };
  const state = () => ({ current: cfg.current ?? '0.19.0', asked: true, enabled: true, lastCheck: Date.now(), latest: null, dismissed: false, channel, prerelease: /-/.test(cfg.current ?? ''), install: cfg.install ?? 'installer', platform: 'linux', self, justUpdated: null });
  window.pugideDesktop = Object.freeze({
    platform: 'linux', version: cfg.current ?? '0.19.0', webUrl: 'https://pug-ide.vercel.app',
    onEvent: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    invoke: async (ch, payload) => {
      window.__calls.push([ch, payload ?? null]);
      if (ch === 'ws:list') return { workspaces: [], lastId: null, colors: [] };
      if (ch === 'upd:state') return state();
      if (ch === 'upd:channel') { channel = payload.channel; return state(); }
      return null;
    },
  });
}

const calls = (page, channel) => page.evaluate((c) => window.__calls.filter(([ch]) => ch === c).map(([, p]) => p), channel);

async function open(env, cfg) {
  const app = await openApp(env, { path: '/ide', session, storage: { 'pug-ide-workspaces-intro': '1' } });
  if (cfg) { await app.page.addInitScript(fakeDesktop, cfg); await app.page.reload(); }
  await app.page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  return app;
}

export default async function (env) {
  // 1 · Web: el número de versión es un botón y el panel solo enseña la versión.
  let app = await open(env, null);
  let page = app.page;
  const btn = page.locator('[data-testid="version-button"]');
  await btn.waitFor({ timeout: 8000 });
  check('76 el número de versión es un botón', (await btn.evaluate((el) => el.tagName)) === 'BUTTON' && /^v\d/.test((await btn.innerText()).trim()));
  await btn.click();
  const dlg = page.locator('[data-testid="updates-dialog"]');
  await dlg.waitFor({ timeout: 4000 });
  check('76 en la web: versión y enlace a las novedades, sin canales', (await dlg.locator('[data-testid="updates-web"]').count()) === 1 && (await dlg.locator('[data-testid="updates-channels"]').count()) === 0);
  await page.keyboard.press('Escape');
  check('76 Escape cierra el panel', !!(await waitUntil(async () => (await dlg.count()) === 0, 3000)));
  await app.close();

  // 2 · Escritorio, paquete .deb: canal, explicación de la contraseña y cambio a «Pruebas».
  app = await open(env, { install: 'deb' });
  page = app.page;
  await page.locator('[data-testid="version-button"]').click();
  const d2 = page.locator('[data-testid="updates-dialog"]');
  await d2.waitFor({ timeout: 4000 });
  check('76 «Estable» viene marcado por defecto', await d2.locator('[data-testid="channel-stable"]').isChecked());
  check('76 el .deb avisa de que el sistema pedirá la contraseña', /contraseña/.test(await d2.locator('[data-testid="updates-explain"]').innerText()));
  await d2.locator('[data-testid="channel-rc"]').check();
  check('76 elegir «Pruebas» lo pide al proceso principal y avisa', !!(await waitUntil(async () => (await calls(page, 'upd:channel')).some((p) => p?.channel === 'rc') && (await d2.locator('[data-testid="channel-rc-note"]').count()) === 1, 3000)));
  check('76 sin versiones de pruebas más nuevas lo dice', /No hay versiones de pruebas más nuevas/.test(await d2.locator('[data-testid="updates-status"]').innerText()));
  await app.close();

  // 3 · Versión de pruebas instalada y contraseña cancelada.
  app = await open(env, { install: 'deb', current: '0.20.0-rc.1', error: 'password' });
  page = app.page;
  await page.locator('[data-testid="version-button"]').click();
  const d3 = page.locator('[data-testid="updates-dialog"]');
  await d3.waitFor({ timeout: 4000 });
  check('76 la versión de pruebas lleva la etiqueta «pruebas»', (await d3.locator('[data-testid="updates-badge"]').count()) === 1);
  check('76 explica que no se baja de versión al volver a «Estable»', (await d3.locator('[data-testid="channel-back-note"]').count()) === 1);
  check('76 contraseña cancelada: dice que la descarga sigue guardada', /sigue guardada/.test(await d3.locator('[data-testid="updates-password"]').innerText()));
  check('76 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
