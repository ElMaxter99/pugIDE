/**
 * Programa que corre DENTRO del iframe aislado del render (origen opaco, sin acceso al almacenamiento de la app).
 * Se empaqueta con `npm run bundle:runtime` en `src/assets/render-sandbox.js` y se ejecuta después del bundle de Pug.
 */
import { renderPug, PugBundle, RenderRequest } from './render-core';

declare const self: Window & { pugBundle?: PugBundle };

window.addEventListener('message', (e: MessageEvent) => {
  if (e.source !== window.parent) return;
  const d = e.data as { source?: string; id?: number; req?: RenderRequest } | null;
  if (!d || d.source !== 'pugide-render-req' || typeof d.id !== 'number' || !d.req) return;
  const bundle = self.pugBundle;
  const res = bundle
    ? renderPug(bundle, d.req)
    : { html: '', errors: [{ message: 'Pug compiler not loaded', source: 'pug' as const, severity: 'error' as const }] };
  window.parent.postMessage({ source: 'pugide-render-res', id: d.id, res }, '*');
});

window.parent.postMessage({ source: 'pugide-render-ready' }, '*');
