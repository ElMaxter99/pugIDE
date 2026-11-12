// Instala las dependencias de la app de escritorio (desktop/) si faltan o si cambió su package-lock.json, para que
// `npm run start:desktop` y `npm run test:desktop` funcionen a la primera, sin acordarse de `npm run desktop:install`.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'desktop');
const lock = join(desktop, 'package-lock.json');
const stamp = join(desktop, 'node_modules', '.pugide-lock-hash');
const want = createHash('sha256').update(readFileSync(lock, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
const have = existsSync(stamp) ? readFileSync(stamp, 'utf8').trim() : null;
const electronThere = existsSync(join(desktop, 'node_modules', 'electron', 'package.json'));

const force = process.argv.includes('--force');
if (!force && electronThere && have === want) process.exit(0);
console.log(force ? 'Instalando las dependencias de escritorio (npm ci en desktop/)…' : electronThere ? 'Las dependencias de escritorio cambiaron: reinstalando (npm ci en desktop/)…' : 'Primera vez: instalando las dependencias de escritorio (npm ci en desktop/; tarda un par de minutos)…');
const r = spawnSync('npm', ['ci'], { cwd: desktop, stdio: 'inherit', shell: process.platform === 'win32' });
if (r.status !== 0) {
  console.error('No se pudieron instalar las dependencias de escritorio. Prueba a mano: npm run desktop:install');
  process.exit(r.status ?? 1);
}
writeFileSync(stamp, want);
