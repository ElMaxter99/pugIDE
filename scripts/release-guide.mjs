// Genera la guía de publicación de una versión: docs/releases/vX.Y.Z.md, con los comandos exactos (PowerShell y Bash),
// lo que lleva la versión y cómo comprobar que salió bien. Quien despliega (una persona u otro agente) solo sigue esa guía.
// Uso: `npm run release:guide -- X.Y.Z`. Se ejecuta al preparar la versión, antes de abrir el PR.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { releaseNotes } from './release-notes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2] ?? '';
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Uso: npm run release:guide -- X.Y.Z');
  process.exit(1);
}
const notes = releaseNotes(version);
if (!notes) {
  console.error(`No hay sección «## [${version}]» en CHANGELOG.md: fecha primero el CHANGELOG.`);
  process.exit(1);
}
const when = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\] - (\\d{4}-\\d{2}-\\d{2})`, 'm').exec(readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'))?.[1] ?? '';
const tag = `v${version}`;

const guide = `# Publicar ${tag}${when ? ` (${when})` : ''}

Guía para quien despliega (una persona o un agente). Más contexto del proceso: [docs/RELEASE.md](../RELEASE.md).

## El comando

Con el PR de la versión **mergeado en \`master\`** y su CI en verde, desde la carpeta del proyecto:

\`\`\`bash
npm run release:deploy
\`\`\`

Es el mismo en PowerShell, Bash y CI. No hay que pasarle versión ni commit: se pone en \`master\`, lo actualiza (si no tienes cambios sin guardar), lee la versión que declara (\`${version}\`), encuentra su commit (el merge del PR de la versión) y:

1. Comprueba que ese commit lleva la versión en \`package.json\` y su sección fechada del CHANGELOG.
2. Crea y sube el tag anotado \`${tag}\` (si ya existe, comprueba que apunta a ese commit; un tag publicado no se mueve).
3. Crea la release de GitHub con las notas del CHANGELOG (si ya existe, la deja).
4. Deja la rama \`release\` (la de producción en Vercel) en ese commit, solo si es fast-forward. Si no lo es, **no fuerza nada** y se detiene con un aviso.

Se puede repetir sin miedo: lo que ya está hecho se salta. Antes de lanzarlo de verdad se puede ver qué haría:

\`\`\`bash
npm run release:deploy -- --dry-run
\`\`\`

Otras opciones: \`--no-prod\` (tag y release de GitHub sin tocar \`release\`), \`${version}\` como argumento (una versión concreta, por si \`master\` ya declara otra) y \`--sha COMMIT\` / \`--remote NOMBRE\` (casos raros).

Necesita \`git\` con permiso de push de tags y de la rama \`release\`, y \`gh\` (GitHub CLI) con sesión iniciada. Los agentes de IA que preparan la versión **no** pueden empujar tags ni \`release\`: lo lanza una persona o el agente de despliegue con esos permisos.

## Lo único que queda a mano: Vercel

Cuando el script termina, la rama \`release\` ya está bien puesta. Falta desplegarla en Vercel:

- Vercel → proyecto \`pug-ide\` → **Deployments** → el despliegue de la rama \`release\` (su commit es el de la versión) → **Promote to Production** (o **Redeploy**). Si la rama de producción configurada es \`release\`, el push ya lo habrá lanzado: comprueba que su despliegue está en verde.

## Comprobación a mano en producción

Con una ventana de incógnito (el service worker de la PWA cachea la versión anterior):

- Carga el editor y la vista previa, y el Workspace muestra \`v${version}\`.
- \`Ctrl+V\` pega en el editor.
- La consola del navegador no muestra violaciones de CSP.
- Una plantilla con imágenes remotas se ve.

## Si algo falla

- **«No es fast-forward»:** \`release\` tiene algo que \`master\` no tiene. No fuerces nada: investígalo y avisa.
- **El tag ya existe y apunta a otro commit:** un tag publicado no se mueve. Investígalo.
- **\`gh\` falla:** inicia sesión con \`gh auth login\` y repite el comando (el tag no se vuelve a crear).
- **Volver atrás, rápido:** en Vercel → Deployments, el despliegue de producción anterior → **Promote to Production** (o **Instant Rollback**).
- **Volver atrás, definitivo:** corregir en \`master\` con un PR, publicar un parche y repetir. No se reescribe el historial ni se reutilizan tags.

## Los mismos pasos a mano (por si el script no se puede usar)

\`\`\`bash
git fetch origin master release --tags
\`\`\`

\`\`\`bash
git tag -a ${tag} <SHA del merge del PR de la versión> -m "PugIDE ${version}"
\`\`\`

\`\`\`bash
git push origin ${tag}
\`\`\`

\`\`\`bash
node scripts/release-notes.mjs ${version} release-notes.md
\`\`\`

\`\`\`bash
gh release create ${tag} --title "PugIDE ${version}" --notes-file release-notes.md --verify-tag
\`\`\`

\`\`\`bash
git push origin <SHA del merge>:refs/heads/release
\`\`\`

Antes del último, comprueba el fast-forward: \`git merge-base --is-ancestor origin/release <SHA>\`.

## Qué lleva ${tag}

${notes}`;
mkdirSync(path.join(root, 'docs/releases'), { recursive: true });
writeFileSync(path.join(root, `docs/releases/${tag}.md`), guide);
console.log(`docs/releases/${tag}.md escrito.`);
