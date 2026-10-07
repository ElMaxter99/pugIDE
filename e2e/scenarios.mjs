// Punto de entrada e2e: ejecuta los modulos de e2e/scenarios/ en orden.
import { readdirSync } from 'node:fs';
import { stats } from './lib.mjs';
const dir = new URL('./scenarios/', import.meta.url);
for (const f of readdirSync(dir).filter((n) => n.endsWith('.mjs')).sort()) await import(new URL(f, dir));
console.log(stats.fails ? `\n${stats.fails} FAILED` : '\nall passed');
process.exit(stats.fails ? 1 : 0);
