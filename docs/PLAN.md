# Estado y plan de PugIDE (v0.9.1)

Actualizado el 2026-11-04. El análisis inicial (v0.3.1) se hizo el 2026-11-03; las seis fases que salieron de él están hechas y resumidas en la sección 4.

## 1. Qué se ha verificado (ejecutado)

| Comprobación | Resultado |
|---|---|
| `npm run build:prod` | OK (incluye la comprobación de que `render-sandbox.js` y `preview-runtime.js` corresponden a sus fuentes) |
| `npm run lint` | OK |
| `npm run test:unit` | 146 pruebas |
| `npm run test:e2e` | 237 comprobaciones (servicios reales de la app en Node, render en línea) |
| `npm run test:ui` en Chromium | 430 comprobaciones |
| `PUGIDE_BROWSER=firefox` / `webkit` | 331 y 326 comprobaciones (los escenarios 03, 05, 21, 23, 25, 27 y 28 solo valen en Chromium, o en Chromium y Firefox y se muestran como `SKIP` con el motivo). Corren también en el CI (`ui-firefox`, `ui-webkit`) |
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
| Seguimiento | CI también en Firefox y WebKit (#32); `@angular/cli` y `@angular/build` 20.3.42 y una devDependency sin uso menos: `npm audit` pasa de 43 a 33 avisos y sin altos ni bajos |
| Seguimiento 2 | Angular 22 y TypeScript 6; CSP y cabeceras de seguridad; assets entregados al preview una sola vez |
| Seguimiento 3 | Errores explicados y con arreglo (fase 8), cabeceras de tabla repetidas (7.1, 7.4), soltar carpetas y `.zip` (9.1), `release:check` (13.3) |
| Seguimiento 4 | Instantáneas de proyecto, huérfanas y viudas y avisos de `string()`/`element()` en el PDF, mediciones y optimización del paginado de tablas, CSP de la app sin `unsafe-inline` ni `unsafe-eval` |

## 5. Plan de mejoras e implementaciones

Las pruebas van bien (unitarias, e2e, interfaz en tres navegadores, accesibilidad automática), así que el plan se centra en producto. Estado tras la 0.4.1 y el trabajo posterior (✅ hecho, ⏳ pendiente, 👤 lo debe hacer una persona).

### Fase 8. Errores y diagnóstico ✅

- ✅ **8.1 Más causas explicadas:** mixin no definido o sin `include`, `include`/`extends` inexistente, dato `undefined` (Chrome, Firefox y Safari), variable o función inexistente, indentación, paréntesis sin cerrar, texto suelto.
- ✅ **8.2 Lista de problemas:** todos los diagnósticos, clicables, con su explicación y su arreglo; «Ir al siguiente/anterior problema» en la paleta (el F8 de Monaco recorre el archivo abierto).
- ✅ **8.3 Terminal enlazada:** las entradas con ubicación abren `archivo:línea`.
- ✅ **8.4 Arreglos con un clic:** crear el mixin, añadir el `include`, corregir una errata; también como arreglo rápido de Monaco (`Ctrl+.`).

### Fase 7. Informes largos y PDF ✅

- ✅ **7.1 Cabeceras de tabla repetidas** en cada hoja (`thead`), con y sin márgenes, como Chromium (que no repite una cabecera de más de un cuarto de hoja). El `tfoot` no se repite.
- ✅ **7.2 Huérfanas y viudas** (`orphans`/`widows`) como Chromium (medido con `page.pdf()`), con y sin márgenes; escenario 28.
- ✅ **7.3 `string()` y `element()`:** Chromium 141 no los implementa (descarta la declaración y la caja sale vacía), así que no se emulan: el preview avisa y oculta la caja.
- ✅ **7.4 Avisos de corte con la regla CSS concreta** y un selector del elemento.
- ✅ **7.5 Medición** de tablas con cabecera repetida (500, 2000 y 5000 filas) y optimización: el estilo de la cabecera se calcula una vez y se clona por hoja. Queda un residuo: una maquetación completa de la tabla por hoja (5000 filas ≈ 2,5 s); quitarlo exigiría predecir posiciones sin leer el DOM.

### Fase 9. Proyectos e importación ✅

- ✅ **9.1 Soltar sobre el árbol:** una carpeta o un `.zip` abren un proyecto nuevo (el anterior queda en «Mis proyectos»); varias carpetas o archivos de texto sueltos se añaden sin sobrescribir. La lectura de carpetas se prueba con entradas simuladas, no con una carpeta real arrastrada.
- ✅ **9.2 Instantáneas de proyecto con nombre:** guardar, comparar y restaurar el proyecto entero (mesas V-28 a V-35 del lienzo, pendientes de aprobar; tope de 20 y 25 MB; escenario 29).
- ✅ **9.3 Assets que faltan:** ya existía la lista «Faltan N archivo(s)» del árbol, con subida directa de cada uno.

### Fase 11. Seguridad endurecida

- ✅ **11.1 CSP sin `unsafe-inline` ni `unsafe-eval`** en `script-src` de la app: preview, render y pestaña nueva en documentos propios con CSP por cabecera. Probado contra el servidor de pruebas con las mismas cabeceras, no contra Vercel: hay una checklist manual en `docs/ARCHITECTURE.md`.
- 👤 **11.2 Protección de ramas:** `ui-firefox` y `ui-webkit` requeridos en `master`; `release` sin force-push ni borrado.

### Fase 10. Rendimiento

- ✅ **10.1 Medido:** el envío de assets una sola vez baja el cambio de código con un asset de 3 MB de 577 a 336 ms (`npm run perf`).
- ✅ **10.2** No hace falta: las mediciones no lo justifican.

### Fase 12. Accesibilidad real y Mac

- 👤 **12.1 Lector de pantalla** (NVDA, VoiceOver u Orca) sobre las pantallas principales.
- 👤 **12.2 Atajos en un Mac real:** desde la 0.4.1 Monaco usa Cmd en Mac y soltar el foco del editor es Ctrl+Mayús+M; solo se ha probado con el WebKit de Playwright.

### Fase 14. Mejoras de interfaz 0.7 (propuesta aprobada, por oleadas)

Detalle y mediciones en `design/propuestas/0.7-mejoras-funcionales.md`; mesas P-01 a P-12 del lienzo.

- ✅ **14.1 Oleada 1 (sin mover paneles):** textos en español y accesibilidad (anillo de foco en selectores, nombres accesibles, corrección del selector de dispositivo), terminal renombrada «Registro» con filtro «Esenciales» (P-09) y paleta con recientes, atajos y sublista de dispositivos (P-07).
- ✅ **14.2 Oleada 2 (barras):** barra del preview en una fila con menú «Vista» (P-04), barra de datos simplificada con menú «⋯» (P-05) y menús «Proyecto» y «Exportar» (P-11). Los datos como pestaña del panel lateral son estructura y pasan a la oleada 3 con P-08.
- ✅ **14.3 Oleada 3 (estructura), parte 1:** panel «Problemas» único (P-03) y disposiciones y tiradores con los datos como pestaña del panel lateral (P-08).
- ✅ **14.4 Oleada 3, parte 2:** bienvenida con plantillas y recorrido de 4 pasos (P-06, P-12).

### Fase 15. Versión 0.7.2: correcciones ✅

Detalle, evidencia y qué está verificado en `design/propuestas/0.8-plan.md`.

- ✅ **15.1 SCSS en producción:** `@mixin/@include`, `@use` y funciones salían sin estilo bajo la CSP, sin ningún aviso: `sass` se empaqueta ahora sin `new Function` (`scripts/bundle-sass.mjs`), el respaldo avisa y entiende la última declaración sin `;`, y hay un escenario con `@mixin` bajo las cabeceras de producción.
- ✅ **15.2 Globales tapados por los datos de ejemplo** (`Intl`, `encodeURIComponent`, `btoa`, `URL`…): ampliar `BUILTINS`.
- ✅ **15.3 Aviso al no poder guardar la sesión** (datos de 5 MB o más se pierden al recargar).

### Fase 16. Versión 0.8 (por oleadas)

- ✅ **16.1 Oleada 1, accesibilidad y robustez (sin diseño):** menú contextual del árbol con teclado (F2, Supr), contrastes y bordes, `forced-colors` y `prefers-reduced-motion`, paleta accesible, textos en inglés, errores explicados, importar `.zip`, sesión corrupta, filtro `:escape`. Publicada en la 0.8.0; quedan fuera el título en español de los problemas, Monaco en español y los bordes de controles bajo 3:1 (pasan al lienzo).
- ➡️ **16.2 Oleada 2, pantallas (con diseño), movida a la 0.9 (17.4):** interfaz usable con ventana baja o zoom al 200 %, botones de arreglo de «Problemas» visibles, tema inicial según el sistema, navegación por teclado más corta, plurales e idioma de reserva.
- ⏳ **16.3 Oleada 3, funciones (con diseño):** exportar «para correo» (CSS inline y avisos), navegar entre páginas y exportar todas, sesión en IndexedDB y datos grandes, PDF con tablas enormes, OpenAPI por endpoint.

### Fase 17. Versión 0.9 (propuesta)

- ✅ **17.1 Compartir con opciones** (P-15, P-16): caducidad, contraseña cifrada, datos e imágenes opcionales, nota, y abrir un enlace como proyecto nuevo por defecto. Ver `design/propuestas/0.9-compartir.md`.
- ✅ **17.2 Visor de JSON estilo Firefox** (P-17): conmutador «Árbol | Código», filtro, menú de fila y, en los idiomas, «sin traducir» y «falta». Ver `design/propuestas/0.9-visor-json.md`.
- ⏳ **17.3 Renombrar y borrar carpetas** (diseño P-18, pendiente de visto bueno): clic derecho en una carpeta del árbol → «Borrar carpeta» (con todo lo que contiene: archivos de texto y assets) y «Renombrar». Hoy el menú de una carpeta solo ofrece «Nuevo archivo». A tener en cuenta al diseñarlo: el diálogo de confirmación dice cuántos archivos e imágenes se borran y lista los primeros; **Deshacer** de la paleta (Ctrl+K) lo recupera entero de una vez (hoy `FileOp` solo guarda un archivo); cierra las pestañas de lo borrado y, si el archivo de la vista previa estaba dentro, la vista previa vuelve a automática (`pinnedAfterDelete`); renombrar mueve todo el contenido (y sus historiales); F2 y Supr en una carpeta hacen lo mismo que el menú (hoy se ignoran); no se puede borrar la raíz; las referencias que se rompen (`include`, `link`, `img`) salen en «Problemas» como siempre.
- ➡️ **17.4 La antigua oleada 2 de la 0.8, ahora en la 0.9** (diseño P-19 a P-22, aprobado): ✅ P-19 ventana baja, ✅ P-20 botones de Problemas, ✅ P-21 tema Automático y teclado (F6, enlaces de salto), ✅ P-22 idioma por defecto y de reserva (sin plurales automáticos; las claves calculadas ya están). Ver `design/propuestas/0.9-carpetas-y-ola-2.md`.

### Fase 18. PugIDE de escritorio
- ✅ **18.0 PWA instalable**, **18.1 contenedor Electron** (`desktop/`), **18.2 empaquetado y CI** (Windows, macOS, Linux; sin firmar, gratis). Ver [ESCRITORIO.md](ESCRITORIO.md) e [INSTALAR.md](INSTALAR.md).
- ❌ **18.3 firma y notarización:** descartada (el proyecto no usa certificados de pago).
- ⏳ **18.4 aviso de versión nueva** opt-in con «Descargar» (la actualización automática exige firma en macOS), **18.5 espacios de trabajo por cliente** (con diseño primero).

### Fase 13. Mantenimiento (parcial)

- ⏳ **13.1** Los 18 avisos moderados de `npm audit` (`minimatch` dentro de `eslint`): subir `eslint` cuando salga una versión con `minimatch` 11.
- ⏳ **13.2** Revisión de dependencias cada mes y subida de Angular en cuanto salga cada versión mayor.
- ✅ **13.3** `npm run release:check` comprueba la coherencia de la versión antes de etiquetar (ver `docs/RELEASE.md`).

## 6. Notas

- Todo respeta la filosofía del proyecto: nada de backend ni telemetría nueva.
- Los números de esta página salen de ejecuciones reales en este entorno (Chromium 153, Firefox 142, WebKit 26 de Playwright); las mediciones de rendimiento están en `ARCHITECTURE.md`.
