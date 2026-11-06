// Comprueba que la versión es coherente en todos los sitios antes de etiquetar (ver docs/RELEASE.md):
// package.json, package-lock.json, badge del README (español e inglés), título de docs/PLAN.md y sección fechada del CHANGELOG.
// Uso: `npm run release:check`. Sale con código 1 si algo no cuadra.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

const version = JSON.parse(read('package.json')).version;
const lock = JSON.parse(read('package-lock.json'));

const checks = [
  ['package-lock.json (versión)', lock.version === version, `${lock.version} ≠ ${version}`],
  ['package-lock.json (paquete raíz)', lock.packages?.['']?.version === version, `${lock.packages?.['']?.version} ≠ ${version}`],
  ['badge de versión del README', read('README.md').includes(`badge/version-${version}-`), `falta badge/version-${version}-`],
  ['badge de versión del README en inglés', read('README.en.md').includes(`badge/version-${version}-`), `falta badge/version-${version}- en README.en.md`],
  ['título de docs/PLAN.md', read('docs/PLAN.md').split('\n')[0].includes(`(v${version})`), `la primera línea no menciona (v${version})`],
  ['sección fechada del CHANGELOG', new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm').test(read('CHANGELOG.md')), `falta «## [${version}] - AAAA-MM-DD»`],
];

// «Sin publicar» no debe llevar entradas si la versión ya está fechada: se olvidaron al publicar.
const unreleased = /^## \[Sin publicar\]\n([\s\S]*?)(?=^## \[)/m.exec(read('CHANGELOG.md'))?.[1].trim() ?? '';
checks.push(['CHANGELOG sin entradas sueltas en «Sin publicar»', unreleased === '', 'hay entradas en «Sin publicar»: muévelas a la versión o deja para la siguiente']);

let failed = 0;
console.log(`Versión ${version}`);
for (const [name, ok, why] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — ${why}`}`);
  if (!ok) failed++;
}
if (failed) {
  console.error(`\n${failed} comprobación(es) fallan: corrígelas antes de etiquetar.`);
  process.exit(1);
}
