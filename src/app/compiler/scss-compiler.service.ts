import { Injectable } from '@angular/core';
import { compileScssLite } from '../core/utils/scss-lite.util';
import { resolveImports } from '../core/utils/style-refs.util';

export interface ScssCompileError {
  path: string;
  message: string;
}

export interface ScssCompileResult {
  css: string;
  errors: ScssCompileError[];
}

@Injectable({ providedIn: 'root' })
export class ScssCompilerService {
  /** Compiles one stylesheet following its local `@import`s; remote imports are returned hoisted at the top. */
  compileFile(path: string, files: Map<string, string>): ScssCompileResult & { used: Set<string> } {
    const errors: ScssCompileError[] = [];
    const r = resolveImports(path, files);
    for (const m of r.missing) errors.push({ path, message: `@import no encontrado: ${m}` });
    let css = '';
    try {
      css = compileScssLite(r.source);
    } catch (err: unknown) {
      errors.push({ path, message: (err as Error).message ?? 'SCSS compile error' });
    }
    return { css: [...r.remote, css].filter((x) => x.trim()).join('\n'), errors, used: r.used };
  }

  /** Compiles every project stylesheet except `exclude` (those already inlined through `<link>` / `@import`). */
  compileAll(files: Map<string, string>, exclude: Set<string> = new Set()): ScssCompileResult {
    const all = Array.from(files.keys())
      .filter((p) => p.endsWith('.scss') || p.endsWith('.sass') || p.endsWith('.css'))
      .sort();
    // Files imported by another stylesheet are part of it: injecting them again would duplicate the rules.
    const imported = new Set<string>(exclude);
    for (const p of all) resolveImports(p, files).used.forEach((u) => imported.add(u));

    const remote: string[] = [];
    const parts: string[] = [];
    const errors: ScssCompileError[] = [];
    for (const path of all) {
      if (imported.has(path) || !(files.get(path) ?? '').trim()) continue;
      const r = this.compileFile(path, files);
      errors.push(...r.errors);
      const lines = r.css.split('\n');
      while (lines.length && /^@import url\(/.test(lines[0])) remote.push(lines.shift()!);
      const body = lines.join('\n');
      if (body.trim()) parts.push(body);
    }
    return { css: [...remote, parts.join('\n\n')].filter((x) => x.trim()).join('\n'), errors };
  }
}
