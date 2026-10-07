# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

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
