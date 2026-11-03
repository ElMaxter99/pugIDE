# Estado y plan de PugIDE (v0.4.0)

Actualizado el 2026-11-03. El análisis inicial (v0.3.1) se hizo el mismo día; las seis fases que salieron de él están hechas y resumidas en la sección 4.

## 1. Qué se ha verificado (ejecutado)

| Comprobación | Resultado |
|---|---|
| `npm run build:prod` | OK (incluye la comprobación de que `render-sandbox.js` y `preview-runtime.js` corresponden a sus fuentes) |
| `npm run lint` | OK |
| `npm run test:unit` | 109 pruebas |
| `npm run test:e2e` | 237 comprobaciones (servicios reales de la app en Node, render en línea) |
| `npm run test:ui` en Chromium | 172 comprobaciones |
| `PUGIDE_BROWSER=firefox` / `webkit` | 161 comprobaciones cada uno (los escenarios 03 y 05 solo valen en Chromium y se muestran como `SKIP` con el motivo). Corren también en el CI (`ui-firefox`, `ui-webkit`) |
| Accesibilidad (axe-core) | 0 incumplimientos en 12 pantallas y diálogos, tema oscuro y claro, más recorrido por teclado |
| `npm audit --omit=dev` | 0 vulnerabilidades en dependencias de producción |
| `npm audit` (todo) | 33 moderados, 0 altos y 0 bajos (antes 43: 4 altos y 7 bajos). Todos de herramientas de desarrollo (ver sección 3) |

Sin verificar: lector de pantalla real, Safari real (WebKit de Playwright no es Safari), pantallas táctiles y móvil (fuera de alcance: PugIDE es una herramienta de escritorio).

## 2. Qué funciona

- Flujo parser → datos → orquestador → compilador → preview, con debounce, recompilación encolada y errores marcados en el editor (Pug, SCSS/Sass, Less).
- Proyectos multiarchivo: `include`, `extends`, mixins, CSS/SCSS/Sass/Less, `<link>` locales, assets en IndexedDB.
- Mocks automáticos, juegos de datos, importación desde JSON/JSON Schema/OpenAPI, traducciones por idioma (`locales/<código>/translations.json`) con selector en el preview.
- Helpers propios (`helpers.js`), filtros `:cdata` y `:markdown`, métodos de helpers de objeto (`utils.upper(x)`).
- Preview por dispositivos y modo PDF con `@page`, cabeceras y pies, avisos de cortes; captura PNG; imprimir.
- Editor Monaco: completado, hover, outline, ir a definición, buscar y reemplazar en el proyecto, formateador, paleta Ctrl+K, atajos.
- Biblioteca de proyectos, plantillas, deshacer archivos, historial local por archivo (30 versiones con diff y restauración), compartir por enlace, exportar zip/carpeta/HTML, recordatorio de copia de seguridad.
- **El JavaScript del usuario no corre con los permisos de la app**: la plantilla y `helpers.js` van en un Worker dentro de un iframe de origen opaco, y el preview en otro iframe igual (ver «Aislamiento» en `ARCHITECTURE.md`).
- Offline/PWA, recursos autoalojados, analítica opt-in.

## 3. Qué falta o está flojo

Prioridad: **A** = afecta al uso diario, **B** = mejora clara, **C** = deseable.

- **A. Lector de pantalla real.** La accesibilidad está auditada con herramientas automáticas y teclado, no con NVDA/VoiceOver/Orca. Lo debe probar una persona.
- **B. Assets pesados en el preview.** Cada compilación reenvía los assets como `data:` (un asset de 3 MB suma ~150 ms). Se arregla entregando los assets al iframe una sola vez.
- **B. Endurecimiento de seguridad pendiente.** No hay CSP en el hosting (restringir imágenes rompería plantillas con imágenes remotas, hay que diseñarlo). Un bucle infinito en un `<script>` del HTML renderizado solo está contenido en navegadores que aíslan los iframes `sandbox` en otro proceso (Chromium); el render de Pug sí va siempre en un Worker.
- **B. Dependencias de desarrollo.** Quedan 33 avisos moderados de `npm audit`, todos con una sola causa: `minimatch <11.0.1` (ReDoS con patrones glob manipulados) dentro de `eslint`, `typescript-eslint`, `angular-eslint` y de la cadena `glob`/`pacote` de `@angular/cli`. Los patrones salen de la configuración del propio repositorio, no de entradas externas, y nada de esto llega al bundle. Arreglarlo exige pasar a Angular 22 o forzar `minimatch` 11 sobre paquetes que esperan la 3 y la 10 (rompería el lint); se revisará al subir de versión de Angular.
- **B. `ng test` sin ningún `*.spec.ts`.** Los componentes se cubren con Playwright; los trozos de lógica, con pruebas de utilidades puras.
- **C. Límites conocidos** (no son fallos): la paginación PDF es una emulación (sin huérfanas/viudas, `string()`/`element()`); los filtros de Pug que necesitan Node (`:scss`, `:stylus`…) no existen y el error lo explica; `:markdown` es un subconjunto; la plantilla no ve `window` ni `document`; la captura PNG no ejecuta JavaScript; el historial guarda 30 versiones por archivo y hasta 512 K caracteres.
- **Fuera de alcance:** móvil, traducción de la propia interfaz, sincronización y colaboración.

## 4. Historial de fases

| Fase | Resultado |
|---|---|
| 1. Fiabilidad | Marcadores de error en Monaco, filtro `:cdata`, Angular 20.3.35 (0 vulnerabilidades de producción), `angular-eslint` 20, `lang="es"` |
| 2. Usabilidad | Buscar y reemplazar en el proyecto, hover y outline de mixins, atajos, recordatorio de copia de seguridad, idiomas por carpetas. Móvil descartado |
| 3. Mantenibilidad | Editor de datos, preview, editor y Workspace troceados con la lógica en utilidades puras (941 → 411, 831 → 717, 820 → 617, 645 → 398 líneas) y pruebas de interfaz del editor de datos y el Workspace |
| 4. Extras | Helpers del usuario, captura PNG, historial local por archivo |
| 5. Aislamiento | Plantillas, helpers y preview en iframes de origen opaco; página anfitriona para pestañas nuevas y SVG |
| 6. Calidad | Accesibilidad con axe y teclado, pruebas en Firefox y WebKit, `:markdown`, métodos de helpers, render en Worker, mediciones de rendimiento |
| Seguimiento | CI también en Firefox y WebKit (#32); `@angular/cli` y `@angular/build` 20.3.42 y una devDependency sin uso menos: `npm audit` pasa de 43 a 33 avisos y sin altos ni bajos |

## 5. Siguientes pasos posibles

1. Probar con un lector de pantalla y corregir lo que salga (A).
2. Entregar los assets al preview una sola vez (B).
3. Diseñar un CSP compatible con plantillas con imágenes remotas (B).
4. Subir a Angular 21/22 cuando convenga: cierra los avisos de herramientas de desarrollo que quedan (B).
5. Hacer `ui-firefox` y `ui-webkit` comprobaciones requeridas en la protección de `master` (ajuste del repositorio).

## 6. Notas

- Todo respeta la filosofía del proyecto: nada de backend ni telemetría nueva.
- Los números de esta página salen de ejecuciones reales en este entorno (Chromium 153, Firefox 142, WebKit 26 de Playwright); las mediciones de rendimiento están en `ARCHITECTURE.md`.
