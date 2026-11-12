// Notas de una versión: el texto de su sección del CHANGELOG y «Cambios completos», listo para `gh release create --notes-file`.
// Uso: `node scripts/release-notes.mjs 0.8.0 [archivo]` (sin archivo, lo escribe en la salida estándar).
// Es de Node para que funcione igual en PowerShell, Bash y CI (sin `awk` ni `sed`).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function releaseNotes(version, changelog = readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')) {
  const escaped = version.replace(/\./g, '\\.');
  const m = new RegExp(`^## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|(?![\\s\\S]))`, 'm').exec(changelog);
  return m ? m[1].trim() + '\n' : null;
}

const REPO = 'https://github.com/ElMaxter99/pugIDE';

/** La versión anterior a `version` según el CHANGELOG (la siguiente sección fechada), o null si es la primera. */
export function previousVersion(version, changelog) {
  const versions = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1]);
  const i = versions.indexOf(version);
  return i >= 0 && i + 1 < versions.length ? versions[i + 1] : null;
}

/** Notas de la release: la sección del CHANGELOG y, al final, «Cambios completos» (como en las demás apps del proyecto). */
export function releaseBody(version, changelog = readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), repo = REPO) {
  const notes = releaseNotes(version, changelog);
  if (!notes) return null;
  const prev = previousVersion(version, changelog);
  const links = [`[CHANGELOG](${repo}/blob/v${version}/CHANGELOG.md)`];
  if (prev) links.push(`[todos los cambios desde la ${prev}](${repo}/compare/v${prev}...v${version})`);
  return `${notes}\n**Cambios completos:** ${links.join(' · ')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [version, out] = process.argv.slice(2);
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
    console.error('Uso: node scripts/release-notes.mjs X.Y.Z [archivo]');
    process.exit(1);
  }
  const notes = releaseBody(version);
  if (!notes) {
    console.error(`No hay sección «## [${version}]» en CHANGELOG.md.`);
    process.exit(1);
  }
  if (out) writeFileSync(out, notes);
  else process.stdout.write(notes);
}
