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

Guía para quien despliega (una persona o un agente). Sigue los pasos en orden y no te saltes las comprobaciones. Más contexto del proceso: [docs/RELEASE.md](../RELEASE.md).

## Antes de empezar

- El PR de la versión («chore(release): ${version}») está **mergeado en \`master\`** y su CI estaba en verde (\`build-test\`, \`ui-firefox\`, \`ui-webkit\`).
- Se necesita \`git\` con permiso de push de tags y de la rama \`release\`, y \`gh\` (GitHub CLI) con sesión iniciada. Los agentes de IA que trabajan en el repositorio **no** pueden empujar tags ni \`release\`: lo hace una persona o el agente de despliegue con esos permisos.
- No avances \`release\` (producción) sin confirmación expresa de la persona responsable.

## 1. Fijar el commit de la versión

PowerShell:

\`\`\`powershell
git fetch origin master release --tags
\`\`\`

\`\`\`powershell
$SHA = git rev-parse origin/master
\`\`\`

\`\`\`powershell
git log --oneline -3 origin/master
\`\`\`

Bash:

\`\`\`bash
git fetch origin master release --tags
\`\`\`

\`\`\`bash
SHA=$(git rev-parse origin/master)
\`\`\`

\`\`\`bash
git log --oneline -3 origin/master
\`\`\`

Comprueba que el último commit es el merge del PR de ${tag}. Si hay otros commits después, usa el SHA del merge de la versión, no el de la punta de \`master\`.

## 2. Comprobar que la versión cuadra

\`\`\`bash
git checkout --detach $SHA
\`\`\`

\`\`\`bash
npm ci
\`\`\`

\`\`\`bash
npm run release:check
\`\`\`

Debe imprimir \`Versión ${version}\` y todo con ✓. (En PowerShell, \`$SHA\` funciona igual en \`git checkout --detach $SHA\`.)

## 3. Etiquetar (tag anotado)

PowerShell:

\`\`\`powershell
git tag -a ${tag} $SHA -m "PugIDE ${version}"
\`\`\`

\`\`\`powershell
git push origin ${tag}
\`\`\`

Bash:

\`\`\`bash
git tag -a ${tag} $SHA -m "PugIDE ${version}"
\`\`\`

\`\`\`bash
git push origin ${tag}
\`\`\`

Un tag publicado no se mueve ni se reutiliza. Si el tag ya existe en el remoto, comprueba que apunta al mismo commit (\`git rev-parse ${tag}^{}\`) y sigue.

## 4. Release en GitHub

Las notas salen del CHANGELOG con un script de Node (sirve igual en PowerShell, Bash y CI):

\`\`\`bash
node scripts/release-notes.mjs ${version} release-notes.md
\`\`\`

\`\`\`bash
gh release create ${tag} --title "PugIDE ${version}" --notes-file release-notes.md --verify-tag
\`\`\`

\`\`\`bash
gh release view ${tag}
\`\`\`

(El archivo \`release-notes.md\` es temporal: bórralo después, no se versiona.)

## 5. Producción (Vercel): avanzar \`release\`

Solo con confirmación de la persona responsable. \`release\` solo se mueve **hacia delante** (fast-forward) y a un commit que ya está en \`master\`:

PowerShell:

\`\`\`powershell
git merge-base --is-ancestor origin/release $SHA; if ($LASTEXITCODE -eq 0) { "fast-forward posible" } else { "NO es fast-forward: para y avisa" }
\`\`\`

\`\`\`powershell
git push origin "$($SHA):refs/heads/release"
\`\`\`

Bash:

\`\`\`bash
git merge-base --is-ancestor origin/release $SHA && echo "fast-forward posible" || echo "NO es fast-forward: para y avisa"
\`\`\`

\`\`\`bash
git push origin $SHA:refs/heads/release
\`\`\`

Si el push se rechaza por no ser fast-forward, \`release\` tiene algo que \`master\` no tiene: no fuerces nada, investígalo y avisa.

## 6. Comprobación a mano en producción

Con una ventana de incógnito (el service worker de la PWA cachea la versión anterior):

- Carga el editor y la vista previa, y el Workspace muestra \`v${version}\`.
- \`Ctrl+V\` pega en el editor.
- La consola del navegador no muestra violaciones de CSP.
- Una plantilla con imágenes remotas se ve.
- En Vercel → Deployments, el despliegue de producción corresponde al commit \`${'$SHA'}\`.

## Volver atrás

- **Rápido, sin tocar el repositorio:** en Vercel → Deployments, el despliegue de producción anterior → **Promote to Production** (o **Instant Rollback**).
- **Definitivo:** corregir en \`master\` con un PR, publicar un parche y avanzar \`release\`. No se reescribe el historial ni se reutilizan tags.

## Qué lleva ${tag}

${notes}`;
mkdirSync(path.join(root, 'docs/releases'), { recursive: true });
writeFileSync(path.join(root, `docs/releases/${tag}.md`), guide);
console.log(`docs/releases/${tag}.md escrito.`);
