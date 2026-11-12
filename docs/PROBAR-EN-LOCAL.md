# Probar una rama en tu equipo (Windows y Ubuntu)

Guía para validar a mano lo que trae una PR antes de mergearla: la web en local, el asistente de IA, la app de
escritorio desde el código, sus instaladores y el aviso de versión nueva. Los comandos son los mismos en
**PowerShell (Windows)** y en **Bash (Ubuntu)** salvo donde se indica.

## 0. Lo que necesitas una vez

- **Node.js 22** y **git**. Comprueba con `node -v` (debe empezar por `v22`) y `git --version`.
  - Windows: instalador de [nodejs.org](https://nodejs.org) (LTS 22) y [git-scm.com](https://git-scm.com).
  - Ubuntu: `sudo apt install git` y Node 22 con [nvm](https://github.com/nvm-sh/nvm) (`nvm install 22`).
- El repositorio clonado: `git clone https://github.com/ElMaxter99/pugIDE.git` y `cd pugIDE`.

## 1. Traer la rama de la PR

Cambia `NOMBRE-DE-LA-RAMA` por la de la PR (sale arriba en la página de la PR, por ejemplo `claude/asistente-ia`):

```bash
git fetch origin
```

```bash
git switch NOMBRE-DE-LA-RAMA
```

```bash
npm ci
```

Para volver después a lo publicado: `git switch master` y `git pull`.

## 2. La web en local

```bash
npm start
```

Abre <http://localhost:4200>. Cada cambio de la rama se ve aquí sin instalar nada.

## 3. El asistente de IA (Claude Code o Copilot)

Solo existe en local (`npm start`) y en la app de escritorio; en la web publicada no aparece.

1. **Instala las CLI que vayas a usar** (una o las dos) e **inicia sesión** una vez en una terminal:
   - Claude Code: `npm i -g @anthropic-ai/claude-code`, luego `claude` (te pide iniciar sesión la primera vez; sal con `/exit`).
   - GitHub Copilot: `npm i -g @github/copilot`, luego `copilot` y `/login` (sal con `/exit`).
   - Comprueba que responden: `claude --version` y `copilot --version`.
2. **Con `npm start`**: el navegador no puede lanzar programas, así que abre **otra terminal** en la carpeta del proyecto y deja corriendo el puente local:

   ```bash
   npm run ia
   ```

   Dice qué CLI encuentra. Solo escucha en tu equipo (127.0.0.1) y solo atiende a PugIDE abierto en `localhost`.
3. En PugIDE: **Vista (de la vista previa) → Asistente de IA…** Comprueba que salen las dos CLI con su versión, elige el **modelo por defecto** de cada una y guarda.
4. Prueba los dos caminos:
   - **Datos**: panel Datos → **⋯ → Proponer datos con IA…** Mira «Qué se envía», la estimación de tokens y «Ver la orden y el texto exactos». Envía, mira los pasos y los tokens en vivo, y en las propuestas usa **Probar en la vista previa → Revertir** y luego **Aplicar**. Ctrl+Z en el editor de datos lo deshace.
   - **Error**: escribe algo que falle (por ejemplo `p= productos[3].nombre.x`) y en **Problemas → Proponer arreglo con IA…**
5. El **Registro** apunta cada petición (CLI, modelo, tokens, tiempo) y la barra de estado suma la sesión.

Si algo falla, el diálogo enseña el mensaje de la propia CLI (por ejemplo, sesión caducada o modelo que no existe).

## 4. La app de escritorio desde el código (sin instalar nada)

Es la forma más rápida de probar la app de escritorio de una rama:

```bash
npm run start:desktop
```

La primera vez (y cuando cambian) instala solo las dependencias de escritorio, que tarda un par de minutos.

Abre la app con el código de la rama. Para el asistente de IA **no hace falta** `npm run ia`: lo lanza la propia app.

Esta app de prueba se identifica como versión **0.0.0**, así que si activas el **aviso de versión nueva**
(primera vez que la abres, o **Ayuda → Buscar actualizaciones…**) te avisará de la última versión publicada. Es una
forma sencilla de comprobar el aviso.

## 5. Los instaladores de la rama

### Sin compilar nada: los del CI de la PR

Cada PR que toca la app de escritorio construye los instaladores de Windows, macOS y Linux. En la PR: **Checks →
Escritorio → Summary → Artifacts**, y descarga `instaladores-Windows` (o `-Linux` / `-macOS`). Se guardan 14 días.

### Compilándolos tú

Primero la web y las dependencias de escritorio:

```bash
npm run build:prod
```

```bash
npm run desktop:install
```

- **Windows (PowerShell)**: genera el instalador y el portable en `desktop\dist\`:

  ```bash
  npm run dist:win --prefix desktop -- -c.extraMetadata.version=0.0.1
  ```

- **Ubuntu (Bash)**: genera `.deb` y `.AppImage` en `desktop/dist/` (el `.rpm` necesita `sudo apt install rpm`; si no lo quieres, el comando sigue con los otros dos):

  ```bash
  npm run dist:linux --prefix desktop -- -c.extraMetadata.version=0.0.1 --linux deb AppImage
  ```

  Instálalo con `sudo apt install ./desktop/dist/PugIDE-0.0.1-linux-amd64.deb` o ejecuta el `.AppImage` (`chmod +x` y doble clic).

La versión (`0.0.1`) es la que dirá la app instalada. Pon una **más baja** que la última publicada para probar el aviso de versión nueva.

## 6. El aviso de versión nueva (de principio a fin)

El aviso compara la versión instalada con la última release de GitHub. Para verlo como lo verá cualquiera:

1. Instala la versión **anterior** desde [Releases](https://github.com/ElMaxter99/pugIDE/releases) (por ejemplo la 0.12.0 cuando se publique la 0.13.0), o un instalador local con una versión más baja (apartado 5).
2. Ábrela y **acepta** el aviso de versión nueva cuando te lo pregunte (o actívalo en **Ayuda → Buscar actualizaciones…**).
3. Cuando haya una versión más nueva publicada, al abrir la app (o con **Buscar actualizaciones…**) sale la barra con **«Descargar»**, que abre la página de la release. La app no se actualiza sola: los instaladores no están firmados.
4. Instala el nuevo encima del antiguo: conserva tus proyectos, espacios de trabajo y ajustes.

## 7. La batería de pruebas (la misma que pasa el CI)

Desde la carpeta del proyecto, con la rama que quieras probar (o `master`). La primera vez instala los navegadores de prueba:

```bash
npx playwright-core install chromium firefox webkit
```

En Ubuntu, si faltan librerías del sistema para los navegadores:

```bash
sudo npx playwright-core install-deps
```

Luego, en este orden:

```bash
npm run lint
```

```bash
npm run test:unit
```

```bash
npm run test:e2e
```

```bash
npm run build:prod
```

```bash
npm run test:ui
```

`npm run test:ui` prueba sobre el build de producción, por eso va después de `npm run build:prod`. Dice `all passed (N)` o lista los `FAIL`. Para ejecutar solo un escenario, pon parte de su nombre: `node ui-tests/run.mjs 63` (el asistente de IA).

**En Firefox y WebKit** (Safari):

- PowerShell:

  ```bash
  $env:PUGIDE_BROWSER="firefox"; npm run test:ui; Remove-Item Env:PUGIDE_BROWSER
  ```

- Bash:

  ```bash
  PUGIDE_BROWSER=firefox npm run test:ui
  ```

Cambia `firefox` por `webkit` para Safari.

### La app de escritorio

Abre la app con el código de la rama (compila la web y lanza Electron):

```bash
npm run start:desktop
```

Su prueba automática lanza Electron de verdad y comprueba el arranque, la seguridad (CSP y sandbox), que no sale a internet y que el service worker y la analítica están apagados. Necesita el build de producción (las dependencias de escritorio se instalan solas si faltan):

```bash
npm run build:prod
```

```bash
npm run test:desktop
```

Termina con `all passed`. En un Ubuntu sin escritorio (un servidor) usa `xvfb-run -a npm run test:desktop` (`sudo apt install xvfb`).

## 8. Si algo falla

- **«render-sandbox.js desactualizado: ejecuta npm run bundle:runtime»** al compilar en Windows: pasaba en clones hechos antes de la 0.13.1 (los archivos llegan con saltos de línea CRLF). Con la 0.13.1 ya no ocurre. Si quieres dejar tu clon con saltos LF, como en el repositorio (**borra los cambios que no hayas guardado**):

  ```bash
  git rm -rq --cached .
  ```

  ```bash
  git reset --hard
  ```

- **Electron no arranca en un Ubuntu sin escritorio**: usa `xvfb-run -a` delante del comando.
