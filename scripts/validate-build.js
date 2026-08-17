import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

let failed = false;

function check(label, ok, detail) {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed = true;
  }
}

// 1. Version must not be 0.0.0
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
check(
  `version is "${pkg.version}"`,
  pkg.version !== '0.0.0',
  'bump version before building',
);

// 2. Pug browser bundles exist
const bundles = ['src/assets/pug-browser.js', 'src/assets/parser-browser.js'];
for (const b of bundles) {
  check(
    `${b} exists`,
    existsSync(resolve(root, b)),
    'run scripts/bundle-pug.sh first',
  );
}

// 3. No console.log in app source
const { readdirSync, statSync } = await import('node:fs');

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(ts|js)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const appDir = resolve(root, 'src/app');
const offenders = [];
for (const file of walk(appDir)) {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/console\.log\(/.test(lines[i])) {
      const rel = file.replace(root + '/', '');
      offenders.push(`${rel}:${i + 1}`);
    }
  }
}
check(
  'no console.log in src/app',
  offenders.length === 0,
  offenders.length > 0 ? `found in:\n    ${offenders.join('\n    ')}` : '',
);

if (failed) {
  console.error('\nBuild validation failed.');
  process.exit(1);
}
console.log('\nAll checks passed.');
