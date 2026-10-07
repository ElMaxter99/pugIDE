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
import { AssetState, AssetFile } from '../state/asset.state';
import { AssetStorageService } from './asset-storage.service';
import { inlineLocalStylesheets } from '../utils/style-refs.util';
import { ASSET_EXT_RE, mimeForPath, refToPath, rewriteRefs } from '../utils/asset.util';
import { PugVariable } from '../models/index';
import { getFileType } from '../models/tab.model';
import { buildDataSkeleton } from '../utils/data-skeleton.util';
import { buildTranslationSkeleton, TRANSLATIONS_KEY } from '../utils/i18n.util';
import { findEntryPath, normalize, resolveVirtualPath } from '../utils/pug-vfs.util';

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
  private assetState = inject(AssetState);
  private assetStorage = inject(AssetStorageService);

  private codeChange$ = new Subject<string>();
  private isProcessing = false;
  private recompileRequested = false;
  private createMissingRequested = false;
  private initialDataLoaded = false;
  private assetsReady = false;

  constructor() {
    this.setupAutoCompile();
  }

  markDataInitialized(): void {
    this.initialDataLoaded = true;
  }

  private setupAutoCompile(): void {
    this.codeChange$.pipe(debounceTime(300)).subscribe(async (code) => {
      if (!this.preferences.autoCompile()) return;
      // Auto-compile never creates files: half-typed paths ("./as") would litter the workspace.
      await this.processCode(code, false);
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
    await this.processCode(code, true);
  }

  /** `createMissing`: generate files for includes that don't exist yet (only on explicit save/compile). */
  private async processCode(code: string, createMissing: boolean): Promise<void> {
    // A change that lands mid-compile (e.g. pasting a whole file) must not be dropped:
    // remember it and recompile with the latest state once the current run finishes.
    if (this.isProcessing) {
      this.recompileRequested = true;
      this.createMissingRequested ||= createMissing;
      return;
    }
    this.isProcessing = true;
    this.previewState.setLoading(true);
    this.parserState.setParsing(true);

    try {
      const files = this.editorState.allFileContents();
      const activePath = this.editorState.activeTab()?.path;
      const entryPath = findEntryPath(files, activePath);
      if (!entryPath) {
        this.previewState.updateCompiledResult({ html: '', css: '', errors: [], compilationTime: 0 });
        return;
      }
      // The active tab's live content wins over the stored copy (it is the one being typed).
      const entryCode = entryPath === activePath ? this.editorState.editorContent() : (files.get(entryPath) ?? '');
      if (entryPath === activePath) files.set(entryPath, entryCode);

      const rawParseResult = await this.parser.parse(entryCode, entryPath);
      if (createMissing && rawParseResult.includes.length > 0) {
        this.ensureIncludeFiles(rawParseResult.includes, entryPath);
      }

      const parseResult = await this.parser.parse(entryCode, entryPath, files);
      this.parserState.updateFromParseResult(parseResult);
      this.parserState.setParsing(false);

      if (!this.initialDataLoaded && Object.keys(this.dataState.data()).length === 0) {
        const data = this.buildDataFromVariables(parseResult.variables, parseResult.translationKeys);
        if (Object.keys(data).length > 0) {
          this.dataState.setInitialData(data);
          this.initialDataLoaded = true;
        }
      }

      const skeleton = this.buildDataFromVariables(parseResult.variables, parseResult.translationKeys);
      const patchedData = structuredClone(this.dataState.data());
      if (this.deepMergeMissing(patchedData, skeleton)) {
        this.dataState.patchMissingData(patchedData);
        this.terminalState.addEntry(
          'info',
          'Data',
          'Se han creado propiedades vacías por defecto para nuevas referencias del template. Revisa el editor de datos para rellenarlas.'
        );
      }

      for (const error of parseResult.errors) {
        this.terminalState.addEntry(
          error.severity,
          'Parser',
          `Line ${error.line}:${error.column} - ${error.message}`
        );
      }

      const data = this.dataState.data();
      const compileResult = await this.compiler.compile(entryCode, data, entryPath, files, parseResult.calledFunctions);

      // `<link rel="stylesheet" href="local.css">` becomes an inline <style>; the rest of the project styles are still injected.
      const linkErrors: { path: string; message: string }[] = [];
      let linked = new Set<string>();
      if (compileResult.html) {
        const inlined = await inlineLocalStylesheets(compileResult.html, files, async (p) => {
          const r = await this.scssCompiler.compileFile(p, files);
          linkErrors.push(...r.errors);
          return r;
        });
        compileResult.html = inlined.html;
        linked = inlined.used;
        for (const m of inlined.missing) linkErrors.push({ path: m, message: 'Hoja de estilos referenciada no encontrada en el proyecto' });
      }
      const scssResult = await this.scssCompiler.compileAll(files, linked);
      scssResult.errors.push(...linkErrors);
      compileResult.css = scssResult.css;
      if (scssResult.css) {
        compileResult.html = injectIntoHead(compileResult.html, `<style>\n${scssResult.css}\n</style>`);
      }
      if (compileResult.html) {
        compileResult.html = this.applyAssets(compileResult.html, files);
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
      this.parserState.setParsing(false);
      if (this.recompileRequested) {
        this.recompileRequested = false;
        const create = this.createMissingRequested;
        this.createMissingRequested = false;
        void this.processCode(this.editorState.editorContent(), create);
      }
    }
  }

  /** Points local image / font references at the uploaded files (as `blob:` URLs) and tracks the ones still missing. */
  private applyAssets(html: string, files: Map<string, string>): string {
    const missing = new Set<string>();
    const out = rewriteRefs(html, (ref) => {
      const hit = this.assetState.resolve(ref);
      if (hit) return this.assetState.urlFor(hit);
      const path = refToPath(ref);
      if (ASSET_EXT_RE.test(path) && !files.has(path)) missing.add(path);
      return null;
    });
    const list = [...missing].sort();
    if (list.join('|') !== this.assetState.missing().join('|')) {
      this.assetState.missing.set(list);
      if (list.length > 0) {
        this.terminalState.addEntry('warning', 'Assets', `Faltan ${list.length} archivo(s) referenciados: ${list.join(', ')} — súbelos desde la barra lateral.`);
      }
    }
    return out;
  }

  /**
   * Stores uploaded images / fonts. Without `targetPath`, a file whose name matches a missing
   * reference lands exactly at the path the template asks for; anything else goes to /assets/.
   */
  async addAssets(files: File[], targetPath?: string): Promise<void> {
    const added: string[] = [];
    for (const file of files) {
      if (!targetPath && !ASSET_EXT_RE.test(file.name)) {
        this.terminalState.addEntry('warning', 'Assets', `${file.name}: tipo no soportado (imágenes y fuentes).`);
        continue;
      }
      const data = new Uint8Array(await file.arrayBuffer());
      const name = file.name.toLowerCase();
      const matches = this.assetState.missing().filter((p) => p.split('/').pop()!.toLowerCase() === name);
      const paths = targetPath ? [targetPath] : matches.length ? matches : ['/assets/' + file.name.replace(/\s+/g, '-')];
      for (const path of paths) {
        this.assetState.add(path, data, mimeForPath(path));
        added.push(path);
      }
    }
    if (added.length === 0) return;
    this.refreshTree();
    this.terminalState.addEntry('success', 'Assets', `Añadido: ${added.join(', ')}`);
    await this.manualCompile();
  }

  /** Reloads the assets saved by the previous session (IndexedDB). */
  async restoreAssets(): Promise<void> {
    const list = await this.assetStorage.load();
    this.assetsReady = true;
    if (list.length === 0) return;
    this.assetState.replaceAll(list);
    this.refreshTree();
    await this.manualCompile();
  }

  /** Sessions that start without stored assets (demo, empty project) must not wipe them before a restore. */
  markAssetsReady(): void {
    this.assetsReady = true;
  }

  async saveAssets(): Promise<void> {
    if (!this.assetsReady) return;
    const ok = await this.assetStorage.save([...this.assetState.assets().values()]);
    if (!ok) this.terminalState.addEntry('warning', 'Assets', 'No se pudieron guardar las imágenes en el navegador (almacenamiento lleno o bloqueado).');
  }

  private refreshTree(): void {
    this.projectState.setAssetPaths(this.assetState.paths(), this.editorState.files());
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
  loadProject(files: Map<string, string>, projectName: string, assets: AssetFile[] = []): void {
    this.assetState.replaceAll(assets);
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

  onDataChange(): void {
    const code = this.editorState.editorContent();
    this.codeChange$.next(code);
  }

  async clearDataWithKeys(): Promise<Record<string, unknown>> {
    const files = this.editorState.allFileContents();
    const entryPath = findEntryPath(files, this.editorState.activeTab()?.path);
    const { variables, translationKeys } = await this.parser.parseProject(files, entryPath);
    if (variables.length === 0 && translationKeys.length === 0) return {};
    return this.buildDataFromVariables(variables, translationKeys);
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
    if (this.assetState.has(oldPath)) {
      this.assetState.rename(oldPath, newPath);
      this.refreshTree();
      this.terminalState.addEntry('info', 'Files', `Renamed ${oldPath} to ${newPath}`);
      void this.manualCompile();
      return;
    }
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
    if (this.assetState.has(path)) {
      this.assetState.remove(path);
      this.refreshTree();
      this.terminalState.addEntry('info', 'Files', `Deleted ${path}`);
      void this.manualCompile();
      return;
    }
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

  private ensureIncludeFiles(includes: string[], fromPath: string): void {
    let changed = false;
    const files = this.editorState.files();
    for (const includePath of includes) {
      if (resolveVirtualPath(includePath, fromPath, files)) continue;
      const dir = fromPath.substring(0, fromPath.lastIndexOf('/') + 1);
      let path = normalize(includePath.startsWith('/') ? includePath : dir + includePath);
      if (!/\.[a-z0-9]+$/i.test(path)) path += '.pug';
      const name = path.split('/').pop() ?? '';
      // Skip incomplete paths such as "./", "." or "dir/" (still being typed).
      if (!/[^./]/.test(name.replace(/\.pug$/i, ''))) continue;
      this.editorState.files.update((f) => { f.set(path, ''); return f; });
      this.terminalState.addEntry('info', 'Files', `Created missing include: ${name}`);
      changed = true;
    }
    if (changed) {
      this.projectState.setProject(this.projectState.projectName(), this.editorState.files());
    }
  }

  private buildDataFromVariables(variables: PugVariable[], translationKeys: string[] = []): Record<string, unknown> {
    const data = buildDataSkeleton(variables);
    if (translationKeys.length > 0) {
      const existing = data[TRANSLATIONS_KEY];
      data[TRANSLATIONS_KEY] = {
        ...(existing !== null && typeof existing === 'object' && !Array.isArray(existing) ? (existing as object) : {}),
        ...buildTranslationSkeleton(translationKeys),
      };
    }
    return data;
  }

  /** Merges `source` into `target`, filling in only keys missing from `target` (recursing into plain objects). Never touches arrays or primitives already present. Returns whether anything changed. */
  private deepMergeMissing(target: Record<string, unknown>, source: Record<string, unknown>): boolean {
    let changed = false;
    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      if (!(key in target)) {
        target[key] = sourceValue;
        changed = true;
        continue;
      }
      const targetValue = target[key];
      // An untouched placeholder ('' / null) read as a plain value earlier must give way once the template reads its members.
      if ((targetValue === '' || targetValue === null) && sourceValue !== null && typeof sourceValue === 'object') {
        target[key] = sourceValue;
        changed = true;
        continue;
      }
      const bothPlainObjects =
        sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
        targetValue !== null && typeof targetValue === 'object' && !Array.isArray(targetValue);
      if (bothPlainObjects) {
        if (this.deepMergeMissing(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>)) {
          changed = true;
        }
      } else if (Array.isArray(sourceValue) && Array.isArray(targetValue) && sourceValue[0] !== null && typeof sourceValue[0] === 'object' && !Array.isArray(sourceValue[0])) {
        // New fields the template reads on array items must exist on every existing item.
        for (const item of targetValue) {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            if (this.deepMergeMissing(item as Record<string, unknown>, sourceValue[0] as Record<string, unknown>)) changed = true;
          }
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
