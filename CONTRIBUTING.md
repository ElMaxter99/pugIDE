# Contribuir a PugIDE

Gracias por colaborar. Todo en español (UI, commits, issues, docs); el código en inglés.

## Principios

PugIDE es 100% local: no se añaden backends ni envíos de código del usuario a la red. Lee [CLAUDE.md](CLAUDE.md) y [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Flujo

1. Haz un fork y crea una rama (`feat/...`, `fix/...`, `docs/...`).
2. `npm install`, `npm start`.
3. Antes de abrir el PR: `npm run build:prod` y `npm run test:e2e`.
4. Commits pequeños y descriptivos (`feat(data): ...`, `fix(parser): ...`).
5. Abre un PR explicando qué cambia y por qué.

## Estilo

Componentes standalone con OnPush y signals; lógica en servicios; utilidades puras en `core/utils`.

## Licencia

MIT. Al contribuir aceptas que tu aportación se publique bajo MIT y que se conserve la atribución del proyecto.
