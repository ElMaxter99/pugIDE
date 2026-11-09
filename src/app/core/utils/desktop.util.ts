/**
 * PugIDE de escritorio (Electron): el contenedor expone `window.pugideDesktop` desde su preload (ver `desktop/`).
 * En la web no existe. Utilidades puras: nada de Angular.
 */
interface DesktopInfo {
  platform: string;
  version: string;
  /** Dirección de la versión web, para que los enlaces de compartir funcionen fuera de la app de escritorio. */
  webUrl: string;
}

function info(): DesktopInfo | null {
  try {
    const d = (globalThis as { pugideDesktop?: DesktopInfo }).pugideDesktop;
    return d && typeof d === 'object' ? d : null;
  } catch {
    return null;
  }
}

/** ¿Se está ejecutando dentro de la aplicación de escritorio? */
export function isDesktopApp(): boolean {
  return info() !== null;
}

/** Versión de la aplicación de escritorio (null en la web). */
export function desktopVersion(): string | null {
  return info()?.version ?? null;
}

/**
 * Base para los enlaces de compartir: en la web, su propio origen; en escritorio, la dirección de la web (el origen
 * interno `pugide://app` no se abre en ningún otro sitio). Sin dirección configurada, se usa el origen interno.
 */
export function shareBaseUrl(origin: string): string {
  const web = info()?.webUrl;
  return web && /^https:\/\//.test(web) ? web.replace(/\/+$/, '') : origin;
}
