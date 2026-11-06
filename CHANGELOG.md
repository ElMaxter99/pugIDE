# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

Segunda oleada de la propuesta 0.7 de mejoras de interfaz (mesas P-04, P-05 y P-11 del lienzo, aprobadas): las tres barras. No cambia la estructura de paneles.

### Cambiado
- **Barra superior (de 9 controles a 6):** el logo, un menú **«Proyecto»** (Mis proyectos, plantillas, instantáneas, historial, importar carpeta o .zip, subir imágenes/fuentes/estilos, añadir idioma, buscar en el proyecto y atajos), un menú **«Exportar»** (copiar enlace, HTML autocontenido, captura PNG, imprimir/PDF, proyecto en carpeta o .zip), el campo **«Buscar comandos y archivos…»** con `Ctrl K` visible, el tema y **Guardar** como único botón relleno. El nombre del proyecto sale de la barra y se ve en el panel lateral. No se pierde ninguna acción.
- **Autocompilar** baja a la barra de estado («Autocompilar: sí/no»); sigue el comando de la paleta.
- **Barra del preview en una fila:** segmentado Escritorio/Tableta/Móvil/PDF, zoom e Inspector, y un menú **«Vista»** con dispositivo (los 11 siguen disponibles), idioma del preview, modo de color, auditoría de accesibilidad, captura PNG, recargar y abrir en una pestaña nueva. Con el panel estrecho (menos de 600 px) el segmentado y el Inspector pasan a solo icono con nombre accesible. En modo PDF, la segunda fila (orientación, páginas, avisos, imprimir) solo aparece cuando hace falta.
- **Barra de datos:** de 14 controles en 5 filas a 7 en 2. A la vista: «Árbol | JSON», deshacer, rehacer, el juego de datos y «Regenerar»; en el menú **«⋯»**, lo ocasional (nuevo juego, renombrar, duplicar, borrar, idioma de los datos, importar JSON/Schema/OpenAPI, copiar JSON y dejar el objeto vacío).

### Añadido
- Componente de menú desplegable accesible (`role="menu"`, Intro/Espacio/↓ abren y llevan el foco a la primera fila, ↑/↓/Inicio/Fin se mueven, Esc cierra y devuelve el foco).
- Escenarios de interfaz `31-barra-preview`, `32-barra-datos` y `33-menus-barra`.

Primera oleada de la propuesta 0.7 de mejoras de interfaz (mesas P-07 y P-09 del lienzo, aprobadas): textos y accesibilidad, Registro y paleta. No mueve ningún panel.

### Añadido
- **Paleta de comandos (Ctrl+K):** arriba los **comandos recientes** (los 5 últimos, guardados en este navegador), los **atajos de teclado** a la derecha de cada comando, la coincidencia **resaltada** y un pie con las teclas. Los 11 dispositivos del preview pasan a una **sublista** («Cambiar dispositivo…»; Esc o Retroceso vuelven) y siguen encontrándose al escribir («móvil»). Nuevos comandos: «Buscar y reemplazar en el proyecto», «Ir a símbolo», «Formatear Pug» y «Mostrar u ocultar / Limpiar el Registro».
- Escenario `30-registro-paleta` de las pruebas de interfaz y pruebas unitarias de recientes y resaltado.

### Cambiado
- **La terminal pasa a llamarse «Registro»** y se abre con el filtro **«Esenciales»** (errores, avisos y acciones); «Todo» añade el detalle (arranque, compilaciones) atenuado y «Esenciales» avisa de cuántos mensajes de detalle oculta. Todos sus mensajes y orígenes están en español, con la hora del equipo.
- **Textos en español:** «Archivos» y «Datos» (antes «Workspace» y «Data»), «Vista previa» (antes «Live Preview»), nombres de dispositivo («Móvil», «Tableta», «Escritorio», «Portátil») y tildes de «Móvil» y «Auditoría».

### Corregido
- **Selector de dispositivo:** con «Escritorio» activo mostraba «Mobile (390x844)»; ahora refleja el dispositivo activo.
- **Accesibilidad:** los selectores recuperan el anillo de foco con el teclado, los botones de dispositivo del preview tienen nombre accesible y los botones del Registro miden 24 px.

## [0.6.0] - 2026-11-05

### Añadido
- **README rehecho**, más visual y explicativo, con capturas nuevas de la app y **versión en inglés** (`README.en.md`, que se actualiza junto con el español). `npm run screenshots` (`scripts/screenshots.mjs`) regenera las capturas desde el build, reutilizando las escenas del lienzo de diseño. `npm run release:check` comprueba también el badge de versión del README en inglés.
- **Instantáneas del proyecto con nombre:** guarda, compara y restaura el proyecto entero (archivos, datos, idiomas y assets) desde el botón de cámara de la barra superior o la paleta («Instantáneas del proyecto…»). Hasta 20 por proyecto y 25 MB por instantánea, solo en este navegador. Restaurar guarda antes una copia automática «Antes de restaurar…» y aplica los archivos como ediciones del editor, así que `Ctrl+Z` y el historial por archivo siguen funcionando. Nunca se sustituye ni se omite nada sin avisar. Diseño en el lienzo (mesas V-28 a V-35).
- **PDF:** aviso en la barra y en la terminal cuando el HTML usa `string()`, `string-set`, `element()` o `position: running()`, que Chromium no imprime (la caja de margen sale vacía y el preview la oculta); sugiere un texto fijo o `counter(page)`.
- `npm run perf` (`scripts/perf.mjs`) y escenario `27-rendimiento` con presupuestos holgados; método y tabla antes/después en «Rendimiento (medido)» de `docs/ARCHITECTURE.md`.

### Corregido
- **Lista de todos los problemas:** el texto de cada problema se aplastaba en una columna estrecha (una palabra por línea) junto a sus botones; ahora cada fila envuelve.

### Cambiado
- **PDF:** los párrafos largos se reparten entre hojas como la impresión real de Chromium con `orphans` y `widows` (2 por defecto): nunca menos de `orphans` líneas al final de una hoja ni menos de `widows` al principio de la siguiente, con y sin márgenes de `@page`, y respetando `break-inside: avoid`. La barra del PDF dice «N avisos a revisar».
- **Rendimiento:** el paginado de tablas grandes en modo PDF es ~2 veces más rápido (2000 filas con cabecera: 725 → 396 ms; 5000 filas: 4,7 → 2,5 s). El envío de assets una sola vez ya era rápido (cambio de código con un asset de 3 MB: 577 → 336 ms frente a reinyectar `data:` en cada compilación).
- **Seguridad:** la CSP de la app (`/`, `/ide`) ya no admite `'unsafe-inline'` ni `'unsafe-eval'` en `script-src`; queda `'self'` más el hash del único script inline de `index.html`. El preview, el render y la pestaña nueva usan documentos propios (`preview-frame.html`, `render-frame.html`, `preview-host.html`) con su CSP por cabecera, origen opaco por la directiva `sandbox` y `connect-src` más estricta (sin `'self'`). La app ya no ejecuta `helpers.js` en el hilo principal: sus nombres se leen del texto (límite: `Object.assign(module.exports, …)` y las claves calculadas no se reconocen y se tratan como datos); el código del usuario solo corre en el Worker aislado. Los enlaces `#ancla` del preview se resuelven con `location.hash` y el service worker precarga los documentos nuevos.

## [0.5.1] - 2026-11-04

### Corregido
- **Buscar en el proyecto (`Ctrl+Mayús+F`):** la lista de resultados se quedaba en unos 4 px de alto y no se veía ningún resultado aunque el resumen dijera «4 resultados en 3 archivos».
- **Portada:** usaba el `sans-serif` del sistema en lugar de Geist (pedía `Geist` y solo está cargada `Geist Variable`).
- **La app no se actualizaba sola**: había que borrar la caché para ver la versión nueva. El service worker servía la versión guardada y descargaba la nueva en segundo plano, pero solo la usaba en una recarga posterior y sin avisar. Ahora (`AppUpdateService`):
  - Al entrar comprueba enseguida (antes esperaba hasta 30 s); si la versión nueva llega en los primeros 20 s y no has tocado nada, se aplica y recarga sola con el mensaje «Actualizando a la última versión…».
  - Mientras trabajas comprueba cada 10 minutos y al volver a la pestaña; si hay versión nueva muestra una barra fina con «Actualizar ahora» y «Más tarde». Nunca recarga sola mientras trabajas, y guarda la sesión antes de recargar.
  - Si el service worker queda en un estado irrecuperable, recarga.
  - Quien ya tiene una versión anterior necesitará una recarga extra (o dos) para llegar a esta; a partir de aquí se actualiza sola.

### Añadido
- **Errores explicados y con arreglo.** Más causas con explicación en español (`include`/`extends` inexistente, dato `undefined` en Chrome, Firefox y Safari, variable o función que no existe, indentación, paréntesis sin cerrar, texto suelto) y arreglos con un clic: crear el mixin que falta, añadir el `include`, corregir una errata («¿Quisiste decir +saludo?»). Salen en el aviso del preview, en una lista de todos los problemas con enlace al archivo y la línea, y como arreglo rápido de Monaco (`Ctrl+.`). Paleta: «Ir al siguiente/anterior problema». Las entradas de la terminal con ubicación enlazan a `archivo:línea`.
- **PDF:** las cabeceras de tabla (`thead`) se repiten al empezar cada hoja, con o sin márgenes de `@page`, como en la impresión real de Chromium (que no repite una cabecera de más de un cuarto de hoja; el preview tampoco). Los avisos de corte proponen la regla CSS concreta con un selector.
- **Soltar archivos sobre el árbol:** una carpeta o un `.zip` abren un proyecto nuevo (el anterior queda en «Mis proyectos»); varias carpetas o archivos de texto sueltos se añaden al proyecto sin sobrescribir lo existente.
- **Diseño primero:** lienzo de diseño de claude.ai («PugIDE · Diseño de la interfaz») fiel a la app: mesas de tokens y de componentes (tema oscuro y claro) y 27 pantallas y estados reales (IDE, errores, inicio, PDF, inspector, terminal, datos, diálogos…) más el aviso de actualización (V-03, dibujado a mano). Las mesas de la app real se generan fotografiando el DOM de la app compilada (`design/tools`, `sh design/tools/all.sh`) y se comparan píxel a píxel con las capturas (menos de un 1,5 % de diferencia). Copia versionada en `design/canvas/`, proceso en `design/README.md`, regla en `CLAUDE.md` y tokens documentados en `docs/brand/DESIGN_TOKENS.md`.
- `npm run release:check`: comprueba que la versión es coherente en `package.json`, `package-lock.json`, el README, `docs/PLAN.md` y el CHANGELOG antes de etiquetar.
- `docs/RELEASE.md`: cómo se publica una versión (versión, CHANGELOG, tag, release de GitHub) y cómo se despliega (producción = rama `release` en Vercel), con comprobaciones y vuelta atrás.

## [0.4.1] - 2026-11-04

### Añadido
- Los errores de ejecución de Pug se explican: si se llama a `+tarjeta` y ningún archivo define ese mixin, el aviso del preview lo dice, lista los mixins que sí existen y, si el mixin está definido en un archivo que no se incluye, indica el `include` que falta. Lo mismo para variables no definidas. El aviso ya no arrastra la ruta ni el fragmento de código y tiene un botón «Ir al error (archivo:línea)» que abre el archivo y deja la línea a la vista.

### Corregido
- **Ctrl+V no pegaba en el editor** en Chrome, Edge y Safari (sin ningún error; en Firefox sí). El polyfill de `process` declaraba `versions.node`, Monaco se creía en Node/Electron y enlazaba Ctrl+V por su cuenta en lugar de dejar pegar al navegador. Los bundles de Pug (que sí necesitan `process.versions.node`) reciben ahora su propio `process` local en vez de uno global. Como consecuencia Monaco detecta bien la plataforma: en Mac los atajos usan Cmd (antes Ctrl) y liberar el foco del editor es Ctrl+Mayús+M. Hay una prueba de pegado con el teclado.
- En Safari/WebKit, los errores de ejecución de una plantilla señalaban una línea que no era la del `.pug` (se usaba la línea del JavaScript compilado en vez de la que indica Pug).

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
- Content-Security-Policy y cabeceras de seguridad en `vercel.json` (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS). Las imágenes, fuentes y estilos remotos de las plantillas siguen funcionando; las peticiones de red (`fetch`/XHR) del JavaScript del usuario en el preview quedan bloqueadas. Las pruebas de interfaz se ejecutan con esas mismas cabeceras y fallan ante cualquier violación.

### Corregido
- `npm run build:prod` (el del CI) no ejecutaba la comprobación de que `render-sandbox.js` y `preview-runtime.js` están al día; ahora la ejecuta (`prebuild:prod`).
- Accesibilidad: los iconos ya no se leen como texto («folder_open»); el árbol de archivos, las pestañas, las filas plegables del árbol de datos y los interruptores booleanos se manejan con teclado (flechas, Enter, Espacio, Mayús+F10); nombres accesibles en los controles de formulario, el marco del preview y los botones del buscador; puntos de referencia (`main`, `aside`, `footer`, regiones) y un único `h1`; contraste suficiente en el tema claro (colores de la sintaxis JSON, texto terciario, aviso, éxito) y en la barra de estado; jerarquía de encabezados en los diálogos; textos de la barra de estado y del Workspace en español. Ctrl+M libera el foco del editor.
- La captura PNG en Firefox no aplicaba las media queries del dispositivo: se resuelven antes de generar la imagen.

### Cambiado
- El render de Pug corre en un Worker dentro del iframe aislado: una plantilla con un bucle infinito se cancela a los 15 s sin bloquear la página también en Firefox y WebKit (antes solo en Chromium). Una plantilla ya no ve `window` ni `document`.
- La paginación del modo PDF, la medida del documento y la impresión ahora corren dentro del iframe del preview (`assets/preview-runtime.js`) y se comunican con la app por mensajes; el render de Pug corre en `assets/render-sandbox.js`. Ambos se generan con `npm run bundle:runtime` (se versionan y el build comprueba que están al día). Las imágenes y fuentes de los assets llegan al preview como `data:` (las URL `blob:` no cargan en un documento de origen opaco).
- Refactor interno sin cambios de comportamiento: los componentes más grandes se trocean y su lógica pasa a utilidades puras con pruebas. Editor de datos → `DataTreeComponent`, `DatasetBarComponent` y `data-tree.util`; preview → `PdfBarComponent` y `preview-layout.util`; editor → `ProjectSearchComponent` y `pug-language`; Workspace → `FileTreeComponent` y `file-actions.util`. Nuevas pruebas de interfaz del editor de datos y del Workspace.
- Los diálogos y el menú contextual del Workspace están en español.
- `<html lang="es">` y textos de botones (`title` y `aria-label`) en español, con nombre accesible en los botones de solo icono.
- Angular 22, TypeScript 6 y `angular-eslint` 22. `npm audit` baja de 33 a 18 avisos moderados (solo `minimatch` en `eslint`).
- Los assets llegan al iframe del preview una sola vez (como `Blob`) y las compilaciones posteriores solo envían el documento; el iframe ya no se recarga en cada cambio. Con un fallback a `data:` si el navegador rechaza reescribir el documento.
- El CI usa `actions/checkout@v5` y `actions/setup-node@v5` (Node 24): las v4 van sobre Node 20, obsoleto, y GitHub avisaba de que las forzaría a Node 24.
- El bundle de la aplicación ya no incluye `package.json` entero (con sus dependencias de desarrollo) solo para leer la versión: se importa `version` por su nombre y el resto se descarta. Una comprobación de interfaz verifica que el Workspace muestre la versión de `package.json`.
- Se elimina la devDependency `vite-plugin-node-polyfills`, que no se usaba. Las dependencias de producción no tienen vulnerabilidades.
- El CI ejecuta también las pruebas de interfaz en Firefox y WebKit (job `ui-navegadores`, en paralelo al de Chromium). Los escenarios que solo valen en Chromium se saltan solos con un `SKIP` visible en el log.

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
