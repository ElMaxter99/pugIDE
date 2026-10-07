# PugIDE

IDE visual para **Pug/Jade** que corre 100% en tu navegador: detecta variables, genera datos de ejemplo (mocks) y previsualiza en tiempo real.

## Características

- Preview en vivo mientras escribes.
- Mocks automáticos a partir de las variables del template, editables.
- Proyectos multi-archivo reales: carpetas, `include`, SCSS.
- Inspector del preview, terminal de errores y modo claro/oscuro.

## Privacidad

**Nada sale de tu navegador.** No hay backend, ni cuenta, ni subida de código. Tu proyecto se guarda solo en el `localStorage` de tu navegador. Si borras los datos del sitio, lo pierdes: exporta tus proyectos.

## Desarrollo

```bash
npm install
npm start          # http://localhost:4200
npm run build:prod
npm test
```

Más detalles en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) y [CONTRIBUTING.md](CONTRIBUTING.md).

## Importar y exportar

- **Exportar**: a una carpeta de tu disco (navegadores con File System Access API, como Chrome/Edge) o, si no está disponible, como `.zip`.
- **Importar**: desde una carpeta o un `.zip`. Las rutas se conservan.
- Solo se manejan archivos de texto: `.pug`, `.jade`, `.scss`, `.sass`, `.css`, `.json`, `.js`, `.html`, `.htm`, `.md`, `.txt`. El resto se ignora.

## Limitaciones conocidas

- El almacenamiento en `localStorage` tiene cuota (~5 MB); proyectos grandes pueden no guardarse (se avisa).
- No se importan imágenes ni otros binarios.
- El soporte de SCSS es una implementación ligera: no cubre todo Sass.
- Importar/exportar a carpeta no funciona en Firefox/Safari (se usa `.zip`).
- No hay sincronización entre dispositivos ni colaboración.

## Licencia

MIT. Debes conservar el aviso de copyright y la atribución al autor original. Consulta [CONTRIBUTING.md](CONTRIBUTING.md).
