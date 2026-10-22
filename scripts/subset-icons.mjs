// Iconos de Material Symbols que usa la app y su subconjunto de fuente (src/fonts/).
//
//   npm run fonts:icons           regenera la lista y la fuente (necesita python3 + `pip install fonttools brotli`)
//   node scripts/subset-icons.mjs --check   solo comprueba que la lista cubre todos los iconos del código
//
// Se considera icono toda cadena entre comillas o texto de un elemento (`>nombre<`) que sea un nombre
// válido de Material Symbols: puede incluir algún falso positivo (p. ej. 'error'), que solo añade un glifo.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIST = resolve(root, 'src/fonts/material-symbols-icons.json');
const FONT_OUT = resolve(root, 'src/fonts/material-symbols-outlined-subset.woff2');
const FONT_SRC = resolve(root, 'node_modules/material-symbols/material-symbols-outlined.woff2');
const NAMES = resolve(root, 'node_modules/material-symbols/index.d.ts');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|html|scss)$/.test(name) && !name.endsWith('.d.ts')) yield p;
  }
}

export function validIconNames() {
  const text = readFileSync(NAMES, 'utf8');
  return new Set([...text.matchAll(/^\s*"([a-z][a-z0-9_]*)",?\s*$/gm)].map((m) => m[1]));
}

export function usedIcons(valid = validIconNames()) {
  const files = [...walk(resolve(root, 'src/app')), resolve(root, 'src/index.html')];
  const found = new Set();
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/(['"`])([a-z][a-z0-9_]*)\1|>\s*([a-z][a-z0-9_]*)\s*</g)) {
      const name = m[2] ?? m[3];
      if (valid.has(name)) found.add(name);
    }
  }
  return [...found].sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  if (!existsSync(NAMES)) {
    console.error('Falta node_modules/material-symbols (npm ci).');
    process.exit(1);
  }
  const used = usedIcons();
  if (check) {
    const stored = new Set(existsSync(LIST) ? JSON.parse(readFileSync(LIST, 'utf8')) : []);
    const missing = used.filter((n) => !stored.has(n));
    if (missing.length) {
      console.error(`Iconos sin incluir en la fuente: ${missing.join(', ')}. Ejecuta "npm run fonts:icons".`);
      process.exit(1);
    }
    console.log(`Iconos: ${used.length} usados, todos en el subconjunto (${stored.size}).`);
  } else {
    writeFileSync(LIST, JSON.stringify(used, null, 2) + '\n');
    const r = spawnSync('python3', [resolve(root, 'scripts/subset-font.py'), FONT_SRC, LIST, FONT_OUT], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}
