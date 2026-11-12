'use strict';
// PugIDE de escritorio. Mismo código que la web, dentro de Electron: la app se sirve desde el disco con el protocolo
// `pugide://app` y las mismas cabeceras de seguridad que producción; no hace ninguna llamada de red por su cuenta.
const { app, BrowserWindow, Menu, protocol, session, shell, dialog, ipcMain, net } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { existsSync } = require('node:fs');
const { loadRules } = require('./headers.cjs');
const { resolveRequest } = require('./serve.cjs');
const config = require('./config.json');
const { WorkspaceStore, readWorkspace, readPaths, writeWorkspace, watchedPath, COLORS } = require('./workspaces.cjs');
const { compareVersions, parseLatestRelease, latestReleaseApi, selfUpdateSupport } = require('./updates.cjs');
const { createSelfUpdater, fakeUpdaterModule } = require('./self-update.cjs');
const aiCli = require('./ai-cli.cjs');

/** Peticiones de IA en curso (P-30 a P-34), por id: se pueden detener y se paran todas al cerrar la ventana. */
const aiRuns = new Map();

const SCHEME = 'pugide';
const ORIGIN = `${SCHEME}://app`;
const START_URL = `${ORIGIN}/ide`;

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

/** Carpeta de la app web compilada y `vercel.json`: dentro del instalador (`resources/`) o, en desarrollo, la del repositorio. */
function locate() {
  const packaged = app.isPackaged;
  const webRoot = packaged ? path.join(process.resourcesPath, 'app-web') : path.join(__dirname, '..', '..', 'dist', 'pug-ide', 'browser');
  const vercel = packaged ? path.join(process.resourcesPath, 'vercel.json') : path.join(__dirname, '..', '..', 'vercel.json');
  return { webRoot, vercel };
}

let mainWindow = null;
let pendingLink = null;

function isOurs(url) {
  // `URL.origin` vale 'null' para los esquemas propios: se comparan el esquema y el nombre.
  try { const u = new URL(url); return u.protocol === `${SCHEME}:` && u.host === 'app'; } catch { return false; }
}

// Versión de la app. Empaquetada, la de su package.json (el CI la pone al construir el instalador). Desde el código
// (`npm run start:desktop`) desktop/package.json vale 0.0.0, así que se lee la del proyecto: si no, el aviso de versión
// nueva decía «tienes la 0.0.0». Para probar ese aviso desde el código: PUGIDE_FAKE_VERSION=0.1.0 npm run start:desktop.
const APP_VERSION = app.isPackaged
  ? app.getVersion()
  : (process.env.PUGIDE_FAKE_VERSION || require(path.join(__dirname, '..', '..', 'package.json')).version);

// Icono propio en la ventana y la barra de tareas (sin él se ve el de Electron, sobre todo con `npm run start:desktop`).
// Va empaquetado (electron-builder.yml, `files`): en Windows el .ico, con todos los tamaños; en el resto, el PNG.
const APP_ICON = path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

function createWindow(webRoot) {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: config.appName,
    backgroundColor: '#16111b',
    icon: APP_ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
      additionalArguments: [`--pugide-version=${encodeURIComponent(APP_VERSION)}`, `--pugide-web-url=${encodeURIComponent(config.webUrl || '')}`],
    },
  });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { if (mainWindow === win) { mainWindow = null; for (const h of aiRuns.values()) h.cancel(); aiRuns.clear(); } });
  void win.loadURL(pendingLink ?? START_URL);
  pendingLink = null;
  return win;
}

/** Enlaces `pugide://app/ide#…` (compartir) abiertos desde fuera: se cargan en la ventana. */
function openLink(url) {
  if (!isOurs(url)) return;
  if (!mainWindow) { pendingLink = url; return; }
  void mainWindow.webContents.loadURL(url).then(() => mainWindow?.webContents.reloadIgnoringCache());
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function installMenu() {
  const isMac = process.platform === 'darwin';
  const about = () => {
    void dialog.showMessageBox(mainWindow ?? undefined, {
      type: 'info',
      title: `Acerca de ${config.appName}`,
      message: `${config.appName} ${APP_VERSION}`,
      detail: 'IDE de Pug/Jade 100 % local: tu código no sale de tu equipo.\n\nSoftware libre con licencia MIT, sin garantía y bajo la responsabilidad de cada persona usuaria. Este instalador no está firmado.\n\n' + config.repoUrl,
    });
  };
  const template = [
    ...(isMac ? [{ label: config.appName, submenu: [{ label: `Acerca de ${config.appName}`, click: about }, { type: 'separator' }, { role: 'hide', label: 'Ocultar' }, { role: 'hideOthers', label: 'Ocultar otros' }, { role: 'unhide', label: 'Mostrar todo' }, { type: 'separator' }, { role: 'quit', label: 'Salir' }] }] : []),
    ...(isMac ? [] : [{ label: 'Archivo', submenu: [{ role: 'quit', label: 'Salir' }] }]),
    // «Edición» es imprescindible en macOS: sin ella no funcionan Cmd+C, Cmd+V ni Cmd+Z en el editor.
    { label: 'Edición', submenu: [{ role: 'undo', label: 'Deshacer' }, { role: 'redo', label: 'Rehacer' }, { type: 'separator' }, { role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' }, { role: 'selectAll', label: 'Seleccionar todo' }] },
    { label: 'Ver', submenu: [{ role: 'reload', label: 'Recargar' }, { type: 'separator' }, { role: 'resetZoom', label: 'Tamaño real' }, { role: 'zoomIn', label: 'Acercar' }, { role: 'zoomOut', label: 'Alejar' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'Pantalla completa' }, ...(app.isPackaged ? [] : [{ type: 'separator' }, { role: 'toggleDevTools' }])] },
    { label: 'Espacios', submenu: [
      { label: 'Espacios de trabajo…', accelerator: 'CmdOrCtrl+Shift+E', click: () => sendEvent({ type: 'open-workspaces' }) },
    ] },
    { label: 'Ayuda', submenu: [
      { label: 'Buscar actualizaciones…', click: () => sendEvent({ type: 'open-updates' }) },
      { type: 'separator' },
      { label: 'Documentación y código fuente', click: () => shell.openExternal(config.repoUrl) },
      { label: 'Notas de las versiones', click: () => shell.openExternal(`${config.repoUrl}/releases`) },
      ...(isMac ? [] : [{ type: 'separator' }, { label: `Acerca de ${config.appName}`, click: about }]),
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function sendEvent(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('pugide:event', payload);
}

// ---------- Espacios de trabajo (P-26) y aviso de versión nueva (P-27) ----------
let store = null;
/** Carpetas elegidas con el diálogo del sistema en esta sesión: solo esas pueden convertirse en un espacio. */
const pickedFolders = new Map();
const watchers = new Map();
/** Rutas absolutas que acaba de escribir la app (para no avisar de sus propios cambios). */
const ownWrites = new Map();

function stopWatching(id) {
  const w = watchers.get(id);
  if (w) { try { w.watcher.close(); } catch { /* ya cerrado */ } clearTimeout(w.timer); watchers.delete(id); }
}

function startWatching(ws) {
  stopWatching(ws.id);
  try {
    const pending = new Set();
    const entry = { watcher: null, timer: null };
    entry.watcher = fs.watch(ws.path, { recursive: true }, (_event, file) => {
      if (!file) return;
      const rel = String(file);
      if (!watchedPath(rel)) return;
      const abs = path.join(ws.path, rel);
      const mine = ownWrites.get(abs);
      if (mine && Date.now() - mine < 1500) return;
      pending.add('/' + rel.replace(/\\/g, '/'));
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => { const paths = [...pending]; pending.clear(); sendEvent({ type: 'workspace-changed', id: ws.id, paths }); }, 350);
    });
    entry.watcher.on('error', () => stopWatching(ws.id));
    watchers.set(ws.id, entry);
  } catch { /* sin vigilancia (carpeta de red, límite del sistema): la app sigue guardando */ }
}

async function checkForUpdate() {
  const api = latestReleaseApi(config.repoUrl);
  const updates = store.state.updates;
  if (!api) return { ok: false, reason: 'config' };
  try {
    const res = await net.fetch(api, { headers: { 'User-Agent': 'PugIDE-desktop', Accept: 'application/vnd.github+json' } });
    if (!res.ok) return { ok: false, reason: 'http' };
    const latest = parseLatestRelease(await res.json(), config.repoUrl);
    if (!latest) return { ok: false, reason: 'format' };
    updates.lastCheck = Date.now();
    updates.latest = latest;
    store.save();
    return { ok: true };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

function updateState() {
  const u = store.state.updates;
  const current = APP_VERSION;
  const newer = !!u.latest && compareVersions(u.latest.version, current) > 0;
  return {
    current, asked: !!u.asked, enabled: !!u.enabled, lastCheck: u.lastCheck || 0, latest: newer ? u.latest : null, dismissed: newer && u.dismissed === u.latest.version,
    self: selfUpdater ? selfUpdater.state() : null,
    justUpdated,
  };
}

// Actualizar dentro de la app (P-35/P-36). Solo donde el sistema deja sustituir la instalación (ver updates.cjs).
let selfUpdater = null;
/** Versión a la que se acaba de actualizar (aviso «PugIDE se ha actualizado a X» al abrir), o null. */
let justUpdated = null;

function setupSelfUpdate() {
  const fake = process.env.PUGIDE_TEST_UPDATER; // pruebas: ok | fail | checksum (descarga simulada, no instala)
  let packageType = null;
  try { packageType = fs.readFileSync(path.join(process.resourcesPath, 'package-type'), 'utf8').trim(); } catch { /* AppImage, Windows, macOS */ }
  const support = fake ? { ok: true, reason: null, linuxPackage: process.env.PUGIDE_TEST_UPDATER_PACKAGE || null } : selfUpdateSupport({ platform: process.platform, isPackaged: app.isPackaged, env: process.env, packageType });
  selfUpdater = createSelfUpdater({
    support,
    currentVersion: APP_VERSION,
    send: sendEvent,
    load: () => (fake ? fakeUpdaterModule(fake, process.env.PUGIDE_TEST_UPDATER_VERSION || '99.0.0', () => sendEvent({ type: 'upd-test-installed' })) : require('electron-updater')),
  });
  // ¿Se acaba de actualizar? Se compara con la versión de la última vez que se abrió.
  const u = store.state.updates;
  if (u.lastRunVersion && compareVersions(APP_VERSION, u.lastRunVersion) > 0) justUpdated = APP_VERSION;
  if (u.lastRunVersion !== APP_VERSION) { u.lastRunVersion = APP_VERSION; store.save(); }
}

/** Si la persona lo aceptó: una consulta al abrir (como mucho una al día) y otra cada 24 h. */
function scheduleUpdateChecks() {
  const DAY = 24 * 60 * 60 * 1000;
  const tick = async () => {
    const u = store.state.updates;
    if (!u.enabled || Date.now() - (u.lastCheck || 0) < DAY - 60000) return;
    if ((await checkForUpdate()).ok) sendEvent({ type: 'updates-changed' });
  };
  setTimeout(tick, 4000);
  setInterval(tick, 60 * 60 * 1000);
}

function openRelease() {
  const u = store.state.updates;
  const version = selfUpdater?.state().version || u.latest?.version || justUpdated;
  const url = version ? `${config.repoUrl}/releases/tag/v${version}` : `${config.repoUrl}/releases`;
  if (/^\d+\.\d+\.\d+$/.test(version || '0.0.0') && url.startsWith(config.repoUrl)) void shell.openExternal(url);
  return { ok: true };
}

function setupIpc() {
  const handlers = {
    'ws:list': () => ({ workspaces: store.list(), lastId: store.state.lastId, colors: COLORS }),
    'ws:pick-folder': async () => {
      // Para las pruebas automáticas: sin diálogo del sistema.
      const forced = process.env.PUGIDE_TEST_PICK_FOLDER;
      let dir = forced || null;
      if (!dir) {
        const r = await dialog.showOpenDialog(mainWindow ?? undefined, { title: 'Elegir la carpeta del espacio de trabajo', properties: ['openDirectory', 'createDirectory'] });
        dir = r.canceled ? null : r.filePaths[0] ?? null;
      }
      if (!dir) return null;
      const token = require('node:crypto').randomUUID();
      pickedFolders.set(token, dir);
      let pugCount = 0;
      try { const r = await readWorkspace(dir); if (r.ok) pugCount = Object.keys(r.files).filter((p) => /\.(pug|jade)$/i.test(p)).length; else return { token, path: dir, pugCount: 0, tooBig: true }; } catch { /* se verá al abrir */ }
      return { token, path: dir, pugCount, tooBig: false };
    },
    'ws:create': ({ name, color, token }) => {
      const dir = pickedFolders.get(token);
      if (!dir) return null;
      const ws = store.create(name, color, dir);
      return { id: ws.id };
    },
    'ws:relocate': ({ id, token }) => {
      const dir = pickedFolders.get(token);
      return dir && store.update(id, { path: dir }) ? { ok: true } : { ok: false };
    },
    'ws:update': ({ id, name, color }) => ({ ok: !!store.update(id, { name, color }) }),
    'ws:remove': ({ id }) => { stopWatching(id); store.remove(id); return { ok: true }; },
    'ws:open': async ({ id }) => {
      const ws = store.get(id);
      if (!ws) return { ok: false, reason: 'missing' };
      try { if (!fs.statSync(ws.path).isDirectory()) throw new Error('no dir'); } catch { return { ok: false, reason: 'no-folder' }; }
      const r = await readWorkspace(ws.path);
      if (!r.ok) return r;
      store.touch(id);
      startWatching(ws);
      return { ...r, workspace: { id: ws.id, name: ws.name, color: ws.color, path: ws.path } };
    },
    'ws:read-paths': async ({ id, paths }) => {
      const ws = store.get(id);
      return ws && Array.isArray(paths) ? readPaths(ws.path, paths.filter((p) => typeof p === 'string')) : {};
    },
    'ws:write': async ({ id, change }) => {
      const ws = store.get(id);
      if (!ws || !change || typeof change !== 'object') return { written: [], failed: ['?'] };
      const now = Date.now();
      const mark = (p) => { if (typeof p === 'string') ownWrites.set(path.join(ws.path, '.' + p), now); };
      Object.keys(change.files ?? {}).forEach(mark);
      (change.assets ?? []).forEach((a) => mark(a?.path));
      (change.deleted ?? []).forEach(mark);
      if (typeof change.datasets === 'string') mark('/.pugide/datasets.json');
      if (ownWrites.size > 5000) for (const [k, t] of ownWrites) if (now - t > 5000) ownWrites.delete(k);
      return writeWorkspace(ws.path, change);
    },
    'ws:close': ({ id }) => { stopWatching(id); store.setLast(null); return { ok: true }; },
    'ws:reveal': ({ id }) => { const ws = store.get(id); if (ws) void shell.openPath(ws.path); return { ok: !!ws }; },
    'upd:state': () => updateState(),
    'upd:answer': ({ enabled }) => {
      store.state.updates.asked = true;
      store.state.updates.enabled = !!enabled;
      store.save();
      if (enabled) void checkForUpdate().then((r) => { if (r.ok) sendEvent({ type: 'updates-changed' }); });
      return updateState();
    },
    'upd:check': async () => { const r = await checkForUpdate(); return { ...updateState(), checked: r.ok, reason: r.ok ? null : r.reason }; },
    'upd:dismiss': () => { const u = store.state.updates; if (u.latest) { u.dismissed = u.latest.version; store.save(); } return updateState(); },
    // Asistente de IA: lanza la CLI instalada (`claude` o `copilot`) sin herramientas; el texto lo ha visto la persona.
    'ai:detect': () => aiCli.detect(),
    'ai:run': ({ provider, model, prompt, maxOutputTokens }) => {
      if (typeof prompt !== 'string' || prompt.length > 2_000_000) throw new Error('Petición no válida');
      const runId = require('node:crypto').randomUUID();
      const max = Number.isFinite(maxOutputTokens) ? Math.min(Math.max(256, maxOutputTokens), 128000) : 8000;
      const handle = aiCli.run({ provider, model, prompt, maxOutputTokens: max }, (event) => {
        sendEvent({ type: 'ai', runId, event });
        if (event.type === 'done' || event.type === 'error') aiRuns.delete(runId);
      });
      aiRuns.set(runId, handle);
      return { runId };
    },
    'ai:cancel': ({ runId }) => { aiRuns.get(runId)?.cancel(); return { ok: aiRuns.has(runId) }; },
    // «Ver novedades» y «Descargar» (macOS, portable): la página de la versión en el navegador. upd:download es el nombre antiguo.
    'upd:open-release': () => openRelease(),
    'upd:download': () => openRelease(),
    'upd:update': () => selfUpdater.start(),
    'upd:cancel': () => selfUpdater.cancel(),
    'upd:install': ({ when } = {}) => selfUpdater.install(when === 'quit' ? 'quit' : 'now'),
    'upd:ack-updated': () => { justUpdated = null; return updateState(); },
  };
  for (const [channel, fn] of Object.entries(handlers)) {
    ipcMain.handle(channel, async (event, payload) => {
      // Solo la ventana principal de la app (no los marcos del usuario ni otras ventanas).
      const frame = event.senderFrame;
      if (!frame || frame.parent || !isOurs(frame.url) || event.sender !== mainWindow?.webContents) throw new Error('No permitido');
      return fn(payload && typeof payload === 'object' ? payload : {});
    });
  }
}

/** Seguridad: nada de navegar fuera de la app ni de abrir ventanas arbitrarias. */
function hardenWebContents(contents) {
  contents.on('will-navigate', (event, url) => {
    if (isOurs(url)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
  });
  contents.setWindowOpenHandler(({ url }) => {
    // La ventana «Abrir en una pestaña nueva» del preview es una página de la propia app.
    if (isOurs(url) && new URL(url).pathname === '/assets/preview-host.html') return { action: 'allow', overrideBrowserWindowOptions: { width: 1100, height: 800, autoHideMenuBar: true, title: `${config.appName}: vista previa` } };
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
}

function setupPermissions() {
  const allowed = new Set(['clipboard-read', 'clipboard-sanitized-write', 'fileSystem', 'fullscreen']);
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((contents, permission, callback, details) => callback(allowed.has(permission) && isOurs(details.requestingUrl || contents.getURL())));
  ses.setPermissionCheckHandler((_contents, permission, requestingOrigin) => allowed.has(permission) && requestingOrigin.startsWith(ORIGIN));
}

// Windows agrupa la barra de tareas por este identificador: con el de PugIDE (el `appId` de electron-builder.yml) usa
// nuestro icono también al ejecutar desde el código, en vez del de electron.exe.
if (process.platform === 'win32') app.setAppUserModelId('com.elmaxter99.pugide');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const link = argv.find((a) => a.startsWith(`${SCHEME}://`));
    if (link) openLink(link);
    else if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.on('open-url', (event, url) => { event.preventDefault(); openLink(url); }); // macOS

  app.on('web-contents-created', (_event, contents) => hardenWebContents(contents));

  void app.whenReady().then(() => {
    if (process.platform === 'darwin' && !app.isPackaged) app.dock?.setIcon(path.join(__dirname, '..', 'build', 'icon.png'));
    const { webRoot, vercel } = locate();
    if (!existsSync(path.join(webRoot, 'index.html'))) {
      dialog.showErrorBox('PugIDE', `No se encuentra la aplicación compilada en:\n${webRoot}\n\nEn desarrollo, ejecuta antes «npm run build:prod» en la carpeta del proyecto.`);
      app.quit();
      return;
    }
    const rules = loadRules(vercel);
    protocol.handle(SCHEME, async (request) => {
      const { status, body, headers } = await resolveRequest(webRoot, rules, new URL(request.url).pathname);
      return new Response(body, { status, headers });
    });
    store = new WorkspaceStore(path.join(app.getPath('userData'), 'pugide-desktop.json'));
    setupSelfUpdate();
    setupIpc();
    scheduleUpdateChecks();
    setupPermissions();
    installMenu();
    app.setAsDefaultProtocolClient(SCHEME);
    const initial = process.argv.find((a) => a.startsWith(`${SCHEME}://`));
    if (initial && isOurs(initial)) pendingLink = initial;
    mainWindow = createWindow(webRoot);
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow(webRoot); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
