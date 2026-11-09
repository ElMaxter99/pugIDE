'use strict';
// PugIDE de escritorio. Mismo código que la web, dentro de Electron: la app se sirve desde el disco con el protocolo
// `pugide://app` y las mismas cabeceras de seguridad que producción; no hace ninguna llamada de red por su cuenta.
const { app, BrowserWindow, Menu, protocol, session, shell, dialog } = require('electron');
const path = require('node:path');
const { existsSync } = require('node:fs');
const { loadRules } = require('./headers.cjs');
const { resolveRequest } = require('./serve.cjs');
const config = require('./config.json');

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
  try { return new URL(url).origin === ORIGIN; } catch { return false; }
}

function createWindow(webRoot) {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: config.appName,
    backgroundColor: '#16111b',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
      additionalArguments: [`--pugide-version=${encodeURIComponent(app.getVersion())}`, `--pugide-web-url=${encodeURIComponent(config.webUrl || '')}`],
    },
  });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { if (mainWindow === win) mainWindow = null; });
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
      message: `${config.appName} ${app.getVersion()}`,
      detail: 'IDE de Pug/Jade 100 % local: tu código no sale de tu equipo.\n\nSoftware libre con licencia MIT, sin garantía y bajo la responsabilidad de cada persona usuaria. Este instalador no está firmado.\n\n' + config.repoUrl,
    });
  };
  const template = [
    ...(isMac ? [{ label: config.appName, submenu: [{ label: `Acerca de ${config.appName}`, click: about }, { type: 'separator' }, { role: 'hide', label: 'Ocultar' }, { role: 'hideOthers', label: 'Ocultar otros' }, { role: 'unhide', label: 'Mostrar todo' }, { type: 'separator' }, { role: 'quit', label: 'Salir' }] }] : []),
    ...(isMac ? [] : [{ label: 'Archivo', submenu: [{ role: 'quit', label: 'Salir' }] }]),
    // «Edición» es imprescindible en macOS: sin ella no funcionan Cmd+C, Cmd+V ni Cmd+Z en el editor.
    { label: 'Edición', submenu: [{ role: 'undo', label: 'Deshacer' }, { role: 'redo', label: 'Rehacer' }, { type: 'separator' }, { role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' }, { role: 'selectAll', label: 'Seleccionar todo' }] },
    { label: 'Ver', submenu: [{ role: 'reload', label: 'Recargar' }, { type: 'separator' }, { role: 'resetZoom', label: 'Tamaño real' }, { role: 'zoomIn', label: 'Acercar' }, { role: 'zoomOut', label: 'Alejar' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'Pantalla completa' }, ...(app.isPackaged ? [] : [{ type: 'separator' }, { role: 'toggleDevTools' }])] },
    { label: 'Ayuda', submenu: [
      { label: 'Documentación y código fuente', click: () => shell.openExternal(config.repoUrl) },
      { label: 'Notas de las versiones', click: () => shell.openExternal(`${config.repoUrl}/releases`) },
      ...(isMac ? [] : [{ type: 'separator' }, { label: `Acerca de ${config.appName}`, click: about }]),
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
