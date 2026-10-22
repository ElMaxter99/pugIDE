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

## Flujo: parser -> datos -> orquestador -> compilador -> preview

`OrchestratorService.processCode(code, createMissing)` (tras el debounce de `onCodeChange`, o `manualCompile`):

1. **Entrada**: `findEntryPath` elige el archivo Pug de entrada; si hay cambios durante una compilación se marca `recompileRequested` y se repite al terminar.
2. **Parser**: `parser.parse(entryCode, entryPath, files)` resuelve includes/extends contra los archivos del proyecto. Los archivos de include inexistentes solo se crean en compilación explícita (`createMissing`), no al autocompilar.
3. **Datos**: de variables y claves `t('CLAVE.ANIDADA')` (también `i18n.t`, `$t`, `translate`...) se construye un esqueleto (`buildDataFromVariables`, `buildTranslationSkeleton`, bajo la clave `translations`). `deepMergeMissing` añade solo lo que falte, sin pisar valores del usuario, y avisa en el terminal. Los datos viven en `DataState`. En el preview `t('KEY')` devuelve el valor rellenado o la propia clave.
4. **Compilador**: `PugCompilerService.compile(...)` genera HTML. Las `<link rel="stylesheet">` locales se inlinean como `<style>` (`inlineLocalStylesheets`) y el resto de estilos del proyecto se compilan con `ScssCompilerService.compileAll` y se inyectan en `<head>`.
5. **Assets**: `applyAssets` reescribe referencias locales a imágenes/fuentes hacia URLs `blob:` de los archivos subidos; los que faltan se avisan en el terminal y en `AssetState.missing`.
6. **Preview**: se anotan las líneas del HTML (`annotateHtmlLines`), se inyecta el script del inspector y se publica en `PreviewState`, que alimenta el iframe. Errores y tiempos van a `TerminalState`.

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

`npm run test:ui` (`ui-tests/`, Playwright-core + Chromium sobre `dist/pug-ide/browser`, que hay que construir antes con `npm run build:prod`): un servidor estático con la lógica SPA de producción, un contexto aislado por escenario y **todas las peticiones externas bloqueadas y registradas** (la app no debe necesitar CDNs). Cubre arranque, proyectos y plantillas, paleta, preview PDF frente a la impresión real de Chromium (`page.pdf`), foco de diálogos y arranque sin conexión con el service worker. Chromium se toma de Playwright o de `PUGIDE_CHROMIUM`. No se ejecuta aún en CI: añadir el job toca `.github/workflows` y se coordina aparte (`npx playwright install --with-deps chromium` y `npm run test:ui` tras el build).

## Convenciones

- Standalone + OnPush + signals; servicios `providedIn: 'root'`.
- Servicios para la lógica, estados para datos compartidos, utilidades puras sin dependencias de Angular.
- Nunca enviar contenido del usuario a la red.
