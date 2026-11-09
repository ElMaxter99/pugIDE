'use strict';
// Cabeceras de seguridad de la app de escritorio: salen de `vercel.json` (la misma fuente que usa el hosting y las
// pruebas de interfaz), de modo que la app dentro del instalador tiene exactamente la misma CSP y los mismos `sandbox`
// que la de la web. Los `source` de Vercel que usa este proyecto son expresiones regulares sobre la ruta completa.
const { readFileSync } = require('node:fs');

function loadRules(vercelJsonPath) {
  const config = JSON.parse(readFileSync(vercelJsonPath, 'utf8'));
  return (config.headers ?? []).map((r) => ({ re: new RegExp(`^${r.source}$`), headers: r.headers }));
}

/** Cabeceras que Vercel enviaría para `pathname` (si varias reglas coinciden, la última gana por clave). */
function headersFor(rules, pathname) {
  const out = {};
  for (const r of rules) if (r.re.test(pathname)) for (const h of r.headers) out[h.key.toLowerCase()] = h.value;
  return out;
}

module.exports = { loadRules, headersFor };
