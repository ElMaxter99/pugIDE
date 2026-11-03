# Arquitectura de PugIDE

## Principios

1. **Todo local en el navegador**: sin backend. Compilación, parseo, almacenamiento y exportación ocurren en el cliente.
2. **Mocks automáticos**: las variables y las claves de traducción referenciadas por el template generan datos de ejemplo.
3. **Preview en vivo**: recompilación con debounce de 300 ms.
4. **Plantillas reales multi-archivo**: el proyecto es un `Map<ruta, contenido>` con `.pug`, estilos, etc., más assets binarios aparte.
5. **MIT con atribución** (ver `LICENSE`).

## Estructura de `src/app`

| Carpeta | Contenido |
|---|---|
| `parser/` | `PugParserService`: analiza el Pug (con los archivos del proyecto) y extrae variables, includes, funciones llamadas, claves de traducción y errores. |
| `compiler/` | `PugCompilerService` (Pug en navegador) y `ScssCompilerService` (CSS, SCSS/Sass con `sass` real y Less con `less` real, cargados bajo demanda; `scss-lite.util` como apoyo). |
| `core/services/` | `OrchestratorService` (coordina todo), `PersistenceService` (localStorage), `AssetStorageService` (IndexedDB), `PreferencesState`, `ProjectIoService` (importar/exportar). |
| `core/state/` | Estado reactivo con signals: editor, parser, preview, datos, terminal, proyecto, inspector, assets. |
| `core/utils/` | `pug-vfs` (sistema de archivos virtual y archivo de entrada), `style-refs` (`<link>`, `@import`/`@use`), `asset` (referencias y MIME), `i18n`, `data-skeleton`, `page-size`/`paginate` (PDF), inyección en HTML, script del inspector. |
| `features/` | `landing`, `editor` (Monaco), `preview`, `smart-data-editor`, `terminal`, `inspector`. |
| `layout/`, `shared/` | Layout principal y componentes comunes. |

## Componentes grandes y sus partes

Para que los componentes no acumulen lógica, cada uno delega en utilidades puras (`core/utils`, probadas con `npm run test:unit`) y en componentes hijos:

| Componente | Hijos | Utilidades |
|---|---|---|
| `SmartDataEditorComponent` (modo JSON, cabecera) | `DataTreeComponent` (árbol editable; sigue vivo, oculto, en modo JSON para conservar los nodos abiertos), `DatasetBarComponent` (juegos de datos; avisa con `beforeChange` / `changed`) | `data-tree.util` (`flattenTree`, `parseDataJson`) |
| `PreviewPanelComponent` | `PdfBarComponent` | `preview-layout.util` (`fitScale`, `buildPageChrome`, `a11yReport`…), `paginate.util`, `page-rules.util` |
| `EditorPanelComponent` (Monaco, modelos, marcadores) | `ProjectSearchComponent` (no toca Monaco: emite `openMatch` / `replaced`), `pug-language.ts` (completado, hover, símbolos y formato) | `pug-editor.util` |
| `SidebarComponent` (diálogos y menú contextual) | `FileTreeComponent` | `file-actions.util` (textos de diálogos, rutas, menú) |

## Flujo: parser -> datos -> orquestador -> compilador -> preview

`OrchestratorService.processCode(code, createMissing)` (tras el debounce de `onCodeChange`, o `manualCompile`):

1. **Entrada**: `findEntryPath` elige el archivo Pug de entrada; si hay cambios durante una compilación se marca `recompileRequested` y se repite al terminar.
2. **Parser**: `parser.parse(entryCode, entryPath, files)` resuelve includes/extends contra los archivos del proyecto. Los archivos de include inexistentes solo se crean en compilación explícita (`createMissing`), no al autocompilar.
3. **Datos**: de variables y claves `t('CLAVE.ANIDADA')` (también `i18n.t`, `$t`, `translate`...) se construye un esqueleto (`buildDataFromVariables`, `buildTranslationSkeleton`, bajo la clave `translations`). `deepMergeMissing` añade solo lo que falte, sin pisar valores del usuario, y avisa en el terminal. Los datos viven en `DataState`. En el preview `t('KEY')` devuelve el valor rellenado o la propia clave.
4. **Compilador**: `PugCompilerService.compile(...)` genera HTML. Las `<link rel="stylesheet">` locales se inlinean como `<style>` (`inlineLocalStylesheets`) y el resto de estilos del proyecto se compilan con `ScssCompilerService.compileAll` y se inyectan en `<head>`.
5. **Assets**: `applyAssets` reescribe referencias locales a imágenes/fuentes hacia URLs `blob:` de los archivos subidos; los que faltan se avisan en el terminal y en `AssetState.missing`.
6. **Preview**: se anotan las líneas del HTML (`annotateHtmlLines`), se inyecta el script del inspector y se publica en `PreviewState`, que alimenta el iframe. Errores y tiempos van a `TerminalState`.

## Diagnósticos en el editor

`diagnostics.util.ts` convierte los errores del parser, de Pug y de estilos en `Diagnostic` (archivo, línea, columna, mensaje limpio): `splitPugMessage` separa la ubicación del fragmento de código de Pug y se prefiere la ruta del propio mensaje, porque el `filename` del parser es siempre el de entrada. `OrchestratorService.processCode` los publica en `DiagnosticsState` y `EditorPanelComponent` los pinta con `monaco.editor.setModelMarkers` (propietario `pugide`) en todos los modelos abiertos. Los errores de sass/less llevan línea y columna (`ScssCompileError`). `PugCompilerService` solo registra el filtro `:cdata`; un filtro desconocido añade al error la lista de disponibles.

## Aislamiento del JavaScript del usuario

PugIDE ejecuta JavaScript que escribe el usuario (`- código` y expresiones de la plantilla, `helpers.js`, `<script>` del HTML renderizado) y que puede venir de un enlace compartido. Para que no corra con los permisos de la app (que guarda los proyectos en `localStorage` e IndexedDB del mismo origen), se ejecuta siempre en iframes con `sandbox` **sin** `allow-same-origin`, que tienen origen opaco: no pueden leer el almacenamiento, las cookies ni el DOM del padre, solo `postMessage`.

- **Render** (`core/render`): `render-core.ts` (puro) compila y ejecuta la plantilla con los datos, los helpers y los stubs. `SandboxRenderHost` lo ejecuta en un iframe oculto: el padre descarga `assets/pug-browser.js` y `assets/render-sandbox.js`, se los envía por mensaje y el iframe los evalúa; después cada render es un mensaje `{ id, req }` → `{ id, res }` con datos clonables (`files` va como pares). Si no responde en `RENDER_TIMEOUT_MS` (15 s) se descarta el iframe y se crea otro. `InlineRenderHost` ejecuta el mismo núcleo en línea y solo se usa si no hay DOM (las pruebas de Node); en el navegador nunca hay un respaldo en línea.
- **Preview**: el HTML se muestra en un iframe `sandbox="allow-scripts allow-modals"` con `srcdoc`. Como un documento de origen opaco no carga las URL `blob:` de la app, `AssetState.blobToDataUri()` (memoizado) las sustituye por `data:` al mostrar el documento; `compiledHtml` conserva los `blob:`. A ese documento se le añade `assets/preview-runtime.js`, que hace desde dentro lo que antes hacía la app tocando el DOM del iframe: paginar el modo PDF, medir el contenido (con `ResizeObserver`) e imprimir. Mensajes de la app: `pugide-layout`, `pugide-print`, `pugide-color-scheme`, `pugide-inspector-toggle`, `pugide-a11y-run`; del iframe: `pugide-layout-result`, `pugide-runtime-ready`, `pugide-inspector`, `pugide-a11y`. Como el origen es opaco, el destino de `postMessage` es `'*'`; la app solo acepta mensajes del `contentWindow` del preview y valida su forma, porque el contenido es del usuario.
- **Pestañas nuevas**: un blob de HTML o un SVG abiertos como documento tendrían el origen de la app. `openInHost` abre `assets/preview-host.html`, que muestra el HTML en un iframe aislado y las imágenes en un `<img>`.
- **Programas de los iframes**: `sandbox-entry.ts` y `preview-entry.ts` se empaquetan con `npm run bundle:runtime` (`scripts/bundle-runtime.mjs`, esbuild) en `src/assets/render-sandbox.js` y `preview-runtime.js`. Se versionan; la primera línea lleva el hash de sus fuentes y `prebuild` (`validate-build.js`) falla si están desactualizados.
- **Pruebas**: `ui-tests/scenarios/15-aislamiento.mjs` comprueba con Chromium que la plantilla y el HTML renderizado no pueden leer `localStorage`, IndexedDB, cookies ni el padre, que ningún iframe tiene `allow-same-origin`, que el inspector, la auditoría, el modo de color y la impresión llegan por mensajes, que un bucle infinito se cancela, y la pestaña anfitriona y el SVG con script.
- **Límites**: el aislamiento protege los datos de la app, no los del propio proyecto (el JavaScript del usuario sigue pudiendo hacer peticiones de red con lo que renderiza). En navegadores que no ponen los iframes `sandbox` en otro proceso, un bucle infinito puede bloquear la pestaña hasta que se cancele.

## Captura PNG

`capture.util.ts` (`captureHtmlToPng`): toma el HTML autocontenido de «Exportar HTML» (assets como `data:`), lo maqueta en un iframe oculto con `sandbox="allow-same-origin"` (sin scripts) con el ancho y alto de viewport del dispositivo o de la hoja, espera tipografías e imágenes, serializa `documentElement` con `XMLSerializer` dentro de un `<foreignObject>` de un SVG y lo dibuja en un canvas (`limitScale` baja la escala por encima de 16384 px de lado o 100 Mpx). `ProjectIoService.exportPng` lo descarga. Se prueba con Chromium en `ui-tests/scenarios/13-captura-png.mjs` (tamaño, fondo, colores y media queries).

## Historial por archivo

`history.util.ts` (puro): `addVersion` (más reciente primero; no duplica el último contenido; las automáticas esperan `AUTO_GAP_MS`; tope de 30 versiones y 512 K caracteres por archivo) y el diff de líneas (`diffLines` LCS con recorte de prefijo/sufijo, `foldContext`, `summarizeDiff`). `FileHistoryService` guarda un registro por archivo en IndexedDB (`pug-ide-history`, clave `<proyecto>\0<ruta>`; en memoria si no hay IndexedDB) con las lecturas-escrituras en cola. `OrchestratorService` decide cuándo guardar: `saveFile` (Ctrl+S, motivo `guardado`), `trackHistory` en cada autoguardado (motivo `automático`, y si el archivo no tenía historial guarda antes el contenido anterior como `inicial`), `snapshotFiles` (antes de reemplazar) y `restoreVersion` (guarda antes el estado actual y aplica la versión como una edición de Monaco con `notifyFileSync`, para poder deshacerla). `renameFile` mueve el historial y `deleteProject` lo borra. La interfaz es `FileHistoryDialogComponent`.

## Helpers del usuario

`helpers.util.ts` ejecuta `/helpers.js` y `/helpers/*.js` con `new Function('module', 'exports', código)` en el navegador (igual que el JavaScript de las plantillas) y reúne lo que exportan; el resultado se memoriza por contenido. `PugCompilerService.compile` los pasa como locales (`{ ...data, ...helpers }`: ganan a un dato del mismo nombre) y los stubs de funciones desconocidas solo se aplican si no hay una función; un archivo roto se devuelve como `CompileError` con su ruta y línea (`source: 'javascript'`) y se marca en el editor. `processCode` quita de las variables detectadas las raíces que son helpers. Limitación conocida: sin helper, `obj.metodo(x)` sobre un dato sigue fallando (solo las funciones sueltas y los traductores tienen stub).

## Idiomas (`locales/`)

Si el proyecto tiene archivos `/locales/<código>/translations.json` (`locales.util.ts`: `listLocales`, `parseTranslations`, `addMissingKeys`…), el modo cambia: `OrchestratorService.processCode` no añade `translations` a los datos y `syncLocales` (1) añade a cada archivo de idioma las claves `t('…')` que le faltan, vacías, avisando a Monaco con `EditorState.notifyFileSync` para que refresque los modelos abiertos, (2) marca como diagnóstico un JSON inválido (sin sobrescribirlo) y (3) devuelve las traducciones del idioma activo, que sustituyen a `data.translations` solo al compilar (el traductor del preview no cambia). El idioma activo es `DataState.translationLocale`, que viaja en `DatasetsFile.translationLocale` (sesión, biblioteca y `/.pugide/datasets.json`); si ya no existe se usa el primero. `addLocale` migra al primer idioma el `translations` de los datos (lo quita de todos los juegos) y los siguientes copian la estructura del primero con valores vacíos. Sin carpeta `locales/` se mantiene el comportamiento anterior (`translations` en los datos).

## Buscar y reemplazar, hover y outline

`pug-editor.util.ts` (puro, sin Angular ni Monaco) reúne `searchProject` / `replaceInProject` (misma expresión regular, línea a línea; el reemplazo es literal salvo en modo regex), `hoverInfoAt` y `documentSymbols`. `EditorPanelComponent.replaceAll` aplica cada archivo cambiado con `model.pushEditOperations` sobre su modelo de Monaco (creándolo si el archivo no estaba abierto), de modo que Ctrl+Z funciona archivo a archivo. El hover y el outline se registran con `registerHoverProvider` / `registerDocumentSymbolProvider`. Los atajos del diálogo están en `shortcuts.util.ts`.

## Copia de seguridad

`backup.util.ts` decide cuándo recordar exportar (`backupReminderDays`: 14 días desde la última exportación o el primer uso). `PersistenceService` guarda `pug-ide-last-backup` y `pug-ide-first-use`; `ProjectIoService` anota la copia al exportar a carpeta o `.zip` (compartir por enlace no cuenta). `MainLayoutComponent` avisa en la terminal y pide `navigator.storage.persist()`.

## Juegos de datos, mocks e importación de esquemas

- `DataState` guarda varios **juegos de datos** por proyecto (`Por defecto`, `Vacío`, `Lleno`, `Error` y personalizados); el activo es `data`. Se crean/cambian/renombran/duplican/borran desde el selector del editor de datos (`OrchestratorService.createDataset` etc.). Viajan en la sesión (`ProjectSessionState.datasets`) y en el export/import como `/.pugide/datasets.json` (zip o carpeta; no es un archivo del proyecto). Utilidades puras en `core/utils/datasets.util.ts`.
- `core/utils/mock-data.util.ts`: mocks por nombre de campo y tipo (es/en): datos reales para campos con significado (nombre, email, ciudad, precio, fecha...) y lorem ipsum para el texto genérico (títulos, descripciones, valores sin pista) con PRNG con semilla (`createRng`), derivado de (semilla, ruta) para que sean reproducibles y estables. Se usan al crear datos que faltan (salvo en `Vacío`, sin mocks, y `Error`, con nulos) y en el botón **Regenerar**. Las imágenes son SVG `data:` (sin red).
- `core/utils/schema-infer.util.ts`: infiere datos desde un JSON de ejemplo, JSON Schema u OpenAPI sencillo (`$ref` local, `allOf`, `enum`, `format`...); el botón **Importar** crea un juego nuevo.

## Plantillas, paleta de comandos y avisos de calidad

- `core/utils/templates.util.ts`: plantillas de inicio (factura, correo, informe), proyectos reales multiarchivo con datos y traducciones; `OrchestratorService.createProject(nombre?, plantillaId?)`. Las prueba `e2e/scenarios/11-plantillas.mjs` (compilan sin errores).
- `CommandPaletteComponent` (Ctrl/Cmd+K, listener en fase de captura para adelantarse a Monaco) y `core/utils/command-palette.util.ts` (filtrado sin acentos). El estado de los paneles flotantes está en `UiState`.
- Deshacer archivos: `OrchestratorService.undoFileOp` (pila de hasta 20 borrados/renombrados, también de assets); se vacía al cargar otro proyecto.
- `core/utils/quality-hints.util.ts`: avisos de datos sin usar y peso del HTML; `OrchestratorService.reportQualityHints` los emite una vez hasta que desaparecen.

## Preview PDF

Además de dispositivos (escritorio/móvil), el preview tiene modo **PDF / página impresa**: lee el tamaño de `@page { size }` (A4 por defecto), emula saltos de página con `page-size.util` y `paginate.util`, muestra el número de páginas y permite imprimir o guardar como PDF con el diálogo del navegador (`onPrint`). `paginate.util` también detecta los elementos que se partirían mal al imprimir (`findPageBreakIssues`: imágenes, figuras, `pre` o `blockquote` que cruzan el salto y encabezados al final de página) y el panel los muestra como aviso. `page-rules.util` lee las reglas `@page` del HTML (márgenes, `@page :first` y las cajas `@top-left|center|right` / `@bottom-left|center|right` con `content`, `counter(page)` y `counter(pages)`) y el panel dibuja esas cajas sobre cada hoja; `paginateDocument` recibe una `PageGeometry` (hoja + márgenes), aplica los márgenes como relleno de la raíz y reparte el contenido para que nada caiga en los márgenes entre hojas: párrafos partidos línea a línea con un espaciador, filas de tabla con una fila vacía delante y bloques indivisibles con margen superior; todo se deshace en `resetPagination` antes de imprimir. Limitaciones: no se emulan huérfanas/viudas, las cajas de esquina ni `string()`/`element()`, y las cajas se reparten en tres columnas iguales. Contrastado con la impresión real de Chromium: mismo número de páginas y mismo texto al inicio de cada página. No se genera ningún PDF en servidor.

## Privacidad y analítica

La única telemetría es **opt-in**: `AnalyticsService` carga `@vercel/analytics` (Vercel Web Analytics: sin cookies de seguimiento ni datos de proyectos) solo si la decisión guardada (`pug-ide-analytics-consent` en `localStorage`, vía `PersistenceService`) es `granted`. `ConsentBannerComponent`, en `AppComponent`, pregunta hasta que el usuario decide; la decisión se puede cambiar desde la paleta de comandos. `ui-tests/scenarios/06-consentimiento.mjs` comprueba que sin aceptar no hay ninguna petición a `/_vercel/insights`.

## Recursos autoalojados

Sin CDNs: Monaco (`monaco-editor`, copiado a `assets/monaco/vs` por `angular.json`, sin los `nls.messages.*`; el editor lo carga con el loader AMD desde `editor-panel.component.ts`), las tipografías variables de `@fontsource-variable/*` y un subconjunto de Material Symbols Outlined en `src/fonts/`. El subconjunto se genera con `npm run fonts:icons` (`scripts/subset-icons.mjs` + `scripts/subset-font.py`, requiere `pip install fonttools brotli`): se queda con los nombres de icono que aparecen entre comillas o como texto de un elemento en `src/app`. `npm run lint` (script `prelint`) y `scripts/validate-build.js` fallan si el código usa un icono que no está en `material-symbols-icons.json`. El service worker cachea `assets/**` bajo demanda.

## Persistencia e import/export

- **Biblioteca de proyectos** (`ProjectLibraryService`, IndexedDB `pug-ide-projects`): cada proyecto se guarda con su id (`ProjectState.projectId`), sesión (archivos, pestañas, juegos de datos) y assets. `OrchestratorService.saveSession` / `saveAssets` la actualizan en cada autoguardado; `openProject`, `createProject`, `renameProject`, `duplicateProject` y `deleteProject` la gestionan desde `ProjectsDialogComponent` (botón del proyecto en la barra superior). `localStorage` sigue guardando la sesión activa (`pug-ide-project`) y su id (`pug-ide-current-project`); si falta, `MainLayoutComponent` la recupera de la biblioteca. `loadProject` (importar, compartir, abrir) guarda antes el proyecto que reemplaza. El backend es intercambiable (`LibraryBackend`) para las pruebas.

- Sesión y preferencias en `localStorage` (`pug-ide-project`, `pug-ide-preferences`); si falla la escritura se expone `lastWriteFailed`.
- Assets binarios (imágenes y fuentes) en IndexedDB (`pug-ide-assets`) vía `AssetStorageService`; los fallos no son fatales.
- `ProjectIoService`: exporta a carpeta (File System Access API) o `.zip` (fflate), incluyendo los assets; importa carpeta o `.zip`.

## Compartir y exportar HTML

- **Compartir por enlace** (`share.util`, `ProjectIoService.buildShareLink`): archivos de texto + datos se serializan a JSON `{v, n, f, d}`, se comprimen con fflate (deflate) y se codifican en base64url en el hash (`/ide#p=...`). Todo ocurre en el cliente; el hash nunca se envía al servidor. Los assets binarios pequeños (hasta `SHARE_MAX_ASSET_BYTES`, 60 KB en total) viajan en el payload v2 (`a: {ruta: base64url}`); los demás no se incluyen y el aviso ofrece descargar el `.zip` (`ProjectIoService.downloadZip`). Se siguen leyendo enlaces v1. Si el enlace supera ~8000 caracteres se muestra un aviso.
- Al abrir `/ide#p=...`, `MainLayoutComponent` decodifica y valida el payload (versión, rutas, tipos, tope de 5 MB descomprimido); si hay sesión guardada pide confirmación antes de reemplazarla, y luego carga con `OrchestratorService.loadProject`. Un enlace inválido se ignora con un error en el terminal.
- **Exportar HTML** (`export-html.util`): parte de `PreviewState.compiledHtml`, quita el script del inspector y los atributos `data-pugide-*` y sustituye las URLs `blob:` de los assets por data URIs. El CSS ya va inline.

## Tests

`npm run test:e2e` (carpeta `e2e/`, con fixtures de proyectos reales; un módulo por tema en `e2e/scenarios/`) y `npm run test:unit` (`test/unit/`, `node:test`, utilidades puras).

`npm run test:ui` (`ui-tests/`, Playwright-core + Chromium sobre `dist/pug-ide/browser`, que hay que construir antes con `npm run build:prod`): un servidor estático con la lógica SPA de producción, un contexto aislado por escenario y **todas las peticiones externas bloqueadas y registradas** (la app no debe necesitar CDNs). Cubre arranque, proyectos y plantillas, paleta, preview PDF frente a la impresión real de Chromium (`page.pdf`), foco de diálogos y arranque sin conexión con el service worker. Chromium se toma de Playwright o de `PUGIDE_CHROMIUM`. Corre en CI (`.github/workflows/ci.yml`) tras el build, con `npx playwright-core install --with-deps chromium` y `npm run test:ui`.

## Convenciones

- Standalone + OnPush + signals; servicios `providedIn: 'root'`.
- Servicios para la lógica, estados para datos compartidos, utilidades puras sin dependencias de Angular.
- Nunca enviar contenido del usuario a la red.
