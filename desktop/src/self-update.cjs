'use strict';
// Actualizar dentro de la app (P-35/P-36). Envuelve electron-updater: descargar a petición de la persona, enseñar el
// progreso, comprobar la huella (lo hace electron-updater con el SHA-512 de latest*.yml) e instalar al reiniciar o al
// cerrar. Guía general: docs/ACTUALIZAR-ESCRITORIO.md.
const { EventEmitter } = require('node:events');
const { classifyUpdateError, compareVersions, isPrerelease } = require('./updates.cjs');

/**
 * @param {object} o
 * @param {{ok: boolean, reason: string|null, linuxPackage?: string|null}} o.support  selfUpdateSupport()
 * @param {string} o.currentVersion
 * @param {(payload: object) => void} o.send  evento a la ventana (`pugide:event`)
 * @param {() => {autoUpdater: any, CancellationToken: any}} o.load  electron-updater (o uno falso en las pruebas)
 * @param {() => Promise<{version: string, tag: string}|null>} [o.pick]  la release que toca según el canal elegido
 * @param {(tag: string) => string} [o.feed]  carpeta de descargas de esa release (si falta, electron-updater decide solo)
 * @param {{download: Function, open: (file: string) => void}} [o.manual]  macOS: sin electron-updater (app sin firmar),
 *   se descarga y comprueba el .dmg y se abre (mac-download.cjs)
 */
function createSelfUpdater({ support, currentVersion, send, load, pick = null, feed = null, manual = null }) {
  let state = { phase: 'idle', version: null, percent: 0, transferred: 0, total: 0, error: null, installOnQuit: false, file: null };
  let cancelToken = { cancelled: false };
  let lib = null;
  let token = null;

  const snapshot = () => ({ ...state, canUpdate: !!support.ok || !!manual, manual: !!manual && !support.ok, cannotReason: support.ok || manual ? null : support.reason, linuxPackage: support.linuxPackage ?? null });
  const set = (patch) => { state = { ...state, ...patch }; send({ type: 'upd-progress', update: snapshot() }); };
  const fail = (err) => {
    const reason = classifyUpdateError(err?.message ?? err);
    if (reason === 'cancelled') set({ phase: 'idle', percent: 0, transferred: 0, total: 0 });
    // .deb/.rpm: la persona cerró el cuadro de la contraseña. La descarga sigue lista; puede volver a intentarlo (P-49).
    else if (reason === 'password') set({ phase: state.phase === 'ready' ? 'ready' : 'error', error: 'password', installOnQuit: false });
    else if (state.phase !== 'ready') set({ phase: 'error', error: reason });
  };

  function updater() {
    if (lib) return lib.autoUpdater;
    lib = load();
    const u = lib.autoUpdater;
    u.autoDownload = false; // nunca sin que la persona pulse «Actualizar»
    u.autoInstallOnAppQuit = false; // solo si elige «Al cerrar PugIDE»
    u.allowPrerelease = false; // la release la elegimos nosotros (pick), no electron-updater
    u.allowDowngrade = false;
    u.logger = null;
    u.on('download-progress', (p) => set({ phase: 'downloading', percent: Math.max(0, Math.min(100, Math.round(p?.percent ?? 0))), transferred: p?.transferred ?? 0, total: p?.total ?? 0 }));
    u.on('update-downloaded', (info) => set({ phase: 'ready', version: info?.version ?? state.version, percent: 100 }));
    u.on('error', fail);
    return u;
  }

  /** macOS: elegir la release, descargar el .dmg, comprobar su huella; después «Abrir el instalador». */
  async function startManual() {
    if (state.phase === 'downloading' || state.phase === 'ready') return { ok: true };
    cancelToken = { cancelled: false };
    set({ phase: 'downloading', percent: 0, transferred: 0, total: 0, error: null, file: null });
    try {
      const chosen = pick ? await pick() : null;
      if (!chosen || compareVersions(chosen.version, currentVersion) <= 0) { set({ phase: 'error', error: 'missing' }); return { ok: false, reason: 'missing' }; }
      set({ version: chosen.version });
      manual.download({ chosen, token: cancelToken, onProgress: (percent, transferred, total) => { if (!cancelToken.cancelled) set({ phase: 'downloading', percent, transferred, total }); } })
        .then((file) => { if (!cancelToken.cancelled) set({ phase: 'ready', percent: 100, file }); })
        .catch(fail);
      return { ok: true };
    } catch (err) {
      fail(err);
      return { ok: false, reason: state.error };
    }
  }

  return {
    state: snapshot,
    /** «Actualizar»: busca en la release (latest*.yml) y descarga. */
    async start() {
      if (manual && !support.ok) return startManual();
      if (!support.ok) return { ok: false, reason: support.reason };
      if (state.phase === 'downloading' || state.phase === 'ready') return { ok: true };
      set({ phase: 'downloading', percent: 0, transferred: 0, total: 0, error: null });
      try {
        const u = updater();
        if (pick) {
          const chosen = await pick();
          if (!chosen || compareVersions(chosen.version, currentVersion) <= 0) { set({ phase: 'error', error: 'missing' }); return { ok: false, reason: 'missing' }; }
          if (feed) u.setFeedURL({ provider: 'generic', url: feed(chosen.tag) });
          // Desde una versión de pruebas, electron-updater solo mira su mismo canal: allowPrerelease evita que descarte la elegida.
          u.allowPrerelease = isPrerelease(chosen.version) || isPrerelease(currentVersion);
        }
        const found = await u.checkForUpdates();
        const version = found?.updateInfo?.version;
        if (!version || compareVersions(version, currentVersion) <= 0) { set({ phase: 'error', error: 'missing' }); return { ok: false, reason: 'missing' }; }
        set({ version });
        token = new lib.CancellationToken();
        u.downloadUpdate(token).catch(fail);
        return { ok: true };
      } catch (err) {
        fail(err);
        return { ok: false, reason: state.error };
      }
    },
    cancel() {
      if (state.phase !== 'downloading') return { ok: false };
      cancelToken.cancelled = true;
      token?.cancel();
      set({ phase: 'idle', percent: 0, transferred: 0, total: 0 });
      return { ok: true };
    },
    /** `now`: cierra, instala y vuelve a abrir. `quit`: la instala cuando la persona cierre la app. */
    install(when) {
      if (manual && !support.ok) {
        if (state.phase !== 'ready' || !state.file) return { ok: false };
        manual.open(state.file);
        return { ok: true };
      }
      if (state.phase !== 'ready' || !lib) return { ok: false };
      if (state.error) set({ error: null });
      if (when === 'quit') {
        lib.autoUpdater.autoInstallOnAppQuit = true;
        set({ installOnQuit: true });
      } else {
        setImmediate(() => lib.autoUpdater.quitAndInstall(false, true));
      }
      return { ok: true };
    },
  };
}

/**
 * Un electron-updater falso para las pruebas (`PUGIDE_TEST_UPDATER=ok|fail|checksum`): descarga en cuatro pasos y
 * termina bien o con el error pedido. `quitAndInstall` no cierra nada: avisa con `onInstall`.
 */
function fakeUpdaterModule(mode, version = '99.0.0', onInstall = () => {}) {
  class CancellationToken { constructor() { this.cancelled = false; } cancel() { this.cancelled = true; } }
  const u = new EventEmitter();
  u.feedUrls = [];
  u.setFeedURL = (o) => { u.feedUrls.push(o); };
  u.checkForUpdates = async () => ({ updateInfo: { version } });
  u.downloadUpdate = (tok) => new Promise((resolve, reject) => {
    const total = 112 * 1024 * 1024;
    let step = 0;
    const timer = setInterval(() => {
      if (tok?.cancelled) { clearInterval(timer); const e = new Error('cancelled'); u.emit('error', e); reject(e); return; }
      step += 1;
      if (step <= 4) u.emit('download-progress', { percent: step * 25, transferred: (total * step) / 4, total });
      if (step === 2 && mode === 'fail') { clearInterval(timer); const e = new Error('net::ERR_INTERNET_DISCONNECTED'); u.emit('error', e); reject(e); return; }
      if (step === 4) {
        clearInterval(timer);
        if (mode === 'checksum') { const e = new Error('sha512 checksum mismatch, expected aaa, got bbb'); u.emit('error', e); reject(e); return; }
        u.emit('update-downloaded', { version });
        resolve([]);
      }
    }, 150);
  });
  u.quitAndInstall = () => onInstall('now');
  return { autoUpdater: u, CancellationToken };
}

module.exports = { createSelfUpdater, fakeUpdaterModule };
