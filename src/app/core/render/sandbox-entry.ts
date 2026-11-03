/**
 * Programa que corre en un Worker DENTRO del iframe aislado del render (origen opaco, sin acceso al
 * almacenamiento de la app). Un Worker tiene su propio hilo: si la plantilla no termina, el iframe se descarta
 * sin bloquear la página (en todos los navegadores). Se empaqueta con `npm run bundle:runtime` en
 * `src/assets/render-sandbox.js` y se ejecuta después del bundle de Pug.
 */
import { renderPug, PugBundle, RenderRequest } from './render-core';

declare const self: {
  pugBundle?: PugBundle;
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
};

self.onmessage = (e: MessageEvent) => {
  const d = e.data as { source?: string; id?: number; req?: RenderRequest } | null;
  if (!d || d.source !== 'pugide-render-req' || typeof d.id !== 'number' || !d.req) return;
  const bundle = self.pugBundle;
  const res = bundle
    ? renderPug(bundle, d.req)
    : { html: '', errors: [{ message: 'Pug compiler not loaded', source: 'pug' as const, severity: 'error' as const }] };
  self.postMessage({ source: 'pugide-render-res', id: d.id, res });
};

self.postMessage({ source: 'pugide-render-ready' });
