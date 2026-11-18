import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { selfUpdateSupport, classifyUpdateError } = require('../../desktop/src/updates.cjs');

test('solo se actualiza sola una instalación que el sistema deja sustituir', () => {
  assert.equal(selfUpdateSupport({ platform: 'win32', isPackaged: false }).reason, 'dev');
  assert.deepEqual(selfUpdateSupport({ platform: 'win32', isPackaged: true, env: {} }), { ok: true, reason: null });
  assert.equal(selfUpdateSupport({ platform: 'win32', isPackaged: true, env: { PORTABLE_EXECUTABLE_FILE: 'C:\\PugIDE.exe' } }).reason, 'portable');
  assert.equal(selfUpdateSupport({ platform: 'darwin', isPackaged: true }).reason, 'mac');
  assert.deepEqual(selfUpdateSupport({ platform: 'linux', isPackaged: true, env: { APPIMAGE: '/home/ana/PugIDE.AppImage' } }), { ok: true, reason: null, linuxPackage: null });
  assert.equal(selfUpdateSupport({ platform: 'linux', isPackaged: true, env: {}, packageType: 'deb' }).linuxPackage, 'deb');
  assert.equal(selfUpdateSupport({ platform: 'linux', isPackaged: true, env: {}, packageType: 'rpm' }).ok, true);
  assert.equal(selfUpdateSupport({ platform: 'linux', isPackaged: true, env: {}, packageType: null }).reason, 'linux-unknown');
});

test('los errores de la descarga se clasifican para explicarlos', () => {
  assert.equal(classifyUpdateError('sha512 checksum mismatch, expected abc, got def'), 'checksum');
  assert.equal(classifyUpdateError('net::ERR_INTERNET_DISCONNECTED'), 'offline');
  assert.equal(classifyUpdateError('getaddrinfo ENOTFOUND github.com'), 'offline');
  assert.equal(classifyUpdateError('cancelled'), 'cancelled');
  assert.equal(classifyUpdateError('Cannot find latest.yml in the latest release artifacts (404)'), 'missing');
  assert.equal(classifyUpdateError('algo raro'), 'other');
});

const { createSelfUpdater, fakeUpdaterModule } = require('../../desktop/src/self-update.cjs');
const run = (mode, support = { ok: true, reason: null }) => {
  const events = [];
  let installed = null;
  const up = createSelfUpdater({ support, currentVersion: '0.14.0', send: (e) => events.push(e.update), load: () => fakeUpdaterModule(mode, '0.15.0', (w) => { installed = w; }) });
  return { up, events, installed: () => installed };
};
const until = async (fn, ms = 3000) => { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await new Promise((r) => setTimeout(r, 20)); } return false; };

test('Actualizar: descarga con progreso, queda lista y se instala al reiniciar', async () => {
  const { up, events, installed } = run('ok');
  assert.deepEqual(await up.start(), { ok: true });
  assert.ok(await until(() => up.state().phase === 'ready'));
  assert.deepEqual([...new Set(events.filter((e) => e.phase === 'downloading').map((e) => e.percent))].filter(Boolean), [25, 50, 75, 100]);
  assert.equal(up.state().version, '0.15.0');
  assert.deepEqual(up.install('now'), { ok: true });
  assert.ok(await until(() => installed() === 'now'));
});

test('«Al cerrar PugIDE» deja la instalación para cuando se cierre', async () => {
  const { up } = run('ok');
  await up.start();
  await until(() => up.state().phase === 'ready');
  up.install('quit');
  assert.equal(up.state().installOnQuit, true);
});

test('sin conexión o con la huella que no coincide: error y no se instala', async () => {
  for (const [mode, reason] of [['fail', 'offline'], ['checksum', 'checksum']]) {
    const { up, installed } = run(mode);
    await up.start();
    assert.ok(await until(() => up.state().phase === 'error'), mode);
    assert.equal(up.state().error, reason);
    assert.deepEqual(up.install('now'), { ok: false });
    assert.equal(installed(), null);
  }
});

test('Cancelar vuelve a como estaba', async () => {
  const { up } = run('ok');
  await up.start();
  await until(() => up.state().percent >= 25);
  assert.deepEqual(up.cancel(), { ok: true });
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(up.state().phase, 'idle');
});

test('donde no se puede (portable, macOS, desde el código) no descarga nada', async () => {
  const { up } = run('ok', { ok: false, reason: 'portable' });
  assert.deepEqual(await up.start(), { ok: false, reason: 'portable' });
  assert.equal(up.state().canUpdate, false);
  assert.equal(up.state().cannotReason, 'portable');
});

const { compareVersions, isPrerelease, parseReleases, feedUrl, normalizeChannel } = require('../../desktop/src/updates.cjs');
const REPO = 'https://github.com/ElMaxter99/pugIDE';

test('las versiones se ordenan como semver: rc.2 < rc.10 < estable', () => {
  assert.ok(compareVersions('0.20.0-rc.2', '0.20.0-rc.10') < 0);
  assert.ok(compareVersions('0.20.0-rc.10', '0.20.0') < 0);
  assert.ok(compareVersions('0.20.0-rc.1', '0.19.0') > 0);
  assert.ok(compareVersions('v1.10.0', '1.2.0') > 0);
  assert.equal(compareVersions('0.19.0', '0.19.0'), 0);
  assert.equal(isPrerelease('0.20.0-rc.1'), true);
  assert.equal(isPrerelease('0.19.0'), false);
});

test('cada canal elige la release que le toca por versión, no por fecha', () => {
  const list = [
    { tag_name: 'v0.20.0-rc.2', prerelease: true },
    { tag_name: 'v0.19.0', prerelease: false },
    { tag_name: 'v0.20.0-rc.10', prerelease: true },
    { tag_name: 'v0.21.0', draft: true },
    { tag_name: 'nightly' },
  ];
  assert.equal(parseReleases(list, 'stable', REPO).version, '0.19.0');
  const rc = parseReleases(list, 'rc', REPO);
  assert.equal(rc.version, '0.20.0-rc.10');
  assert.equal(rc.prerelease, true);
  assert.equal(rc.tag, 'v0.20.0-rc.10');
  // Si la estable ya superó a la rc, el canal de pruebas también la ofrece.
  assert.equal(parseReleases([...list, { tag_name: 'v0.20.0' }], 'rc', REPO).version, '0.20.0');
  assert.equal(parseReleases([], 'stable', REPO), null);
  assert.equal(parseReleases(null, 'rc', REPO), null);
  assert.equal(normalizeChannel('rc'), 'rc');
  assert.equal(normalizeChannel('loquesea'), 'stable');
  assert.equal(feedUrl(REPO, 'v0.20.0-rc.1'), `${REPO}/releases/download/v0.20.0-rc.1/`);
});

test('la contraseña cancelada se distingue de una descarga cancelada', () => {
  assert.equal(classifyUpdateError('Error executing command as another user: Request dismissed'), 'password');
  assert.equal(classifyUpdateError('pkexec exited with exit code 126'), 'password');
  assert.equal(classifyUpdateError('cancelled'), 'cancelled');
});

test('el canal elegido decide qué release se descarga', async () => {
  const events = [];
  const lib = fakeUpdaterModule('ok', '0.20.0-rc.1');
  const upd = createSelfUpdater({
    support: { ok: true, reason: null }, currentVersion: '0.19.0', send: (e) => events.push(e), load: () => lib,
    pick: async () => ({ version: '0.20.0-rc.1', tag: 'v0.20.0-rc.1' }), feed: (tag) => feedUrl(REPO, tag),
  });
  assert.equal((await upd.start()).ok, true);
  assert.deepEqual(lib.autoUpdater.feedUrls, [{ provider: 'generic', url: `${REPO}/releases/download/v0.20.0-rc.1/` }]);
  assert.equal(lib.autoUpdater.allowPrerelease, true);
  await new Promise((r) => setTimeout(r, 900));
  assert.equal(upd.state().phase, 'ready');
});

test('sin release nueva en el canal no hay descarga', async () => {
  const upd = createSelfUpdater({
    support: { ok: true, reason: null }, currentVersion: '0.20.0', send: () => {}, load: () => fakeUpdaterModule('ok'),
    pick: async () => ({ version: '0.19.0', tag: 'v0.19.0' }), feed: (tag) => feedUrl(REPO, tag),
  });
  assert.equal((await upd.start()).reason, 'missing');
  assert.equal(upd.state().error, 'missing');
});

test('cerrar el cuadro de la contraseña deja la descarga lista para reintentar', async () => {
  const lib = fakeUpdaterModule('ok', '0.20.0');
  const upd = createSelfUpdater({ support: { ok: true, reason: null, linuxPackage: 'deb' }, currentVersion: '0.19.0', send: () => {}, load: () => lib });
  await upd.start();
  await new Promise((r) => setTimeout(r, 900));
  assert.equal(upd.state().phase, 'ready');
  lib.autoUpdater.emit('error', new Error('Request dismissed'));
  assert.equal(upd.state().phase, 'ready');
  assert.equal(upd.state().error, 'password');
  upd.install('now');
  assert.equal(upd.state().error, null);
});
