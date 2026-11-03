/**
 * Abrir contenido del usuario en una pestaña nueva sin ejecutarlo con los permisos de la app: un blob de HTML
 * (o un SVG) abierto como documento tendría el origen de la app. En su lugar se abre `assets/preview-host.html`,
 * que lo muestra en un iframe `sandbox` sin `allow-same-origin` o en un `<img>`.
 */

export type HostPayload = { kind: 'html'; html: string } | { kind: 'image'; url: string };

/** Devuelve false si el navegador bloqueó la ventana. */
export function openInHost(payload: HostPayload): boolean {
  const win = window.open('assets/preview-host.html', '_blank');
  if (!win) return false;
  const onMessage = (e: MessageEvent): void => {
    const d = e.data as { source?: string } | null;
    if (e.source !== win || e.origin !== window.location.origin || d?.source !== 'pugide-host-ready') return;
    window.removeEventListener('message', onMessage);
    win.postMessage(payload, window.location.origin);
  };
  window.addEventListener('message', onMessage);
  setTimeout(() => window.removeEventListener('message', onMessage), 15000);
  return true;
}
