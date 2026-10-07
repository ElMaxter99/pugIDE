import { Injectable } from '@angular/core';
import { compileScssLite } from '../core/utils/scss-lite.util';
import { isStylePath, resolveImports, resolveStyleFile } from '../core/utils/style-refs.util';

export interface ScssCompileError {
  path: string;
  message: string;
}

export interface ScssCompileResult {
  css: string;
  errors: ScssCompileError[];
}

export interface StyleFileResult extends ScssCompileResult {
  /** Project files pulled in through `@import` / `@use` (already part of `css`). */
  used: Set<string>;
}

const TOP_IMPORT_RE = /^@import\s+[^;]+;[ \t]*$/gm;

/** Compiles project stylesheets: plain CSS, SCSS / Sass (real `sass`) and Less (real `less`); the heavy compilers load on demand. */
@Injectable({ providedIn: 'root' })
export class ScssCompilerService {
  async compileFile(path: string, files: Map<string, string>): Promise<StyleFileResult> {
    const lower = path.toLowerCase();
    const used = new Set<string>();
    try {
      if (lower.endsWith('.less')) return { ...(await this.compileLess(path, files, used)), used };
      if (lower.endsWith('.scss') || lower.endsWith('.sass')) return { ...(await this.compileSass(path, files, used)), used };
    } catch (err: unknown) {
      return { css: '', errors: [{ path, message: describe(err) }], used };
    }
    return { ...this.compileCss(path, files), used: resolveImports(path, files).used };
  }

  /** Compiles every project stylesheet except `exclude` (the ones already inlined through `<link>`). */
  async compileAll(files: Map<string, string>, exclude: Set<string> = new Set()): Promise<ScssCompileResult> {
    const roots = Array.from(files.keys())
      .filter((p) => isStylePath(p) && !exclude.has(p) && !p.split('/').pop()!.startsWith('_') && (files.get(p) ?? '').trim())
      .sort();
    const results = new Map<string, StyleFileResult>();
    const imported = new Set<string>();
    for (const path of roots) {
      const r = await this.compileFile(path, files);
      results.set(path, r);
      r.used.forEach((u) => imported.add(u));
    }

    const remote: string[] = [];
    const parts: string[] = [];
    const errors: ScssCompileError[] = [];
    for (const [path, r] of results) {
      // A file imported by another one is part of it: injecting it again would duplicate the rules.
      if (imported.has(path)) continue;
      errors.push(...r.errors);
      const body = r.css.replace(TOP_IMPORT_RE, (m) => { remote.push(m.trim()); return ''; });
      if (body.trim()) parts.push(body.trim());
    }
    return { css: [...remote, parts.join('\n\n')].filter((x) => x.trim()).join('\n'), errors };
  }

  private compileCss(path: string, files: Map<string, string>): ScssCompileResult {
    const errors: ScssCompileError[] = [];
    const r = resolveImports(path, files);
    for (const m of r.missing) errors.push({ path, message: `@import no encontrado: ${m}` });
    return { css: [...r.remote, r.source].filter((x) => x.trim()).join('\n'), errors };
  }

  private async compileSass(path: string, files: Map<string, string>, used: Set<string>): Promise<ScssCompileResult> {
    let sass: typeof import('sass');
    try {
      sass = await import('sass');
    } catch {
      // Compiler unavailable (offline chunk, blocked): fall back to the tiny built-in SCSS subset.
      return this.compileFallback(path, files);
    }
    const toUrl = (p: string) => new URL('file://' + encodeURI(p));
    const fromUrl = (u: URL) => decodeURI(u.pathname);
    const result = sass.compileString(files.get(path) ?? '', {
      syntax: path.toLowerCase().endsWith('.sass') ? 'indented' : 'scss',
      url: toUrl(path),
      logger: { warn: () => undefined, debug: () => undefined } as never,
      importers: [{
        canonicalize: (url: string, ctx: { containingUrl?: URL | null }) => {
          const from = ctx.containingUrl ? fromUrl(ctx.containingUrl) : path;
          const target = resolveStyleFile(url.replace(/^file:\/\//, ''), from, files);
          return target ? toUrl(target) : null;
        },
        load: (canonical: URL) => {
          const target = fromUrl(canonical);
          used.add(target);
          return {
            contents: files.get(target) ?? '',
            syntax: target.toLowerCase().endsWith('.sass') ? 'indented' : target.toLowerCase().endsWith('.css') ? 'css' : 'scss',
          };
        },
      }],
    });
    return { css: result.css, errors: [] };
  }

  private compileFallback(path: string, files: Map<string, string>): ScssCompileResult {
    const r = resolveImports(path, files);
    return { css: [...r.remote, compileScssLite(r.source)].filter((x) => x.trim()).join('\n'), errors: [] };
  }

  private async compileLess(path: string, files: Map<string, string>, used: Set<string>): Promise<ScssCompileResult> {
    // The DOM-free core: the prebuilt browser bundle hides the page and scans <link>/<style> tags on load.
    const mod = (await import('less/lib/less/index.js')) as unknown as { default: (env?: unknown, fm?: unknown, version?: string) => LessStatic };
    const [{ default: AbstractFileManager }, { default: AbstractPluginLoader }] = await Promise.all([
      import('less/lib/less/environment/abstract-file-manager.js'),
      import('less/lib/less/environment/abstract-plugin-loader.js'),
    ]);
    const less = mod.default(undefined, undefined, '4.0.0');
    less.FileManager = AbstractFileManager;
    (less as unknown as { PluginLoader: unknown }).PluginLoader = AbstractPluginLoader;
    const plugin = {
      install(lessInstance: { FileManager: new () => LessFileManager }, pluginManager: { addFileManager(m: LessFileManager): void }) {
        class ProjectFileManager extends lessInstance.FileManager {
          override supports(filename: string): boolean { return !/^[a-z][a-z0-9+.-]*:|^\/\//i.test(filename); }
          override supportsSync(): boolean { return false; }
          override async loadFile(filename: string, currentDirectory: string): Promise<{ filename: string; contents: string }> {
            const from = (currentDirectory || '/').replace(/\/?$/, '/') + '_';
            const target = resolveStyleFile(filename, from, files) ?? resolveStyleFile(filename + '.less', from, files);
            if (!target) throw { type: 'File', message: `'${filename}' wasn't found in the project` };
            used.add(target);
            return { filename: target, contents: files.get(target) ?? '' };
          }
        }
        pluginManager.addFileManager(new ProjectFileManager());
      },
    };
    const out = await less.render(files.get(path) ?? '', { filename: path, plugins: [plugin] } as never);
    return { css: out.css, errors: [] };
  }
}

interface LessFileManager {
  supports(filename: string): boolean;
  supportsSync(): boolean;
  loadFile(filename: string, currentDirectory: string): Promise<{ filename: string; contents: string }>;
}
interface LessStatic {
  FileManager: new () => LessFileManager;
  render(input: string, options: unknown): Promise<{ css: string }>;
}

function describe(err: unknown): string {
  const e = err as { message?: string; line?: number; sassMessage?: string };
  const msg = e.sassMessage ?? e.message ?? 'Style compile error';
  return e.line ? `línea ${e.line}: ${msg}` : msg.split('\n')[0];
}
