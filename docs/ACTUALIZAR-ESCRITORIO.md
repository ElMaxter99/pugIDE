# Cómo se actualiza una app de escritorio (Electron)

Guía **reutilizable** para cualquier app Electron empaquetada con electron-builder y publicada en las releases de
GitHub, escrita al diseñar la actualización de PugIDE (mesas P-35 y P-36 del lienzo). La primera parte vale para
cualquier proyecto; la última dice cómo se aplica a PugIDE y en qué estado está.

## 1. Por qué la web es fácil y el escritorio no

| | Web / PWA | App de escritorio |
|---|---|---|
| Dónde está el código | En el servidor (Vercel) | Copiado en el disco de cada persona |
| Cómo llega la versión nueva | Recargar: el service worker descarga lo nuevo y limpia lo viejo | Hay que **descargar un instalador nuevo y ejecutarlo**, sustituyendo los archivos de la app mientras no está abierta |
| Quién puede escribir ahí | El navegador, siempre | La propia app solo si el sistema la deja: en macOS exige que la app esté **firmada** |

Por eso en escritorio hacen falta tres piezas: **saber** que hay versión nueva, **descargarla** comprobando que es la
publicada, e **instalarla** al cerrar la app.

## 2. Las piezas (electron-builder + electron-updater)

### 2.1 Al construir: los archivos de la release

electron-updater no mira la página de la release: lee un **manifiesto** que electron-builder genera junto a cada
instalador, cuando hay un `publish` configurado:

| Sistema | Manifiesto | Lo que contiene |
|---|---|---|
| Windows (NSIS) | `latest.yml` | versión, nombre del `.exe`, tamaño y **SHA-512** |
| macOS | `latest-mac.yml` | lo mismo para el `.zip` (el `.dmg` no sirve para actualizar) |
| Linux | `latest-linux.yml` | lo mismo para AppImage, `.deb` y `.rpm` |

Además, los `*.blockmap` permiten descargar solo los bloques que cambian (actualización diferencial).

En `electron-builder.yml`:

```yaml
publish:
  provider: github      # owner/repo se deducen de package.json → repository
  releaseType: release  # no mirar borradores ni prerreleases
```

Y en el CI se construye con `--publish never` (que **no** sube nada, solo genera los `.yml`), y luego se suben a la
release **los instaladores, los `.yml` y los `.blockmap`**. Si falta el `.yml`, la app dirá que no hay versión nueva o
dará error 404.

> La versión de `package.json` (o la de `-c.extraMetadata.version`) tiene que ser la del tag (`v1.2.3` ↔ `1.2.3`),
> y en semver. electron-updater compara la versión instalada con la del manifiesto.

### 2.2 En la app: el proceso principal

```js
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = false;          // nunca descargar sin que la persona lo pida
autoUpdater.autoInstallOnAppQuit = true;   // si ya se descargó, instalar al cerrar
autoUpdater.allowPrerelease = false;

autoUpdater.on('update-available', (info) => send({ type: 'available', version: info.version }));
autoUpdater.on('update-not-available', () => send({ type: 'none' }));
autoUpdater.on('download-progress', (p) => send({ type: 'progress', percent: p.percent, transferred: p.transferred, total: p.total }));
autoUpdater.on('update-downloaded', (info) => send({ type: 'ready', version: info.version }));
autoUpdater.on('error', (err) => send({ type: 'error', message: err.message }));

// Por IPC, desde la interfaz:
ipcMain.handle('upd:check', () => autoUpdater.checkForUpdates());
ipcMain.handle('upd:download', () => autoUpdater.downloadUpdate());   // admite un CancellationToken
ipcMain.handle('upd:install', async () => {
  await guardarTodo();                       // primero, lo que la persona tenga sin guardar
  autoUpdater.quitAndInstall(false, true);   // (isSilent, isForceRunAfter): cierra, instala y vuelve a abrir
});
```

- `checkForUpdates()` solo funciona **empaquetada** (`app.isPackaged`). Para probar desde el código:
  `autoUpdater.forceDevUpdateConfig = true` y un `dev-app-update.yml` en la carpeta de la app con el mismo `publish`.
- Lo que descarga se guarda en la caché de la app (`%LOCALAPPDATA%\<app>-updater`, `~/.cache/<app>-updater`…).
- Antes de instalar, electron-updater **comprueba el SHA-512** del archivo contra el del manifiesto. Si no coincide,
  lo borra y lanza `error`.

### 2.3 Qué sistemas se pueden actualizar solos

electron-updater elige el actualizador según el sistema (`process.platform`) y, en Linux, según el archivo
`resources/package-type` que deja electron-builder en los `.deb` y `.rpm`:

| Instalación | ¿Se actualiza sola? | Notas |
|---|---|---|
| Windows, instalador NSIS | **Sí**, sin firma | Solo comprueba la firma si se configura `publisherName`. SmartScreen puede avisar la primera vez. |
| Windows, **portable** | **No** | No hay instalación que sustituir, pero electron-updater no lo sabe e intentaría instalar con NSIS: hay que detectarlo (`process.env.PORTABLE_EXECUTABLE_FILE`) y ofrecer «Descargar». |
| Linux, AppImage | **Sí** | Sustituye el archivo `.AppImage` (requiere `process.env.APPIMAGE`, que pone el propio AppImage). |
| Linux, `.deb` / `.rpm` | **Sí**, con contraseña | Instala con `pkexec`/`sudo`: el sistema pide la contraseña. |
| macOS | **Solo con la app firmada y notarizada** | Squirrel.Mac rechaza actualizaciones de apps sin firmar. Sin certificado de Apple (de pago): «Descargar». |

### 2.4 Seguridad (lo que se garantiza y lo que no)

- Todo va por **HTTPS** a github.com, y el instalador se comprueba con el **SHA-512** del manifiesto. Así se evita
  un archivo corrupto o una descarga a medias.
- **No** es una firma: quien pudiera publicar en la release podría cambiar instalador y manifiesto a la vez. Con apps
  sin firmar la confianza es la cuenta de GitHub del proyecto: protégela con 2FA y que solo el CI suba los archivos.
- No descargues ni instales sin que la persona lo pida (`autoDownload = false`), y que el aviso sea **opcional**.
- La consulta no envía nada de la persona: GitHub ve la IP y la versión pedida, como en cualquier descarga.

### 2.5 Lista de comprobación para otra app

1. `publish: { provider: github }` en `electron-builder.yml`; `appId` y `productName` **estables** (si cambian, la
   instalación nueva no sustituye a la vieja).
2. El CI construye con `--publish never` y sube instaladores **+ `latest*.yml` + `*.blockmap`** a la release del tag.
3. `electron-updater` como dependencia de la app (no de desarrollo) y el código de 2.2 en el proceso principal.
4. Detectar dónde **no** se puede (portable, macOS sin firma, ejecución desde el código) y ofrecer «Descargar».
5. Guardar el trabajo antes de `quitAndInstall`.
6. Interfaz: aviso → «Actualizar» → progreso con «Cancelar» → «Reiniciar y actualizar» / «Al cerrar» → aviso
   «Se ha actualizado a X» tras abrir; errores con «Reintentar» y «Descargar desde GitHub».
7. Probar de principio a fin (apartado 3).

## 3. Cómo se prueba de principio a fin

1. Publica una versión **A** (por ejemplo 1.4.0) con sus `.yml` e instálala con su instalador (no el portable).
2. Publica una versión **B** (1.4.1) igual.
3. Abre la A: debe ofrecer la B → «Actualizar» → progreso → «Reiniciar y actualizar». Al volver a abrir, «Acerca de»
   dice 1.4.1 y los datos siguen ahí.
4. Repite en cada sistema (Windows instalador, AppImage, `.deb`), y comprueba que el portable y macOS ofrecen
   «Descargar».
5. Errores: corta la red a mitad de descarga (sigue la A, «Reintentar» funciona) y, en una release de prueba,
   cambia el SHA-512 del `.yml` (debe negarse a instalar).

### 3.1 De verdad, sin publicar nada: un servidor local (como se probó en PugIDE)

electron-updater también sabe leer de un servidor web normal (`provider: generic`). Se construye una versión «vieja»
que apunta a `http://127.0.0.1:8099/` y se sirve la nueva desde ahí. En Linux (AppImage), desde `desktop/`:

1. La **nueva** (la que se servirá), con la configuración normal:
   `npx electron-builder --linux AppImage -c.extraMetadata.version=0.14.0 --publish never` → `dist/latest-linux.yml` y el `.AppImage`.
2. Copia esos dos archivos a una carpeta `servidor/` y sírvela: `python3 -m http.server 8099 --bind 127.0.0.1` (dentro de `servidor/`).
3. La **vieja**, con una copia de `electron-builder.yml` cuyo `publish` sea `{ provider: generic, url: http://127.0.0.1:8099/ }`
   y otra carpeta de salida: `npx electron-builder --config eb-prueba.yml --linux AppImage -c.extraMetadata.version=0.13.9 --publish never`.
4. Abre la vieja (`./PugIDE-0.13.9-linux-x86_64.AppImage`), acepta el aviso o ve a «Buscar actualizaciones», pulsa
   «Actualizar» y «Reiniciar y actualizar». El archivo `.AppImage` pasa a ser el de la 0.14.0 (compruébalo con `sha512sum`).
5. Para el caso de error, cambia un `sha512` en `servidor/latest-linux.yml`: debe decir que el archivo no coincide y
   dejar la vieja intacta.

En PugIDE se hizo así (con Playwright pulsando por IPC) y salió: 0.13.9 → descarga → lista → instalada la 0.14.0; y
con la huella cambiada, error `checksum` y el archivo sin tocar. En Windows es igual con `--win nsis` y `latest.yml`.

### 3.2 Desde el código

`autoUpdater.forceDevUpdateConfig = true` y un `dev-app-update.yml` (apartado 2.2). En PugIDE, para ver la interfaz sin
descargar nada: `PUGIDE_TEST_UPDATER=ok npm run start:desktop` (también `fail` y `checksum`) simula la descarga, y
`PUGIDE_FAKE_VERSION=0.1.0` hace que la app se crea antigua para que salga el aviso.

## 4. En PugIDE

| Pieza | Dónde |
|---|---|
| Aviso de versión nueva (opt-in, API de releases de GitHub) | `desktop/src/main.cjs` (`checkForUpdate`), P-27 |
| ¿Se puede actualizar sola esta instalación? | `desktop/src/updates.cjs` (`selfUpdateSupport`) |
| Descargar, progreso, comprobar e instalar (electron-updater) | `desktop/src/self-update.cjs` (`createSelfUpdater`; `fakeUpdaterModule` para las pruebas) |
| Canales `upd:update`, `upd:cancel`, `upd:install`, `upd:open-release`, `upd:ack-updated` | `desktop/src/main.cjs`, `desktop/src/preload.cjs` |
| Interfaz (barra, progreso, lista, error, aviso «se ha actualizado», diálogo) | `desktop-bars.component.ts`, `updates-dialog.component.ts`, `desktop-update.service.ts` (P-35/P-36) |
| Manifiestos y blockmaps en la release | `desktop/electron-builder.yml` (`publish`) y `.github/workflows/desktop.yml` (`--publish never` + subirlos) |
| «Tienes la 0.0.0» desde el código | Arreglado: `APP_VERSION` usa la versión del proyecto |
| Pruebas | `test/unit/self-update.test.mjs`, `ui-tests/scenarios/64-actualizar-escritorio.mjs`, y la prueba de 3.1 a mano |

**Primera versión con «Actualizar»: la 0.14.0.** Quien tenga la 0.13 o anterior llega a la 0.14 con «Descargar» (su
app no sabe actualizarse); de ahí en adelante, con «Actualizar».

Las notas de cada versión están en [CHANGELOG.md](../CHANGELOG.md) y en la página de cada
[release](https://github.com/ElMaxter99/pugIDE/releases), que es lo que abre «Ver novedades».
