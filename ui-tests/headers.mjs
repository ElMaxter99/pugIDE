// Cabeceras de hosting para las pruebas de interfaz: se leen de `vercel.json` (única fuente de verdad), de modo que
// el servidor local aplica exactamente la CSP y el resto de cabeceras de producción. Solo para tests.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const config = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../vercel.json'), 'utf8'));
// Los `source` de Vercel que usa este proyecto son expresiones regulares sobre la ruta completa.
const rules = (config.headers ?? []).map((r) => ({ re: new RegExp(`^${r.source}$`), headers: r.headers }));

/** Cabeceras que Vercel enviaría para `pathname` (si varias reglas coinciden, la última gana por clave). */
export function headersFor(pathname) {
  const out = {};
  for (const r of rules) if (r.re.test(pathname)) for (const h of r.headers) out[h.key.toLowerCase()] = h.value;
  return out;
}
