import { Injectable } from '@angular/core';
import { CompileResult, CompileError, PugAstNode } from '../core/models/index';
import { wireVirtualFs } from '../core/utils/pug-fs-bridge.util';
import { annotateTagSourceLines } from '../core/utils/pug-line-annotate.util';

function getPugBundle(): any {
  return (self as any).pugBundle;
}

export interface LinkedPugTemplate {
  /** The fully linked AST (include/extends/block already resolved), or null if linking failed. */
  ast: PugAstNode | null;
  /** Time spent lexing/parsing/loading/linking/generating code, in ms. */
  linkTime: number;
  /** Renders the linked template against `data`. Safe to call even if `ast` is null (returns the link errors). */
  render: (data: Record<string, unknown>) => CompileResult;
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

  /**
   * Lexes, parses, loads (resolving `include`/`extends` against `files` via
   * the virtual `fs` bridge) and links `code`, then generates a template
   * function — without rendering it yet, since the caller (the orchestrator)
   * needs the extracted variables from the linked AST to build `data` first.
   */
  async prepare(
    code: string,
    activeFilePath: string | undefined,
    files: Map<string, string>,
  ): Promise<LinkedPugTemplate> {
    const start = performance.now();
    const errors: CompileError[] = [];
    let ast: PugAstNode | null = null;
    let compiledFn: ((data: Record<string, unknown>) => string) | null = null;

    try {
      await this.initialize();

      if (!this.available) {
        errors.push({
          message: 'Pug compiler not loaded',
          source: 'pug',
          severity: 'error',
        });
      } else {
        wireVirtualFs(files);
        const bundle = getPugBundle();

        const opts: Record<string, unknown> = {
          pretty: true,
          doctype: 'html',
          self: false,
          filename: activeFilePath ?? '/untitled.pug',
          basedir: '/',
          plugins: [
            {
              postLink: (linkedAst: PugAstNode) => {
                ast = linkedAst;
                annotateTagSourceLines(linkedAst);
                return linkedAst;
              },
            },
          ],
        };

        compiledFn = bundle.compile(code, opts);
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

    const linkTime = performance.now() - start;
    const fn = compiledFn;

    return {
      ast,
      linkTime,
      render: (data: Record<string, unknown>): CompileResult => {
        const renderStart = performance.now();
        const renderErrors: CompileError[] = [...errors];
        let html = '';

        if (fn) {
          try {
            html = fn(data);
          } catch (err: unknown) {
            const error = err as { message?: string; line?: number; column?: number };
            renderErrors.push({
              message: error.message ?? 'Render error',
              source: 'pug',
              line: error.line,
              column: error.column,
              severity: 'error',
            });
          }
        }

        return {
          html,
          css: '',
          errors: renderErrors,
          compilationTime: performance.now() - renderStart,
        };
      },
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
