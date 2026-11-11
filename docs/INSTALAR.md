# Instalar PugIDE

PugIDE se puede usar de **tres formas**. Todas son la misma aplicación y todas funcionan **sin conexión** una vez cargadas o instaladas; tu código **nunca sale de tu equipo**.

| Forma | Para quién | Qué hay que hacer |
|---|---|---|
| **1. En el navegador** | Probarlo ya | Abrir la dirección web. Nada que instalar |
| **2. Como PWA** (instalada desde el navegador) | Quien quiere un icono y una ventana propia sin descargar nada | «Instalar» desde Chrome o Edge (ver abajo). Pesa casi nada; por debajo sigue siendo el navegador |
| **3. Aplicación de escritorio** (Windows, macOS, Linux) | Quien quiere una app independiente del navegador | Descargar el instalador de la [última release](https://github.com/ElMaxter99/pugIDE/releases/latest) |

> ## Aviso importante (léelo antes de instalar)
> PugIDE es **software libre y gratuito (licencia MIT)**, ofrecido **«tal cual», sin garantía de ningún tipo** y **bajo la responsabilidad de cada persona que lo use**. Los instaladores de escritorio **no están firmados**: el proyecto no usa certificados de pago (ni de Apple ni de Microsoft), así que **Windows y macOS mostrarán un aviso la primera vez**. Es normal y no significa que el archivo esté dañado. Si no te fías, no lo instales: puedes **compilarlo tú desde el código fuente** (más abajo) o usar la versión web o la PWA. Haz copia de tus proyectos (Proyecto → Exportar `.zip`) antes de actualizar o desinstalar.

## 2. Instalar como PWA

- **Chrome o Edge (Windows, macOS, Linux):** abre PugIDE y pulsa el icono de **«Instalar»** que sale en la barra de direcciones (a la derecha), o el menú ⋮ → **Guardar y compartir → Instalar PugIDE** (en Edge: ⋯ → **Aplicaciones → Instalar este sitio como una aplicación**).
- **Safari (macOS Sonoma o posterior):** **Archivo → Añadir al Dock**.
- **Firefox de escritorio:** no admite instalar PWA. Usa Chrome o Edge, o el instalador de escritorio.
- **Se actualiza sola:** cuando hay una versión nueva en la web, la app te lo dice y recargas (como en el navegador).
- **Límites:** depende del navegador que la instaló; las carpetas del disco (importar/exportar proyecto como carpeta) solo van en navegadores de la familia Chromium.

## 3. Aplicación de escritorio

Los instaladores están en la página de cada [release](https://github.com/ElMaxter99/pugIDE/releases). Elige el de tu sistema:

| Sistema | Archivo | Notas |
|---|---|---|
| **Windows 10/11** (64 bits) | `PugIDE-X.Y.Z-windows-x64-instalador.exe` o `…-portable.exe` (sin instalar) | Ver «Windows» |
| **macOS** (Apple Silicon: M1 o posterior) | `PugIDE-X.Y.Z-mac-arm64.dmg` | Ver «macOS» |
| **macOS** (Intel) | `PugIDE-X.Y.Z-mac-x64.dmg` | Ver «macOS» |
| **Linux** (64 bits): Ubuntu, Debian y derivadas | `PugIDE-X.Y.Z-linux-amd64.deb` | `sudo apt install ./PugIDE-X.Y.Z-linux-amd64.deb` |
| **Linux:** Fedora, openSUSE y derivadas | `PugIDE-X.Y.Z-linux-x86_64.rpm` | `sudo dnf install ./PugIDE-X.Y.Z-linux-x86_64.rpm` |
| **Linux:** cualquiera | `PugIDE-X.Y.Z-linux-x86_64.AppImage` | `chmod +x PugIDE-*.AppImage` y doble clic (o `./PugIDE-*.AppImage`) |

### Windows
Al abrir el instalador, SmartScreen puede decir *«Windows protegió su PC»*: pulsa **Más información → Ejecutar de todos modos**. El instalador no pide permisos de administrador (se instala solo para tu usuario).

### macOS
Al abrir la app por primera vez, macOS puede decir que *«no se puede abrir porque el desarrollador no se puede verificar»* o que *«está dañada»* (es el aviso de las apps sin firmar, no un daño real). Arrastra **PugIDE** a **Aplicaciones** y, **solo la primera vez**, abre con **clic derecho (o Control+clic) → Abrir → Abrir**. Si sigue diciendo que está dañada, quita la marca de cuarentena en Terminal:

```bash
xattr -dr com.apple.quarantine /Applications/PugIDE.app
```

### Linux
- **Ubuntu 24.04 o posterior y AppImage:** Ubuntu restringe los espacios de nombres de usuario y el `AppImage` puede no arrancar. Usa el `.deb` (recomendado) o lánzalo con `./PugIDE-*.AppImage --no-sandbox`.
- El `AppImage` necesita FUSE 2 en algunas distribuciones (`sudo apt install libfuse2`).

## Cómo se actualiza
- **Navegador y PWA:** la app avisa cuando hay versión nueva y recargas.
- **Aplicación de escritorio:** no se instala sola (los instaladores no están firmados), pero **puede avisarte**. La primera vez pregunta si quieres el aviso; si aceptas, consulta en github.com el número de la última versión (una vez al día y al abrir, sin enviar nada tuyo) y, cuando hay una nueva, enseña una barra con «Descargar», que abre la página de la versión. Descargas el instalador y lo instalas encima: tus proyectos y espacios se conservan. Se cambia en **Ayuda → Buscar actualizaciones…**; sin aceptar, la app no hace ninguna llamada de red.

## Espacios de trabajo (solo en la app de escritorio)
Un **espacio de trabajo** es una carpeta de tu equipo: la de las plantillas de un cliente, por ejemplo. Ábrelos desde **Espacios de trabajo…** en la barra superior.

- **Nuevo espacio…**: pon un nombre, elige un color y la carpeta. Si ya tiene plantillas `.pug`, se usan; si no, empieza con una plantilla.
- Lo que editas **se guarda en los archivos de esa carpeta** (los datos de ejemplo, en `.pugide/datasets.json`). Puedes usar git, otro editor o tu copia de seguridad habitual.
- Si un archivo **cambia fuera** de PugIDE, se recarga solo. Si lo cambiaste en los dos sitios, PugIDE pregunta con cuál quedarse.
- PugIDE solo lee plantillas, estilos, JSON, imágenes y fuentes; lo demás (`.git`, `node_modules`, otros tipos de archivo) **no se toca**. Elige la carpeta de las plantillas, no la de un proyecto entero: el límite es de 2000 archivos y 60 MB.
- «Quitar de la lista» no borra nada del disco. El historial por archivo y las instantáneas se guardan en el perfil de la app, no en la carpeta.

## Tus proyectos y tu privacidad
- La app de escritorio **no hace ninguna llamada de red por su cuenta** (salvo, si lo aceptas, la consulta de versión nueva a github.com) y **no lleva analítica**. Funciona con el cable desenchufado. (Los enlaces `https` que abras desde ella se abren en tu navegador.)
- Los proyectos se guardan en **el perfil de cada app**: la web, la PWA y la app de escritorio **no comparten** proyectos entre sí. Para llevarte uno: **Proyecto → Exportar** (`.zip`) y en la otra, **Proyecto → Importar**.
- Los enlaces de **compartir** funcionan igual en las tres. Desde la app de escritorio apuntan a la versión web (`https://pug-ide.vercel.app`, configurable en `desktop/src/config.json`, clave `webUrl`), así que se abren en cualquier navegador. Si se vaciara esa clave, saldrían como `pugide://app/…`, que solo abre quien tenga la app de escritorio instalada.

## Desinstalar
- **Windows:** Configuración → Aplicaciones. **macOS:** arrastra PugIDE a la Papelera. **Linux:** `sudo apt remove pugide` (o `dnf remove pugide`), o borra el `AppImage`.
- Los datos (tus proyectos) quedan en el perfil de la app: en Windows `%APPDATA%\PugIDE`, en macOS `~/Library/Application Support/PugIDE`, en Linux `~/.config/PugIDE`. Bórralos si quieres eliminarlos del todo.

## Compilarlo tú desde el código fuente
Es la forma de no fiarte de ningún binario ajeno. Necesitas Node 22 y git:

```bash
git clone https://github.com/ElMaxter99/pugIDE.git
cd pugIDE
npm ci
npm run desktop:install
npm run desktop:start        # abre la app de escritorio, sin instalar nada
```

Para generar tu propio instalador: `npm run desktop:pack` (carpeta lista para ejecutar) o, dentro de `desktop/`, `npm run dist:linux`, `dist:win` o `dist:mac` (cada uno en su sistema operativo).

## Para quien mantiene el proyecto
El flujo `.github/workflows/desktop.yml` construye los tres instaladores cuando se publica una release y los adjunta a ella; ver [RELEASE.md](RELEASE.md) y [ESCRITORIO.md](ESCRITORIO.md).
