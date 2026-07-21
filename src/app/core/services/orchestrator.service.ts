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
import { ProjectState } from '../state/project.state';
import { PugVariable } from '../models/index';
import { getFileType } from '../models/tab.model';

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
  private projectState = inject(ProjectState);

  private codeChange$ = new Subject<string>();
  private isProcessing = false;
  private initialDataLoaded = false;

  constructor() {
    this.setupAutoCompile();
  }

  markDataInitialized(): void {
    this.initialDataLoaded = true;
  }

  private setupAutoCompile(): void {
    this.codeChange$.pipe(debounceTime(300)).subscribe(async (code) => {
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
    this.codeChange$.next(code);
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
      const files = this.editorState.allFileContents();
      const activePath = this.editorState.activeTab()?.path;
      const files2 = files;

      const rawParseResult = await this.parser.parse(code);
      if (rawParseResult.includes.length > 0) {
        this.ensureIncludeFiles(rawParseResult.includes);
      }

      const resolvedCode = this.resolvePugIncludes(code, files, activePath);
      const parseResult = await this.parser.parse(resolvedCode);
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
      const compileResult = await this.compiler.compile(code, data, files, activePath);
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

  async clearDataWithKeys(): Promise<Record<string, unknown>> {
    const files = this.editorState.allFileContents();
    const variables = await this.parser.parseAllFiles(files);
    console.log('[clearDataWithKeys] all variables:', variables.map(v => `${v.path} (${v.type})`).join(', '));
    if (variables.length === 0) return {};
    return this.buildDataFromVariables(variables);
  }

  addFile(path: string, name: string, content = ''): void {
    const activePath = this.editorState.activeTab()?.path;
    this.editorState.files.update((f) => { f.set(path, content); return f; });
    this.projectState.setProject(
      this.projectState.projectName(),
      this.editorState.files()
    );
    this.editorState.openFile(path, name, getFileType(name), content);
  }

  private ensureIncludeFiles(includes: string[]): void {
    let changed = false;
    const files = this.editorState.files();
    for (const includePath of includes) {
      const path = includePath.startsWith('/') ? includePath : '/' + includePath;
      if (!files.has(path)) {
        const name = path.split('/').pop() ?? 'unknown.pug';
        this.editorState.files.update((f) => { f.set(path, ''); return f; });
        this.terminalState.addEntry('info', 'Files', `Created missing include: ${name}`);
        changed = true;
      }
    }
    if (changed) {
      this.projectState.setProject(
        this.projectState.projectName(),
        this.editorState.files()
      );
    }
  }

  private resolvePugIncludes(code: string, files: Map<string, string>, activeFilePath?: string): string {
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

  private buildDataFromVariables(variables: PugVariable[]): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const v of variables) {
      if (v.path.includes('[]')) {
        this.setArrayValue(data, v.path, v.defaultValue);
      } else {
        this.setNestedValue(data, v.path, v.defaultValue);
      }
    }
    return data;
  }

  private setArrayValue(data: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let arrayPathParts: string[] = [];
    let itemPathParts: string[] = [];
    let foundArray = false;

    for (const part of parts) {
      if (part.includes('[]')) {
        arrayPathParts.push(part.replace('[]', ''));
        foundArray = true;
      } else if (foundArray) {
        itemPathParts.push(part);
      } else {
        arrayPathParts.push(part);
      }
    }

    const arrayPath = arrayPathParts.join('.');
    if (!Array.isArray(this.getNestedValue(data, arrayPath))) {
      this.setNestedValue(data, arrayPath, []);
    }

    const arr = this.getNestedValue(data, arrayPath) as unknown[];
    if (itemPathParts.length > 0 && arr.length === 0) {
      const item: Record<string, unknown> = {};
      this.setNestedValue(item, itemPathParts.join('.'), value);
      arr.push(item);
    } else if (itemPathParts.length > 0 && arr.length > 0) {
      this.setNestedValue(arr[0] as Record<string, unknown>, itemPathParts.join('.'), value);
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: any = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
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
