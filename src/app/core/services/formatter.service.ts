import { Injectable } from '@angular/core';

const PARSER_BY_TYPE: Record<string, string> = {
  pug: 'pug',
  scss: 'scss',
  css: 'css',
  json: 'json',
};

@Injectable({ providedIn: 'root' })
export class FormatterService {
  private modulePromise: Promise<{ format: (code: string, opts: Record<string, unknown>) => Promise<string>; plugins: unknown[] }> | null = null;

  supports(fileType: string): boolean {
    return fileType in PARSER_BY_TYPE;
  }

  /** Formats `code` for `fileType` (pug/scss/css/json). Loads prettier's browser bundle lazily on first use. */
  async format(code: string, fileType: string, tabWidth: number): Promise<string> {
    const parser = PARSER_BY_TYPE[fileType];
    if (!parser) return code;

    const { format, plugins } = await this.loadModules();
    return format(code, { parser, plugins, tabWidth, useTabs: false });
  }

  private loadModules(): Promise<{ format: (code: string, opts: Record<string, unknown>) => Promise<string>; plugins: unknown[] }> {
    if (!this.modulePromise) {
      this.modulePromise = (async () => {
        const [standalone, pluginPug, pluginPostcss, pluginBabel, pluginEstree] = await Promise.all([
          import('prettier/standalone'),
          import('@prettier/plugin-pug'),
          import('prettier/plugins/postcss'),
          import('prettier/plugins/babel'),
          import('prettier/plugins/estree'),
        ]);
        return {
          format: standalone.format,
          plugins: [
            (pluginPug as { default?: unknown }).default ?? pluginPug,
            pluginPostcss,
            pluginBabel,
            pluginEstree,
          ],
        };
      })();
    }
    return this.modulePromise;
  }
}
