'use strict';
// Aviso de versión nueva (P-27). Sin Electron: comparar versiones y leer la respuesta de GitHub.

/** `1.2.3-rc.1` → partes numéricas y prerelease (semver). null si no es una versión. */
function parseVersion(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(String(v ?? '').trim());
  if (!m) return null;
  return { nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : [] };
}

/**
 * `1.2.3` frente a `1.10.0`: >0 si `a` es más nueva. Sigue semver: `1.0.0-rc.2 < 1.0.0-rc.10 < 1.0.0`.
 * Lo que no es una versión cuenta como 0.0.0.
 */
function compareVersions(a, b) {
  const x = parseVersion(a) ?? { nums: [0, 0, 0], pre: [] };
  const y = parseVersion(b) ?? { nums: [0, 0, 0], pre: [] };
  for (let i = 0; i < 3; i++) if (x.nums[i] !== y.nums[i]) return x.nums[i] - y.nums[i];
  if (!x.pre.length || !y.pre.length) return y.pre.length - x.pre.length; // sin sufijo gana a con sufijo
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i], q = y.pre[i];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    if (p === q) continue;
    const pn = /^\d+$/.test(p), qn = /^\d+$/.test(q);
    if (pn && qn) return Number(p) - Number(q);
    if (pn !== qn) return pn ? -1 : 1;
    return p < q ? -1 : 1;
  }
  return 0;
}

/** ¿Es una versión de pruebas (`0.20.0-rc.1`)? */
function isPrerelease(v) {
  return (parseVersion(v)?.pre.length ?? 0) > 0;
}

/** De la respuesta de `releases/latest` de GitHub saca solo lo que hace falta; null si no vale. */
function parseLatestRelease(json, repoUrl) {
  if (!json || typeof json !== 'object' || typeof json.tag_name !== 'string') return null;
  const version = json.tag_name.replace(/^v/i, '');
  if (!/^\d+\.\d+\.\d+/.test(version) || json.draft || json.prerelease) return null;
  return { version, url: `${repoUrl}/releases/tag/v${version}` };
}

/**
 * De la lista de releases de GitHub elige la más nueva del canal, por versión real (no por fecha):
 * `stable` ignora las de pruebas; `rc` mira todas (si la estable ya superó a la rc, gana la estable).
 */
function parseReleases(list, channel, repoUrl) {
  if (!Array.isArray(list)) return null;
  let best = null;
  for (const r of list) {
    if (!r || typeof r !== 'object' || typeof r.tag_name !== 'string' || r.draft) continue;
    const version = r.tag_name.replace(/^v/i, '');
    if (!parseVersion(version)) continue;
    const pre = isPrerelease(version);
    if (channel !== 'rc' && (pre || r.prerelease)) continue;
    if (!best || compareVersions(version, best.version) > 0) {
      best = { version, tag: r.tag_name, prerelease: pre || !!r.prerelease, url: `${repoUrl}/releases/tag/${r.tag_name}` };
    }
  }
  return best;
}

/** `https://github.com/usuario/repo` → dirección de la API de su última versión. */
function latestReleaseApi(repoUrl) {
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?$/.exec(repoUrl);
  return m ? `https://api.github.com/repos/${m[1]}/${m[2]}/releases/latest` : null;
}

/** Lista de releases (incluye las de pruebas) para el canal «Pruebas». */
function releasesApi(repoUrl) {
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?$/.exec(repoUrl);
  return m ? `https://api.github.com/repos/${m[1]}/${m[2]}/releases?per_page=30` : null;
}

/** Carpeta de descargas de una release, donde electron-updater lee `latest*.yml`. */
function feedUrl(repoUrl, tag) {
  return `${String(repoUrl).replace(/\/+$/, '')}/releases/download/${encodeURIComponent(tag)}/`;
}

/** Solo dos canales; cualquier otra cosa es «stable». */
function normalizeChannel(c) {
  return c === 'rc' ? 'rc' : 'stable';
}

/**
 * ¿Puede esta instalación actualizarse sola (P-35/P-36)? Ver docs/ACTUALIZAR-ESCRITORIO.md.
 * - Desde el código (`npm run start:desktop`): no, no hay instalación.
 * - macOS: no, el sistema solo instala actualizaciones de apps firmadas.
 * - Windows portable: no, no hay instalación que sustituir (electron-builder pone PORTABLE_EXECUTABLE_FILE).
 * - Linux: AppImage (pone APPIMAGE) o .deb/.rpm (electron-builder deja resources/package-type); el resto, no.
 * `linuxPackage` dice si hará falta la contraseña del sistema (.deb y .rpm se instalan con pkexec).
 */
function selfUpdateSupport({ platform, isPackaged, env = {}, packageType = null }) {
  if (!isPackaged) return { ok: false, reason: 'dev' };
  if (platform === 'darwin') return { ok: false, reason: 'mac' };
  if (platform === 'win32') return env.PORTABLE_EXECUTABLE_FILE ? { ok: false, reason: 'portable' } : { ok: true, reason: null };
  if (platform === 'linux') {
    if (env.APPIMAGE) return { ok: true, reason: null, linuxPackage: null };
    if (packageType === 'deb' || packageType === 'rpm') return { ok: true, reason: null, linuxPackage: packageType };
    return { ok: false, reason: 'linux-unknown' };
  }
  return { ok: false, reason: 'other' };
}

/** El error de electron-updater, en una de las causas que enseña la interfaz (P-36, caso 8). */
function classifyUpdateError(message) {
  const m = String(message ?? '');
  if (/dismissed|not authori[sz]ed|pkexec|authentication (failed|cancel)|exit code:? 12[67]/i.test(m)) return 'password';
  if (/cancel/i.test(m)) return 'cancelled';
  if (/sha512|checksum|mismatch/i.test(m)) return 'checksum';
  if (/ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED|net::|socket|network|offline/i.test(m)) return 'offline';
  if (/404|latest.*\.yml|Cannot find/i.test(m)) return 'missing';
  return 'other';
}

module.exports = { compareVersions, isPrerelease, parseLatestRelease, parseReleases, latestReleaseApi, releasesApi, feedUrl, normalizeChannel, selfUpdateSupport, classifyUpdateError };
