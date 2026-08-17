import { Injectable, inject } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { PugParserService } from '../../parser/pug-parser.service';
import { PugCompilerService } from '../../compiler/pug-compiler.service';
import { ScssCompilerService } from '../../compiler/scss-compiler.service';
import { injectIntoHead, injectIntoBody } from '../utils/html-injection.util';
import { annotateHtmlLines, INSPECTOR_SCRIPT } from '../utils/inspector-script.util';
import { EditorState } from '../state/editor.state';
import { ParserState } from '../state/parser.state';
import { PreviewState } from '../state/preview.state';
import { DataState } from '../state/data.state';
import { TerminalState } from '../state/terminal.state';
import { PreferencesState } from './preferences.state';
import { ProjectState } from '../state/project.state';
import { PersistenceService } from './persistence.service';
import { PugVariable } from '../models/index';
import { getFileType } from '../models/tab.model';

@Injectable({ providedIn: 'root' })
export class OrchestratorService {
  private parser = inject(PugParserService);
  private compiler = inject(PugCompilerService);
  private scssCompiler = inject(ScssCompilerService);
  private editorState = inject(EditorState);
  private parserState = inject(ParserState);
  private previewState = inject(PreviewState);
  private dataState = inject(DataState);
  private terminalState = inject(TerminalState);
  private preferences = inject(PreferencesState);
  private projectState = inject(ProjectState);
  private persistence = inject(PersistenceService);

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

      const rawParseResult = await this.parser.parse(code);
      if (rawParseResult.includes.length > 0) {
        this.ensureIncludeFiles(rawParseResult.includes);
      }

      const template = await this.compiler.prepare(code, activePath, files);
      const parseResult = this.parser.parseAst(template.ast);
      this.parserState.updateFromParseResult(parseResult);
      this.parserState.setParsing(false);

      if (!this.initialDataLoaded && Object.keys(this.dataState.data()).length === 0) {
        const data = this.buildDataFromVariables(parseResult.variables);
        if (Object.keys(data).length > 0) {
          this.dataState.setInitialData(data);
          this.initialDataLoaded = true;
        }
      }

      const skeleton = this.buildDataFromVariables(parseResult.variables);
      const patchedData = structuredClone(this.dataState.data());
      const newPaths: string[] = [];
      if (this.deepMergeMissing(patchedData, skeleton, '', newPaths)) {
        this.dataState.patchMissingData(patchedData, newPaths);
        this.terminalState.addEntry(
          'info',
          'Data',
          'Se han creado propiedades vacías por defecto para nuevas referencias del template. Revisa el editor de datos para rellenarlas.'
        );
      }

      const data = this.dataState.data();
      const compileResult = template.render(data);
      compileResult.compilationTime += template.linkTime;

      const scssResult = this.scssCompiler.compileAll(files);
      compileResult.css = scssResult.css;
      if (scssResult.css) {
        compileResult.html = injectIntoHead(compileResult.html, `<style>\n${scssResult.css}\n</style>`);
      }
      if (compileResult.html) {
        compileResult.html = annotateHtmlLines(compileResult.html);
        compileResult.html = injectIntoBody(compileResult.html, `<script>${INSPECTOR_SCRIPT}</script>`);
      }

      this.previewState.updateCompiledResult(compileResult);

      for (const error of compileResult.errors) {
        this.terminalState.addEntry(
          error.severity,
          error.source,
          `Line ${error.line ?? '?'} - ${error.message}`
        );
      }

      for (const scssError of scssResult.errors) {
        this.terminalState.addEntry('error', 'scss', `${scssError.path} - ${scssError.message}`);
      }

      if (compileResult.errors.length === 0) {
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
      this.parserState.setParsing(false);
    }
  }

  saveSession(): void {
    const files = this.editorState.files();
    if (files.size === 0) return;
    this.persistence.saveProjectState({
      projectName: this.projectState.projectName(),
      files: Object.fromEntries(files),
      openTabPaths: this.editorState.openTabs().map((t) => t.path),
      activeTabPath: this.editorState.activeTab()?.path ?? null,
    });
  }

  /** Replaces the whole in-memory project (used by import) and recompiles from scratch. */
  loadProject(files: Map<string, string>, projectName: string): void {
    this.editorState.openTabs.set([]);
    this.editorState.activeTabId.set(null);
    this.editorState.editorContent.set('');
    this.editorState.files.set(files);
    this.editorState.bumpResetToken();

    this.projectState.setProject(projectName, files);
    this.dataState.setInitialData({});
    this.initialDataLoaded = false;

    const firstPugPath = Array.from(files.keys()).find((p) => p.endsWith('.pug')) ?? Array.from(files.keys())[0];
    if (firstPugPath) {
      const name = firstPugPath.split('/').pop() ?? firstPugPath;
      this.editorState.openFile(firstPugPath, name, getFileType(name), files.get(firstPugPath) ?? '');
    }

    this.terminalState.addEntry(
      'success',
      'Project',
      `Loaded "${projectName}" (${files.size} file${files.size === 1 ? '' : 's'}).`
    );
    this.manualCompile();
    this.saveSession();
  }

  /** Discards the current project and starts a blank one, callable both at bootstrap and from inside a running IDE session. */
  resetToEmptyProject(): void {
    const defaultPug = `doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title PugIDE
  body
    h1 Hola, #{nombre}
    p Empieza a editar tu plantilla Pug y los datos aqui.`;

    this.persistence.clearProjectState();

    this.editorState.openTabs.set([]);
    this.editorState.activeTabId.set(null);
    this.editorState.editorContent.set('');
    this.editorState.files.set(new Map());
    this.editorState.bumpResetToken();

    this.editorState.openFile('/main.pug', 'main.pug', getFileType('main.pug'), defaultPug);
    this.projectState.setProject('MiProyecto', this.editorState.files());
    this.dataState.setInitialData({ nombre: 'Mundo' });
    this.initialDataLoaded = true;
    this.previewState.setDevice('Desktop', 1200, 800);
    this.terminalState.addEntry('info', 'PugIDE', 'Nueva sesión iniciada.');
    this.manualCompile();
  }

  onDataChange(): void {
    const code = this.editorState.editorContent();
    this.codeChange$.next(code);
  }

  async clearDataWithKeys(): Promise<Record<string, unknown>> {
    const files = this.editorState.allFileContents();
    const variables = await this.parser.parseAllFiles(files);
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

  renameFile(oldPath: string, newPath: string): void {
    const files = this.editorState.files();
    const content = files.get(oldPath);
    if (content === undefined || oldPath === newPath || files.has(newPath)) return;

    this.editorState.files.update((f) => {
      f.delete(oldPath);
      f.set(newPath, content);
      return f;
    });
    const name = newPath.split('/').pop() ?? newPath;
    this.editorState.renameOpenTab(oldPath, newPath, name);
    this.projectState.setProject(this.projectState.projectName(), this.editorState.files());
    this.terminalState.addEntry('info', 'Files', `Renamed ${oldPath} to ${newPath}`);
  }

  deleteFile(path: string): void {
    const files = this.editorState.files();
    if (!files.has(path)) return;
    this.editorState.files.update((f) => { f.delete(path); return f; });
    this.editorState.closeTabByPath(path);
    this.projectState.setProject(this.projectState.projectName(), this.editorState.files());
    this.terminalState.addEntry('info', 'Files', `Deleted ${path}`);
  }

  duplicateFile(path: string): void {
    const files = this.editorState.files();
    const content = files.get(path);
    if (content === undefined) return;

    const newPath = this.generateDuplicatePath(path, files);
    this.editorState.files.update((f) => { f.set(newPath, content); return f; });
    this.projectState.setProject(this.projectState.projectName(), this.editorState.files());
    const name = newPath.split('/').pop() ?? newPath;
    this.editorState.openFile(newPath, name, getFileType(name), content);
    this.terminalState.addEntry('info', 'Files', `Duplicated ${path} as ${newPath}`);
  }

  private generateDuplicatePath(path: string, files: Map<string, string>): string {
    const lastDot = path.lastIndexOf('.');
    const lastSlash = path.lastIndexOf('/');
    const base = lastDot > lastSlash ? path.slice(0, lastDot) : path;
    const ext = lastDot > lastSlash ? path.slice(lastDot) : '';
    let candidate = `${base}-copy${ext}`;
    let i = 2;
    while (files.has(candidate)) {
      candidate = `${base}-copy-${i}${ext}`;
      i++;
    }
    return candidate;
  }

  private ensureIncludeFiles(includes: string[]): void {
    let changed = false;
    const createdPaths: string[] = [];
    const files = this.editorState.files();
    for (const includePath of includes) {
      const path = includePath.startsWith('/') ? includePath : '/' + includePath;
      if (!files.has(path)) {
        const name = path.split('/').pop() ?? 'unknown.pug';
        this.editorState.files.update((f) => { f.set(path, ''); return f; });
        this.terminalState.addEntry('info', 'Files', `Created missing include: ${name}`);
        createdPaths.push(path);
        changed = true;
      }
    }
    if (changed) {
      this.projectState.setProject(
        this.projectState.projectName(),
        this.editorState.files()
      );
      this.projectState.markAutoCreated(createdPaths);
    }
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

  /** Merges `source` into `target`, filling in only keys missing from `target` (recursing into plain objects). Never touches arrays or primitives already present. Returns whether anything changed, and appends the dotted paths of every newly added key to `newPaths`. */
  private deepMergeMissing(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
    pathPrefix: string,
    newPaths: string[],
  ): boolean {
    let changed = false;
    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const path = pathPrefix ? `${pathPrefix}.${key}` : key;
      if (!(key in target)) {
        target[key] = sourceValue;
        newPaths.push(path);
        changed = true;
        continue;
      }
      const targetValue = target[key];
      const bothPlainObjects =
        sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
        targetValue !== null && typeof targetValue === 'object' && !Array.isArray(targetValue);
      if (bothPlainObjects) {
        if (this.deepMergeMissing(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>, path, newPaths)) {
          changed = true;
        }
      }
    }
    return changed;
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
