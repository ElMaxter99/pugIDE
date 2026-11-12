# Diseño de la interfaz

PugIDE se diseña **primero en un lienzo** y después se programa. El lienzo es un artifact de claude.ai del tipo *Design (canvas)* (no es Figma): cada pantalla es una mesa (*artboard*), las mesas son interactivas y se enlazan entre sí para recorrerlas como prototipo con Play.

**Lienzo:** [PugIDE · Diseño de la interfaz](https://claude.ai/artifact/3vebTCZF85wwV6fGneyrqM) (privado: solo lo abre quien lo tenga compartido). Es el único lienzo del proyecto: no se crea otro.

## Regla «diseño primero»

Todo cambio en lo que ve el usuario (pantallas, flujos, textos de pantalla) se dibuja antes en el lienzo, se revisa y se aprueba allí. El código implementa lo aprobado; si hay que apartarse del diseño, primero se corrige el lienzo. Lo que no se ve (motor, pruebas, rendimiento, documentación) se programa sin esperar. La regla completa está en [CLAUDE.md](../CLAUDE.md).

## Cómo está organizado el lienzo

- **Fila «Referencia»:** `Tokens de diseño` y `Componentes` (oscuro y claro). Toda pantalla se compone con ellos.
- **Una fila por versión** («Versión 0.5», «Versión 0.5.1»…), con título, y dentro solo las mesas que nacen o cambian en esa versión. Las pantallas de la 0.5 se reparten en varias filas temáticas con el mismo prefijo.
- **Nombre estable `V-NN …`** por pantalla o estado. Nunca se reutiliza ni se renumera; una pantalla nueva toma el siguiente número libre.
- **Una mesa por tema** (oscuro / claro) solo cuando cambia algo; el tema oscuro es el de referencia.
- Mesas de **1440 × 900 px** (la app es de escritorio y ocupa la ventana; no hay móvil). La página de inicio (V-04, V-24) es más alta: es una página con scroll.
- Notas a la izquierda de la primera fila explican esta convención en el propio lienzo.

## Dos tipos de mesa

1. **Fieles a la app (capturas del DOM real).** `V-01`, `V-02`, `V-04` a `V-27`, `Tokens` y `Componentes` no se dibujan a mano: las genera [`design/tools/`](tools) a partir de la app compilada. Así coinciden con la app en medidas, colores, tipografía y textos. Cuando la UI cambia, se regeneran (ver [Mantener el lienzo fiel](../docs/brand/DESIGN_TOKENS.md#cómo-mantener-el-lienzo-fiel)).
2. **Diseños nuevos (diseño primero).** Se dibujan a mano en una fila nueva con los tokens y los componentes. Hoy: `V-03` (aviso de actualización de la 0.5.1) y `V-28` a `V-35` (instantáneas del proyecto, 0.6; muestran además el botón de cámara nuevo en la barra superior). Al programarse, se sustituye por la captura real (V-03 ya está programada en la 0.5.1; falta sustituirla por la captura).

## Mesas

Estado «fiel a la 0.5»: generada de la app de este repositorio (0.4.1 más los cambios sin publicar de la 0.5), tema y estado indicados. Verificada comparando píxel a píxel con la captura real (ver abajo).

| Mesa | Pantalla o estado | Archivo | Componente de la app | Estado |
|---|---|---|---|---|
| Tokens de diseño | Variables de `styles.scss` en oscuro y claro, usos, contraste, tipografía, radios, espaciado, sombras, medidas, iconos | [`Main.dc.html`](canvas/Main.dc.html) | `src/styles.scss` | Generada del código; fiel a la 0.5 |
| Componentes (oscuro) | Botones, campos, pestañas, árbol, avisos, insignias, diálogos y capas, en cada estado | [`Componentes.dc.html`](canvas/Componentes.dc.html) | varios (selector bajo cada pieza) | Fiel a la 0.5 |
| Componentes (claro) | Igual, tema claro | [`Componentes-claro.dc.html`](canvas/Componentes-claro.dc.html) | varios | Fiel a la 0.5 |
| V-01 IDE | Editor, datos, preview y terminal con el proyecto «Informe trimestral» | [`V-01-IDE.dc.html`](canvas/V-01-IDE.dc.html) | `layout/main-layout`, `topbar`, `sidebar`, `editor-panel`, `smart-data-editor`, `preview-panel`, `terminal-panel`, `statusbar` | Fiel a la 0.5 |
| V-02 Errores | Error de compilación con arreglo, lista de problemas y terminal | [`V-02-Errores.dc.html`](canvas/V-02-Errores.dc.html) | `preview-panel` (`.compile-error`), `problems-list`, `terminal-panel` | Fiel a la 0.5 |
| V-03 Actualización | Aviso de versión nueva y recarga automática | [`V-03-Actualizacion.dc.html`](canvas/V-03-Actualizacion.dc.html) | `AppUpdateService`, `UpdateBarComponent`, `UpdateOverlayComponent` | Diseño de la 0.5.1, ya implementado; sigue siendo un dibujo, no una captura |
| V-04 Inicio | Página de presentación completa | [`V-04-Inicio.dc.html`](canvas/V-04-Inicio.dc.html) | `features/landing` | Fiel a la 0.5 |
| V-05 IDE claro | V-01 en tema claro | [`V-05-IDE-claro.dc.html`](canvas/V-05-IDE-claro.dc.html) | igual que V-01 | Fiel a la 0.5 |
| V-06 PDF | Preview en modo PDF: hojas, barra de página | [`V-06-PDF.dc.html`](canvas/V-06-PDF.dc.html) | `preview-panel`, `pdf-bar` | Fiel a la 0.5 |
| V-07 Inspector | Inspector abierto con un elemento elegido | [`V-07-Inspector.dc.html`](canvas/V-07-Inspector.dc.html) | `features/inspector` | Fiel a la 0.5 |
| V-08 Terminal | Terminal maximizada con filtro «Warnings» | [`V-08-Terminal.dc.html`](canvas/V-08-Terminal.dc.html) | `terminal-panel` | Fiel a la 0.5 |
| V-09 Datos | Editor de datos con nodos desplegados | [`V-09-Datos.dc.html`](canvas/V-09-Datos.dc.html) | `smart-data-editor`, `data-tree`, `dataset-bar` | Fiel a la 0.5 |
| V-10 Archivos que faltan | Aviso en el árbol y en la terminal | [`V-10-Archivos-que-faltan.dc.html`](canvas/V-10-Archivos-que-faltan.dc.html) | `file-tree` (`.missing-assets`) | Fiel a la 0.5 |
| V-11 Proyectos | Diálogo «Mis proyectos» | [`V-11-Proyectos.dc.html`](canvas/V-11-Proyectos.dc.html) | `projects-dialog` | Fiel a la 0.5 |
| V-12 Paleta | Paleta de comandos (Ctrl+K) | [`V-12-Paleta.dc.html`](canvas/V-12-Paleta.dc.html) | `command-palette` | Fiel a la 0.5 |
| V-13 Atajos | Diálogo de atajos de teclado | [`V-13-Atajos.dc.html`](canvas/V-13-Atajos.dc.html) | `shortcuts-dialog` | Fiel a la 0.5 |
| V-14 Historial | Historial del archivo con diferencias | [`V-14-Historial.dc.html`](canvas/V-14-Historial.dc.html) | `file-history-dialog` | Fiel a la 0.5 |
| V-15 Proyecto compartido | Confirmar al abrir un enlace compartido | [`V-15-Proyecto-compartido.dc.html`](canvas/V-15-Proyecto-compartido.dc.html) | `main-layout` + `dialog` | Fiel a la 0.5 |
| V-16 Buscar | Buscar y reemplazar en el proyecto (Ctrl+Shift+F) | [`V-16-Buscar.dc.html`](canvas/V-16-Buscar.dc.html) | `editor/project-search` | Fiel a la 0.5 |
| V-17 Añadir idioma | Diálogo con campo | [`V-17-Anadir-idioma.dc.html`](canvas/V-17-Anadir-idioma.dc.html) | `main-layout` + `dialog` | Fiel a la 0.5 |
| V-18 Nuevo archivo | Diálogo con campo | [`V-18-Nuevo-archivo.dc.html`](canvas/V-18-Nuevo-archivo.dc.html) | `sidebar` + `dialog` | Fiel a la 0.5 |
| V-19 Borrar archivo | Diálogo de aviso | [`V-19-Borrar-archivo.dc.html`](canvas/V-19-Borrar-archivo.dc.html) | `sidebar` + `dialog` | Fiel a la 0.5 |
| V-20 Importar | Diálogo de importar (en la 0.5, «Importar proyecto»; desde la 0.12 es «Importar archivos», P-28) | [`V-20-Importar.dc.html`](canvas/V-20-Importar.dc.html) | `sidebar` + `dialog` | Fiel a la 0.5 |
| V-21 Menú contextual | Menú del árbol de archivos | [`V-21-Menu-contextual.dc.html`](canvas/V-21-Menu-contextual.dc.html) | `context-menu` | Fiel a la 0.5 |
| V-22 Privacidad | Aviso de analítica opcional | [`V-22-Privacidad.dc.html`](canvas/V-22-Privacidad.dc.html) | `consent-banner` | Fiel a la 0.5 |
| V-23 Compartir | Aviso tras pulsar Compartir | [`V-23-Compartir.dc.html`](canvas/V-23-Compartir.dc.html) | `topbar` (`.share-notice`) | Fiel a la 0.5 |
| V-24 Inicio claro | V-04 en tema claro | [`V-24-Inicio-claro.dc.html`](canvas/V-24-Inicio-claro.dc.html) | `features/landing` | Fiel a la 0.5 |
| V-25 Errores claro | V-02 en tema claro | [`V-25-Errores-claro.dc.html`](canvas/V-25-Errores-claro.dc.html) | igual que V-02 | Fiel a la 0.5 |
| V-26 PDF claro | V-06 en tema claro | [`V-26-PDF-claro.dc.html`](canvas/V-26-PDF-claro.dc.html) | igual que V-06 | Fiel a la 0.5 |
| V-27 Proyectos claro | V-11 en tema claro | [`V-27-Proyectos-claro.dc.html`](canvas/V-27-Proyectos-claro.dc.html) | igual que V-11 | Fiel a la 0.5 |
| V-28 Instantáneas | Diálogo «Instantáneas del proyecto»: guardar con nombre, lista (fecha, archivos, assets, tamaño), Comparar, Restaurar, Renombrar, Eliminar | [`V-28-Instantaneas.dc.html`](canvas/V-28-Instantaneas.dc.html) | `project-snapshots-dialog` | Diseño de la 0.6; dibujado a mano |
| V-29 Comparar instantánea | Archivos añadidos, eliminados y modificados con recuentos y diff del archivo elegido | [`V-29-Instantaneas-comparar.dc.html`](canvas/V-29-Instantaneas-comparar.dc.html) | `snapshot-compare` | Diseño de la 0.6; dibujado a mano |
| V-30 Restaurar instantánea | Confirmación: qué cambia y aviso de la copia automática «Antes de restaurar» | [`V-30-Instantaneas-restaurar.dc.html`](canvas/V-30-Instantaneas-restaurar.dc.html) | `snapshot-restore-confirm` | Diseño de la 0.6; dibujado a mano |
| V-31 Instantáneas vacío | Diálogo sin ninguna instantánea | [`V-31-Instantaneas-vacio.dc.html`](canvas/V-31-Instantaneas-vacio.dc.html) | `project-snapshots-dialog` | Diseño de la 0.6; dibujado a mano |
| V-32 Instantáneas tope | 20 de 20: aviso de que se eliminará la más antigua antes de guardar | [`V-32-Instantaneas-tope.dc.html`](canvas/V-32-Instantaneas-tope.dc.html) | `project-snapshots-dialog` | Diseño de la 0.6; dibujado a mano |
| V-33 Instantáneas no cabe | Error: el proyecto supera el tope de 25 MB por instantánea | [`V-33-Instantaneas-no-cabe.dc.html`](canvas/V-33-Instantaneas-no-cabe.dc.html) | `project-snapshots-dialog` | Diseño de la 0.6; dibujado a mano |
| V-34 Restaurar con el tope | Confirmación de restaurar con 20 de 20: avisa de que la copia automática elimina la más antigua | [`V-34-Instantaneas-restaurar-tope.dc.html`](canvas/V-34-Instantaneas-restaurar-tope.dc.html) | `snapshot-restore-confirm` | Diseño de la 0.6; dibujado a mano |
| V-35 Instantánea guardada | Aviso tras guardar una instantánea | [`V-35-Instantaneas-guardada.dc.html`](canvas/V-35-Instantaneas-guardada.dc.html) | `project-snapshots-dialog` | Diseño de la 0.6; dibujado a mano |
| P-01 Diagnóstico | Captura real de la 0.5.1 con 9 llamadas numeradas y la evidencia medida de cada hallazgo | [`P-01-Diagnostico.dc.html`](canvas/P-01-Diagnostico.dc.html) | `design/propuestas/` | Propuesta 0.7, pendiente de aprobar; dibujada a mano |
| P-02 IDE propuesto | Barra de 6 controles con un solo botón primario, panel lateral Archivos|Datos, editor y preview de 660 px, panel inferior cerrado | [`P-02-IDE-propuesto.dc.html`](canvas/P-02-IDE-propuesto.dc.html) | `layout/main-layout`, `topbar`, `sidebar`, `statusbar` | Propuesta 0.7, pendiente de aprobar; dibujada a mano |
| P-03 Problemas | Panel «Problemas» unificado: filtro, explicación, arreglo y navegación; el preview se queda con «2 problemas · Ver» | [`P-03-Problemas.dc.html`](canvas/P-03-Problemas.dc.html) | `preview-panel`, `problems-list`, `terminal-panel` | Propuesta 0.7 aprobada; implementada en la oleada 3 (sin publicar) |
| P-04 Barra del preview | Una fila (7 controles) con segmentado de dispositivo con texto y menú «Vista»; modo PDF con segunda fila | [`P-04-Barra-preview.dc.html`](canvas/P-04-Barra-preview.dc.html) | `preview-panel`, `pdf-bar` | Propuesta 0.7 aprobada; implementada en la oleada 2 (sin publicar) |
| P-05 Datos | Barra de datos de 14 a 7 controles y de 5 a 2 filas; menú «⋯»; equivalencias de cada control | [`P-05-Datos.dc.html`](canvas/P-05-Datos.dc.html) | `smart-data-editor`, `dataset-bar` | Propuesta 0.7 aprobada; barra implementada en la oleada 2 (sin publicar); la pestaña lateral, en la oleada 3 (P-08) |
| P-06 Primer uso | Bienvenida con plantillas (Informe, Factura, Correo, vacío), proyectos guardados e importar | [`P-06-Primer-uso.dc.html`](canvas/P-06-Primer-uso.dc.html) | `main-layout`, `projects-dialog` | Propuesta 0.7, pendiente de aprobar; dibujada a mano |
| P-07 Paleta | Recientes, grupos, atajos visibles, dispositivos en una sublista; búsqueda con coincidencia resaltada | [`P-07-Paleta.dc.html`](canvas/P-07-Paleta.dc.html) | `command-palette` | Propuesta 0.7 aprobada; implementada en la oleada 1 (sin publicar) |
| P-08 Disposición | Cuatro presets, menú «Disposición», tiradores redimensionables y reglas de tamaño | [`P-08-Disposicion.dc.html`](canvas/P-08-Disposicion.dc.html) | `main-layout`, `statusbar`, `PreferencesState` | Propuesta 0.7 aprobada; implementada en la oleada 3 (sin publicar) |
| P-09 Registro | Terminal renombrada «Registro»: filtro «Esenciales» por defecto, todo en español, hora real | [`P-09-Registro.dc.html`](canvas/P-09-Registro.dc.html) | `terminal-panel`, `terminal.state` | Propuesta 0.7 aprobada; implementada en la oleada 1 (sin publicar) |
| P-10 Diagnóstico de errores | Captura real con dos errores, llamadas numeradas y mediciones de la paleta y del primer uso | [`P-10-Diagnostico-errores.dc.html`](canvas/P-10-Diagnostico-errores.dc.html) | `design/propuestas/` | Propuesta 0.7, pendiente de aprobar; dibujada a mano |
| P-11 Menús | Menús «Proyecto» y «Exportar» y la tabla de dónde queda cada botón actual | [`P-11-Menus.dc.html`](canvas/P-11-Menus.dc.html) | `topbar` | Propuesta 0.7 aprobada; implementada en la oleada 2 (sin publicar) |
| P-12 Recorrido | Recorrido de 4 pasos con halo, consejos y atajos | [`P-12-Recorrido.dc.html`](canvas/P-12-Recorrido.dc.html) | `main-layout` | Propuesta 0.7, pendiente de aprobar; dibujada a mano |
| P-13 Previsualizar cada archivo | Marca «Vista previa» en el árbol, «Previsualizar este archivo» en el menú del árbol y en la paleta, y avisos en el Registro | [`P-13-Previsualizar-archivo.dc.html`](canvas/P-13-Previsualizar-archivo.dc.html) | `file-tree`, `sidebar`, `command-palette`, `orchestrator.service` | Propuesta; implementada, pendiente de revisar; dibujada a mano |
| P-14 Importar idioma | «Importar archivo…» en «Añadir idioma», confirmación del código, idioma ya existente (fusionar/reemplazar) y aviso al soltar un JSON de textos | [`P-14-Importar-idioma.dc.html`](canvas/P-14-Importar-idioma.dc.html) | `main-layout` + `dialog`, `project-io.service`, `orchestrator.service` | Propuesta 0.8; aprobada e implementada; dibujada a mano |
| P-15 · P-16 Compartir | Diálogo «Compartir proyecto» (caducidad, contraseña, datos, nota), «Enlace copiado», «Abrir proyecto compartido» con «Abrir como proyecto nuevo» por defecto y «Este enlace tiene contraseña» | [`P-15-P-16-Compartir.dc.html`](canvas/P-15-P-16-Compartir.dc.html) | `topbar`, `main-layout` + `dialog`, `project-io.service`, `share.util` | Propuesta 0.9; aprobada e implementada; dibujada a mano (ver `design/propuestas/0.9-compartir.md`) |
| P-17 Visor de JSON | Conmutador «Árbol \| Código» en los `.json`, árbol en dos columnas al estilo de Firefox con filtro, menú de fila, «sin traducir» y «falta» en los archivos de idioma | [`P-17-Visor-JSON.dc.html`](canvas/P-17-Visor-JSON.dc.html) | `editor-panel`, `data-tree.util`, `locales.util`, `context-menu` | Propuesta 0.9; aprobada e implementada; dibujada a mano (ver `design/propuestas/0.9-visor-json.md`) |
| P-18 Carpetas | Menú de carpeta con «Renombrar» y «Borrar carpeta», diálogos de borrado (con nombre si es grande) y renombrado, y «Deshacer» en el Registro | [`P-18-P-22-Carpetas-y-ola-2.dc.html`](canvas/P-18-P-22-Carpetas-y-ola-2.dc.html) | ver `design/propuestas/0.9-carpetas-y-ola-2.md` | Propuesta 0.9; pendiente de visto bueno; dibujada a mano |
| P-19 Ventana baja | Panel inferior acotado y recogible, barra superior y de estado compactas (hasta 640 × 360) | [`P-18-P-22-Carpetas-y-ola-2.dc.html`](canvas/P-18-P-22-Carpetas-y-ola-2.dc.html) | ver `design/propuestas/0.9-carpetas-y-ola-2.md` | Propuesta 0.9; pendiente de visto bueno; dibujada a mano |
| P-20 Botones de Problemas | Botones de arreglo en la línea del título y fragmento acotado a 3 líneas | [`P-18-P-22-Carpetas-y-ola-2.dc.html`](canvas/P-18-P-22-Carpetas-y-ola-2.dc.html) | ver `design/propuestas/0.9-carpetas-y-ola-2.md` | Propuesta 0.9; pendiente de visto bueno; dibujada a mano |
| P-21 Tema y teclado | Tema Automático/Oscuro/Claro, enlaces de salto, F6 entre regiones y atajos nuevos | [`P-18-P-22-Carpetas-y-ola-2.dc.html`](canvas/P-18-P-22-Carpetas-y-ola-2.dc.html) | ver `design/propuestas/0.9-carpetas-y-ola-2.md` | Propuesta 0.9; pendiente de visto bueno; dibujada a mano |
| P-22 Plurales y reserva | Idioma por defecto y de reserva, plurales con `Intl.PluralRules` y texto de reserva | [`P-18-P-22-Carpetas-y-ola-2.dc.html`](canvas/P-18-P-22-Carpetas-y-ola-2.dc.html) | ver `design/propuestas/0.9-carpetas-y-ola-2.md` | Propuesta 0.9; pendiente de visto bueno; dibujada a mano |
| P-23 Exportar para correo | Menú, diálogo con opciones, medidor de peso (102 KB de Gmail) y avisos de compatibilidad | [`P-23-P-25-Correo-paginas-plantillas.dc.html`](canvas/P-23-P-25-Correo-paginas-plantillas.dc.html) | `export-dialogs/email-export-dialog`, `email-export.util` | Diseño 0.11 aprobado y programado; dibujado a mano |
| P-24 Varias páginas | Navegador de páginas del modo PDF y «Páginas»; «Exportar todas las plantillas»; enlaces entre plantillas | mismo archivo | `pdf-bar`, `export-dialogs/export-all-dialog`, `pug-vfs.util` | Diseño 0.11 aprobado y programado; dibujado a mano |
| P-25 Plantillas propias | «Guardar como plantilla», «Mis plantillas» con sus acciones, importar y exportar | mismo archivo | `templates-dialogs/save-template-dialog`, `projects-dialog`, `user-template.service` | Diseño 0.11 aprobado y programado; dibujado a mano |
| P-26 Espacios de trabajo | Solo escritorio: lista de espacios, nuevo espacio, espacio en la barra, cambios en disco | [`P-26-P-27-Escritorio-espacios-y-avisos.dc.html`](canvas/P-26-P-27-Escritorio-espacios-y-avisos.dc.html) | `desktop/` | Diseño 0.11 aprobado y programado |
| P-27 Aviso de versión nueva | Solo escritorio: pregunta opcional, barra «Descargar», «Buscar actualizaciones» | mismo archivo | `desktop/` | Diseño 0.11 aprobado y programado |
| P-28 Importar archivos | Botón del panel, menú Proyecto, «Importar archivos aquí…», diálogo (elegir y resumen), conflictos, deshacer, soltar sobre el árbol | [`P-28-P-29-Importar-archivos-y-proyecto.dc.html`](canvas/P-28-P-29-Importar-archivos-y-proyecto.dc.html) | `import-files-dialog`, `sidebar`, `file-tree`, `import-files.util` | Diseño 0.12 aprobado y programado |
| P-29 Importar proyecto | «Mis proyectos» con «Importar proyecto…» (carpeta o .zip), resultado y nombre libre | mismo archivo | `projects-dialog`, `project-io.service` | Diseño 0.12 aprobado y programado |
| L-01 Logo | Cuatro propuestas de logo (A «Dog-ear», B, C, D «Mensajero») | [`L-01-Logo-propuestas.dc.html`](canvas/L-01-Logo-propuestas.dc.html) | `scripts/brand-icons.mjs` | Elegida la D y aplicada (0.12) |
| L-02 Logo, segunda ronda | Seis variaciones de las familias A y D | [`L-02-Logo-segunda-ronda.dc.html`](canvas/L-02-Logo-segunda-ronda.dc.html) | (marca) | Descartadas en favor de la D original |
| P-30 Ajustes del asistente de IA | CLI encontradas (`claude`, `copilot`), modelo por defecto de cada una, proveedor, límites; aviso del puente local | [`P-30-P-34-Asistente-IA.dc.html`](canvas/P-30-P-34-Asistente-IA.dc.html) | `ai-settings-dialog`, `ai.service` | Diseño 0.13 aprobado y programado |
| P-31 Preparar la petición | Proveedor y modelo, qué se envía, estimación de tokens, orden y texto exactos | mismo archivo | `ai-dialog`, `ai.util` | Diseño 0.13 aprobado y programado |
| P-32 En marcha | Pasos de la CLI, tokens en vivo, detener | mismo archivo | `ai-dialog` | Diseño 0.13 aprobado y programado |
| P-33 Propuestas | Propuestas con comprobación, diferencias, probar, aplicar | mismo archivo | `ai-dialog`, `orchestrator` | Diseño 0.13 aprobado y programado |
| P-34 Probando en la vista previa | Barra de prueba con Revertir y Aplicar; entradas desde Datos y Problemas | mismo archivo | `ai-dialog`, `dataset-bar`, `problems-panel` | Diseño 0.13 aprobado y programado |

Las mesas `P-NN` son la propuesta 0.7 de mejoras funcionales (ver [`propuestas/0.7-mejoras-funcionales.md`](propuestas/0.7-mejoras-funcionales.md)): no están programadas y se generan con `node design/propuestas/build-mesas-0.7.mjs` (ver la cabecera del script). Los `V-NN` no se han tocado; V-01 y V-05 siguen sin el botón de cámara de la 0.6 y se regenerarán al implementar.

`canvas/canvas.json` es el índice del lienzo (posición, tamaño, título y enlaces entre mesas; filas y notas). Los `*.dc.html` son HTML real con un bloque de script mínimo; se abren dentro del lienzo, no sueltos en el navegador. `canvas/` es copia exacta de lo publicado.

## Herramientas ([`design/tools/`](tools))

Requieren `npm ci` y `npm run build:prod`.

| Herramienta | Qué hace |
|---|---|
| `all.sh` | Regenera todo (pantallas, tokens, componentes, índice). `sh design/tools/all.sh [--only V-01,V-05] [--verify DIR]` |
| `build.mjs` | Abre la app compilada con el proyecto de ejemplo, deja cada estado (`scenes.mjs`) y lo convierte en `.dc.html` |
| `scenes.mjs` | Lista de escenas: id `V-NN`, archivo, tema y acciones sobre la app. Añadir una pantalla = añadir una escena |
| `fixtures.mjs` | Proyecto «Informe trimestral» y sus datos (ficticios y realistas) |
| `extract-page.mjs` | Convierte el DOM renderizado en marcado con estilos en línea (sin clases, scripts ni iframes) |
| `tokens.mjs`, `components.mjs`, `layout.mjs` | Mesas de tokens y componentes; índice, filas y notas |
| `compare.py` | Compara la captura real con la mesa (`--verify`) y marca los píxeles distintos |

La fuente de iconos (subconjunto de Material Symbols) se sube como recurso del lienzo; su URL está en `capture.mjs` (`FONT_BLOB`).

## Diferencias conocidas entre lienzo y app

- Las imágenes (`<img>`, `blob:`/`data:`) y los `<canvas>` (minimapa de Monaco) se dibujan como cajas grises del mismo tamaño: el lienzo no admite imágenes incrustadas.
- El contenido del preview se reproduce con el mismo DOM, pero sus imágenes son esas cajas.
- Las barras de desplazamiento de 4 px no se dibujan (el desplazamiento ya aplicado sí se conserva).
- El anillo de foco del navegador no se dibuja.
- Las mesas no tienen comportamiento: solo los enlaces de prototipo entre mesas.
- El modo PDF puede desviarse unos píxeles en vertical dentro de la hoja (≈0,5 % de píxeles).

## Flujo de trabajo

1. Una mesa por pantalla o estado, con identificador y nombre. Fluidas de 1280–1440 px, sin móvil.
2. Tokens y componentes salen del código; no se inventan colores ni tipografías.
3. Cada versión en una fila nueva con solo las mesas que cambian. Datos ficticios realistas; accesible como se dibuja (contraste AA, `<button>`/`<a href>` reales, `aria-label` en botones solo con icono).
4. Al terminar el diseño se pasa el enlace con una lista corta de decisiones y recomendación. No se programa la interfaz hasta que esté aprobada.
5. Tras la aprobación, `canvas.json` y los `*.dc.html` se copian a `design/canvas/` **en la misma PR** que registra el cambio; se actualiza esta tabla y el CHANGELOG. La PR de código enlaza la mesa que implementa. Al implementarse una pantalla, se regenera su mesa desde la app.

## Pendientes de diseño

Pantalla de importación al soltar una carpeta (9.1) y el flujo de CSP/seguridad si cambia algo visible. Ver [docs/PLAN.md](../docs/PLAN.md).
