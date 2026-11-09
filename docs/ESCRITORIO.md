# PugIDE de escritorio (Windows, macOS y Linux): investigación y plan

Estado: **propuesta para aprobar** (2026-11-09). Nada de esto está programado. Las decisiones que necesitan visto bueno están al final.

## Objetivo
Tener PugIDE como aplicación instalable, como Postman, y no solo en la web: una ventana propia, que funcione sin conexión, con **espacios de trabajo por cliente** (cada cliente con sus maquetas y plantillas) y que se actualice sola. La versión web en Vercel se mantiene; la de escritorio es la misma app dentro de un contenedor.

## Lo que ya juega a nuestro favor
- **Es 100 % cliente.** Pug, Sass y Less se compilan en el navegador (paquetes JavaScript, sin binarios nativos); no hay backend que empaquetar. Esto hace que envolver la app sea barato.
- **Ya es una PWA** (`manifest.webmanifest` y service worker de Angular): se puede instalar hoy desde Chrome o Edge (y «Añadir al Dock» en Safari de macOS) en Windows, macOS y Linux, con ventana propia, sin hacer nada.
- **Ya usa la API de carpetas del navegador** (`showDirectoryPicker`) para importar y exportar proyectos, así que la idea de «proyecto = carpeta del disco» ya existe en pequeño.

## Lo que hay que respetar (condiciona el diseño técnico)
- **CSP estricta y marcos aislados.** `vercel.json` define una CSP por ruta y los marcos del preview (`preview-frame.html`, `render-frame.html`) llevan `sandbox`. El contenedor tiene que servir la app con **las mismas cabeceras**; si no, las pruebas de interfaz (que aplican las cabeceras de producción) dejarían de ser representativas.
- **`window.print()`** se usa en el modo PDF / página impresa. El motor de impresión del contenedor importa.
- **Compartir** usa `location.origin`: dentro del contenedor el origen no sería `https://…`, así que hay que fijar la dirección web para los enlaces (cambio pequeño, localizado en `share-create-dialog`).
- **Analítica de Vercel** (opt-in) y **service worker**: en escritorio no tienen sentido; se desactivan.
- **«Todo local»**: la única llamada de red nueva sería la de actualizaciones; debe ser opt-in y decirse con claridad (decisión 4).

## Opciones estudiadas

| Opción | Qué es | A favor | En contra |
|---|---|---|---|
| **A. PWA instalada** | La app web, instalada desde el navegador | Gratis, hoy, sin código; se actualiza sola | Sin Firefox de escritorio; las carpetas solo en navegadores Chromium; sin menús nativos, sin asociar `.pug`, sin vigilar archivos; el usuario depende de su navegador |
| **B. Electron** | Chromium + Node empaquetados | El **mismo motor en los tres sistemas** (renderizado idéntico, `print` y `printToPDF` probados); acceso nativo al disco; ecosistema maduro (electron-builder, actualizador); casi no cambia el código de la app | Instalador grande (≈ 85–150 MB); hay que actualizar Electron por seguridad con regularidad |
| **C. Tauri 2** | Webview del sistema + Rust | Instalador muy pequeño (unos pocos MB) y poca memoria | **Usa un motor distinto en cada sistema** (WebView2 en Windows, WebKit en macOS, **WebKitGTK en Linux**); en Linux va por detrás en CSS y funciones, y la impresión a PDF es la parte débil; hay que escribir Rust para el acceso a disco; nuestra suite se probaría en tres motores más |
| D. Neutralino / NW.js | Alternativas ligeras | — | Menos mantenimiento y comunidad; sin ventaja clara frente a B |

**Recomendación: A ya y B como camino principal.** La app depende de CSP estricta, iframes con `sandbox`, impresión a PDF y compilación pesada en el navegador; con Electron el motor es el mismo que ya probamos en Chromium, y el riesgo de «en Linux se ve distinto» desaparece. Tauri compensa si el tamaño fuese crítico, y no lo es para una herramienta de desarrollo (Postman, VS Code y Slack son Electron).

## Plan por fases

### Fase 0: PWA instalable (1 día, sin riesgo)
- Probar la instalación en Chrome, Edge y Safari; arreglar lo que falle (iconos, `start_url`, captura de pantalla del manifiesto).
- Dar una línea de ayuda en el README («Instalar»). Si se quiere un botón «Instalar PugIDE» en la portada, es un cambio visible y pasa por el lienzo.

### Fase 1: contenedor Electron mínimo, sin cambios de interfaz (1–2 semanas)
- Carpeta `desktop/` en este mismo repositorio (principal + preload).
- Servir `dist/pug-ide/browser` con un **protocolo propio** (`pugide://app`) aplicando las mismas cabeceras que `vercel.json` (se leen de ese archivo, no se copian: una sola fuente).
- Seguridad de Electron: `contextIsolation`, `sandbox`, sin `nodeIntegration`, sin ventanas ni navegación externas (los enlaces `https` se abren en el navegador del sistema), permisos denegados por defecto.
- Desactivar service worker y analítica en escritorio; dirección fija para los enlaces de compartir.
- **Pruebas:** un modo de `ui-tests` que lanza la app con Playwright (`_electron`) y pasa la misma batería; más una prueba de humo de arranque por sistema operativo.

### Fase 2: empaquetado y CI (1 semana)
- **electron-builder:** Windows `NSIS` (x64 y arm64), macOS `dmg` (Intel y Apple Silicon), Linux `AppImage`, `deb` y `rpm` (x64 y arm64).
- Flujo de GitHub Actions con una máquina por sistema operativo: cuando `release:deploy` crea el tag, el flujo construye los instaladores y los **adjunta a la release de GitHub**. Compilar en cada sistema (no cruzado) es lo fiable.
- Requiere tocar `.github/workflows` (**regla de CLAUDE.md: coordinarlo**, decisión 5).

### Fase 3: firma y notarización (depende de presupuesto)
- **macOS:** firma con Developer ID y notarización (Apple Developer Program, unos 99 USD/año). Sin ella, macOS bloquea o avisa al abrir la app.
- **Windows:** sin firma sale el aviso de SmartScreen. Opciones: Azure Artifact Signing (antes Trusted Signing; unos 10 USD/mes según fuentes de terceros, disponible solo en ciertos países; **hay que comprobar el tuyo**) o un certificado OV/EV (de 200 a 700 USD/año).
- **Linux:** no requiere firma de la app; `deb` y `rpm` pueden firmarse con GPG.
- Las credenciales las pones tú como secretos del repositorio; yo no puedo crearlas.

### Fase 4: actualizaciones automáticas (3–5 días)
- `electron-updater` leyendo las releases de GitHub: sirve para NSIS, dmg, AppImage, deb y rpm (Snap se actualiza por su tienda). En macOS necesita la app firmada.
- **Opt-in**, con un aviso «Buscar actualizaciones (hace una consulta a GitHub)» para respetar «todo local». Sin aceptar, la app nunca llama a ningún sitio.

### Fase 5: lo que solo da el escritorio — espacios de trabajo por cliente (diseño primero; 2–4 semanas)
Es la razón de hacerlo, y **cambia lo que ve la persona usuaria**, así que primero va al lienzo:
- **Espacio de trabajo = carpeta del disco** (por cliente). Pantalla de inicio con la lista de espacios recientes, nombre y color por cliente, y «Abrir carpeta…».
- Guardado en disco y vigilancia de cambios (editar con otro editor y ver el cambio), compatible con git.
- Plantillas rápidas por cliente, e importar lo que hoy vive en la web (con el `.zip` que ya se exporta).
- Menús nativos, asociar `.pug`/`.jade` y enlaces `pugide://` para abrir un enlace de compartir en la app.
- Exportar PDF con el motor nativo de Electron (`printToPDF`).
- Diseño en el lienzo (mesas P-23 en adelante) y aprobación antes de programar.

## Riesgos conocidos
- **Ubuntu 24.04 y el sandbox de Chromium:** las restricciones de espacios de nombres de usuario hacen que AppImage a veces no arranque sin un ajuste; hay que probarlo en una Ubuntu real y documentar la solución.
- **Tamaño** del instalador (≈ 100 MB o más) y **actualizar Electron** con regularidad (nuevos Chromium con parches de seguridad): se asume como mantenimiento.
- **Datos existentes:** `localStorage` e IndexedDB del escritorio son un perfil aparte del de la web; hay que ofrecer importar/exportar proyectos entre ambos (ya existe el `.zip`).
- **Wayland, HiDPI y arm64** en Linux: se prueban en la fase de empaquetado.
- La investigación en la web fue sobre **fuentes secundarias** (blogs y guías de terceros, con cifras que no coinciden entre sí). Antes de contratar nada, verificar precios y condiciones en las páginas oficiales de Apple, Microsoft y electron.build.

## Decisiones para quien aprueba
1. **Tecnología:** ¿Electron? (recomiendo que sí; Tauri solo si el tamaño del instalador fuese lo principal).
2. **Fase 0** (PWA instalable ya): ¿la hago ahora? (recomiendo que sí, es de un día).
3. **Firma:** ¿presupuesto para Apple Developer (99 USD/año) y para Windows? (recomiendo empezar con macOS y Windows con Azure Artifact Signing si está disponible en tu país; hasta entonces, instaladores sin firmar con aviso en las notas de la release).
4. **Actualizaciones:** ¿solo opt-in y con el aviso de que consulta a GitHub? (recomiendo que sí).
5. **CI:** ¿me autorizas a añadir un flujo de GitHub Actions que construya los instaladores? (`.github/workflows` requiere tu visto bueno según CLAUDE.md).
6. **Fase 5 (espacios por cliente):** ¿te parece bien el alcance y que lo diseñe en el lienzo antes? (recomiendo que sí).
7. **Estructura:** `desktop/` dentro de este repositorio y la misma versión que la web (recomiendo que sí: una sola release publica web y escritorio).

## Fuentes consultadas
- [Tauri vs Electron: building a lightweight desktop app in 2026](https://www.dualmedia.fr/en/read-tauri-vs-electron-app/)
- [Tauri 2.x vs Electron 2026 — Desktop App Framework Decision](https://moklabs-research.pages.dev/reports/technology/2026-03-20-tauri-electron-desktop-framework-decision)
- [Electron vs Tauri 2026 (pkgpulse)](https://www.pkgpulse.com/guides/electron-vs-tauri-2026)
- [Code Signing, electron-builder](https://www.electron.build/docs/features/code-signing/)
- [Code Signing, Electron](https://electronjs.org/docs/latest/tutorial/code-signing)
- [Azure Artifact Signing (devclass)](https://devclass.com/2026/01/14/code-signing-windows-apps-may-be-easier-and-more-secure-with-new-azure-artifact-service/)
- [electron-builder: Linux](https://www.electron.build/docs/linux)
