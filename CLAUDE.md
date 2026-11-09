# CLAUDE.md

Guía para agentes y colaboradores que trabajan en PugIDE. Detalle técnico en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Publicar versiones y desplegar: [docs/RELEASE.md](docs/RELEASE.md) (producción = rama `release`).

## Qué es PugIDE

IDE de Pug/Jade 100% en el navegador (Angular 22, componentes standalone, signals).

## Filosofía (no negociable)

- **Todo local en el navegador.** No hay backend; nada del código del usuario sale de su máquina. No añadas llamadas de red con datos del usuario. La única telemetría es la analítica anónima de visitas de Vercel, **opt-in** (se carga solo si el usuario acepta el aviso de privacidad; `AnalyticsService`): no añadas otra.
- **Mocks automáticos.** Se detectan las variables y las claves de traducción `t('KEY')` del template y se generan datos de ejemplo (bajo `translations`); el usuario los edita después.
- **Preview en vivo.** Compilación con debounce al escribir; el preview (dispositivos y modo PDF/página impresa) siempre debe reflejar el estado actual.
- **Plantillas reales multi-archivo.** Proyectos con carpetas, `include`, `extends`, estilos CSS/SCSS/Sass/Less y assets locales (imágenes y fuentes en IndexedDB, servidos como `blob:`), no ejemplos de un solo archivo.
- **Licencia MIT con atribución:** se conserva el aviso de copyright y la atribución al autor original.

## Diseño primero

Todo cambio en lo que ve el usuario (pantallas, flujos, textos de pantalla) se diseña **antes de programarlo** en el lienzo de diseño de claude.ai (artifact *Design (canvas)*), y la persona responsable lo aprueba allí. Detalle y enlace en [design/README.md](design/README.md).

- El lienzo es único: «PugIDE · Diseño de la interfaz». Si no existe, créalo una vez con ese título, guarda su enlace en `design/README.md` y úsalo siempre; no crees otro.
- Una mesa (*artboard*) por pantalla con identificador y nombre (`V-01 IDE…`, `V-02 …`). PugIDE es de escritorio: páginas fluidas de 1280–1440 px, sin móvil. Mesas interactivas y enlazadas entre sí.
- Los tokens salen de `src/styles.scss` y `docs/brand/DESIGN_TOKENS.md` (mesa «Tokens de diseño»); no inventes colores ni tipografías.
- Cada versión va en una fila nueva del lienzo con solo las mesas que cambian.
- Datos ficticios realistas (nada de lorem ipsum); accesible como se dibuja: contraste AA, `<button>` y `<a href>` reales.
- Al terminar el diseño, pasa el enlace y una lista corta de decisiones por tomar con tu recomendación. **No programes la interfaz hasta que esté aprobada.** Lo que no se ve (motor, pruebas, rendimiento, docs) avanza sin esperar.
- Tras la aprobación, copia `canvas.json` y los `*.dc.html` a `design/canvas/` en la misma PR que registra el cambio, actualiza la tabla de mesas de `design/README.md` y el CHANGELOG. La PR de código enlaza la mesa que implementa. Si al programar hay que apartarse del diseño, primero se corrige el lienzo.

## Publicar una versión (regla fija)

Siempre que se prepare una versión (`chore(release): X.Y.Z`), quien la prepara:

1. Genera la guía de despliegue con `npm run release:guide -- X.Y.Z` (crea `docs/releases/vX.Y.Z.md`: comandos exactos para PowerShell y Bash, comprobaciones, vuelta atrás y lo que lleva la versión) y la incluye en el mismo PR. `npm run release:check` falla si falta.
2. **Pasa a la persona responsable los comandos en el chat** (un bloque `bash` por comando, y los de PowerShell si usa Windows) y le dice dónde está la guía.
3. No empuja tags ni avanza `release` desde su sesión: lo hace una persona o el agente de despliegue, con confirmación expresa para producción.

Las notas de la release de GitHub salen del CHANGELOG con `node scripts/release-notes.mjs X.Y.Z archivo.md` (sin `awk`). Detalle en [docs/RELEASE.md](docs/RELEASE.md).

## Flujo principal

parser -> datos -> orquestador -> compilador -> preview. Ver `src/app/core/services/orchestrator.service.ts` (`processCode`).

## Comandos

- `npm start` servidor de desarrollo
- `npm run build:prod` build de producción
- `npm run test:e2e` pruebas e2e de servicios (`e2e/`)
- `npm run test:ui` pruebas de interfaz con Playwright sobre el build de producción (`ui-tests/`; ejecuta antes `npm run build:prod`)

## Convenciones

- Todo el texto de UI, commits, issues y docs en español; el código (identificadores) en inglés. Excepción: `README.en.md` es la versión en inglés del README y se actualiza junto con `README.md` (incluido el badge de versión).
- Componentes standalone con `ChangeDetectionStrategy.OnPush`; estado con signals en `core/state`.
- Lógica de negocio en servicios (`core/services`, `parser`, `compiler`), no en componentes.
- Utilidades puras en `core/utils`; modelos en `core/models`.
- Iconos: Material Symbols autoalojados (subconjunto en `src/fonts/`, sin CDN: también funcionan sin conexión); al añadir uno nuevo ejecuta `npm run fonts:icons` y usa su nombre **canónico** (no un alias antiguo como `screen_rotation` o `smartphone`: el lint lo rechaza).
- Persistencia solo vía `PersistenceService` (localStorage) y `AssetStorageService` (IndexedDB), siempre con try/catch.
- La licencia está en `LICENSE`: no modificarla.
- Commits pequeños y descriptivos (estilo `feat(...)`, `fix(...)`, `docs: ...`).
- No tocar `.github/workflows` sin coordinarlo.
- `.serena/` está ignorado y no se versiona.
