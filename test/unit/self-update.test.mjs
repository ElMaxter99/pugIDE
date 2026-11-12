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
