# Publicar una versión y desplegar

Cómo se publica PugIDE y cómo llega a producción. Si algo de aquí deja de ser cierto, se corrige en este archivo en el mismo PR que cambia el proceso.

## Resumen

| Qué | Dónde |
|---|---|
| Desarrollo | rama de trabajo → PR a `master` (el CI tiene que estar en verde) |
| Versión publicada | tag `vX.Y.Z` sobre `master` (anotado) y release en GitHub |
| Producción (Vercel) | rama **`release`**: lo que haya en ella es lo que ve el público |
| Previews | cada PR y cada rama que no sea `release` genera un despliegue de preview en Vercel |

`release` solo se mueve **hacia delante** (fast-forward) y siempre a un commit que ya está en `master` y con el CI en verde. Nunca se trabaja directamente en ella.

## Vercel

El proyecto `pug-ide` usa `vercel.json` (`npm run build:prod`, salida `dist/pug-ide/browser`, cabeceras de seguridad y CSP). Para que `release` sea producción:

1. Vercel → proyecto `pug-ide` → **Settings** → **Environments** → **Production** → **Branch Tracking**.
2. Rama de producción: `release`.

Con eso, un push a `release` despliega como producción y `master` pasa a generar solo previews. Si alguna vez se duda de qué está en producción, en **Deployments** se ve el commit exacto de cada despliegue; debe coincidir con `release`.

## Pasos para publicar una versión

Los comandos están en PowerShell (también valen en Bash); el `&&` se ha evitado a propósito porque Windows PowerShell 5.1 no lo admite.

1. **Versión y notas** (dentro de un PR normal a `master`):
   - `npm run version:patch` (o `version:minor` / `version:major`), que cambia `package.json` y `package-lock.json` sin crear tag ni commit.
   - En `CHANGELOG.md`, lo de «Sin publicar» pasa a una sección `## [X.Y.Z] - AAAA-MM-DD` (formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)).
   - Actualiza el badge de versión del `README.md` y el título de `docs/PLAN.md`.
   - Genera la guía de despliegue de la versión: `npm run release:guide -- X.Y.Z` (escribe `docs/releases/vX.Y.Z.md` con los comandos exactos, las comprobaciones y la vuelta atrás; va en el mismo PR). Quien prepara la versión **pasa además los comandos a la persona responsable en el chat**.
   - Comprueba que todo cuadra: `npm run release:check` (versión en `package.json`, `package-lock.json`, README, `docs/PLAN.md` y CHANGELOG, la guía `docs/releases/vX.Y.Z.md`, y que «Sin publicar» está vacío).
   - Antes de abrir el PR: `npm run lint`, `npm run test:unit`, `npm run build:prod`, `npm run test:e2e` y `npm run test:ui` (también con `PUGIDE_BROWSER=firefox` y `webkit`).
2. **Merge a `master`** cuando el CI esté en verde: `build-test`, `ui-firefox` y `ui-webkit`.
3. **Publicar con un solo comando** (lo lanza una persona o el agente de despliegue; los agentes que preparan la versión no tienen permiso de push de tags ni de `release`). Desde la carpeta del proyecto, el mismo en PowerShell y Bash:

   ```bash
   npm run release:deploy
   ```

   Sin pasarle versión ni commit, el script (`scripts/release.mjs`): se pone en `master` y lo actualiza; lee la versión que declara; encuentra su commit (el merge del PR de la versión, aunque `master` ya haya avanzado); comprueba `package.json` y el CHANGELOG; crea y sube el tag anotado `vX.Y.Z` (si ya existe, comprueba que apunta a ese commit); crea la release de GitHub con las notas del CHANGELOG (`gh`); y deja la rama `release` en ese commit **solo si es fast-forward** (si no, no fuerza nada y se detiene). Se puede repetir: lo ya hecho se salta. `npm run release:deploy -- --dry-run` cuenta qué haría sin cambiar nada; `--no-prod` hace el tag y la release sin tocar `release`. Los pasos a mano equivalentes están al final de `docs/releases/vX.Y.Z.md`.
4. **Producción (Vercel)**: lo único a mano. Con `release` ya bien puesta por el script, en Vercel → Deployments se promueve o se redespliega el despliegue de la rama `release` (si la rama de producción configurada es `release`, el push ya lo lanza).
5. **Comprobación a mano** en la URL de producción, con una ventana de incógnito (el service worker de la PWA cachea la versión anterior):
   - Carga el editor y el preview, y el Workspace muestra `vX.Y.Z`.
   - `Ctrl+V` pega en el editor.
   - La consola del navegador no muestra violaciones de CSP.
   - Una plantilla con imágenes remotas se ve.

## Volver atrás

- **Rápido, sin tocar el repositorio:** en Vercel → **Deployments**, el despliegue de producción anterior → **Promote to Production** (o **Instant Rollback**). Sirve mientras se arregla el problema.
- **Definitivo:** corregir en `master` con un PR (`fix: ...`), publicar una versión de parche (`X.Y.Z+1`) y avanzar `release`. No se reescribe el historial ni se reutilizan tags: un tag ya publicado no se mueve.

## Cómo se ha hecho hasta ahora

- `v0.4.0` está en `a6093bc` y `v0.4.1` en `3d79f47` (el merge del PR que arregló `Ctrl+V` y explicó los errores de Pug).
- `release` se creó el 2026-11-03 a partir de `master` y avanza solo con el comando del paso 5.
- Los agentes de IA que trabajan en el repositorio solo pueden empujar a su rama de trabajo; el tag, la release de GitHub y los ajustes de Vercel los hace una persona.

## Ajustes del repositorio pendientes (solo una persona con permisos)

- Hacer `ui-firefox` y `ui-webkit` comprobaciones requeridas en la protección de `master`.
- Proteger `release` (sin force-push ni borrado).
