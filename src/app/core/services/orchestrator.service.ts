import { Injectable, inject } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { PugParserService } from '../../parser/pug-parser.service';
import { PugCompilerService } from '../../compiler/pug-compiler.service';
import { EditorState } from '../state/editor.state';
import { ParserState } from '../state/parser.state';
import { PreviewState } from '../state/preview.state';
import { DataState } from '../state/data.state';
import { TerminalState } from '../state/terminal.state';
import { PreferencesState } from './preferences.state';
import { PugVariable } from '../models/index';

@Injectable({ providedIn: 'root' })
export class OrchestratorService {
  private parser = inject(PugParserService);
  private compiler = inject(PugCompilerService);
  private editorState = inject(EditorState);
  private parserState = inject(ParserState);
  private previewState = inject(PreviewState);
  private dataState = inject(DataState);
  private terminalState = inject(TerminalState);
  private preferences = inject(PreferencesState);

  private codeChange$ = new Subject<string>();
  private isProcessing = false;
  private initialDataLoaded = false;

  constructor() {
    this.setupAutoCompile();
  }

  private setupAutoCompile(): void {
    this.codeChange$.pipe(debounceTime(300)).subscribe(async (code) => {
      if (!this.preferences.autoCompile()) return;
      await this.processCode(code);
    });
  }

  async initialize(): Promise<void> {
    await this.parser.initialize();
    await this.compiler.initialize();
    this.terminalState.addEntry('info', 'PugIDE', 'PugIDE initialized successfully');
  }

  onCodeChange(code: string): void {
    this.editorState.updateContent(code);
    if (this.preferences.autoCompile()) {
      this.codeChange$.next(code);
    }
  }

  async manualCompile(): Promise<void> {
    const code = this.editorState.editorContent();
    await this.processCode(code);
  }

  private async processCode(code: string): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.previewState.setLoading(true);
    this.parserState.setParsing(true);

    try {
      const parseResult = await this.parser.parse(code);
      this.parserState.updateFromParseResult(parseResult);

      if (!this.initialDataLoaded && Object.keys(this.dataState.data()).length === 0) {
        const data = this.buildDataFromVariables(parseResult.variables);
        if (Object.keys(data).length > 0) {
          this.dataState.setData(data);
          this.initialDataLoaded = true;
        }
      }

      for (const error of parseResult.errors) {
        this.terminalState.addEntry(
          error.severity,
          'Parser',
          `Line ${error.line}:${error.column} - ${error.message}`
        );
      }

      const data = this.dataState.data();
      const compileResult = await this.compiler.compile(code, data);
      this.previewState.updateCompiledResult(compileResult);

      for (const error of compileResult.errors) {
        this.terminalState.addEntry(
          error.severity,
          error.source,
          `Line ${error.line ?? '?'} - ${error.message}`
        );
      }

      if (parseResult.errors.length === 0 && compileResult.errors.length === 0) {
        this.terminalState.addEntry(
          'success',
          'Compiler',
          `Compiled in ${compileResult.compilationTime.toFixed(1)}ms`
        );
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.terminalState.addEntry('error', 'System', error.message);
    } finally {
      this.isProcessing = false;
      this.previewState.setLoading(false);
    }
  }

  onDataChange(): void {
    const code = this.editorState.editorContent();
    this.codeChange$.next(code);
  }

  private buildDataFromVariables(variables: PugVariable[]): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const v of variables) {
      this.setNestedValue(data, v.path, v.defaultValue);
    }
    return data;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
  }
}
