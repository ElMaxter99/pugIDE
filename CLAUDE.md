# CLAUDE.md

Guía para agentes y colaboradores que trabajan en PugIDE. Detalle técnico en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Publicar versiones y desplegar: [docs/RELEASE.md](docs/RELEASE.md) (producción = rama `release`).

## Qué es PugIDE

IDE de Pug/Jade 100% en el navegador (Angular 22, componentes standalone, signals).

## Filosofía (no negociable)

- **Todo local en el navegador.** No hay backend; nada del código del usuario sale de su máquina. No añadas llamadas de red con datos del usuario. La única telemetría es la analítica anónima de visitas de Vercel, **opt-in** (se carga solo si el usuario acepta el aviso de privacidad; `AnalyticsService`): no añadas otra.
  - **Única excepción: el asistente de IA** (`AiService`, diseño P-30 a P-34). Solo existe en la app de escritorio y al ejecutar PugIDE en tu equipo con `npm start` (+ `npm run ia`); **nunca en la web publicada** (ni en Vercel ni en ningún build de producción servido en un navegador). Lanza la CLI que la persona ya tiene instalada (`claude` o `copilot`) con su propia sesión, **sin herramientas** (no lee ni escribe archivos ni ejecuta órdenes), y **no envía nada hasta que se pulsa «Enviar»**, después de ver exactamente qué se manda. Las propuestas nunca se aplican solas. No amplíes esta excepción a otros servicios ni a la web.
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

## Cómo se informa a la persona responsable (regla fija)

El objetivo es que el agente trabaje de forma autónoma y que la persona responsable nunca pierda el hilo. Cada mensaje de estado (y el final de cada tarea) lleva estas cuatro partes, en este orden:

1. **Estado**: qué está hecho, qué está en marcha y qué falta (con enlaces a PR y versiones).
2. **Lo he hecho yo**: lo que el agente ya ha resuelto, sin pedir nada.
3. **Necesito tu aprobación**: lista numerada de decisiones o permisos (diseños, merge de PR, forzar ramas, cambios de alcance) con mi recomendación en cada una. Si no hay, se dice «nada pendiente de aprobar».
4. **Te toca a ti**: lo que solo puede hacer la persona (mergear, ejecutar `npm run release:deploy`, desplegar en Vercel…), con el comando exacto o los pasos. Si no hay, se dice «nada».

El estado vivo está en [docs/ESTADO.md](docs/ESTADO.md): se actualiza en cada PR y es lo primero que se lee al retomar el trabajo.

## Publicar una versión (regla fija)

Siempre que se prepare una versión (`chore(release): X.Y.Z`), quien la prepara:

1. Genera la guía de despliegue con `npm run release:guide -- X.Y.Z` (crea `docs/releases/vX.Y.Z.md`: el comando único, las comprobaciones, la vuelta atrás, los pasos a mano y lo que lleva la versión) y la incluye en el mismo PR. `npm run release:check` falla si falta.
2. **Pasa a la persona responsable el comando en el chat**: tras mergear el PR, desde la carpeta del proyecto, `npm run release:deploy` (el mismo en PowerShell y Bash). Hace todo solo: se pone en `master`, lee la versión, encuentra su commit (nadie escribe un SHA), crea el tag, la release de GitHub y deja la rama `release` bien puesta; lo único a mano es desplegar en Vercel. Le dice también dónde está la guía.
3. No empuja tags ni avanza `release` desde su sesión (no tiene permiso): lo hace `npm run release:deploy` lanzado por una persona o por el agente de despliegue.

Detalle en [docs/RELEASE.md](docs/RELEASE.md).

## Flujo principal

parser -> datos -> orquestador -> compilador -> preview. Ver `src/app/core/services/orchestrator.service.ts` (`processCode`).

## Comandos

- `npm start` servidor de desarrollo
- `npm run build:prod` build de producción
- `npm run test:e2e` pruebas e2e de servicios (`e2e/`)
- `npm run test:ui` pruebas de interfaz con Playwright sobre el build de producción (`ui-tests/`; ejecuta antes `npm run build:prod`)
- `npm run start:desktop` app de escritorio con el código actual; `npm run test:desktop` su prueba automática (tras `npm run build:prod`; ambas instalan solas las dependencias de `desktop/` si faltan o cambian)
- `npm run ia` puente local del asistente de IA (solo con `npm start`)
- Probar una rama a mano en Windows o Ubuntu (web, IA, escritorio, instaladores, aviso de versión): [docs/PROBAR-EN-LOCAL.md](docs/PROBAR-EN-LOCAL.md)

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
