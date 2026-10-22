# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

### Añadido
- Aviso de privacidad: la analítica anónima de visitas (Vercel Web Analytics) pasa a ser opcional y solo se carga si el usuario la acepta; la decisión se guarda y se puede cambiar desde la paleta de comandos. La landing lo indica.

### Corregido
- Paleta de comandos: al pulsar Ctrl+K y escribir de seguido ya no se pierden las primeras letras.

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
