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

## Preview PDF

Además de dispositivos (escritorio/móvil), el preview tiene modo **PDF / página impresa**: lee el tamaño de `@page { size }` (A4 por defecto), emula saltos de página con `page-size.util` y `paginate.util`, muestra el número de páginas y permite imprimir o guardar como PDF con el diálogo del navegador (`onPrint`). No se genera ningún PDF en servidor.

## Persistencia e import/export

- Sesión y preferencias en `localStorage` (`pug-ide-project`, `pug-ide-preferences`); si falla la escritura se expone `lastWriteFailed`.
- Assets binarios (imágenes y fuentes) en IndexedDB (`pug-ide-assets`) vía `AssetStorageService`; los fallos no son fatales.
- `ProjectIoService`: exporta a carpeta (File System Access API) o `.zip` (fflate), incluyendo los assets; importa carpeta o `.zip`.

## Tests

`npm run test:e2e` (carpeta `e2e/`, con fixtures de proyectos reales).

## Convenciones

- Standalone + OnPush + signals; servicios `providedIn: 'root'`.
- Servicios para la lógica, estados para datos compartidos, utilidades puras sin dependencias de Angular.
- Nunca enviar contenido del usuario a la red.
