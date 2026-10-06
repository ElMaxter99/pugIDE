# PugIDE

Entorno de desarrollo visual para **Pug/Jade**: detecta variables, genera datos de prueba (mocks) y previsualiza el resultado en tiempo real, todo en el navegador.

![Versión](https://img.shields.io/badge/version-0.0.2-blueviolet) ![Licencia](https://img.shields.io/badge/license-MIT-green)

## Capturas

### Vista principal

![Vista principal de PugIDE](docs/screenshots/landing.png)

### IDE (`/ide?demo=true`)

Editor de código, árbol de datos y vista previa en vivo, con un proyecto demo cargado.

![IDE en modo demo](docs/screenshots/ide-demo.png)

## Características

- Editor Pug con resaltado de sintaxis (Monaco) y soporte multi-archivo (includes / componentes).
- Detección automática de las variables usadas en la plantilla y editor de datos en árbol.
- Vista previa en vivo (escritorio / móvil) con auto-compilación.
- Consola con errores, warnings e info de compilación.
- Importar / exportar el proyecto.
- Modo demo: abre `/ide?demo=true` para cargar un proyecto de ejemplo completo.

## Desarrollo

```bash
npm install
npm start          # http://localhost:4200
npm run build:prod # build de producción
npm run test:e2e   # pruebas e2e
```

Prueba la demo en local: <http://localhost:4200/ide?demo=true>

## Licencia

Distribuido bajo licencia [MIT](LICENSE). Es de uso **libre y gratuito**, pero debes **mantener el aviso de copyright y mencionar al autor original**:

> PugIDE © 2026 [ElMaxter99](https://github.com/ElMaxter99) — <https://github.com/ElMaxter99/pugIDE>
