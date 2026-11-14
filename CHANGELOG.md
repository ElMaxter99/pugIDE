# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

### Añadido
- **Ver diferencias antes de elegir en un conflicto** (espacios de trabajo, app de escritorio; diseño P-37, aprobado). Cuando un archivo cambia en el disco mientras aquí tiene cambios sin guardar, la barra de conflicto ofrece **«Ver diferencias»**: las dos versiones lado a lado («Aquí (sin guardar)» y «En el disco»), con lo que cambia resaltado con signo y color, el número de cambios y de líneas, y saltos al cambio anterior y siguiente (Alt+↑ / Alt+↓). Se decide ahí mismo o en la barra. **La versión que no se elige queda en «Historial del archivo»**, así que elegir mal ya no pierde trabajo. Si el archivo se borró en el disco, lo dice y ofrece conservarlo o borrarlo aquí. Escenario `66-conflictos-diferencias` y pruebas unitarias de `sideBySideDiff`.

### Cambiado
- **La zona de Datos, tan clara como la de traducciones** (diseño P-38, aprobado). Los datos se ven en una **tabla CLAVE / VALOR**, como al abrir un archivo de `locales/`: cada grupo dice cuántos elementos tiene (`{4}`, `[3]`), los valores largos ocupan una línea (enteros al editar o al pasar el ratón) y se sigue editando en el sitio: textos, números e interruptores para los sí/no; **Esc deshace lo escrito** en un campo. La cabecera queda ordenada: arriba el **juego de datos con su nombre entero** (antes se cortaba en «Por defect»), el **dado** para regenerar y «⋯»; debajo un **filtro nuevo** (busca en claves y valores, sin tildes ni mayúsculas, y abre los grupos donde hay coincidencias; Esc lo limpia) y Árbol / JSON. Una tira fina resume cuántas claves hay o cuántas coinciden y reúne deshacer, rehacer, **contraer todo** y **expandir todo**. Las claves que la plantilla no lee llevan un **punto ámbar «sin usar»** (antes ese aviso solo salía en el Registro). En el modo JSON, el mismo campo busca en el texto: cuenta las coincidencias e Intro salta de una a otra. Escenario `67-datos-tabla` y pruebas unitarias de `dataTable` y `findFolded`.
- Las notas de cada release terminan con **«Cambios completos»**: el enlace al CHANGELOG de esa versión y a todos los cambios desde la anterior en GitHub (`releaseBody` en `scripts/release-notes.mjs`, que usa `npm run release:deploy`).

### Corregido
- **«Cargar el del disco» no cargaba nada si el archivo en conflicto era el que tenías abierto** (y lo mismo al recargarse solo un archivo abierto que cambió fuera): el editor seguía con el texto antiguo y, al guardar, volvía a escribirlo en disco encima de lo que había llegado. Ahora el editor toma la versión del disco.
- **Escribir ya no da tirones en proyectos con muchas imágenes o fuentes.** Cada autoguardado (un segundo después de dejar de escribir) volvía a escribir en la biblioteca del navegador el proyecto entero, **incluidas todas las imágenes y fuentes**, con la pantalla congelada mientras tanto: medido en Chromium, unos 1,85 ms por MB (49 ms con 25 MB, 92 ms con 50 MB, 185 ms con 100 MB). Ahora la biblioteca guarda las imágenes y fuentes de cada proyecto **aparte** del texto y solo las reescribe cuando cambian (añadir, quitar o sustituir); el autoguardado escribe solo el texto y los datos (menos de 1 ms). Los proyectos guardados con versiones anteriores se siguen abriendo con sus imágenes y pasan al formato nuevo la primera vez que se guardan. Escenario `65-biblioteca-assets` (IndexedDB de verdad, también el formato anterior) y pruebas de la biblioteca.
- Las pruebas de interfaz del CI volvían a fallar sin probar nada: GitHub pasó `ubuntu-latest` a Ubuntu 26.04 y Playwright 1.56.1 no sabe instalar ahí los navegadores. `playwright-core` sube a 1.65.1 (en local, tras `npm install`, vuelve a ejecutar `npx playwright-core install chromium firefox webkit`).

## [0.14.0] - 2026-11-12

### Añadido
- **Actualizar dentro de la app de escritorio** (diseño P-35 y P-36, aprobado). La barra de versión nueva ya no ofrece «Descargar» (que abría GitHub) sino **«Actualizar»**: descarga la versión nueva de la release, con barra de progreso y «Cancelar» mientras sigues trabajando; comprueba que el archivo es el publicado (huella SHA-512) y la instala con **«Reiniciar y actualizar»** (guarda antes) o **«Al cerrar PugIDE»**. Al volver a abrir avisa de que se ha actualizado. **«Ver novedades»** abre la página de la versión en GitHub. Funciona con el instalador de Windows y en Linux (AppImage, .deb y .rpm; con .deb/.rpm el sistema pide la contraseña). En macOS (exige apps firmadas) y en el portable de Windows sigue «Descargar». Si la descarga falla o no coincide, no se instala nada y se ofrece «Reintentar» o «Descargar desde GitHub». Probado de verdad con un AppImage 0.13.9 que se actualizó a 0.14.0 desde un servidor local (y que se negó con una huella cambiada). Se usa electron-updater; cada release lleva ahora `latest*.yml` y `*.blockmap`. **La primera versión que se actualiza sola es la 0.14.0**: a ella se llega con «Descargar».
- **Guía reutilizable de cómo se actualiza una app de escritorio** ([docs/ACTUALIZAR-ESCRITORIO.md](docs/ACTUALIZAR-ESCRITORIO.md)): por qué la web es fácil y el escritorio no, los manifiestos, el código mínimo, qué sistemas se actualizan solos sin firma, seguridad, lista de comprobación y cómo probarlo con un servidor local.
- Escenario `64-actualizar-escritorio` y pruebas unitarias de `selfUpdateSupport` y del actualizador (con uno falso).
- **Comprobación de palabras prohibidas** (`scripts/check-forbidden-words.mjs`, dentro de `npm run lint` y, por tanto, del CI): falla si en cualquier archivo del repositorio aparece una palabra de la lista, sin distinguir mayúsculas ni tildes y también dentro de otras palabras. Sirve para que no se cuele el nombre de un cliente real en los ejemplos. La lista (`scripts/forbidden-words.json`) guarda solo el SHA-256 de cada palabra, nunca la palabra; se añade una con `node scripts/check-forbidden-words.mjs --hash palabra`.

### Corregido
- **`npm run build:prod` (y `npm run start:desktop`) ya no fallan en Windows con «render-sandbox.js desactualizado».** En un clon hecho antes de fijar los saltos de línea a LF (o con `core.autocrlf=true`), las fuentes del motor llegan con CRLF y su hash no coincidía con el de los archivos generados, aunque el código fuera el mismo. La comprobación ya no depende de los saltos de línea.
- **`npm run start:desktop` funciona a la primera.** Si faltaban las dependencias de la app de escritorio daba «"electron" no se reconoce como un comando»; ahora las instala sola la primera vez y cuando cambia `desktop/package-lock.json` (`scripts/ensure-desktop-deps.mjs`). Lo mismo `test:desktop` y `desktop:pack`.
- **La app de escritorio desde el código ya no dice «tienes la 0.0.0».** Con `npm run start:desktop` leía la versión de `desktop/package.json` (siempre 0.0.0, la real la pone el CI al empaquetar) y el aviso de versión nueva lo decía; ahora usa la del proyecto. Para probar el aviso: `PUGIDE_FAKE_VERSION=0.1.0 npm run start:desktop`.
- **App de escritorio: el icono de la ventana va dentro de los instaladores.** La ventana usaba `build/icon.png`, que no se empaquetaba; en Linux eso dejaba el icono de Electron. Ahora se empaquetan el PNG y un `.ico` nuevo con todos los tamaños de Windows (16 a 256 px, generado por `npm run brand:icons`), Windows agrupa la barra de tareas con el identificador de PugIDE también al ejecutar desde el código, y la prueba automática de escritorio comprueba que el icono está.

## [0.13.0] - 2026-11-12

### Añadido
- **Asistente de IA, solo en la app de escritorio y en local** (diseño P-30 a P-34, aprobado). Propone **datos de ejemplo coherentes** con la plantilla (leyendo sus `include`, `mixin` y la forma de los datos) y **arreglos de errores** desde «Problemas». Usa la CLI que ya tienes instalada, con tu sesión: **Claude Code** (`claude`) o **GitHub Copilot** (`copilot`); eliges el proveedor y el **modelo por defecto** de cada una en «Vista → Asistente de IA…». No es un botón mágico: antes de enviar ves **qué se manda** (puedes quitar archivos), la **estimación de tokens** y la orden exacta; mientras trabaja ves los pasos y los **tokens consumidos**; y las propuestas se **prueban en la vista previa**, se **revierten** o se **aplican** (con deshacer). La CLI se lanza **sin herramientas**: no puede leer ni escribir archivos ni ejecutar órdenes. En la web publicada no aparece nada. Con `npm start` hace falta abrir el puente local con `npm run ia` (solo escucha en 127.0.0.1). El Registro apunta cada petición y la barra de estado suma la sesión.
- **Guía para probar una rama en tu equipo** ([docs/PROBAR-EN-LOCAL.md](docs/PROBAR-EN-LOCAL.md)): Windows y Ubuntu, la web en local, el asistente, la app de escritorio desde el código, los instaladores de la PR o compilados por ti y cómo comprobar el aviso de versión nueva.
- Escenario `63-asistente-ia` y pruebas unitarias de `ai.util`, de las CLI (`desktop/src/ai-cli.cjs`, con CLI falsas y una respuesta real grabada) y del puente.

### Cambiado
- `npm run start:desktop` abre la app de escritorio con el código actual y `npm run test:desktop` lanza su prueba automática (los nombres antiguos `desktop:start` y `desktop:test` siguen valiendo). La guía [docs/PROBAR-EN-LOCAL.md](docs/PROBAR-EN-LOCAL.md) explica la batería completa en Windows y Ubuntu, también en Firefox y WebKit.

### Corregido
- **Una plantilla que lee un elemento por su posición ya no falla con los datos de ejemplo.** Con `productos[1].name`, PugIDE no entendía el índice: trataba `productos` como un texto y la vista previa daba «Cannot read properties of undefined (reading 'name')». Ahora reconoce `lista[N]` (también dentro de un `each`) como un elemento de la lista y se asegura de que haya al menos N+1: los datos de ejemplo nuevos se generan con esos elementos, y si tus datos ya tenían menos, se completan copiando la forma del último, sin tocar los que había. Escenario `62-indices-en-datos` y pruebas unitarias del parser y de `padArray`.

## [0.12.0] - 2026-11-12

### Cambiado
- **«Importar archivos» añade al proyecto abierto** (diseño P-28, aprobado). El botón de subir del panel de archivos se llamaba «Importar proyecto» y creaba un proyecto nuevo con lo elegido, cuando lo que se espera de él es añadir archivos al que está abierto. Ahora es **«Importar archivos…»** (también en «Proyecto» y en la paleta): se eligen **archivos sueltos o una carpeta entera**, o se sueltan, y se guardan **dentro del proyecto abierto**, en la carpeta que se elija. Antes de escribir nada se ve qué es **nuevo**, qué **ya existe** y qué **no se admite**; con los que ya existen se elige entre no tocarlos (por defecto), sustituirlos (la versión anterior queda en «Historial del archivo») o conservar los dos (`tabla-2.pug`). Una carpeta se puede conservar como subcarpeta o volcar su contenido en el destino. Toda la importación se **deshace de una vez**. El menú de una carpeta ofrece «Importar archivos aquí…».
- **«Importar proyecto» pasa a «Mis proyectos»** (P-29), junto a «Nuevo proyecto»: desde una carpeta o desde un `.zip`. Crea un proyecto **nuevo** (con nombre libre si ya hay uno igual) y el que estaba abierto sigue guardado en la lista; ya no hace falta el aviso de «esto reemplaza todos los archivos». También está en «Proyecto», en la paleta y en la bienvenida.
- **Soltar sobre el árbol de archivos ya no sustituye el proyecto**: abre «Importar archivos» con el resumen, y la carpeta sobre la que se suelta es el destino. Un `.zip` pregunta si añadir su contenido al proyecto o abrirlo como proyecto nuevo.
- **Elegir una carpeta funciona en todos los navegadores** (también Firefox y Safari): se usa el selector de carpetas estándar en vez de la API que solo tenían Chrome y Edge. Se saltan `node_modules`, `.git` y los restos del sistema.
- El botón «Subir imágenes, fuentes o estilos» del panel y su entrada del menú desaparecen: «Importar archivos» acepta todos los tipos. Subir el archivo que falta desde su aviso en el árbol sigue igual.
- Escenarios `60-importar-archivos` y `61-importar-proyecto`, y pruebas unitarias de `import-files.util`.
- **Logo nuevo.** Sigue siendo un pug y un documento, pero ahora en una sola figura: el pug trae la hoja en la boca (mesa L-01 del lienzo, propuesta D, elegida entre diez). Sustituye al anterior, que eran dos mitades pegadas, en verde (fuera de la paleta de la app) y que no se distinguía en la pestaña del navegador. Cambian el icono de la pestaña, los iconos de la PWA instalada (también el enmascarable), los de Apple, Android y Windows, la imagen al compartir el enlace y el icono de la app de escritorio. En tamaños pequeños se usa una versión simplificada.
- Todos los iconos salen de un solo dibujo con `npm run brand:icons` (`scripts/brand-icons.mjs`); el SVG fuente queda también en `docs/brand/`.

## [0.11.0] - 2026-11-11

### Añadido
- **Exportar para correo** (diseño P-23, aprobado). «Exportar → HTML para correo…» (y la paleta) pasa el CSS a atributos `style` respetando la cascada (`!important`, especificidad y orden; el `style` propio se conserva), quita `<script>` y los atributos de eventos, conserva `@media` y `:hover` en un `<style>` y permite un texto de vista previa del correo. Mide el peso contra los **102 KB a partir de los que Gmail recorta** y avisa de lo que el correo no admite: flexbox y grid (Outlook), `position`, fuentes web, imágenes sin `alt`, `<form>`, `<video>`… Con «Copiar HTML» y «Descargar .html». Sin incrustar las imágenes locales, llevan la ruta del proyecto y se avisa. Todo en el navegador.
- **Documentos de varias páginas** (P-24). En el modo PDF, **navegador de páginas**: anterior y siguiente, «ir a la página», Re Pág / Av Pág y un panel «Páginas» con una ficha por hoja, que marca las que tienen un aviso de corte. **«Exportar → Todas las plantillas (.zip)…»** compila cada plantilla que es una página (los parciales de `include` y `extends` no) a un `.html` autocontenido, sin cambiar la vista previa; las que no compilan se dicen. **Los enlaces entre plantillas** (`a(href="factura.pug")`) previsualizan esa plantilla al pulsarlos y pasan a `.html` al exportar.
- **Plantillas propias** (P-25). «Proyecto → Guardar como plantilla…» guarda el proyecto abierto (archivos y, si se quiere, datos, imágenes y fuentes e idiomas) como punto de partida. «Mis proyectos» enseña **«Mis plantillas»** con Usar, Renombrar, Actualizar con el proyecto abierto, Exportar (`.zip`) y Borrar, e «Importar plantilla (.zip)…». Hasta 30 plantillas de 25 MB, guardadas en el navegador (IndexedDB).
- Escenarios `56-exportar-correo`, `57-varias-paginas` y `58-plantillas-propias`, y pruebas unitarias de `email-export.util`, `user-template.util` y de las páginas y enlaces de `pug-vfs.util`.
- **Espacios de trabajo por cliente, en la app de escritorio** (diseño P-26, aprobado). Un espacio es **una carpeta de tu equipo** con nombre y color. «Espacios de trabajo…» (barra superior, menú «Espacios», Ctrl+Mayús+E o la paleta) lista los espacios, crea uno eligiendo la carpeta (usa lo que ya hay en ella o empieza con una plantilla) y avisa si una carpeta ya no se encuentra. Con un espacio abierto, **lo que editas se guarda en sus archivos** (los datos en `.pugide/datasets.json`), así que puedes usar git u otro editor a la vez; **lo que cambia fuera se recarga solo** y, si cambió en los dos sitios, se pregunta con cuál quedarse. La barra enseña el espacio, su carpeta y «Guardado en disco». Lo que la app no maneja (otros tipos de archivo, `.git`, `node_modules`) no se toca. La app vuelve a abrir el último espacio al arrancar. En la web y la PWA no cambia nada.
- **Aviso de versión nueva, en la app de escritorio** (P-27). **Apagado mientras no lo aceptes**: se pregunta una sola vez. Si lo permites, la app consulta en github.com (una vez al día y al abrir) el número de la última versión, sin enviar nada tuyo; con versión nueva sale una barra con **«Descargar»**, que abre la página de la versión en el navegador. No instala nada sola (los instaladores no están firmados). «Ayuda → Buscar actualizaciones…» busca a mano y cambia la preferencia.
- Seguridad de la app de escritorio: el acceso al disco pasa por una lista corta de operaciones y **solo dentro de las carpetas elegidas con el diálogo del sistema**; no se puede leer ni escribir fuera. Pruebas: la prueba real de Electron abre un espacio en una carpeta temporal, edita dentro y fuera y comprueba que no se sale de ella; pruebas unitarias de la sincronización, de la lectura y escritura de carpetas y de la comparación de versiones.

### Corregido
- La app de escritorio no reconocía sus propias direcciones internas (`pugide://`): «Abrir en una pestaña nueva» de la vista previa y los enlaces `pugide://` no funcionaban.

## [0.10.2] - 2026-11-11

### Corregido
- **Al crear un proyecto o cambiar de proyecto, el archivo del mismo nombre se pisaba y el editor se quedaba en blanco.** Si el proyecto que se abría tenía un archivo con el mismo nombre que el que estaba abierto (lo habitual: `main.pug`), su contenido quedaba sustituido por el del proyecto anterior y el editor no enseñaba nada. Afectaba a «Nuevo proyecto», a abrir otro proyecto de «Mis proyectos» y a crear uno desde una plantilla, en la web y en la app de escritorio. La causa: al cambiar de proyecto, el editor cargaba la pestaña nueva antes de soltar los archivos del proyecto anterior, y al hacerlo escribía el contenido viejo en el archivo nuevo. Ahora primero se sueltan y después se carga. Escenario `59-cambiar-de-proyecto` (crear, cambiar, volver y recargar: cada proyecto conserva lo suyo).
- **Qué hacer si te pasó:** abre ese proyecto y mira «Proyecto → Historial del archivo…»: si el archivo se había guardado antes, sus versiones anteriores siguen ahí (hasta 30 por archivo). También valen las «Instantáneas del proyecto…» y cualquier `.zip` exportado.

## [0.10.1] - 2026-11-09

### Cambiado
- **Ejemplos genéricos** en las pruebas: el proyecto de ejemplo de informe de las pruebas e2e pasa a ser un informe de ventas inventado, con fuentes, imágenes y textos genéricos. No cambia nada para quien usa la app.

## [0.10.0] - 2026-11-09

### Añadido
- **PugIDE de escritorio para Windows, macOS y Linux** (Electron, `desktop/`), gratuito y **sin firmar** (sin certificados de pago): software libre MIT, sin garantía y bajo la responsabilidad de cada persona usuaria, con los avisos en el README, en `docs/INSTALAR.md` y en las notas de cada release. Instaladores: Windows (instalador y portable), macOS (dmg Intel y Apple Silicon) y Linux (`AppImage`, `deb`, `rpm`). **Funciona del todo sin conexión** y sin llamadas de red por su cuenta; sin analítica ni aviso de privacidad ni service worker. La app se sirve desde el disco con las **mismas cabeceras de seguridad que producción** (CSP y `sandbox` de los marcos, leídas de `vercel.json`); `contextIsolation` y `sandbox`, sin Node en la página y sin abrir ventanas ni navegar fuera de la app (los enlaces `https` abren el navegador). Los enlaces `pugide://` abren la app. Los proyectos de la web, la PWA y el escritorio son perfiles aparte (se llevan con Exportar/Importar `.zip`).
- **`.github/workflows/desktop.yml`:** al publicarse una release construye los instaladores en las tres máquinas, ejecuta la prueba de humo sobre cada app ya empaquetada y los adjunta a la release (con el aviso de «sin firmar» en sus notas). También se lanza a mano (Actions → Escritorio) y en los PR que tocan `desktop/`.
- **PWA instalable documentada y comprobada:** manifiesto con idioma y descripción en español; escenario `55-pwa-instalable` con las condiciones que exigen Chrome, Edge y Safari para ofrecer «Instalar».
- Comandos `npm run desktop:install`, `desktop:start`, `desktop:test` y `desktop:pack`. Prueba de humo `desktop/test/smoke.mjs` (Electron real con Playwright), pruebas unitarias de `desktop.util` y `docs/INSTALAR.md`.

## [0.9.1] - 2026-11-09

### Añadido
- **Doble clic en una plantilla Pug/Jade del árbol la previsualiza**, igual que «Previsualizar este archivo» del clic derecho (que sigue ahí, y es la vía con teclado). Un archivo que no es plantilla no cambia la vista previa. Fila nueva en «Atajos de teclado». Escenario `54-doble-clic-previsualiza`.

## [0.9.0] - 2026-11-09

### Añadido
- **Tema Automático / Oscuro / Claro** (diseño P-21). El botón de tema pasa a un menú con las tres opciones. «Automático» sigue el tema del sistema (`prefers-color-scheme`) y cambia solo si el sistema cambia; es lo que ve quien no ha elegido (antes siempre salía oscuro). Quien ya había guardado oscuro o claro lo conserva. La portada y el editor usan la misma regla; la paleta tiene «Tema: Automático».
- **Idiomas del proyecto: por defecto y de reserva** (diseño P-22). Menú «Vista» → «Idiomas…» (o la paleta): el **idioma por defecto** es el que se abre si no elegiste otro en la vista previa (antes, el primero por orden alfabético) y el **idioma de reserva** rellena, al previsualizar, las claves que faltan o están vacías en el idioma activo; el Registro avisa de cuáles. Los archivos de idioma no se modifican. Los ajustes viajan con el proyecto (sesión, `.pugide/datasets.json`, zip). Sin plurales automáticos. Escenario `53-idiomas-del-proyecto`, e2e `27` y pruebas unitarias.
- **Teclado más corto** (P-21). Tres **enlaces de salto** al principio de la página («Saltar al editor», «a la vista previa» y «a Problemas»), visibles solo con el foco; **F6 / Mayús+F6** recorren las regiones (lateral, editor, datos, vista previa, Problemas) con un marco visible; el lateral lleva nombre de región. Filas nuevas en «Atajos de teclado». Escenario `52-tema-y-teclado`.
- **Renombrar y borrar carpetas** (diseño P-18, aprobado). El menú de una carpeta (clic derecho, Mayús+F10, o F2 y Supr con el foco) ofrece «Renombrar» y «Borrar carpeta». Borrar dice cuántos archivos e imágenes se borran y lista los primeros; con más de 10 hay que escribir el nombre de la carpeta. Renombrar mueve todo el contenido (archivos, imágenes e historial) y avisa de que las referencias no se cambian solas. El Registro cuenta la operación y ofrece **«Deshacer»**, que recupera toda la carpeta de una vez (también desde la paleta). No deja mover una carpeta dentro de sí misma ni sobre una ruta que ya existe. Escenario `51-carpetas`.
- **Publicar una versión con un solo comando: `npm run release:deploy`.** Sin pasarle versión ni commit: se pone en `master` y lo actualiza, lee la versión que declara, encuentra su commit (el merge del PR de la versión, aunque `master` ya haya avanzado), comprueba el `package.json` y el CHANGELOG, crea y sube el tag anotado, crea la release de GitHub con las notas del CHANGELOG y deja la rama `release` en ese commit solo si es fast-forward (si no, no fuerza nada). Se puede repetir (lo ya hecho se salta), tiene `--dry-run` y `--no-prod`, y es de Node (igual en PowerShell, Bash y CI). Lo único a mano es desplegar en Vercel. Probado con repositorios de mentira (9 casos: simulacro, idempotencia, no fast-forward, tag en otro commit…).
- **Guía de despliegue por versión** (`npm run release:guide -- X.Y.Z` → `docs/releases/vX.Y.Z.md`, que `release:check` exige) y **`node scripts/release-notes.mjs X.Y.Z`**, que saca las notas de la release del CHANGELOG. Regla fija en `CLAUDE.md`: quien prepara una versión pasa el comando y deja la guía.
- **Claves de traducción calculadas con una variable del template.** `- var textS = 'SINGLE'` + `t(`TEXT_${textS}`)` (también `t('TEXT_' + textS)` y `t(textS)`) añade `TEXT_SINGLE` a las traducciones o a los archivos de idioma; un ternario de textos (`n === 1 ? 'SINGLE' : 'PLURAL'`) añade las dos claves. Si el valor viene de un dato o de una llamada no se inventa ninguna. Antes solo se detectaban los literales (`t('CLAVE')`). Los plurales automáticos no se generan: cada proyecto los resuelve con sus propias claves.
- **Visor de JSON en árbol, al estilo del de Firefox** (diseño P-17, aprobado). Cada `.json` tiene un conmutador **«Árbol | Código»** en la barra de pestañas; la vista se recuerda por tipo de archivo (los archivos de idioma se abren en árbol y el resto en código). El árbol tiene dos columnas (clave y valor), triángulos para plegar, recuentos `{4}` y `[3]`, colores por tipo, **filtro** al instante (deja las coincidencias con sus padres, las marca y las cuenta), «Contraer todo», «Expandir todo» y «Copiar JSON». El menú de cada fila (clic derecho, Mayús+F10 o la tecla de menú) ofrece **Copiar ruta** (`HOME.TITLE`), **Copiar valor** y **Editar en el código** (pasa a «Código» en esa línea). En los archivos de idioma añade la insignia **«sin traducir»**, el filtro **«Solo sin traducir (N)»**, las claves que **faltan** respecto al primer idioma (filas «falta») y **«Ver en la plantilla»**, que abre la plantilla en la línea que usa la clave. Es de solo lectura (se edita en «Código»), un JSON no válido enseña el error con su línea y «Ir al error», y solo se pintan las filas visibles (un JSON de 6000 claves no congela la página). Accesible: `treegrid` con ↑/↓/Inicio/Fin/←/→/Intro, `/` enfoca el filtro, contraste AA en oscuro y claro.
- Escenario `47-visor-json` y pruebas unitarias de `json-view.util`.
- **Compartir con opciones** (diseño P-15, aprobado). «Copiar enlace para compartir» abre «Compartir proyecto»: **caducidad** (1 hora, 1 día, 7 días —por defecto—, 30 días o nunca), **contraseña** opcional (mínimo 8 caracteres) que cifra el contenido con AES-GCM de 256 bits y una clave derivada con PBKDF2-SHA-256 (600 000 vueltas), si se incluyen los **datos** y las **imágenes y fuentes**, y una **nota** para quien lo abra. El enlace se genera en el navegador y se copia al portapapeles; con contraseña usa `#e=` y los enlaces antiguos (`#p=`, versiones 1 y 2) siguen abriéndose igual. La caducidad la respeta PugIDE pero no impide que quien ya tenga el enlace lo copie (sin servidor no se puede revocar); el diálogo lo dice.
- **Abrir un enlace compartido como proyecto nuevo** (diseño P-16, aprobado). El diálogo ofrece, marcada por defecto, «Abrir como proyecto nuevo»: el proyecto actual se guarda antes en «Mis proyectos» y el del enlace se abre con un nombre que no repite ninguno. «Reemplazar mi sesión» sigue disponible pero sin marcar. Un enlace con contraseña la pide (tras 5 fallos seguidos pide esperar 30 s), uno caducado dice cuándo caducó, y sin sesión guardada se abre directo como antes.
- Escenario `46-compartir` (interfaz), e2e `30` y pruebas unitarias del cifrado, la caducidad y la manipulación del texto cifrado.

### Cambiado
- **Ventana baja o zoom al 200 %** (diseño P-19, aprobado). El panel inferior mide `clamp(120px, 33vh, 240px)` (antes 240 fijos); si con él el editor se quedara con menos de 240 px de alto, el panel se recoge en una **franja de 34 px** («N errores · Problemas · Registro · Mostrar») y se abre sobre el editor (≈60 % del alto) con un clic o Ctrl+J, y se recoge con Esc, Ctrl+J o su botón de cerrar. Por debajo de 900 px de ancho la **barra superior** pasa a solo iconos (logo «P», «Proyecto», «Exportar» y el buscador, que sigue abriendo la paleta; «Guardar» y el tema siempre a la vista) y la **barra de estado** a solo iconos, sin «Compilado en N ms», codificación ni lenguaje y sin partir el texto. Escenario `50-ventana-baja`.
- **«Problemas»: los botones «Crear mixin…», «Ir al error» y «Copiar mensaje» van en la línea del título**, a la derecha, y se ven con cualquier altura de panel (antes quedaban tapados por la barra de estado). El fragmento de código se acota a 3 líneas con «Ver más», y la pista y el fragmento van lado a lado si hay ancho (diseño P-20, aprobado).
- El aviso flotante de «Copiar enlace» pasa al diálogo «Enlace copiado» (con el resumen, el enlace, los avisos de lo que no cabe y el `.zip` si es muy largo).

### Corregido
- **`t('PIE_' + s)` generaba la clave «PIE_»**: ahora la clave es el argumento entero.
- **El menú «⋯» de «Datos» (juego de datos, datos de ejemplo, entrada y salida) salía cortado por la izquierda y por abajo** al abrirlo desde el panel lateral, que es estrecho y está pegado al borde de la ventana. Todos los menús desplegables se colocan ahora dentro de la ventana (se ajustan al borde, se abren hacia donde hay sitio y, si no caben enteros, hacen scroll) y ya no los recorta el panel que los contiene. Escenario `48-menus-en-ventana`.
- **F2 y Supr sobre una carpeta del árbol** (añadidos en la 0.8.0) abrían un diálogo de renombrar o borrar que no hacía nada. Ahora se ignoran en las carpetas hasta que exista renombrar y borrar carpetas (anotado en `docs/PLAN.md`, 17.3).
- **F2 y Supr sobre una carpeta del árbol** (añadidos en la 0.8.0) abrían un diálogo de renombrar o borrar que no hacía nada. Ahora se ignoran en las carpetas hasta que exista renombrar y borrar carpetas (anotado en `docs/PLAN.md`, 17.3).

## [0.8.0] - 2026-11-09

Primera entrega de la 0.8: la oleada 1 (accesibilidad y robustez, sin cambios de diseño), la importación de un `translations.json` como idioma y las correcciones de `.less` y `locals.x.y`. No cambia el formato de los proyectos.

### Añadido
- **Menú del árbol y de las pestañas con teclado** (WCAG 2.1.1): `role="menu"`, el foco entra en la primera opción, ↑/↓/Inicio/Fin recorren, Esc cierra y devuelve el foco, Tab cierra. **F2** renombra y **Supr** borra el archivo con el foco (mismos diálogos que el menú).
- **Paleta de comandos:** `aria-activedescendant` (se anuncia la opción activa) y un anuncio con el número de resultados.
- **Anuncios para lector de pantalla** al cambiar de disposición, de dispositivo de la vista previa y al corregir un error.
- **`prefers-reduced-motion`** (para las animaciones infinitas y los fundidos, también en Monaco), **`prefers-contrast: more`** y **`forced-colors`** (el estado activo se marca con contorno).
- **Errores de Pug explicados:** tabuladores y espacios mezclados, `else` sin `if`, `extends` que no es lo primero, recursión infinita de un mixin (o `include` circular), JavaScript con errores de sintaxis y «Unexpected token». Los errores de JavaScript sin ubicación («Error parsing body of the with expression») ahora se sitúan en su línea.
- **Filtro `:escape`.**
- **Sesión dañada:** si lo guardado no se puede leer (JSON truncado, tipos raros) se avisa en el Registro, se rescatan los archivos de texto válidos y se guarda una copia del original (`pug-ide-project-corrupt`) antes de que el autoguardado lo pise.
- Escenarios `43-sesion-corrupta`, `44-accesibilidad-08`, `45-arbol-teclado` y `48` (e2e).
- **Importar un `translations.json` como idioma** (diseño P-14). En «Añadir idioma» hay un botón «Importar archivo .json…»: eliges uno o varios archivos, la app propone el código del nombre (`es-ES.json` → `es-ES`; con `translations.json` lo escribes tú) y los guarda en `locales/<código>/translations.json`. Las claves planas (`"HOME.TITLE"`) se convierten a anidadas. Si el idioma ya existe, eliges entre **Fusionar** (por defecto: añade lo nuevo y rellena lo vacío, sin pisar lo traducido) y **Reemplazar**. Al soltar sobre el árbol un JSON que solo trae textos y se llama como un idioma (`es-ES.json`, `translations.json`, `messages.json`…), la app pregunta si es un idioma; «Es un dato más» (o Esc) lo añade como archivo normal. Los demás JSON se añaden como siempre.
- Escenarios `42-importar-idioma` (interfaz) y `47` (e2e).
- Escenario `41-less-real`: Less con variables, `@import` y `darken()`, y una hoja `.less` que falta en «Problemas».

### Cambiado
- **Importar un `.zip`** aplana una carpeta raíz única (`Mi Proyecto/main.pug` ya no rompe `/partials/…`), ignora `__MACOSX`, `.DS_Store` y similares, y avisa de la carpeta quitada y de lo omitido.
- **Contraste AA:** Inspector activo, `kbd` del menú «Disposición» en claro, filas de detalle del Registro, «Sin mensajes» y el texto del Inspector vacío usan colores sólidos en vez de opacidades (axe da 0 incumplimientos en esos estados, en oscuro y claro).
- **Nombres:** «Cerrar pestaña» pasa a «Cerrar <archivo>» y mide 24×24 px; el editor se llama «Editor de código».
- **Textos en español:** menú de las pestañas, Inspector, «Escribe un JSON válido…», «Buscar en el proyecto» e «Ir a la definición».

### Corregido
- **Los archivos `.less` se ignoraban al importar una carpeta, un `.zip` o al soltarlos** (solo se aceptaban `.css`, `.scss` y `.sass`), así que el `link` a la hoja no encontraba nada. Ahora se importan como el resto de estilos (Less ya compilaba bien al subirlo con el botón del panel «Archivos»).
- **Una hoja de estilos referenciada que no existe (sin línea de error) ahora sale en «Problemas»** y cuenta en la barra de estado, con una pista para subir el archivo. Antes solo aparecía en el Registro bajo «Todo» y parecía que simplemente «no pasaba nada».
- **`locals.x.y` en una plantilla se entiende como el dato `x.y`** (así recibe Pug sus datos: `locals` es el objeto completo). Antes creaba un dato falso llamado `locals`, y el esqueleto de `locals.pdfSettings.fonts` no se generaba.

## [0.7.2] - 2026-11-08

Versión de correcciones: dos bugs que daban una salida incorrecta sin avisar (el SCSS con mixins y los globales estándar), el aviso cuando la sesión no se puede guardar y el mantenimiento posterior a la 0.7.1. No cambia el formato de los proyectos.

### Corregido
- **El SCSS con `@mixin`, `@include`, `@use`, funciones y el Sass indentado salía sin estilo y sin ningún aviso en producción** (desde la 0.6.0). dart-sass crea con `new Function` unas funciones auxiliares y la CSP de la app (sin `'unsafe-eval'`, a propósito) las bloqueaba, así que `sass` no cargaba y la app caía en silencio al subconjunto `scss-lite`. Ahora `sass` se empaqueta con esas llamadas reescritas (`scripts/bundle-sass.mjs`), sin tocar la CSP, y funciona también sin conexión como antes. Los errores de Sass (`$noexiste`, `@use` que falla) vuelven a salir en «Problemas» con su archivo y línea.
- **Si `sass` no llega a cargar, la app lo dice** (una vez, en el Registro) en vez de dejar los estilos a medias, y el subconjunto SCSS entiende ya la última declaración de un bloque sin `;` (`.z{color:blue}` daba un `<style>` vacío).
- **Los globales estándar de ES y de la Web los tapaban los datos de ejemplo:** `encodeURIComponent` devolvía el texto sin codificar, `btoa('hola')` devolvía `hola` y `typeof Intl` daba `string` (`new Intl.NumberFormat` fallaba). Afectaba a `Intl`, `encodeURIComponent`, `decodeURIComponent`, `URL`, `URLSearchParams`, `BigInt`, `btoa`, `atob`, `globalThis`, `structuredClone`, los typed arrays y alguno más. Siguen siendo datos nombres plausibles como `location`, `performance` o `name`.
- **Si la sesión no se puede guardar** (almacenamiento del navegador lleno o bloqueado; los datos importados de unos 5 MB en adelante no caben) **el Registro lo explica** y dice cómo no perder el trabajo (Exportar). Antes solo la barra de estado ponía «No se pudo guardar» y la sesión se perdía al recargar.
- **Salir de «Foco en la vista previa · PDF» recupera el dispositivo anterior** (Escritorio, Tableta, Móvil…): al entrar en esa disposición se recuerda el dispositivo y al pasar a otra disposición (`Ctrl+Alt+1/2/3`, menú «Disposición» o paleta) se restaura. Si mientras tanto eliges a mano otro dispositivo o el modo PDF, se respeta tu elección y no se restaura nada. Lo recordado vive en las preferencias del usuario (no viaja con el proyecto ni el enlace compartido) y sobrevive a recargar la página.

### Cambiado
- **Dependencias (solo parche o menor):** Angular 22.2.4 → 22.2.5, `@angular/build` y `@angular/cli` 22.2.5 → 22.2.6, `material-symbols` 0.48.1 → 0.48.3 (mismos glifos), y dentro de rango `sass`, `prettier`, `tslib` y `@types/node`. No se sube `playwright-core` (cambiaría el Chromium contra el que se mide la paginación del PDF) ni las versiones mayores (`typescript` 7, `eslint` 10, `monaco-editor`). Quedan 12 avisos moderados de `npm audit`, todos de las herramientas de lint (`minimatch` dentro de `typescript-eslint`); arreglarlos exige bajar `typescript-eslint` a una versión incompatible con TypeScript 6.
- **CI:** la instalación de navegadores de Playwright tiene un límite de 8 minutos (tarda ~30 s; `ui-webkit` se había quedado hasta 29 minutos parado en el `apt` del runner) y `build-test` tiene un límite de 30 minutos, que antes no tenía.
- `npm start`, `npm run build`, `npm run build:prod` y `npm run lint` generan antes `node_modules/.pugide/sass-csp.js` (`npm run bundle:sass`); no hay nada que hacer a mano.

### Añadido
- Escenario `40-scss-real`: compila `@mixin`, `@use`, `@function`, `@each` y Sass indentado **bajo las cabeceras de producción**, comprueba que un error de Sass sale en «Problemas» y que, con el chunk de Sass bloqueado, el respaldo avisa una vez y funciona. Hasta ahora ningún escenario de interfaz cargaba SCSS, y por eso el fallo pasó inadvertido. Más: `45-globales-estandar` y `46-sesion-no-se-guarda` (e2e), y `39-salir-del-pdf`.
- `PUGIDE_CPU_THROTTLE=4` para ejecutar las pruebas de interfaz con la CPU de la página ralentizada (solo Chromium) y sacar las carreras de tiempos en local.
- Los escenarios de interfaz 31 a 37 esperan ahora al estado asentado (medidas de ancho, cierre de diálogos con el foco dentro, autoguardado, carga de la fuente de iconos) en lugar de leer el DOM sin más, tras dos carreras que solo se veían en CI (escenarios 34 y 36).

## [0.7.1] - 2026-11-06

Versión de parche: un solo arreglo (los iconos) y su protección. No toca el motor ni el formato de los proyectos.

### Corregido
- **El icono de «Girar» (vista previa móvil o tableta) se veía como el texto «screen_rotation»**, con o sin conexión. Usaba un alias antiguo (`screen_rotation`) que la fuente de iconos recortada no incluía; `smartphone` (el icono de «Móvil») funcionaba solo de rebote. Ahora usan los nombres canónicos (`mobile_rotate` y `mobile`). Las fuentes de iconos siempre han ido en el paquete, sin descargarse de ningún sitio.

### Añadido
- **El lint y el build rechazan un icono con alias antiguo o nombre inexistente** (`scripts/subset-icons.mjs`), con el nombre canónico que hay que usar. Hasta ahora lo descartaba sin avisar.
- Escenario `38-iconos`: mide que ningún icono visible se quede como texto en las pantallas principales (menús, panel Problemas, datos, paleta y bienvenida); el escenario sin conexión (05) hace lo mismo con la app arrancada sin red.

## [0.7.0] - 2026-11-06

Rediseño de la interfaz en tres oleadas (propuesta 0.7, mesas P-01 a P-13 del lienzo; detalle y mediciones en `design/propuestas/0.7-mejoras-funcionales.md`), más la bienvenida de primer uso y la vista previa de cualquier archivo. No cambia el formato de los proyectos ni el motor de compilación.

### Añadido
- **Bienvenida y recorrido de primer uso:** la primera vez (sin sesión ni proyectos guardados) se ofrece un diálogo con plantillas de un clic (Informe, Factura, Correo electrónico, Proyecto vacío), «Abrir un proyecto guardado…», «Importar carpeta o .zip…» y un **recorrido de 4 pasos** que ilumina Archivos y datos, el editor, la vista previa y los atajos (se maneja con teclado, `Esc` lo salta y no vuelve a salir). Espera a que se decida el aviso de privacidad. No sale con sesión, `?demo=true` ni enlaces compartidos. «Ver el recorrido» y «Ver la bienvenida» están en la paleta.
- **Vista previa de cualquier archivo:** al importar varios `.pug` o `.jade` sueltos puedes elegir cuál se previsualiza («Previsualizar este archivo» en el menú del árbol o «Previsualizar archivo…» en la paleta). El elegido lleva una marca en el árbol y se guarda con el proyecto; «Vista previa automática» vuelve al comportamiento de siempre (`index`/`main`/`app`). Renombrar sigue al archivo elegido y borrarlo vuelve a automático. Los `.jade` valen ahora como archivo de entrada y como parciales sin extensión.
- **Panel «Problemas»:** el panel inferior tiene dos pestañas, **«Problemas | Registro»**. «Problemas» reúne todos los diagnósticos con filtros (Todos / Errores / Avisos), «Solo el archivo abierto», Anterior (`Mayús+F8`) / Siguiente (`F8`), la explicación de cada uno, el fragmento de código y los arreglos con un clic. El aviso grande del preview pasa a una franja **«N problemas · Ver»** y el preview **conserva la última vista correcta** cuando la compilación falla.
- **Disposiciones y tiradores:** cuatro disposiciones con atajo (`Ctrl+Alt+1…4`), menú **«Disposición»** en la barra de estado y en la paleta, `Ctrl+B` (panel lateral) y `Ctrl+J` (panel inferior), «Restablecer los tamaños». Tiradores entre paneles (`role="separator"`, arrastre, ← → de 16 px, doble clic restablece) con mínimos por panel. Se recuerdan en las preferencias del usuario y no viajan con el proyecto compartido ni con las instantáneas. En teclados con AltGr, `Ctrl+Alt+cifra` escribe `| @ # ~`, así que ahí no se secuestra la tecla: se cambia desde el menú o la paleta.
- **Paleta de comandos:** los 5 **comandos recientes** arriba, el **atajo** de cada comando, la coincidencia resaltada y los dispositivos del preview en una sublista («Cambiar dispositivo…»). Comandos nuevos: buscar y reemplazar en el proyecto, ir a símbolo, formatear Pug, abrir Problemas o el Registro, mostrar u ocultar y limpiar el panel inferior.
- Componente de menú desplegable accesible (`role="menu"`, Intro/Espacio/↓ abren, ↑/↓/Inicio/Fin se mueven, Esc cierra y devuelve el foco).
- Escenarios de interfaz 30 a 37, pruebas e2e de Problemas, disposición y vista previa de un archivo, y pruebas unitarias nuevas.

### Cambiado
- **Barra superior (de 9 controles a 6):** logo, menú **«Proyecto»**, menú **«Exportar»**, el campo «Buscar comandos y archivos…» con `Ctrl K` visible, el tema y **Guardar** como único botón relleno. El nombre del proyecto sale de la barra y se ve en el panel lateral. **Autocompilar** baja a la barra de estado. No se pierde ninguna acción.
- **Barra del preview en una fila:** segmentado Escritorio/Tableta/Móvil/PDF, zoom e Inspector, y un menú **«Vista»** (dispositivo, idioma, modo de color, auditoría de accesibilidad, captura PNG, recargar, abrir en pestaña nueva). Con el panel estrecho (menos de 600 px) pasa a solo icono con nombre accesible. En modo PDF, la segunda fila solo aparece cuando hace falta.
- **Barra de datos:** de 14 controles en 5 filas a 7 en 2, con un menú **«⋯»** para lo ocasional (nuevo juego, renombrar, duplicar, borrar, idioma de los datos, importar, copiar JSON, dejar el objeto vacío).
- **Los datos pasan a una pestaña «Datos» del panel lateral** (junto a «Archivos») y dejan de ocupar una cuarta columna: con la disposición predeterminada la vista previa mide ~660 px (antes ~390).
- **La terminal pasa a llamarse «Registro»** y se abre con el filtro **«Esenciales»**; «Todo» añade el detalle atenuado. Sus mensajes y orígenes están en español, con la hora del equipo, y ya no repite los errores de compilación (viven en «Problemas»).
- **Textos en español:** «Archivos», «Datos», «Vista previa», nombres de dispositivo («Móvil», «Tableta», «Escritorio», «Portátil») y las tildes de «Móvil» y «Auditoría». El panel inferior mide 240 px.

### Corregido
- **Selector de dispositivo:** con «Escritorio» activo mostraba «Mobile (390x844)».
- **Accesibilidad:** los selectores recuperan el anillo de foco con el teclado; el Inspector, el lienzo del preview y la lista de atajos son enfocables por teclado; los botones del preview y del Registro tienen nombre accesible y miden al menos 24 px.
- Renombrar o borrar un archivo que no estaba abierto no guardaba la sesión, y si era la plantilla que se estaba viendo no recompilaba.
- `Esc` cierra el menú contextual del árbol de archivos (antes solo lo cerraba un clic fuera).

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
