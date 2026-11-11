'use strict';
// Aviso de versión nueva (P-27). Sin Electron: comparar versiones y leer la respuesta de GitHub.

/** `1.2.3` frente a `1.10.0`: >0 si `a` es más nueva. Los sufijos (`-beta`) se ignoran. */
function compareVersions(a, b) {
  const parse = (v) => String(v ?? '').replace(/^v/i, '').split('-')[0].split('.').map((n) => Number.parseInt(n, 10) || 0);
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/** De la respuesta de `releases/latest` de GitHub saca solo lo que hace falta; null si no vale. */
function parseLatestRelease(json, repoUrl) {
  if (!json || typeof json !== 'object' || typeof json.tag_name !== 'string') return null;
  const version = json.tag_name.replace(/^v/i, '');
  if (!/^\d+\.\d+\.\d+/.test(version) || json.draft || json.prerelease) return null;
  return { version, url: `${repoUrl}/releases/tag/v${version}` };
}

/** `https://github.com/usuario/repo` → dirección de la API de su última versión. */
function latestReleaseApi(repoUrl) {
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?$/.exec(repoUrl);
  return m ? `https://api.github.com/repos/${m[1]}/${m[2]}/releases/latest` : null;
}

module.exports = { compareVersions, parseLatestRelease, latestReleaseApi };
