let cached: Promise<string> | null = null;

/**
 * Texto de `assets/preview-runtime.js` (paginación, medidas e impresión dentro del iframe del preview). Se
 * pide una vez, pasa por la caché del service worker y se inyecta en cada documento del preview. Si no se
 * puede cargar devuelve '' y el preview sigue funcionando sin el modo PDF paginado.
 */
export function loadPreviewRuntime(): Promise<string> {
  cached ??= fetch('assets/preview-runtime.js')
    .then((r) => (r.ok ? r.text() : ''))
    .catch(() => '')
    .then((text) => {
      if (!text) cached = null; // reintentar en la próxima compilación
      return text;
    });
  return cached;
}
