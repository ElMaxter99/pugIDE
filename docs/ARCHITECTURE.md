# Arquitectura de PugIDE

## Principios

1. **Todo local en el navegador**: sin backend. Compilación, parseo, almacenamiento y exportación ocurren en el cliente.
2. **Mocks automáticos**: las variables referenciadas por el template generan datos de ejemplo.
3. **Preview en vivo**: recompilación con debounce de 300 ms.
4. **Plantillas reales multi-archivo**: el proyecto es un `Map<ruta, contenido>` con `.pug`, `.scss`, etc.
5. **MIT con atribución**.

## Estructura de `src/app`

| Carpeta | Contenido |
|---|---|
| `parser/` | `PugParserService`: analiza el Pug y extrae variables, includes y errores. |
| `compiler/` | `PugCompilerService` (carga `assets/pug-browser.js` y compila) y `ScssCompilerService` (SCSS a CSS, con `scss-lite.util`). |
| `core/services/` | `OrchestratorService` (coordina todo), `PersistenceService` (localStorage), `PreferencesState`, `ProjectIoService` (importar/exportar). |
| `core/state/` | Estado reactivo con signals: editor, parser, preview, datos, terminal, proyecto, inspector. |
| `core/utils/` | Resolución de `include`, inyección en HTML, script del inspector, iconos. |
| `features/` | `landing`, `editor`, `preview`, `smart-data-editor`, `terminal`, `inspector`. |
| `layout/`, `shared/` | Layout principal y componentes comunes. |

## Flujo: parser -> datos -> orquestador -> compilador -> preview

`OrchestratorService.processCode` (tras el debounce de `onCodeChange`, o `manualCompile`):

1. **Parser**: `parser.parse(code)` detecta `include`; `ensureIncludeFiles` crea los archivos que falten.
2. **Includes**: `resolvePugIncludes` inlinea los includes usando todos los archivos del proyecto; se vuelve a parsear el código resuelto y se actualiza `ParserState` (variables, errores).
3. **Datos**: de las variables se construye un esqueleto (`buildDataFromVariables`). Si no hay datos iniciales se cargan; después `deepMergeMissing` añade solo las propiedades que falten (nunca pisa valores del usuario) y avisa en el terminal. Los datos viven en `DataState` y se editan en el editor de datos.
4. **Compilador**: `PugCompilerService.compile(resolvedCode, data, activePath)` genera HTML; `ScssCompilerService.compileAll(files)` genera CSS, que se inyecta en `<head>`.
5. **Preview**: se anotan las líneas del HTML (`annotateHtmlLines`), se inyecta el script del inspector y se publica en `PreviewState`, que alimenta el iframe. Errores y tiempos van a `TerminalState`.

Un flag `isProcessing` evita compilaciones concurrentes.

## Persistencia e import/export

- Sesión y preferencias en `localStorage` (`pug-ide-project`, `pug-ide-preferences`). Si falla la escritura (cuota, modo privado) se expone `lastWriteFailed`.
- `ProjectIoService`: exporta a carpeta (File System Access API) o `.zip` (fflate); importa carpeta o `.zip`. Solo archivos de texto (`pug, jade, scss, sass, css, json, js, html, htm, md, txt`).

## Convenciones

- Standalone + OnPush + signals; servicios `providedIn: 'root'`.
- Servicios para la lógica, estados para los datos compartidos, utilidades puras sin dependencias de Angular.
- Nunca enviar contenido del usuario a la red.
