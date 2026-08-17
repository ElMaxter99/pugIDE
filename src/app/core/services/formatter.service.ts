import { Injectable } from '@angular/core';

const PARSER_BY_TYPE: Record<string, string> = {
  pug: 'pug',
  scss: 'scss',
  css: 'css',
  json: 'json',
};

interface FormatterBundle {
  format: (code: string, opts: Record<string, unknown>) => Promise<string>;
  plugins: unknown[];
}

function getFormatterBundle(): FormatterBundle | undefined {
  return (self as any).formatterBundle;
}

@Injectable({ providedIn: 'root' })
export class FormatterService {
  private initPromise: Promise<void> | null = null;
  private available = false;

  supports(fileType: string): boolean {
    return fileType in PARSER_BY_TYPE;
  }

  /** Formats `code` for `fileType` (pug/scss/css/json). Loads the prettier browser bundle lazily on first use. */
  async format(code: string, fileType: string, tabWidth: number): Promise<string> {
    const parser = PARSER_BY_TYPE[fileType];
    if (!parser) return code;

    await this.initialize();
    const bundle = getFormatterBundle();
    if (!this.available || !bundle) {
      throw new Error('Formatter is unavailable');
    }
    return bundle.format(code, { parser, plugins: bundle.plugins, tabWidth, useTabs: false });
  }

  private async initialize(): Promise<void> {
    if (this.available) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    if (getFormatterBundle()?.format) {
      this.available = true;
      return;
    }
    try {
      await loadScript('assets/formatter-browser.js');
      this.available = typeof getFormatterBundle()?.format === 'function';
    } catch (err) {
      console.error('[FormatterService] Failed to load formatter bundle:', err);
      this.available = false;
    }
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
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
