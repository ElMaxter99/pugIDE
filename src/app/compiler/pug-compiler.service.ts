import { Injectable } from '@angular/core';
import { CompileResult, CompileError } from '../core/models/index';
import { createPugFilePlugin, normalizeIncludes } from '../core/utils/pug-vfs.util';

function getPugBundle(): any {
  return (self as any).pugBundle;
}

@Injectable({ providedIn: 'root' })
export class PugCompilerService {
  private available = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.available) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    if (getPugBundle()?.compile) {
      this.available = true;
      return;
    }
    try {
      await loadScript('assets/pug-browser.js');
      const bundle = getPugBundle();
      this.available = typeof bundle?.compile === 'function';
      if (!this.available) {
        console.error(`[PugCompiler] Script loaded but not functional. typeof pugBundle=${typeof bundle}`);
      }
    } catch (err) {
      console.error('[PugCompiler] Failed to load script:', err);
      this.available = false;
    }
  }

  async compile(
    code: string,
    data: Record<string, unknown> = {},
    entryPath?: string,
    files?: Map<string, string>,
    functionStubs: string[] = [],
  ): Promise<CompileResult> {
    const start = performance.now();
    const errors: CompileError[] = [];
    let html = '';

    try {
      await this.initialize();

      if (!this.available) {
        errors.push({
          message: 'Pug compiler not loaded',
          source: 'pug',
          severity: 'error',
        });
      } else {
        const bundle = getPugBundle();

        const opts: Record<string, unknown> = {
          pretty: true,
          doctype: 'html',
          self: false,
        };
        if (entryPath) {
          opts['filename'] = entryPath;
          opts['basedir'] = '/';
        }
        if (files) {
          opts['plugins'] = [createPugFilePlugin(files)];
        }

        const source = files && entryPath ? normalizeIncludes(code, entryPath, files) : code;
        const compiledFn = bundle.compile(source, opts);
        // Templates often call helpers the host app provides (`t('KEY')`, `formatDate(x)`).
        // JSON data can't hold functions, so give them an identity-like stub for the preview.
        const locals: Record<string, unknown> = { ...data };
        for (const name of functionStubs) {
          if (typeof locals[name] !== 'function') locals[name] = (...args: unknown[]) => args[0] ?? '';
        }
        html = compiledFn(locals);
      }
    } catch (err: unknown) {
      const error = err as { message?: string; line?: number; column?: number };
      errors.push({
        message: error.message ?? 'Compilation error',
        source: 'pug',
        line: error.line,
        column: error.column,
        severity: 'error',
      });
    }

    return {
      html,
      css: '',
      errors,
      compilationTime: performance.now() - start,
    };
  }

}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}
