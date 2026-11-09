// Notas de una versión: el texto de su sección del CHANGELOG, listo para `gh release create --notes-file`.
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [version, out] = process.argv.slice(2);
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
    console.error('Uso: node scripts/release-notes.mjs X.Y.Z [archivo]');
    process.exit(1);
  }
  const notes = releaseNotes(version);
  if (!notes) {
    console.error(`No hay sección «## [${version}]» en CHANGELOG.md.`);
    process.exit(1);
  }
  if (out) writeFileSync(out, notes);
  else process.stdout.write(notes);
}
