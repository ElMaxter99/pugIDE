# Estado y plan de PugIDE (v0.4.1)

Actualizado el 2026-11-04. El análisis inicial (v0.3.1) se hizo el 2026-11-03; las seis fases que salieron de él están hechas y resumidas en la sección 4.

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
| `npm audit` (todo) | 18 moderados, 0 altos y 0 bajos (antes 43: 4 altos y 7 bajos). Todos de herramientas de desarrollo (ver sección 3) |

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
- **B. Endurecimiento de seguridad pendiente.** Hay CSP en el hosting, pero `script-src` necesita `'unsafe-inline'` y `'unsafe-eval'` porque el preview y el render la heredan; endurecerla exige moverlos a documentos propios con CSP por cabecera. Un bucle infinito en un `<script>` del HTML renderizado solo está contenido en navegadores que aíslan los iframes `sandbox` en otro proceso (Chromium); el render de Pug sí va siempre en un Worker.
- **B. Dependencias de desarrollo.** Quedan 18 avisos moderados de `npm audit`, todos con una sola causa: `minimatch <11.0.1` (ReDoS con patrones glob manipulados) dentro de `eslint`. Los patrones salen de la configuración del propio repositorio y nada de esto llega al bundle. Cerrarlo exige una versión de `eslint` que ya use `minimatch` 11.
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
| Seguimiento 2 | Angular 22 y TypeScript 6; CSP y cabeceras de seguridad; assets entregados al preview una sola vez |
| Seguimiento | CI también en Firefox y WebKit (#32); `@angular/cli` y `@angular/build` 20.3.42 y una devDependency sin uso menos: `npm audit` pasa de 43 a 33 avisos y sin altos ni bajos |

## 5. Plan de mejoras e implementaciones

Las pruebas van bien (unitarias, e2e, interfaz en tres navegadores, accesibilidad automática), así que el plan se centra en producto. Cada ítem lleva su criterio de «hecho»; la tabla de tamaños es orientativa (S = un PR corto, M = un PR medio, L = varios PR).

### Orden recomendado

| # | Fase | Por qué ahora | Tamaño |
|---|---|---|---|
| 8 | Errores y diagnóstico | Es lo que más tiempo hace perder con plantillas reales (el caso `+azBody`) | M |
| 7 | Informes largos y PDF | Los informes con tablas largas son el uso real (modelo 187) | M–L |
| 9 | Proyectos e importación | Entrar con un proyecto ajeno debe ser inmediato | M |
| 11 | Seguridad endurecida | Cierra la deuda de `unsafe-inline`/`unsafe-eval` | L |
| 10 | Rendimiento | Medir antes de tocar | S–M |
| 12 | Accesibilidad real y Mac | Depende de personas con lector de pantalla y Mac | S |
| 13 | Mantenimiento | Evita que las dependencias se acumulen | S |

### Fase 8. Errores y diagnóstico

- **8.1 Más causas explicadas** (hoy: mixin no definido y variable no definida). Añadir: `include`/`extends` que no encuentra el archivo, `Cannot read properties of undefined` (un dato que falta en el JSON, con el nombre del dato), indentación inconsistente, etiquetas o paréntesis sin cerrar. Hecho cuando cada causa tiene mensaje en español, archivo:línea y una prueba.
- **8.2 Panel de problemas.** Lista de todos los diagnósticos (hoy el aviso muestra el primero), cada uno clicable, con F8 / Mayús+F8 para saltar entre ellos. Hecho cuando se puede recorrer un proyecto con varios errores sin tocar el ratón.
- **8.3 Terminal enlazada.** Las entradas con ubicación (`main.pug:52`) abren el archivo en esa línea.
- **8.4 Arreglo rápido.** Para «mixin no definido»: acción «Crear `mixin azBody()` en `mixins.pug`» y «¿Quisiste decir `+saludo`?». Para «mixin definido en un archivo sin `include`»: «Añadir `include`».

### Fase 7. Informes largos y PDF

- **7.1 Cabeceras de tabla repetidas.** `thead` (y `tfoot`) se repiten en cada página cuando una tabla se parte, como hace la impresión real. Es el hueco más visible para informes con tablas largas. Hecho cuando el preview PDF y la impresión del navegador coinciden en una tabla de más de una página.
- **7.2 Huérfanas y viudas** (`orphans`/`widows`) en el paginado.
- **7.3 `string()` y `element()`** en cabeceras y pies (límite conocido de la emulación).
- **7.4 Avisos más útiles.** El aviso «se corta entre páginas» propone la regla concreta (`break-inside: avoid` en qué selector).
- **7.5 Medición** con una tabla de miles de filas: tiempo de paginado y de compilación, y un presupuesto.

### Fase 9. Proyectos e importación

- **9.1 Arrastrar y soltar** una carpeta o un `.zip` en el Workspace (hoy se importa `.zip` desde el menú; comprobar qué falta de carpeta y de arrastrar).
- **9.2 Instantáneas de proyecto con nombre** (hoy el historial es por archivo): guardar, comparar y restaurar el proyecto entero.
- **9.3 Resolución de rutas absolutas de assets** (`/fonts/...`) con aviso claro si el archivo no está en el proyecto, para plantillas copiadas de otro sitio.

### Fase 11. Seguridad endurecida

- **11.1 CSP sin `unsafe-inline` ni `unsafe-eval`** en `script-src`: preview y render pasan a documentos propios (`src=` en lugar de `srcdoc`) con CSP por cabecera. Hecho cuando las cabeceras de producción no necesitan esas dos palabras y la suite pasa con ellas.
- **11.2 Protección de ramas** (ajuste del repositorio, una persona): `ui-firefox` y `ui-webkit` requeridos en `master`; `release` sin force-push ni borrado.

### Fase 10. Rendimiento

- **10.1 Medir el efecto real** de enviar los assets una sola vez (hoy no hay cifras antes/después).
- **10.2 No recompilar lo que no cambia**: si solo cambian los datos, reutilizar la plantilla compilada. Solo si la medición lo justifica.

### Fase 12. Accesibilidad real y Mac

- **12.1 Lector de pantalla** (NVDA, VoiceOver u Orca) sobre las pantallas principales, y corregir lo que salga. Lo debe hacer una persona.
- **12.2 Atajos en un Mac real.** Desde la 0.4.1 Monaco usa Cmd en Mac y soltar el foco del editor es Ctrl+Mayús+M; solo se ha probado con el WebKit de Playwright, que se identifica como Mac.

### Fase 13. Mantenimiento

- **13.1** Los 18 avisos moderados de `npm audit` (`minimatch` dentro de `eslint`): subir `eslint` cuando salga una versión con `minimatch` 11.
- **13.2** Revisión de dependencias cada mes y subida de Angular en cuanto salga cada versión mayor, sin dejar que se acumulen.
- **13.3** Script que compruebe los pasos mecánicos de `docs/RELEASE.md` (versión de `package.json` = sección del CHANGELOG = badge del README) antes de etiquetar.

## 6. Notas

- Todo respeta la filosofía del proyecto: nada de backend ni telemetría nueva.
- Los números de esta página salen de ejecuciones reales en este entorno (Chromium 153, Firefox 142, WebKit 26 de Playwright); las mediciones de rendimiento están en `ARCHITECTURE.md`.
