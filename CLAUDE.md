# CLAUDE.md

Guía para agentes y colaboradores que trabajan en PugIDE. Detalle técnico en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Qué es PugIDE

IDE de Pug/Jade 100% en el navegador (Angular 20, componentes standalone, signals).

## Filosofía (no negociable)

- **Todo local en el navegador.** No hay backend ni telemetría; nada del código del usuario sale de su máquina. No añadas llamadas de red con datos del usuario.
- **Mocks automáticos.** Se detectan las variables del template y se generan datos de ejemplo; el usuario los edita después.
- **Preview en vivo.** Compilación con debounce al escribir; el preview siempre debe reflejar el estado actual.
- **Plantillas reales multi-archivo.** Proyectos con carpetas, `include`, `extends` y SCSS, no ejemplos de un solo archivo.
- **Licencia MIT con atribución:** se conserva el aviso de copyright y la atribución al autor original.

## Flujo principal

parser -> datos -> orquestador -> compilador -> preview. Ver `src/app/core/services/orchestrator.service.ts` (`processCode`).

## Comandos

- `npm start` servidor de desarrollo
- `npm run build:prod` build de producción
- `npm test` / `npm run lint`
- `npm run bundle:pug` regenera el bundle de Pug para navegador

## Convenciones

- Todo el texto de UI, commits, issues y docs en español; el código (identificadores) en inglés.
- Componentes standalone con `ChangeDetectionStrategy.OnPush`; estado con signals en `core/state`.
- Lógica de negocio en servicios (`core/services`, `parser`, `compiler`), no en componentes.
- Utilidades puras en `core/utils`; modelos en `core/models`.
- Persistencia solo vía `PersistenceService` (localStorage), siempre con try/catch.
- Commits pequeños y descriptivos (estilo `feat(...)`, `fix(...)`, `docs: ...`).
- No tocar `.github/workflows` sin coordinarlo.
- `.serena/` está ignorado y no se versiona.
