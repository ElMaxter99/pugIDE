import { Injectable } from '@angular/core';
import { CompileResult } from '../core/models/index';
import { createRenderHost, RenderHost } from '../core/render/render-host';

/**
 * Compila una plantilla Pug con sus datos. El render, que ejecuta el JavaScript del usuario, no corre en la
 * página de la app sino en un `RenderHost` aislado (ver `core/render`).
 */
@Injectable({ providedIn: 'root' })
export class PugCompilerService {
  /** Sustituible en pruebas. */
  host: RenderHost = createRenderHost();

  async initialize(): Promise<void> {
    await this.host.initialize();
  }

  async compile(
    code: string,
    data: Record<string, unknown> = {},
    entryPath?: string,
    files?: Map<string, string>,
    functionStubs: string[] = [],
  ): Promise<CompileResult> {
    const start = performance.now();
    try {
      const { html, errors } = await this.host.render({
        code, data, entryPath, files: files ? [...files] : undefined, functionStubs,
      });
      return { html, css: '', errors, compilationTime: performance.now() - start };
    } catch (err) {
      return {
        html: '',
        css: '',
        errors: [{ message: (err as Error).message || 'Pug compiler not loaded', source: 'pug', severity: 'error' }],
        compilationTime: performance.now() - start,
      };
    }
  }
}
