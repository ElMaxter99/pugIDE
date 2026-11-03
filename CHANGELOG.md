# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

## [0.4.0] - 2026-11-03

### Añadido
- Los errores de compilación (Pug, SCSS/Sass y Less) se subrayan en el editor, en el archivo y la línea donde ocurren (también en parciales incluidos), con el mensaje limpio y sin el fragmento de código; desaparecen al corregirlos.
- Filtro de Pug `:cdata`. Los demás filtros siguen sin estar disponibles (necesitan paquetes de Node) y el error ahora lo explica e indica los disponibles.
- Buscar y reemplazar en todo el proyecto (Ctrl+Shift+F): reemplazo literal o con expresión regular (`$1`, `$&`), respetando mayúsculas y palabra completa. Cada archivo cambia como una edición de Monaco, así que Ctrl+Z la deshace también en los archivos que no estaban abiertos.
- Hover sobre `+mixin` (firma, dónde se define, número de llamadas) y sobre `include` / `extends` (ruta o aviso si no existe).
- "Ir a símbolo" (Ctrl+Shift+O) y outline con los mixins y bloques del archivo.
- Diálogo de atajos de teclado (paleta de comandos → "Atajos de teclado").
- Recordatorio de copia de seguridad: si pasan 14 días sin exportar (contados desde el primer uso si nunca se exportó), la terminal avisa de que los proyectos solo viven en el navegador. Exportar a carpeta o `.zip` lo reinicia. Además se pide al navegador almacenamiento persistente para que no borre los datos por falta de espacio.
- Traducciones por idioma como archivos del proyecto: `locales/<código>/translations.json` (`es-ES`, `es-CAT`, `en`…). El preview tiene un selector de idioma (se conserva en la sesión, la biblioteca y el export), las claves `t('…')` nuevas se añaden vacías a todos los idiomas y un JSON inválido se subraya en su archivo. «Añadir idioma…» (paleta de comandos): el primero recoge las traducciones que hubiera en los datos; los siguientes copian sus claves sin traducir. Sin carpeta `locales/`, todo funciona como antes (`translations` en los datos).
- Las pestañas con el mismo nombre (p. ej. dos `translations.json`) muestran también su carpeta.
- Helpers definidos por el usuario: `helpers.js` (y `helpers/*.js`) exporta con `module.exports` funciones y valores que las plantillas pueden llamar (`money(n)`, `utils.upper(s)`…) y que un JSON de datos no puede contener. Los helpers tapan a un dato con el mismo nombre y dejan de generar campos en los datos; un archivo roto se subraya en su archivo y no impide renderizar. «Añadir archivo de helpers» (paleta de comandos) crea uno con ejemplos.
- Captura PNG del preview (botón de cámara del preview o «Exportar captura PNG» en la paleta): documento completo con el ancho del dispositivo o de la hoja, a doble resolución, sin librerías ni red. Se maqueta en un iframe oculto sin scripts, así que no se ejecuta el JavaScript de la página; las páginas muy largas bajan la escala para no pasar el límite del canvas.
- Historial local por archivo («Historial del archivo…» en la paleta): hasta 30 versiones por archivo en el navegador, guardadas al pulsar Guardar (Ctrl+S), cada ~3 min mientras editas, antes de restaurar y antes de «reemplazar todo»; muestra qué volvería y qué desaparecería al restaurar cada una (diff por líneas) y restaurar se puede deshacer con Ctrl+Z. El historial sigue al archivo al renombrarlo y se borra con el proyecto.
- Aislamiento del JavaScript del usuario: el de las plantillas y de `helpers.js` se ejecuta ahora en un iframe oculto de origen opaco (`sandbox` sin `allow-same-origin`) y el preview es otro iframe del mismo tipo, así que ninguno puede leer `localStorage`, IndexedDB, cookies ni el DOM de la app (antes corrían con los permisos de la app: un enlace compartido malicioso podía leer los proyectos guardados). Una plantilla que no termina (bucle infinito) se cancela a los 15 s y la app sigue respondiendo. «Abrir en pestaña nueva» y abrir un SVG de los assets pasan por una página anfitriona (`assets/preview-host.html`) que los muestra en un iframe aislado o en un `<img>`.
- Filtro de Pug `:markdown` (también `:markdown-it` y `:marked`): subconjunto de Markdown que escapa todo el HTML y anula los enlaces `javascript:`.
- Las llamadas a métodos que no existen en los valores de un JSON (`utils.upper(name)`) ya no fallan ni crean un campo en los datos: devuelven su argumento, o usan el helper real si hay un `helpers.js`.
- Pruebas de interfaz en Firefox y WebKit (`PUGIDE_BROWSER=firefox node ui-tests/run.mjs`) y auditoría automática de accesibilidad con axe-core (0 incumplimientos en 12 pantallas y diálogos, en tema oscuro y claro) más pruebas de teclado.

### Corregido
- `npm run build:prod` (el del CI) no ejecutaba la comprobación de que `render-sandbox.js` y `preview-runtime.js` están al día; ahora la ejecuta (`prebuild:prod`).
- Accesibilidad: los iconos ya no se leen como texto («folder_open»); el árbol de archivos, las pestañas, las filas plegables del árbol de datos y los interruptores booleanos se manejan con teclado (flechas, Enter, Espacio, Mayús+F10); nombres accesibles en los controles de formulario, el marco del preview y los botones del buscador; puntos de referencia (`main`, `aside`, `footer`, regiones) y un único `h1`; contraste suficiente en el tema claro (colores de la sintaxis JSON, texto terciario, aviso, éxito) y en la barra de estado; jerarquía de encabezados en los diálogos; textos de la barra de estado y del Workspace en español. Ctrl+M libera el foco del editor.
- La captura PNG en Firefox no aplicaba las media queries del dispositivo: se resuelven antes de generar la imagen.

### Cambiado
- El render de Pug corre en un Worker dentro del iframe aislado: una plantilla con un bucle infinito se cancela a los 15 s sin bloquear la página también en Firefox y WebKit (antes solo en Chromium). Una plantilla ya no ve `window` ni `document`.
- La paginación del modo PDF, la medida del documento y la impresión ahora corren dentro del iframe del preview (`assets/preview-runtime.js`) y se comunican con la app por mensajes; el render de Pug corre en `assets/render-sandbox.js`. Ambos se generan con `npm run bundle:runtime` (se versionan y el build comprueba que están al día). Las imágenes y fuentes de los assets llegan al preview como `data:` (las URL `blob:` no cargan en un documento de origen opaco).
- Refactor interno sin cambios de comportamiento: los componentes más grandes se trocean y su lógica pasa a utilidades puras con pruebas. Editor de datos → `DataTreeComponent`, `DatasetBarComponent` y `data-tree.util`; preview → `PdfBarComponent` y `preview-layout.util`; editor → `ProjectSearchComponent` y `pug-language`; Workspace → `FileTreeComponent` y `file-actions.util`. Nuevas pruebas de interfaz del editor de datos y del Workspace.
- Los diálogos y el menú contextual del Workspace están en español.
- Angular 20.3.35 (cierra los avisos de `npm audit`) y `angular-eslint` 20, alineado con Angular.
- `<html lang="es">` y textos de botones (`title` y `aria-label`) en español, con nombre accesible en los botones de solo icono.

## [0.3.1] - 2026-10-22

### Añadido
- Aviso de privacidad: la analítica anónima de visitas (Vercel Web Analytics) pasa a ser opcional y solo se carga si el usuario la acepta; la decisión se guarda y se puede cambiar desde la paleta de comandos. La landing lo indica.

### Cambiado
- El CI ejecuta también las pruebas de interfaz (`npm run test:ui`) tras el build y los tests e2e.

### Corregido
- Paleta de comandos: al pulsar Ctrl+K y escribir de seguido ya no se pierden las primeras letras.
- Paleta de comandos: si el navegador entregaba un `mouseenter` tardío sobre un elemento de la lista anterior (con el puntero quieto sobre la lista), el índice resaltado quedaba fuera de rango al filtrar y Enter no ejecutaba nada. Ahora el resaltado se acota a los resultados y solo cambia con movimiento real del ratón.
- Pruebas de interfaz: el escenario 02 esperaba al filtro de la paleta de forma frágil y falló en el CI de GitHub; ahora espera a los estados y hay una prueba de estrés para este fallo.

## [0.3.0] - 2026-10-22

### Añadido
- Preview PDF: emula `@page` — márgenes de página y cajas de margen (`@top-center`, `@bottom-right`…, con `content`, `counter(page)`, `counter(pages)` y `@page :first`). Las páginas se reparten como al imprimir: los párrafos se parten línea a línea, las filas de tabla y los bloques indivisibles bajan enteros y nada cae en el margen.
- Pruebas de interfaz con Playwright (`npm run build:prod && npm run test:ui`, carpeta `ui-tests/`): arranque sin peticiones externas, proyectos y plantillas, paleta de comandos, preview PDF frente a la impresión real, foco de los diálogos y arranque sin conexión con el service worker.
- Formato de Pug: opción para ordenar los atributos de cada etiqueta (`id`, `class`, resto alfabético, `data-*`, `aria-*`, especiales), desactivada por defecto; se activa desde la paleta de comandos. Los atributos con expresiones no se tocan.

### Cambiado
- Monaco, las tipografías (Geist y JetBrains Mono) y los iconos (subconjunto de Material Symbols de ~90 KB) se sirven desde el propio sitio: ya no se contacta con jsdelivr ni con Google Fonts, y la primera carga funciona sin conexión. Si añades un icono nuevo, ejecuta `npm run fonts:icons` (`npm run lint` lo comprueba).
- Diálogos (Mis proyectos, paleta de comandos y diálogos de archivos): el foco se queda dentro con Tab / Shift+Tab, Escape los cierra y el foco vuelve al elemento que los abrió; ahora declaran `role="dialog"` y `aria-modal`.

### Corregido
- Plantilla de factura: el número de factura se mostraba como `#{invoice.number}` literal.
- Al imprimir con el tamaño por defecto, ya no se anulan los márgenes `@page` de la plantilla.
- El proyecto demo ya no carga su avatar de un servidor externo (SVG incrustado).

## [0.2.0] - 2026-10-22

### Añadido
- Preview PDF: avisa de las imágenes, figuras o bloques que se cortan entre páginas y de los encabezados que quedan al final de una página (contador en la barra del PDF y avisos en la terminal).
- Avisos de calidad en la terminal: datos que la plantilla no parece usar y peso del HTML renderizado (recorte de Gmail a partir de 102 KB, HTML pesado a partir de 500 KB, recursos `data:` grandes).
- Paleta de comandos (Ctrl/Cmd+K, o el botón "Comandos"): compilar, guardar, proyectos y plantillas, exportar, tema, dispositivos del preview y abrir cualquier archivo del proyecto.
- Deshacer el borrado y el renombrado de archivos y assets (botón en el Workspace, hasta 20 operaciones).
- Plantillas de inicio (factura, correo electrónico e informe) al crear un proyecto desde "Mis proyectos": multiarchivo, con estilos, mixins, datos y traducciones.
- Compartir por enlace incluye los assets pequeños (hasta 60 KB en total); si no caben, el aviso lo indica y ofrece descargar el `.zip` completo.
- Biblioteca de proyectos en IndexedDB: varios proyectos guardados en el navegador, con diálogo en la barra superior para abrir, crear, renombrar, duplicar y borrar. Si `localStorage` se llena o se borra, el proyecto activo se recupera de la biblioteca.

### Cambiado
- El formateador de Pug unifica comillas y espacios de los atributos simples, reparte las etiquetas largas en varias líneas y entiende atributos multilínea.

## [0.1.0] - 2026-10-22

### Cambiado
- Limpieza de avisos de ESLint (variables sin uso, `inject()`, parámetros rest).

## [0.0.5] - 2026-10-07

### Corregido
- El autoguardado de la sesión ahora se dispara con cada edición; antes lo escrito o pegado tras la primera edición no se guardaba al recargar.
- El preview muestra un aviso con el primer error cuando la compilación falla (antes se quedaba con el render anterior sin señal visible) y se vacía si la plantilla queda vacía.

## [0.0.4] - 2026-10-07

### Añadido
- Compartir por enlace (`#p=...`, proyecto comprimido) y exportar el HTML renderizado autocontenido.
- Juegos de datos por proyecto (Por defecto, Vacío, Lleno, Error y personalizados), persistidos y exportados con el proyecto.
- Mocks por nombre de campo y tipo (es/en) con semilla reproducible, botón "Regenerar" y lorem ipsum para el texto genérico.
- Importar JSON, JSON Schema y OpenAPI sencillo para inferir la forma de los datos.
- Editor: autocompletado de variables y mixins, ir a definición de `include`/`extends`/mixins, búsqueda en el proyecto (Ctrl+Shift+F) y formateador de Pug.
- Preview: 11 presets de dispositivo, modo oscuro simulado, salto del inspector a la línea Pug y auditoría de accesibilidad.
- Paneles Workspace y Data colapsables, con el estado guardado.
- PWA: service worker, manifest e iconos para uso sin conexión.
- CI en GitHub Actions, ESLint, tests unitarios y e2e dividido en módulos.
- Documentación: README, CLAUDE.md, docs/ARCHITECTURE.md, CONTRIBUTING.md y plantillas de issues.
- Mensaje de privacidad en la landing ("100% local, sin cuenta, sin subir tu código").

### Cambiado
- Los datos que faltan se crean con mocks realistas en vez de vacíos (el juego "Vacío" conserva el comportamiento anterior).
- Las cabeceras de Live Preview y Data pasan a una segunda fila cuando no caben, en lugar de ocultar botones.
- Landing dividida en plantilla y estilos; se elimina `provideAnimations`.
- `.serena/` deja de versionarse.

## [0.0.1]

### Añadido
- Versión inicial: editor Pug, preview en vivo, mocks automáticos, proyectos multi-archivo, importar/exportar, sesión nueva/continuar y demo.
