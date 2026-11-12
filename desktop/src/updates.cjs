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
  if (/cancel/i.test(m)) return 'cancelled';
  if (/sha512|checksum|mismatch/i.test(m)) return 'checksum';
  if (/ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED|net::|socket|network|offline/i.test(m)) return 'offline';
  if (/404|latest.*\.yml|Cannot find/i.test(m)) return 'missing';
  return 'other';
}

module.exports = { compareVersions, parseLatestRelease, latestReleaseApi, selfUpdateSupport, classifyUpdateError };
