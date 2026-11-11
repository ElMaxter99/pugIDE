/**
 * PugIDE de escritorio (Electron): el contenedor expone `window.pugideDesktop` desde su preload (ver `desktop/`).
 * En la web no existe. Utilidades puras: nada de Angular.
 */
interface DesktopInfo {
  platform: string;
  version: string;
  /** Dirección de la versión web, para que los enlaces de compartir funcionen fuera de la app de escritorio. */
  webUrl: string;
  /** Llamadas al sistema (espacios de trabajo y aviso de versión nueva). Solo existe en la app de escritorio. */
  invoke?: (channel: string, payload?: unknown) => Promise<unknown>;
  onEvent?: (callback: (payload: unknown) => void) => () => void;
}

function info(): DesktopInfo | null {
  try {
    const d = (globalThis as { pugideDesktop?: DesktopInfo }).pugideDesktop;
    return d && typeof d === 'object' ? d : null;
  } catch {
    return null;
  }
}

/** ¿La app de escritorio ofrece las funciones del sistema (espacios de trabajo, aviso de versión)? */
export function desktopHasSystem(): boolean {
  return typeof info()?.invoke === 'function';
}

/** Llama al sistema; en la web (o en una app antigua) se rechaza. */
export function desktopInvoke<T>(channel: string, payload?: unknown): Promise<T> {
  const invoke = info()?.invoke;
  return invoke ? (invoke(channel, payload) as Promise<T>) : Promise.reject(new Error('Solo en la app de escritorio'));
}

/** Escucha los avisos del sistema; devuelve cómo dejar de escuchar. */
export function onDesktopEvent(callback: (payload: { type?: string; [k: string]: unknown }) => void): () => void {
  const on = info()?.onEvent;
  return on ? on((p) => { if (p && typeof p === 'object') callback(p as { type?: string }); }) : () => undefined;
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
