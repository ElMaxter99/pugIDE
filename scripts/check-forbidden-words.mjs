#!/usr/bin/env node
/**
 * Palabras prohibidas: falla si alguna aparece en los archivos del repositorio (código, ejemplos, pruebas, docs,
 * CHANGELOG…). Sirve para que no se cuele, por ejemplo, el nombre de un cliente real en los datos de ejemplo.
 *
 * La lista (`scripts/forbidden-words.json`) guarda solo el SHA-256 de cada palabra, nunca la palabra: así el propio
 * repositorio no la contiene. Se busca sin distinguir mayúsculas ni tildes, también dentro de otras palabras
 * (`ClienteAcmeSeguros` contiene `acme`).
 *
 *   npm run lint                                    la ejecuta antes de ng lint (y por tanto el CI)
 *   node scripts/check-forbidden-words.mjs          solo esta comprobación
 *   node scripts/check-forbidden-words.mjs --hash palabra   imprime la entrada para añadirla a la lista
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIST = 'scripts/forbidden-words.json';

/** Minúsculas y sin tildes: «Ñandú» → «nandu». */
export const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const sha256 = (word) => createHash('sha256').update(normalize(word)).digest('hex');

/** Las palabras prohibidas que aparecen en `text`: [{ hash, line }]. `entries`: [{ sha256, length }]. */
export function findForbidden(text, entries) {
  if (!entries.length) return [];
  const byLength = new Map();
  for (const e of entries) {
    if (!byLength.has(e.length)) byLength.set(e.length, new Set());
    byLength.get(e.length).add(e.sha256);
  }
  const found = [];
  const lines = normalize(text).split('\n');
  lines.forEach((line, i) => {
    for (const token of line.match(/[a-z0-9]+/g) ?? []) {
      for (const [len, hashes] of byLength) {
        for (let start = 0; start + len <= token.length; start++) {
          const h = createHash('sha256').update(token.slice(start, start + len)).digest('hex');
          if (hashes.has(h)) found.push({ hash: h, line: i + 1 });
        }
      }
    }
  });
  return found;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--hash') {
    const word = normalize(args.slice(1).join(' ').trim());
    if (!/^[a-z0-9]+$/.test(word)) { console.error('Una sola palabra, con letras o números (sin espacios ni signos).'); process.exit(1); }
    console.log(JSON.stringify({ sha256: sha256(word), length: word.length, note: 'describe por qué está prohibida, sin escribirla' }, null, 2));
    return;
  }
  const entries = JSON.parse(readFileSync(join(root, LIST), 'utf8')).words;
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0').filter((f) => f && f !== LIST);
  const hits = [];
  for (const file of files) {
    let buf;
    try {
      if (statSync(join(root, file)).size > 8 * 1024 * 1024) continue;
      buf = readFileSync(join(root, file));
    } catch { continue; } // borrado en el árbol de trabajo
    if (buf.subarray(0, 8000).includes(0)) continue; // binario
    for (const { hash, line } of findForbidden(buf.toString('utf8'), entries)) {
      const note = entries.find((e) => e.sha256 === hash)?.note ?? '';
      hits.push(`  ${file}:${line}  (${note || hash.slice(0, 12)})`);
    }
  }
  if (hits.length) {
    console.error(`Palabras prohibidas en el repositorio (${LIST}):\n${hits.join('\n')}\nCámbialas por datos inventados.`);
    process.exit(1);
  }
  console.log(`Sin palabras prohibidas (${files.length} archivos revisados).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
