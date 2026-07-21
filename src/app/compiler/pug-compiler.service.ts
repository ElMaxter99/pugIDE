import { Injectable } from '@angular/core';
import { CompileResult, CompileError } from '../core/models/index';

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
    pugCode: string,
    data: Record<string, unknown> = {},
    files?: Map<string, string>,
    activeFilePath?: string,
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

        let resolvedCode = pugCode;
        if (files) {
          resolvedCode = this.resolveIncludes(pugCode, files, activeFilePath);
        }

        const opts: Record<string, unknown> = {
          pretty: true,
          doctype: 'html',
          self: false,
        };
        if (activeFilePath) {
          opts['filename'] = activeFilePath;
          opts['basedir'] = '/';
        }

        const compiledFn = bundle.compile(resolvedCode, opts);
        html = compiledFn(data);
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

  private resolveIncludes(code: string, files: Map<string, string>, activeFilePath?: string): string {
    const lines = code.split('\n');
    const result: string[] = [];
    const baseDir = activeFilePath ? activeFilePath.substring(0, activeFilePath.lastIndexOf('/') + 1) : '/';

    for (const line of lines) {
      const incMatch = line.match(/^\s*(include|extends)\s+['"]?([^'"]+)/);
      if (incMatch) {
        const rawPath = incMatch[2].trim();
        const path = rawPath.startsWith('/') ? rawPath : baseDir + rawPath;
        const content = files.get(path) ?? files.get('/' + rawPath);
        if (content !== undefined) {
          result.push(content);
          continue;
        }
      }
      result.push(line);
    }

    return result.join('\n');
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
