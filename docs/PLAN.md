# Plan de estado y trabajo pendiente de PugIDE (v0.3.1)

Análisis hecho el 2026-11-03 sobre `claude/dazzling-ritchie-onhmhj` (commit `8806059`).

## 1. Qué se verificó (ejecutado, no supuesto)

| Comprobación | Resultado |
|---|---|
| `npm run build:prod` | OK (inicial 297 kB; chunk lazy de `sass` 3,35 MB, cargado bajo demanda) |
| `npm run lint` | OK (con un aviso: `angular-eslint` v22 sobre Angular 20) |
| `npm run test:unit` | 64/64 |
| `npm run test:e2e` | todo OK (12 escenarios: includes, datos, PDF, estilos, compartir, datasets, biblioteca, plantillas, deshacer) |
| `npm run test:ui` (Playwright) | 46/46 (arranque sin red, paleta, PDF vs. impresión real, foco, offline con service worker, consentimiento) |
| `npm audit --omit=dev` | 4 vulnerabilidades moderadas (cadena `@angular/common`/`platform-browser`/`router`) |

No se probó a mano en navegadores distintos de Chromium ni en dispositivos táctiles.

## 2. Qué funciona (según código y tests)

- Flujo parser → datos → orquestador → compilador → preview, con debounce y recompilación encolada.
- Multi-archivo: `include`, `extends`, mixins, CSS/SCSS/Sass/Less, `<link>` locales, assets en IndexedDB (`blob:`).
- Mocks automáticos de variables y claves `t('KEY')`; juegos de datos (Por defecto/Vacío/Lleno/Error/personalizados); importar desde JSON, JSON Schema u OpenAPI.
- Preview por dispositivos (11 presets) y modo PDF con `@page`, cabeceras/pies, contador de páginas y avisos de cortes.
- Biblioteca de proyectos (IndexedDB), plantillas (factura, correo, informe), deshacer borrado/renombrado, compartir por enlace, exportar zip/carpeta/HTML.
- Editor Monaco: autocompletado de variables y mixins, ir a definición (Ctrl+clic/F12), búsqueda en proyecto, formateador propio, paleta Ctrl+K.
- Offline/PWA, recursos autoalojados, analítica opt-in, foco accesible en diálogos.

## 3. Qué falta o está flojo

Prioridad: **A** = afecta al uso diario, **B** = mejora clara, **C** = deseable.

### Editor
- **A. Los errores de compilación no aparecen en el editor**: no hay marcadores (`setModelMarkers`) ni subrayado; solo salen en la terminal. Es la carencia más visible en un IDE.
- **B.** Solo hay proveedor de completado y de formato; faltan hover, outline/símbolos de mixins, renombrar símbolo, plegado por indentación explícito y "buscar y reemplazar" en todo el proyecto (la búsqueda es solo lectura).
- **B.** Atajos documentados solo en la paleta; no hay pantalla de atajos.
- **C.** Emmet/snippets de Pug propios; diff entre versiones; historial local de cambios por archivo.

### Compilador y datos
- **A (a verificar).** Filtros de Pug (`:markdown-it`, `:scss`, etc.) y `require` en `-` no se han probado en el bundle del navegador; hay que confirmar qué falla y mostrar un mensaje claro. Mi sonda en Node no llegó a ejecutarse (error de flag), así que **no** afirmo que fallen.
- **B.** Las funciones helper desconocidas se resuelven devolviendo su primer argumento (`identity`): útil, pero oculta errores; sería mejor permitir definir helpers/funciones mock en los datos.
- **B.** Un solo idioma de traducciones: no hay selector de locale en el preview para ver `es`/`en` a la vez.
- **C.** Datos con fechas/imágenes de fuentes externas (por diseño, solo local).

### Preview
- **B.** Paginación PDF es una emulación (límites ya documentados: huérfanas/viudas, `string()`/`element()`, cajas de esquina).
- **B.** No hay modo de rotación (vertical/horizontal) ni zoom guardado por dispositivo (verificar).
- **C.** Capturas del preview como PNG; comparación lado a lado entre dispositivos.

### Plataforma y calidad
- **A.** Layout en móvil/tablet no verificado: no hay media queries en layout ni componentes compartidos; probablemente el IDE no es usable en pantallas pequeñas. Decidir si se soporta o se avisa en la landing.
- **A.** `ng test` no tiene ningún `*.spec.ts`: los componentes (941 líneas el editor de datos, 822 el preview, 671 el editor) solo se cubren indirectamente con Playwright. Riesgo de regresiones en UI.
- **A.** Dependencias: 4 avisos de `npm audit` en Angular (subir a 20.3.x parcheado) y desalineación `angular-eslint` 22 vs Angular 20.
- **B.** Componentes demasiado grandes (`smart-data-editor`, `preview-panel`, `editor-panel`, `sidebar` rondan 650–940 líneas): trocear para cumplir la convención "lógica en servicios".
- **B.** Accesibilidad: solo 23 `aria-label` en toda la app; falta auditoría con lector de pantalla y contraste en tema claro.
- **B.** `html lang="en"` en `index.html` con UI en español.
- **B.** Copia de seguridad: todo vive en el navegador; no hay recordatorio periódico de exportar ni detección de borrado de datos del sitio.
- **C.** i18n de la propia UI (hoy solo español), sincronización/colaboración (fuera de la filosofía actual).

## 4. Plan propuesto

> **Estado de la fase 1** (hecha en esta rama): marcadores de error en Monaco (Pug, SCSS/Sass, Less), filtros de Pug verificados (`:cdata` añadido; `:markdown-it`, `:scss`… no existen en el navegador y ahora el error lo explica; `require` no falla), Angular 20.3.35 (`npm audit` sin vulnerabilidades), `angular-eslint` 20, `lang="es"` y etiquetas accesibles. Pendiente de la fase 1: auditoría de accesibilidad completa con lector de pantalla.

**Fase 1 — Fiabilidad (1–2 semanas)**
1. Marcadores de error de Pug/SCSS en Monaco con línea/columna (el `CompileError` ya trae `line` y `column`).
2. Verificar y cubrir con e2e los filtros de Pug y `require`; mensaje claro si no están soportados.
3. Subir Angular a la última 20.3.x parcheada, alinear `angular-eslint`, volver a pasar `audit`.
4. Cambiar `lang` a `es`; revisar `aria-label` de botones de icono.

**Fase 2 — Usabilidad (2–3 semanas)**
5. Decidir y probar el comportamiento en pantallas pequeñas (soporte real o aviso).
6. Buscar y reemplazar en proyecto; hover y outline de mixins; pantalla de atajos.
7. Selector de idioma para `translations` en el preview.
8. Recordatorio de exportar y aviso si IndexedDB/localStorage están vacíos tras haber tenido proyectos.

**Fase 3 — Mantenibilidad (continuo)**
9. Trocear los cuatro componentes grandes moviendo lógica a servicios/utilidades puras (con tests unitarios en `test/unit`).
10. Añadir pruebas de componente o ampliar `ui-tests` para editor de datos y sidebar.

**Fase 4 — Extras**
11. Helpers/funciones mock definibles por el usuario; captura PNG del preview; historial local por archivo.

## 5. Notas

- Las recomendaciones respetan la filosofía del proyecto: nada de backend ni telemetría nueva.
- Los puntos marcados "a verificar" necesitan una prueba concreta antes de tratarse como bugs.
