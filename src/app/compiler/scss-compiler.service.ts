import { Injectable } from '@angular/core';
import { compileScssLite } from '../core/utils/scss-lite.util';

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
  compileAll(files: Map<string, string>): ScssCompileResult {
    const paths = Array.from(files.keys())
      .filter((p) => p.endsWith('.scss') || p.endsWith('.sass') || p.endsWith('.css'))
      .sort();

    const parts: string[] = [];
    const errors: ScssCompileError[] = [];

    for (const path of paths) {
      const source = files.get(path) ?? '';
      if (!source.trim()) continue;
      try {
        const css = compileScssLite(source);
        if (css.trim()) parts.push(css);
      } catch (err: unknown) {
        errors.push({ path, message: (err as Error).message ?? 'SCSS compile error' });
      }
    }

    return { css: parts.join('\n\n'), errors };
  }
}
