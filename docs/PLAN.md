# Estado y plan de PugIDE (v0.4.1)

Actualizado el 2026-11-04. El análisis inicial (v0.3.1) se hizo el 2026-11-03; las seis fases que salieron de él están hechas y resumidas en la sección 4.

## 1. Qué se ha verificado (ejecutado)

| Comprobación | Resultado |
|---|---|
| `npm run build:prod` | OK (incluye la comprobación de que `render-sandbox.js` y `preview-runtime.js` corresponden a sus fuentes) |
| `npm run lint` | OK |
| `npm run test:unit` | 127 pruebas |
| `npm run test:e2e` | 237 comprobaciones (servicios reales de la app en Node, render en línea) |
| `npm run test:ui` en Chromium | 307 comprobaciones |
| `PUGIDE_BROWSER=firefox` / `webkit` | 279 y 274 comprobaciones (los escenarios 03, 05, 21 y 23 solo valen en Chromium o en Chromium y Firefox y se muestran como `SKIP` con el motivo). Corren también en el CI (`ui-firefox`, `ui-webkit`) |
| Accesibilidad (axe-core) | 0 incumplimientos en 12 pantallas y diálogos, tema oscuro y claro, más recorrido por teclado |
| `npm audit --omit=dev` | 0 vulnerabilidades en dependencias de producción |
| `npm audit` (todo) | 18 moderados, 0 altos y 0 bajos (antes 43: 4 altos y 7 bajos). Todos de herramientas de desarrollo (ver sección 3) |

Sin verificar: lector de pantalla real, Safari real y un Mac real (WebKit de Playwright se identifica como Macintosh pero no es Safari), pantallas táctiles y móvil (fuera de alcance: PugIDE es una herramienta de escritorio).

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
| Seguimiento 3 | Errores explicados y con arreglo (fase 8), cabeceras de tabla repetidas (7.1, 7.4), soltar carpetas y `.zip` (9.1), `release:check` (13.3) |
| Seguimiento 2 | Angular 22 y TypeScript 6; CSP y cabeceras de seguridad; assets entregados al preview una sola vez |
| Seguimiento | CI también en Firefox y WebKit (#32); `@angular/cli` y `@angular/build` 20.3.42 y una devDependency sin uso menos: `npm audit` pasa de 43 a 33 avisos y sin altos ni bajos |

## 5. Plan de mejoras e implementaciones

Las pruebas van bien (unitarias, e2e, interfaz en tres navegadores, accesibilidad automática), así que el plan se centra en producto. Estado tras la 0.4.1 y el trabajo posterior (✅ hecho, ⏳ pendiente, 👤 lo debe hacer una persona).

### Fase 8. Errores y diagnóstico ✅

- ✅ **8.1 Más causas explicadas:** mixin no definido o sin `include`, `include`/`extends` inexistente, dato `undefined` (Chrome, Firefox y Safari), variable o función inexistente, indentación, paréntesis sin cerrar, texto suelto.
- ✅ **8.2 Lista de problemas:** todos los diagnósticos, clicables, con su explicación y su arreglo; «Ir al siguiente/anterior problema» en la paleta (el F8 de Monaco recorre el archivo abierto).
- ✅ **8.3 Terminal enlazada:** las entradas con ubicación abren `archivo:línea`.
- ✅ **8.4 Arreglos con un clic:** crear el mixin, añadir el `include`, corregir una errata; también como arreglo rápido de Monaco (`Ctrl+.`).

### Fase 7. Informes largos y PDF (parcial)

- ✅ **7.1 Cabeceras de tabla repetidas** en cada hoja (`thead`), con y sin márgenes, como Chromium (que no repite una cabecera de más de un cuarto de hoja). El `tfoot` no se repite.
- ⏳ **7.2 Huérfanas y viudas** (`orphans`/`widows`).
- ⏳ **7.3 `string()` y `element()`** en cabeceras y pies (límite conocido de la emulación).
- ✅ **7.4 Avisos de corte con la regla CSS concreta** y un selector del elemento.
- ⏳ **7.5 Medición** con una tabla de miles de filas: tiempo de paginado y de compilación, y un presupuesto. La repetición de cabeceras copia el estilo calculado de cada celda, así que conviene medir tablas grandes con cabecera.

### Fase 9. Proyectos e importación (parcial)

- ✅ **9.1 Soltar sobre el árbol:** una carpeta o un `.zip` abren un proyecto nuevo (el anterior queda en «Mis proyectos»); varias carpetas o archivos de texto sueltos se añaden sin sobrescribir. La lectura de carpetas se prueba con entradas simuladas, no con una carpeta real arrastrada.
- ⏳ **9.2 Instantáneas de proyecto con nombre** (hoy el historial es por archivo): guardar, comparar y restaurar el proyecto entero.
- ✅ **9.3 Assets que faltan:** ya existía la lista «Faltan N archivo(s)» del árbol, con subida directa de cada uno.

### Fase 11. Seguridad endurecida

- ⏳ **11.1 CSP sin `unsafe-inline` ni `unsafe-eval`** en `script-src`: preview y render pasan a documentos propios (`src=` en lugar de `srcdoc`) con CSP por cabecera. Es un cambio grande y de riesgo en producción: hay que probarlo contra el despliegue real (Vercel), no solo contra el servidor de pruebas.
- 👤 **11.2 Protección de ramas:** `ui-firefox` y `ui-webkit` requeridos en `master`; `release` sin force-push ni borrado.

### Fase 10. Rendimiento

- ⏳ **10.1 Medir el efecto real** de enviar los assets una sola vez (no hay cifras antes/después).
- ⏳ **10.2 No recompilar lo que no cambia**, solo si la medición lo justifica.

### Fase 12. Accesibilidad real y Mac

- 👤 **12.1 Lector de pantalla** (NVDA, VoiceOver u Orca) sobre las pantallas principales.
- 👤 **12.2 Atajos en un Mac real:** desde la 0.4.1 Monaco usa Cmd en Mac y soltar el foco del editor es Ctrl+Mayús+M; solo se ha probado con el WebKit de Playwright.

### Fase 13. Mantenimiento (parcial)

- ⏳ **13.1** Los 18 avisos moderados de `npm audit` (`minimatch` dentro de `eslint`): subir `eslint` cuando salga una versión con `minimatch` 11.
- ⏳ **13.2** Revisión de dependencias cada mes y subida de Angular en cuanto salga cada versión mayor.
- ✅ **13.3** `npm run release:check` comprueba la coherencia de la versión antes de etiquetar (ver `docs/RELEASE.md`).

## 6. Notas

- Todo respeta la filosofía del proyecto: nada de backend ni telemetría nueva.
- Los números de esta página salen de ejecuciones reales en este entorno (Chromium 153, Firefox 142, WebKit 26 de Playwright); las mediciones de rendimiento están en `ARCHITECTURE.md`.
