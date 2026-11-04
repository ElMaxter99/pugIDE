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
   - Comprueba que todo cuadra: `npm run release:check` (versión en `package.json`, `package-lock.json`, README, `docs/PLAN.md` y CHANGELOG, y que «Sin publicar» está vacío).
   - Antes de abrir el PR: `npm run lint`, `npm run test:unit`, `npm run build:prod`, `npm run test:e2e` y `npm run test:ui` (también con `PUGIDE_BROWSER=firefox` y `webkit`).
2. **Merge a `master`** cuando el CI esté en verde: `build-test`, `ui-firefox` y `ui-webkit`.
3. **Tag anotado** sobre el commit del merge:

   ```powershell
   git fetch origin master
   ```

   ```powershell
   git tag -a vX.Y.Z origin/master -m "PugIDE X.Y.Z"
   ```

   ```powershell
   git push origin vX.Y.Z
   ```

4. **Release en GitHub**: https://github.com/ElMaxter99/pugIDE/releases/new, eligiendo el tag existente y pegando como notas la sección de ese número del `CHANGELOG.md`.
5. **Producción**: avanzar `release` al mismo commit del tag.

   ```powershell
   git push origin origin/master:refs/heads/release
   ```

   Si el push se rechaza por no ser fast-forward es que `release` tiene algo que `master` no tiene: se investiga antes de forzar nada.
6. **Comprobación a mano** en la URL de producción, con una ventana de incógnito (el service worker de la PWA cachea la versión anterior):
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
