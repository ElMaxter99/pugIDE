import { Injectable } from '@angular/core';
import { CompileResult, CompileError } from '../core/models/index';

@Injectable({ providedIn: 'root' })
export class PugCompilerService {
  private compilerModule: any = null;

  async initialize(): Promise<void> {
    try {
      this.compilerModule = await import('pug');
    } catch {
      console.warn('pug compiler not available, using fallback');
    }
  }

  async compile(pugCode: string, data: Record<string, unknown> = {}): Promise<CompileResult> {
    const start = performance.now();
    const errors: CompileError[] = [];
    let html = '';
    let css = '';

    try {
      await this.initialize();

      if (this.compilerModule) {
        const compiledFn = this.compilerModule.compile(pugCode, {
          pretty: true,
          doctype: 'html',
          self: false,
        });
        html = compiledFn(data);
      } else {
        html = this.fallbackCompile(pugCode, data);
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
      css,
      errors,
      compilationTime: performance.now() - start,
    };
  }

  compileTemplate(template: string, data: Record<string, unknown>): string {
    try {
      return template.replace(/\{\{(\w[\w.]*)\}\}/g, (_, path: string) => {
        const value = this.getNestedValue(data, path);
        return value !== undefined ? String(value) : `{{${path}}}`;
      });
    } catch {
      return template;
    }
  }

  private fallbackCompile(pugCode: string, data: Record<string, unknown>): string {
    const lines = pugCode.split('\n');
    let html = '';
    let indent = 0;
    const indentStack: number[] = [];
    const eachIterations = new Map<string, unknown[]>();

    this.walkForArrays(pugCode, data, eachIterations);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim() || line.trimStart().startsWith('//')) continue;

      const currentIndent = line.length - line.trimStart().length;
      const trimmed = line.trim();

      while (indentStack.length > 0 && currentIndent <= indentStack[indentStack.length - 1]) {
        html += '</' + 'tag' + '>';
        indentStack.pop();
      }

      if (trimmed.startsWith('each ')) {
        const match = trimmed.match(/each\s+(\w+)\s+in\s+(\w+)/);
        if (match) {
          const items = eachIterations.get(match[2]) ?? [];
          indentStack.push(currentIndent);
          continue;
        }
      }

      if (trimmed.startsWith('if ')) {
        indentStack.push(currentIndent);
        continue;
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('mixin ') || trimmed.startsWith('+')) {
        continue;
      }

      if (trimmed.startsWith('include ') || trimmed.startsWith('extends ') || trimmed.startsWith('block ')) {
        continue;
      }

      const tagMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9-]*)((?:[.#][\w-]+)*)((?:\s+[\w-]+="[^"]*")*)?\s*(.*)$/);
      if (tagMatch) {
        const tag = tagMatch[1];
        const selectors = tagMatch[2];
        let attrs = tagMatch[3] || '';
        const text = tagMatch[4] || '';

        let id = '';
        const classes: string[] = [];
        for (const s of selectors.matchAll(/[.#][\w-]+/g)) {
          const match = s[0];
          if (match.startsWith('.')) classes.push(match.slice(1));
          else if (match.startsWith('#')) id = match.slice(1);
        }

        let attrStr = '';
        if (id) attrStr += ` id="${id}"`;
        if (classes.length) attrStr += ` class="${classes.join(' ')}"`;

        attrs = attrs.replace(/(\w[\w-]*)="([^"]*)"/g, (_m: string, name: string, val: string) => {
          const resolved = this.resolveInterpolation(val, data);
          return ` ${name}="${resolved}"`;
        });

        const resolvedText = text ? this.resolveInterpolation(text, data) : '';

        html += `<${tag}${attrStr}${attrs}>${resolvedText}`;
        indentStack.push(currentIndent);
      } else if (trimmed) {
        html += this.resolveInterpolation(trimmed, data);
      }
    }

    while (indentStack.length > 0) {
      html += '</tag>';
      indentStack.pop();
    }

    return html;
  }

  private walkForArrays(code: string, data: Record<string, unknown>, map: Map<string, unknown[]>): void {
    const matches = code.matchAll(/each\s+(\w+)\s+in\s+(\w[\w.]*)/g);
    for (const m of matches) {
      const value = this.getNestedValue(data, m[2]);
      if (Array.isArray(value)) {
        map.set(m[2], value);
      }
    }
  }

  private resolveInterpolation(text: string, data: Record<string, unknown>): string {
    return text.replace(/#\{([^}]+)\}/g, (_, expr: string) => {
      const value = this.getNestedValue(data, expr.trim());
      return value !== undefined ? String(value) : '';
    });
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }
}
