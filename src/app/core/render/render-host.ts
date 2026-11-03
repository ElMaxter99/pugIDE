import { PugBundle, RenderRequest, RenderResponse, renderPug } from './render-core';

/** Dónde se ejecuta el render de Pug. */
export interface RenderHost {
  initialize(): Promise<void>;
  render(req: RenderRequest): Promise<RenderResponse>;
}

/** Tiempo máximo de un render: una plantilla con un bucle infinito no puede dejar la app esperando. */
export const RENDER_TIMEOUT_MS = 15000;

function pugBundle(): PugBundle | undefined {
  return (self as unknown as { pugBundle?: PugBundle }).pugBundle;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Ejecuta el render en el mismo contexto que la app. SOLO para las pruebas de Node (el bundle de Pug ya está
 * cargado) y como último recurso: en el navegador se usa `SandboxRenderHost`.
 */
export class InlineRenderHost implements RenderHost {
  private ready: Promise<void> | null = null;

  initialize(): Promise<void> {
    if (pugBundle()) return Promise.resolve();
    this.ready ??= loadScript('assets/pug-browser.js').then(() => {
      if (!pugBundle()) throw new Error('Pug bundle loaded but not functional');
    });
    return this.ready;
  }

  async render(req: RenderRequest): Promise<RenderResponse> {
    await this.initialize();
    return renderPug(pugBundle()!, req);
  }
}

/**
 * Ejecuta el render en un iframe oculto con `sandbox="allow-scripts"` y SIN `allow-same-origin`: su origen es
 * opaco, así que el JavaScript de la plantilla (y el de `helpers.js`) no puede leer `localStorage`, IndexedDB,
 * cookies ni el DOM de la app. Solo se comunica por `postMessage`, con datos clonables.
 */
export class SandboxRenderHost implements RenderHost {
  private frame: HTMLIFrameElement | null = null;
  private ready: Promise<void> | null = null;
  private seq = 0;
  private pending = new Map<number, { resolve: (r: RenderResponse) => void; timer: ReturnType<typeof setTimeout> }>();
  private signals = new Map<string, () => void>();
  private listener = (e: MessageEvent): void => this.onMessage(e);

  /** Para acotar el tiempo en las pruebas. */
  timeoutMs = RENDER_TIMEOUT_MS;

  initialize(): Promise<void> {
    this.ready ??= this.boot().catch((err) => {
      this.destroy();
      throw err;
    });
    return this.ready;
  }

  async render(req: RenderRequest): Promise<RenderResponse> {
    await this.initialize();
    const frame = this.frame;
    if (!frame?.contentWindow) throw new Error('El entorno de render no está disponible.');
    const id = ++this.seq;
    return new Promise<RenderResponse>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        // Si la plantilla no termina, se descarta el iframe entero (se crea otro en el siguiente render).
        this.destroy();
        resolve({
          html: '',
          errors: [{
            message: `La plantilla tardó más de ${Math.round(this.timeoutMs / 1000)} s en renderizarse (¿un bucle infinito?). Se ha cancelado.`,
            source: 'pug', severity: 'error',
          }],
        });
      }, this.timeoutMs);
      this.pending.set(id, { resolve, timer });
      frame.contentWindow!.postMessage({ source: 'pugide-render-req', id, req }, '*');
    });
  }

  private async boot(): Promise<void> {
    const [pug, runtime] = await Promise.all([fetchText('assets/pug-browser.js'), fetchText('assets/render-sandbox.js')]);
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('tabindex', '-1');
    frame.title = 'Entorno aislado de render';
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-10px;top:-10px;visibility:hidden;';
    const booted = this.waitFor('pugide-render-boot');
    window.addEventListener('message', this.listener);
    frame.srcdoc = BOOTSTRAP_HTML;
    document.body.appendChild(frame);
    this.frame = frame;
    await booted;
    // El código se entrega por mensaje y se evalúa dentro del iframe (sin escapar `</script>` en 2 MB de JS).
    const ready = this.waitFor('pugide-render-ready');
    frame.contentWindow!.postMessage({ pugideInit: pug + '\n;\n' + runtime }, '*');
    await ready;
  }

  private waitFor(signal: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('El entorno aislado de render no arrancó.')), 20000);
      this.signals.set(signal, () => { clearTimeout(timer); resolve(); });
    });
  }

  private onMessage(e: MessageEvent): void {
    if (!this.frame || e.source !== this.frame.contentWindow) return;
    const d = e.data as { source?: string; id?: number; res?: RenderResponse } | null;
    if (!d || typeof d.source !== 'string') return;
    if (d.source === 'pugide-render-res' && typeof d.id === 'number' && d.res) {
      const p = this.pending.get(d.id);
      if (!p) return;
      clearTimeout(p.timer);
      this.pending.delete(d.id);
      p.resolve({ html: String(d.res.html ?? ''), errors: Array.isArray(d.res.errors) ? d.res.errors : [] });
      return;
    }
    const signal = this.signals.get(d.source);
    if (signal) {
      this.signals.delete(d.source);
      signal();
    }
  }

  private destroy(): void {
    window.removeEventListener('message', this.listener);
    this.frame?.remove();
    this.frame = null;
    this.ready = null;
    this.signals.clear();
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.resolve({ html: '', errors: [{ message: 'Render cancelado.', source: 'pug', severity: 'error' }] });
    }
    this.pending.clear();
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
  return res.text();
}

/** Documento inicial del iframe: solo espera el código del render y lo evalúa. */
const BOOTSTRAP_HTML =
  '<!doctype html><meta charset="utf-8"><script>' +
  'addEventListener("message",function(e){if(e.source!==parent)return;var d=e.data;' +
  'if(d&&typeof d.pugideInit==="string"){try{(0,eval)(d.pugideInit)}catch(err){' +
  'parent.postMessage({source:"pugide-render-error",message:String(err)},"*")}}});' +
  'parent.postMessage({source:"pugide-render-boot"},"*");' +
  '</script>';

/** Host por defecto: aislado en el navegador, en línea si no hay DOM (Node). */
export function createRenderHost(): RenderHost {
  return typeof document !== 'undefined' && typeof window !== 'undefined' && typeof fetch === 'function'
    ? new SandboxRenderHost()
    : new InlineRenderHost();
}
