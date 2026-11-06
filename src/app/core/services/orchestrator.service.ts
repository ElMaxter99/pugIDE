import { Injectable, computed, inject, signal } from '@angular/core';
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
import { DiagnosticsState } from '../state/diagnostics.state';
import { FileHistoryService } from './file-history.service';
import { FileVersion } from '../utils/history.util';
import { helperExportNames } from '../utils/helpers.util';
import { ProjectSnapshotService, RestoreOutcome, SaveOutcome } from './project-snapshot.service';
import { SnapshotState } from '../state/snapshot.state';
import type { SnapshotContent, SnapshotMeta } from '../models/project-snapshot.model';
import { autoSnapshotName, cleanSnapshotName, defaultSnapshotName, diffAssetMaps, diffFileMaps, formatBytes } from '../utils/snapshot.util';
import { buildDiagnostics, Diagnostic } from '../utils/diagnostics.util';
import { includeSpecifier, includesFile } from '../utils/error-explain.util';
import { appendMixin, insertInclude, replaceOnLine } from '../utils/fix-apply.util';
import { PreferencesState } from './preferences.state';
import { ProjectState } from '../state/project.state';
import { PersistenceService, ProjectSessionState } from './persistence.service';
import { ProjectLibraryService } from './project-library.service';
import { htmlWeightHints, newHints, unusedDataKeys, QualityHint } from '../utils/quality-hints.util';
import { PROJECT_TEMPLATES } from '../utils/templates.util';
import { DEFAULT_PROJECT_DATA, DEFAULT_PROJECT_NAME, defaultProjectFiles } from '../utils/default-project.util';
import { AssetState, AssetFile } from '../state/asset.state';
import { AssetStorageService } from './asset-storage.service';
import { inlineLocalStylesheets, isStylePath } from '../utils/style-refs.util';
import { ASSET_EXT_RE, mimeForPath, refToPath, rewriteRefs } from '../utils/asset.util';
import { DiagnosticFix, PugVariable } from '../models/index';
import { getFileType } from '../models/tab.model';
import { buildDataSkeleton } from '../utils/data-skeleton.util';
import { errorifyData, mockifyData, mockLeaf } from '../utils/mock-data.util';
import { DatasetKind, DatasetsFile, parseDatasetsFile } from '../utils/datasets.util';
import { inferData } from '../utils/schema-infer.util';
import { buildTranslationSkeleton, TRANSLATIONS_KEY } from '../utils/i18n.util';
import {
  addMissingKeys, blankTranslations, isValidLocaleCode, listLocales, localePath, parseTranslations, resolveLocale, serializeTranslations,
} from '../utils/locales.util';
import { findEntryPath, isPugFile, listTemplates, normalize, pinnedAfterDelete, pinnedAfterRename, resolveVirtualPath, validPinned } from '../utils/pug-vfs.util';

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
  private history = inject(FileHistoryService);
  private diagnosticsState = inject(DiagnosticsState);
  private preferences = inject(PreferencesState);
  private projectState = inject(ProjectState);
  private persistence = inject(PersistenceService);
  private assetState = inject(AssetState);
  private assetStorage = inject(AssetStorageService);
  private library = inject(ProjectLibraryService);
  private snapshots = inject(ProjectSnapshotService);
  private snapshotState = inject(SnapshotState);

  private codeChange$ = new Subject<string>();
  private isProcessing = false;
  private recompileRequested = false;
  private createMissingRequested = false;
  private initialDataLoaded = false;
  private assetsReady = false;
  private libraryWarned = false;
  private fileOps: FileOp[] = [];
  private hintKeys = new Set<string>();
  /** Descripción de la última operación de archivos que se puede deshacer (null si no hay). */
  readonly fileUndoLabel = signal<string | null>(null);

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
    await Promise.all([this.parser.initialize(), this.compiler.initialize()]);
    this.terminalState.addEntry('info', 'Sistema', 'PugIDE listo.', undefined, true);
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
      // Una elección que ya no es válida (el archivo desapareció) se descarta: vuelve la vista automática.
      if (this.previewState.pinnedEntry() && !validPinned(this.previewState.pinnedEntry(), files)) this.previewState.pinnedEntry.set(null);
      const entryPath = findEntryPath(files, activePath, this.previewState.pinnedEntry());
      if (!entryPath) {
        this.previewState.updateCompiledResult({ html: '', css: '', errors: [], compilationTime: 0 });
        this.diagnosticsState.clear();
        return;
      }
      this.previewState.entryPath.set(entryPath);
      // The active tab's live content wins over the stored copy (it is the one being typed).
      const entryCode = entryPath === activePath ? this.editorState.editorContent() : (files.get(entryPath) ?? '');
      if (entryPath === activePath) files.set(entryPath, entryCode);

      const rawParseResult = await this.parser.parse(entryCode, entryPath);
      if (createMissing && rawParseResult.includes.length > 0) {
        this.ensureIncludeFiles(rawParseResult.includes, entryPath);
      }

      const parseResult = await this.parser.parse(entryCode, entryPath, files);
      // Lo que exportan los helpers (/helpers.js) no es un dato: no se crean campos para esos nombres (se leen del texto: el JS del usuario solo se ejecuta en el Worker aislado del render).
      const helperNames = helperExportNames(files);
      if (helperNames.size) parseResult.variables = parseResult.variables.filter((v) => !helperNames.has(v.path.split('.')[0]));
      this.parserState.updateFromParseResult(parseResult);
      this.parserState.setParsing(false);

      // Con `/locales/<código>/translations.json` las claves t('…') van a esos archivos y no a los datos.
      const locales = listLocales(files.keys());
      if (locales.join() !== this.locales().join()) this.locales.set(locales);
      const dataKeys = locales.length ? [] : parseResult.translationKeys;

      if (!this.initialDataLoaded && Object.keys(this.dataState.data()).length === 0) {
        const data = this.skeletonForActiveDataset(parseResult.variables, dataKeys);
        if (Object.keys(data).length > 0) {
          this.dataState.setInitialData(data);
          this.initialDataLoaded = true;
        }
      }

      const skeleton = this.skeletonForActiveDataset(parseResult.variables, dataKeys);
      const patchedData = structuredClone(this.dataState.data());
      const ds = this.dataState.activeDataset();
      const mockOpts = { seed: ds?.seed ?? 1, locale: this.dataState.locale() };
      // Un texto de ejemplo autogenerado cede su sitio si el template pasa a leer sus miembros; un valor editado no.
      const isAutoLeaf = ds?.kind === 'empty' || ds?.kind === 'error' ? undefined
        : (path: string, v: unknown) => typeof v === 'string' && v === mockLeaf(path.split('.').pop() ?? path, path, mockOpts);
      // El juego "Error" conserva nulos a propósito: no se sustituyen por objetos al autocompletar.
      if (this.deepMergeMissing(patchedData, skeleton, ds?.kind !== 'error', isAutoLeaf)) {
        this.dataState.patchMissingData(patchedData);
        this.terminalState.addEntry(
          'info',
          'Datos',
          'Se han creado datos de ejemplo para nuevas referencias del template. Revisa el editor de datos para ajustarlos.'
        );
      }

      for (const error of parseResult.errors) {
        this.terminalState.addEntry(
          error.severity,
          'Pug',
          `Línea ${error.line}:${error.column} - ${error.message}`
        );
      }

      const localeInfo = this.syncLocales(files, locales, parseResult.translationKeys);
      const data = localeInfo.translations
        ? { ...this.dataState.data(), [TRANSLATIONS_KEY]: localeInfo.translations }
        : this.dataState.data();
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
        this.reportQualityHints(parseResult, data, compileResult.html);
        compileResult.html = annotateHtmlLines(compileResult.html);
        compileResult.html = injectIntoBody(compileResult.html, `<script>${INSPECTOR_SCRIPT}</script>`);
      }

      this.previewState.updateCompiledResult(compileResult);
      this.diagnosticsState.set(buildDiagnostics({
        entryPath,
        parseErrors: parseResult.errors,
        compileErrors: compileResult.errors,
        styleErrors: scssResult.errors,
        extra: localeInfo.diagnostics,
      }));

      for (const error of compileResult.errors) {
        const at = error.path ?? entryPath;
        this.terminalState.addEntry(
          error.severity,
          error.source,
          `Línea ${error.line ?? '?'} - ${error.message}${error.hint ? `\n${error.hint}` : ''}`,
          error.line ? { path: at, line: error.line } : undefined,
        );
      }

      for (const scssError of scssResult.errors) {
        this.terminalState.addEntry('error', 'Estilos', `${scssError.path} - ${scssError.line ? `línea ${scssError.line}: ` : ''}${scssError.message}`, scssError.line ? { path: scssError.path, line: scssError.line } : undefined);
      }

      if (parseResult.errors.length === 0 && compileResult.errors.length === 0) {
        this.terminalState.addEntry(
          'success',
          'Compilador',
          `Compilado en ${Math.round(compileResult.compilationTime)} ms`,
          undefined,
          true
        );
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.terminalState.addEntry('error', 'Sistema', error.message);
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

  /** Avisos no bloqueantes (datos sin usar, peso del HTML); cada uno se muestra una vez hasta que desaparece. */
  private reportQualityHints(parseResult: { variables: PugVariable[]; errors: unknown[] }, data: Record<string, unknown>, html: string): void {
    const hints: QualityHint[] = [...htmlWeightHints(html, new TextEncoder().encode(html).length)];
    if (parseResult.errors.length === 0 && parseResult.variables.length > 0) {
      const unused = unusedDataKeys(data, parseResult.variables.map((v) => v.path.split('.')[0]));
      if (unused.length > 0) {
        hints.push({ key: `unused:${unused.join(',')}`, severity: 'info', message: `Datos que la plantilla no parece usar: ${unused.join(', ')}.` });
      }
    }
    for (const h of newHints(hints, this.hintKeys)) this.terminalState.addEntry(h.severity, 'Calidad', h.message);
    this.hintKeys = new Set(hints.map((h) => h.key));
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
        this.terminalState.addEntry('warning', 'Archivos', list.length === 1
          ? `Falta 1 archivo referenciado: ${list[0]}. Súbelo desde el panel de archivos.`
          : `Faltan ${list.length} archivos referenciados: ${list.join(', ')}. Súbelos desde el panel de archivos.`);
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
      if (isStylePath(file.name)) {
        const path = targetPath ?? '/styles/' + file.name.replace(/\s+/g, '-');
        this.addFile(path, path.split('/').pop()!, await file.text());
        added.push(path);
        continue;
      }
      if (!targetPath && !ASSET_EXT_RE.test(file.name)) {
        this.terminalState.addEntry('warning', 'Archivos', `${file.name}: tipo no soportado (imágenes, fuentes y hojas de estilo).`);
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
    this.terminalState.addEntry('success', 'Archivos', `Añadido: ${added.join(', ')}`);
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

  /** Usa estos assets (p. ej. los de la biblioteca cuando la sesión se recupera de ella) y recompila. */
  useAssets(list: AssetFile[]): void {
    this.assetsReady = true;
    if (list.length === 0) return;
    this.assetState.replaceAll(list);
    this.refreshTree();
    void this.manualCompile();
  }

  /** Sessions that start without stored assets (demo, empty project) must not wipe them before a restore. */
  markAssetsReady(): void {
    this.assetsReady = true;
  }

  async saveAssets(): Promise<void> {
    if (!this.assetsReady) return;
    const ok = await this.assetStorage.save([...this.assetState.assets().values()]);
    if (!ok) this.terminalState.addEntry('warning', 'Archivos', 'No se pudieron guardar las imágenes en el navegador (almacenamiento lleno o bloqueado).');
    await this.saveToLibrary();
  }

  /** Asigna el id del proyecto activo en la biblioteca (uno nuevo si no se indica) y lo recuerda. */
  adoptProjectId(id?: string | null): string {
    const value = id || this.library.newId();
    this.projectState.projectId.set(value);
    this.persistence.saveCurrentProjectId(value);
    return value;
  }

  /** Guarda el proyecto activo en la biblioteca (IndexedDB), con sus assets. Espera a que los assets estén cargados. */
  async saveToLibrary(): Promise<void> {
    const id = this.projectState.projectId();
    const session = this.buildSession();
    if (!id || !session || !this.assetsReady) return;
    const ok = await this.library.save(id, { session, assets: [...this.assetState.assets().values()] });
    if (!ok && !this.libraryWarned) {
      this.libraryWarned = true;
      this.terminalState.addEntry('warning', 'Proyectos', 'No se pudo guardar el proyecto en la biblioteca del navegador (almacenamiento lleno o bloqueado).');
    }
  }

  /** Abre un proyecto guardado en la biblioteca (guardando antes el actual). */
  async openProject(id: string): Promise<boolean> {
    if (id === this.projectState.projectId()) return true;
    await this.saveToLibrary();
    const snap = await this.library.load(id);
    if (!snap || Object.keys(snap.session.files).length === 0) {
      this.terminalState.addEntry('error', 'Proyectos', 'No se pudo abrir el proyecto: no está en la biblioteca.');
      return false;
    }
    const { session } = snap;
    this.loadProject(
      new Map(Object.entries(session.files)), session.projectName, snap.assets,
      session.datasets ? parseDatasetsFile(session.datasets) : null, null,
      { id, openTabPaths: session.openTabPaths, activeTabPath: session.activeTabPath, previewEntry: session.previewEntry },
    );
    return true;
  }

  /** Crea un proyecto nuevo, vacío o desde una plantilla de inicio (guardando antes el actual). */
  async createProject(name?: string, templateId?: string): Promise<void> {
    await this.saveToLibrary();
    const existing = (await this.library.list()).map((p) => p.name);
    const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
    const files = template ? new Map(Object.entries(template.files)) : defaultProjectFiles();
    const data = structuredClone(template ? template.data : DEFAULT_PROJECT_DATA);
    this.loadProject(files, uniqueProjectName(name?.trim() || template?.name || DEFAULT_PROJECT_NAME, existing), [], null, data);
  }

  /** Borra un proyecto de la biblioteca; si era el activo, abre el más reciente o crea uno nuevo. */
  async deleteProject(id: string): Promise<void> {
    const wasCurrent = id === this.projectState.projectId();
    if (wasCurrent) this.projectState.projectId.set(null); // evita que el guardado previo al cambio lo vuelva a escribir
    await this.library.remove(id);
    void this.history.removeProject(id);
    void this.snapshots.removeProject(id);
    if (!wasCurrent) return;
    const next = (await this.library.list())[0];
    if (!next || !(await this.openProject(next.id))) await this.createProject();
  }

  /** Cambia el nombre de un proyecto (el activo se renombra en memoria y se guarda con la sesión). */
  async renameProject(id: string, name: string): Promise<void> {
    const clean = name.trim();
    if (!clean) return;
    if (id === this.projectState.projectId()) {
      this.projectState.projectName.set(clean);
      this.saveSession();
      await this.saveToLibrary();
    } else {
      await this.library.rename(id, clean);
    }
  }

  /** Duplica un proyecto de la biblioteca (guardando antes el actual) y devuelve el id de la copia. */
  async duplicateProject(id: string): Promise<string | null> {
    await this.saveToLibrary();
    const list = await this.library.list();
    const source = list.find((p) => p.id === id);
    if (!source) return null;
    return this.library.duplicate(id, uniqueProjectName(`${source.name} (copia)`, list.map((p) => p.name)));
  }

  private refreshTree(): void {
    this.projectState.setAssetPaths(this.assetState.paths(), this.editorState.files());
  }

  private buildSession(): ProjectSessionState | null {
    const files = this.editorState.files();
    if (files.size === 0) return null;
    return {
      projectName: this.projectState.projectName(),
      files: Object.fromEntries(files),
      openTabPaths: this.editorState.openTabs().map((t) => t.path),
      activeTabPath: this.editorState.activeTab()?.path ?? null,
      datasets: this.dataState.snapshotDatasets(),
      ...(this.previewState.pinnedEntry() ? { previewEntry: this.previewState.pinnedEntry()! } : {}),
    };
  }

  saveSession(): void {
    const session = this.buildSession();
    if (!session) return;
    this.persistence.saveProjectState(session);
    void this.saveToLibrary();
    this.trackHistory();
  }

  // ---- Historial local por archivo ----

  /** Último contenido visto de cada archivo (`<proyecto>\0<ruta>`): detecta cambios y da la versión «inicial». */
  private seen = new Map<string, string>();
  private historyInflight = new Set<string>();

  private historyKey(projectId: string, path: string): string {
    return projectId + '\u0000' + path;
  }

  /** Contenido actual de un archivo, incluido lo que se está escribiendo. */
  currentContent(path: string): string {
    return this.editorState.activeTab()?.path === path ? this.editorState.editorContent() : (this.editorState.files().get(path) ?? '');
  }

  /** Versiones guardadas del archivo, la más reciente primero. */
  async fileHistory(path: string): Promise<FileVersion[]> {
    const pid = this.projectState.projectId();
    return pid ? this.history.list(pid, path) : [];
  }

  /** Guarda versiones automáticas de los archivos que cambiaron desde la última vez (como mucho una cada pocos minutos). */
  private trackHistory(): void {
    const pid = this.projectState.projectId();
    if (!pid) return;
    for (const path of this.editorState.files().keys()) {
      const content = this.currentContent(path);
      const key = this.historyKey(pid, path);
      const prev = this.seen.get(key);
      if (prev === undefined) { this.seen.set(key, content); continue; }
      if (prev === content || this.historyInflight.has(key)) continue;
      this.historyInflight.add(key);
      void this.history.record(pid, path, content, 'automático', { auto: true, previous: prev }).then((outcome) => {
        this.historyInflight.delete(key);
        if (outcome === 'added' || outcome === 'same') this.seen.set(key, content);
      });
    }
  }

  /** Guardar (Ctrl+S): guarda una versión del archivo activo, guarda la sesión y compila. */
  saveFile(): void {
    this.editorState.saveCurrentFile();
    const path = this.editorState.activeTab()?.path;
    const pid = this.projectState.projectId();
    if (path && pid) {
      const key = this.historyKey(pid, path);
      const content = this.currentContent(path);
      const previous = this.seen.get(key);
      this.seen.set(key, content);
      void this.history.record(pid, path, content, 'guardado', { previous });
    }
    this.saveSession();
    void this.manualCompile();
  }

  /** Guarda ahora una versión de estos archivos (por ejemplo antes de un reemplazo en todo el proyecto). */
  snapshotFiles(paths: string[], reason: string): void {
    const pid = this.projectState.projectId();
    if (!pid) return;
    for (const path of paths) void this.history.record(pid, path, this.currentContent(path), reason, { previous: this.seen.get(this.historyKey(pid, path)) });
  }

  /** Vuelve el archivo a una versión guardada; antes guarda su estado actual para poder deshacerlo. */
  async restoreVersion(path: string, content: string): Promise<void> {
    const pid = this.projectState.projectId();
    if (pid) await this.history.record(pid, path, this.currentContent(path), 'antes de restaurar');
    const files = this.editorState.files();
    if (!files.has(path)) return;
    files.set(path, content);
    if (this.editorState.activeTab()?.path === path) this.editorState.updateContent(content);
    // Monaco recibe el cambio como una edición (Ctrl+Z lo deshace) y recompila.
    this.editorState.notifyFileSync([path]);
    if (pid) this.seen.set(this.historyKey(pid, path), content);
    this.terminalState.addEntry('success', 'Historial', `${path} vuelve a una versión anterior (el estado previo queda en el historial).`);
    this.saveSession();
    void this.manualCompile();
  }

  // ---- Instantáneas del proyecto ----

  /** El proyecto tal como está ahora (incluido lo que se está escribiendo) en forma de instantánea. */
  currentSnapshotContent(): SnapshotContent {
    const files: Record<string, string> = {};
    for (const path of this.editorState.files().keys()) files[path] = this.currentContent(path);
    return {
      files,
      assets: [...this.assetState.assets().values()].map((a) => ({ path: a.path, mime: a.mime, data: a.data })),
      datasets: this.dataState.snapshotDatasets(),
    };
  }

  /** Vuelve a leer las instantáneas del proyecto activo. */
  async refreshSnapshots(): Promise<SnapshotMeta[]> {
    const pid = this.projectState.projectId();
    this.snapshotState.loading.set(true);
    const list = pid ? await this.snapshots.list(pid) : [];
    this.snapshotState.items.set(list);
    this.snapshotState.loading.set(false);
    return list;
  }

  /** Contenido guardado de una instantánea (para compararla). */
  loadSnapshotContent(id: string): Promise<SnapshotContent | null> {
    return this.snapshots.load(id);
  }

  /**
   * Guarda una instantánea del proyecto actual. Sin `replaceOldest`, si ya hay 20 no guarda y devuelve `full`
   * (la interfaz lo avisa antes de eliminar nada). Un proyecto demasiado grande no se guarda y se dice por qué.
   */
  async saveSnapshot(rawName: string | null, opts: { auto?: boolean; replaceOldest?: boolean } = {}): Promise<SaveOutcome> {
    const pid = this.projectState.projectId();
    if (!pid) return { ok: false, reason: 'unavailable' };
    const at = Date.now();
    const name = (rawName && cleanSnapshotName(rawName)) || defaultSnapshotName(at);
    const outcome = await this.snapshots.save(pid, name, this.currentSnapshotContent(), { ...opts, at });
    if (outcome.ok) {
      this.terminalState.addEntry('success', 'Instantáneas', `Instantánea «${name}» guardada${outcome.replaced ? `; se eliminó la más antigua («${outcome.replaced.name}»)` : ''}.`);
    } else if (outcome.reason === 'too-big') {
      this.terminalState.addEntry('warning', 'Instantáneas', `No se guardó «${name}»: el proyecto ocupa ${formatBytes(outcome.bytes)} y el tope por instantánea es ${formatBytes(outcome.max)}.`);
    } else if (outcome.reason === 'unavailable') {
      this.terminalState.addEntry('warning', 'Instantáneas', `No se pudo guardar «${name}» en el navegador (almacenamiento lleno o bloqueado).`);
    }
    await this.refreshSnapshots();
    return outcome;
  }

  async renameSnapshot(id: string, rawName: string): Promise<boolean> {
    const pid = this.projectState.projectId();
    const name = cleanSnapshotName(rawName);
    if (!pid || !name) return false;
    const ok = await this.snapshots.rename(pid, id, name);
    await this.refreshSnapshots();
    return ok;
  }

  async deleteSnapshot(id: string): Promise<boolean> {
    const ok = await this.snapshots.remove(id);
    await this.refreshSnapshots();
    return ok;
  }

  /**
   * Restaura el proyecto a una instantánea. Antes guarda el estado actual como «Antes de restaurar…» (si eso no es
   * posible, no se restaura nada) y el historial por archivo de lo que cambia. Los archivos modificados se aplican como
   * ediciones del editor, así que Ctrl+Z los deshace. Conserva el nombre del proyecto, las pestañas que siguen existiendo
   * y el historial; trae de la instantánea archivos, assets y juegos de datos (idiomas incluidos).
   */
  async restoreSnapshot(id: string, opts: { replaceOldest?: boolean } = {}): Promise<RestoreOutcome> {
    const pid = this.projectState.projectId();
    if (!pid) return { ok: false, reason: 'unavailable' };
    const meta = this.snapshotState.items().find((s) => s.id === id) ?? (await this.refreshSnapshots()).find((s) => s.id === id);
    const target = meta ? await this.snapshots.load(id) : null;
    if (!meta || !target) return { ok: false, reason: 'missing' };

    const safety = await this.saveSnapshot(autoSnapshotName(meta.name), { auto: true, replaceOldest: opts.replaceOldest });
    if (!safety.ok) return safety;

    const current = this.currentSnapshotContent();
    const files = this.editorState.files();
    const wanted = new Map(Object.entries(target.files));
    const changes = diffFileMaps(wanted, new Map(Object.entries(current.files)));

    // El historial por archivo conserva lo que se va a cambiar o quitar.
    for (const path of [...changes.modified, ...changes.added]) {
      void this.history.record(pid, path, current.files[path], 'antes de restaurar', { previous: this.seen.get(this.historyKey(pid, path)) });
    }
    for (const path of changes.added) {
      files.delete(path);
      this.seen.delete(this.historyKey(pid, path));
      this.editorState.closeTabByPath(path);
    }
    const touched = [...changes.modified, ...changes.removed];
    for (const path of touched) {
      const text = wanted.get(path) ?? '';
      files.set(path, text);
      this.seen.set(this.historyKey(pid, path), text);
    }
    const active = this.editorState.activeTab();
    if (active && changes.modified.includes(active.path)) this.editorState.updateContent(wanted.get(active.path) ?? '');
    // Monaco recibe los cambios como ediciones (Ctrl+Z los deshace).
    if (touched.length) this.editorState.notifyFileSync(touched);
    if (!this.editorState.activeTab()) {
      const first = [...files.keys()].find(isPugFile) ?? [...files.keys()][0];
      if (first) this.editorState.openFile(first, first.split('/').pop() ?? first, getFileType(first), files.get(first) ?? '');
    }

    const assetsChanged = (() => {
      const d = diffAssetMaps(new Map(target.assets.map((a) => [a.path, a])), new Map(current.assets.map((a) => [a.path, a])));
      return d.added.length + d.removed.length + d.modified.length > 0;
    })();
    if (assetsChanged) {
      this.assetState.replaceAll(target.assets.map((a) => ({ path: a.path, mime: a.mime, data: a.data })));
      this.refreshTree();
    }
    if (target.datasets && JSON.stringify(target.datasets) !== JSON.stringify(current.datasets)) this.dataState.restoreDatasets(target.datasets);

    this.projectState.setProject(this.projectState.projectName(), files);
    if (assetsChanged) this.refreshTree();
    this.terminalState.addEntry('success', 'Instantáneas', `Proyecto restaurado a «${meta.name}» (el estado anterior queda en «${safety.meta.name}»).`);
    this.saveSession();
    if (assetsChanged) void this.saveAssets();
    void this.manualCompile();
    return { ok: true, safety: safety.meta, replaced: safety.replaced };
  }

  /** Replaces the whole in-memory project (used by import) and recompiles from scratch. */
  loadProject(
    files: Map<string, string>, projectName: string, assets: AssetFile[] = [], datasets?: DatasetsFile | null,
    data?: Record<string, unknown> | null, opts: { id?: string; openTabPaths?: string[]; activeTabPath?: string | null; previewEntry?: string | null } = {},
  ): void {
    this.fileOps = [];
    this.hintKeys = new Set();
    this.fileUndoLabel.set(null);
    void this.saveToLibrary(); // guarda el proyecto que se va a reemplazar (el estado se captura ya, antes de cambiarlo)
    this.assetsReady = true;
    this.adoptProjectId(opts.id);
    this.assetState.replaceAll(assets);
    this.editorState.openTabs.set([]);
    this.editorState.activeTabId.set(null);
    this.editorState.editorContent.set('');
    this.editorState.files.set(files);
    this.editorState.bumpResetToken();

    this.previewState.pinnedEntry.set(validPinned(opts.previewEntry, files));
    this.projectState.setProject(projectName, files);
    if (datasets) this.dataState.restoreDatasets(datasets);
    else this.dataState.resetDatasets();
    this.dataState.setInitialData(datasets ? this.dataState.data() : (data ?? {}));
    this.initialDataLoaded = false;

    const firstPugPath = Array.from(files.keys()).find(isPugFile) ?? Array.from(files.keys())[0];
    if (firstPugPath) {
      const name = firstPugPath.split('/').pop() ?? firstPugPath;
      this.editorState.openFile(firstPugPath, name, getFileType(name), files.get(firstPugPath) ?? '');
    }
    for (const path of opts.openTabPaths ?? []) {
      if (path === firstPugPath || !files.has(path)) continue;
      const tabName = path.split('/').pop() ?? path;
      this.editorState.openFile(path, tabName, getFileType(tabName), files.get(path) ?? '');
    }
    const active = opts.activeTabPath && this.editorState.openTabs().find((t) => t.path === opts.activeTabPath);
    if (active) this.editorState.selectTab(active.id);

    this.terminalState.addEntry(
      'success',
      'Proyecto',
      `Proyecto «${projectName}» cargado (${files.size} archivo${files.size === 1 ? '' : 's'}).`
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
    const entryPath = findEntryPath(files, this.editorState.activeTab()?.path, this.previewState.pinnedEntry());
    const { variables, translationKeys } = await this.parser.parseProject(files, entryPath);
    if (variables.length === 0 && translationKeys.length === 0) return {};
    return this.buildDataFromVariables(variables, translationKeys);
  }

  /** Esqueleto de datos que faltan: con mocks realistas, salvo en los juegos "Vacío" (sin mocks) y "Error" (nulos). */
  private skeletonForActiveDataset(variables: PugVariable[], translationKeys: string[]): Record<string, unknown> {
    const skeleton = this.buildDataFromVariables(variables, translationKeys);
    const ds = this.dataState.activeDataset();
    if (ds?.kind === 'empty') return skeleton;
    if (ds?.kind === 'error') return errorifyData(skeleton);
    return mockifyData(skeleton, { seed: ds?.seed ?? 1, locale: this.dataState.locale() });
  }

  /** Datos con todas las claves que usa el template (las del usuario se conservan). */
  private async currentShape(): Promise<Record<string, unknown>> {
    const base = structuredClone(this.dataState.data());
    this.deepMergeMissing(base, await this.clearDataWithKeys());
    return base;
  }

  /** Crea un juego de datos nuevo (Vacío, Lleno, Error o copia personalizada del actual) y lo activa. */
  async createDataset(kind: Exclude<DatasetKind, 'default'>, name?: string): Promise<void> {
    const seed = this.randomSeed();
    const locale = this.dataState.locale();
    let data: Record<string, unknown>;
    let label: string;
    if (kind === 'empty') { data = await this.clearDataWithKeys(); label = 'Vacío'; }
    else if (kind === 'full') { data = mockifyData(await this.currentShape(), { seed, locale, arrayLength: 3 }); label = 'Lleno'; }
    else if (kind === 'error') { data = errorifyData(await this.clearDataWithKeys()); label = 'Error'; }
    else { data = structuredClone(this.dataState.data()); label = 'Personalizado'; }
    this.dataState.addDataset(name?.trim() || label, data, seed, kind);
    this.onDataChange();
  }

  switchDataset(id: string): void {
    this.dataState.switchDataset(id);
    this.onDataChange();
  }

  deleteDataset(id: string): boolean {
    const ok = this.dataState.removeDataset(id);
    if (ok) this.onDataChange();
    return ok;
  }

  duplicateDataset(id: string): void {
    if (this.dataState.duplicateDataset(id)) this.onDataChange();
  }

  /** Sustituye los valores del juego activo por datos de ejemplo nuevos (con undo). */
  async regenerateMocks(seed = this.randomSeed()): Promise<void> {
    const shape = await this.currentShape();
    this.dataState.setData(mockifyData(shape, { seed, locale: this.dataState.locale() }));
    this.dataState.setSeed(seed);
    this.onDataChange();
  }

  setMockLocale(locale: 'es' | 'en'): void {
    this.dataState.locale.set(locale);
  }

  /** Importa un JSON de ejemplo, un JSON Schema o un OpenAPI como un juego de datos nuevo. Devuelve el origen detectado. */
  importDataDocument(doc: unknown, label: string, seed = this.randomSeed()): { source: string; warnings: string[] } {
    const res = inferData(doc, { fill: true, seed, locale: this.dataState.locale() });
    this.dataState.addDataset(`Importado: ${label}`, res.data, seed, 'custom');
    this.onDataChange();
    return { source: res.source, warnings: res.warnings };
  }

  private randomSeed(): number {
    return Math.floor(Math.random() * 2147483647);
  }

  /** Aplica un arreglo propuesto por un diagnóstico (crear mixin, añadir include, corregir una errata) y recompila. */
  applyFix(fix: DiagnosticFix): void {
    const files = this.editorState.files();
    // Un solo aviso a Monaco con todos los archivos tocados: avisos seguidos se pisarían (cada uno reemplaza las rutas del anterior).
    const touched = new Set<string>();
    const write = (path: string, content: string): void => {
      if (!files.has(path)) {
        this.addFile(path, path.split('/').pop() ?? path, content);
        return;
      }
      files.set(path, content);
      if (this.editorState.activeTab()?.path === path) this.editorState.updateContent(content);
      touched.add(path);
    };
    const withInclude = (from: string, target: string): void => {
      const src = files.get(from);
      if (src === undefined || includesFile(src, target)) return;
      write(from, insertInclude(src, includeSpecifier(from, target)));
    };

    let reveal: { path: string; line: number } | null = null;
    if (fix.kind === 'createMixin') {
      const r = appendMixin(files.get(fix.path) ?? '', fix.name);
      write(fix.path, r.content);
      if (fix.includeFrom) withInclude(fix.includeFrom, fix.path);
      reveal = { path: fix.path, line: r.line };
    } else if (fix.kind === 'addInclude') {
      withInclude(fix.path, fix.target);
    } else {
      const src = files.get(fix.path);
      const next = src === undefined ? null : replaceOnLine(src, fix.line, fix.from, fix.to);
      if (next === null) {
        this.terminalState.addEntry('warning', 'Arreglo', `No se pudo aplicar «${fix.label}»: el código ya no coincide. Vuelve a compilar.`);
        return;
      }
      write(fix.path, next);
    }
    if (touched.size) this.editorState.notifyFileSync([...touched]);
    this.projectState.setProject(this.projectState.projectName(), files);
    this.terminalState.addEntry('success', 'Arreglo', fix.label);
    // Monaco aplica el cambio en el siguiente ciclo; cambiar de pestaña antes lo dejaría sobre el modelo equivocado.
    if (reveal) {
      const target = reveal;
      setTimeout(() => this.editorState.revealLine(target.path, target.line), 150);
    }
    void this.manualCompile();
  }

  /** Añade al proyecto actual archivos soltados (carpetas incluidas) sin sobrescribir los que ya existen. */
  addDroppedFiles(files: Map<string, string>, assets: AssetFile[]): void {
    const current = this.editorState.files();
    const added: string[] = [];
    const skipped: string[] = [];
    this.editorState.files.update((f) => {
      for (const [path, content] of files) {
        if (f.has(path)) skipped.push(path);
        else { f.set(path, content); added.push(path); }
      }
      return f;
    });
    for (const a of assets) {
      if (this.assetState.assets().has(a.path)) skipped.push(a.path);
      else { this.assetState.add(a.path, a.data, a.mime); added.push(a.path); }
    }
    if (skipped.length) {
      this.terminalState.addEntry('warning', 'Importar', `Ya existían y no se sobrescriben: ${skipped.slice(0, 8).join(', ')}${skipped.length > 8 ? '…' : ''}`);
    }
    if (added.length === 0) return;
    this.projectState.setProject(this.projectState.projectName(), current);
    this.refreshTree();
    const firstPug = [...files.keys()].find((p) => /\.(pug|jade)$/i.test(p));
    if (firstPug && !this.editorState.activeTab()) this.editorState.openFile(firstPug, firstPug.split('/').pop() ?? firstPug, getFileType(firstPug), files.get(firstPug) ?? '');
    this.terminalState.addEntry('success', 'Importar', `Añadido${added.length === 1 ? '' : 's'} ${added.length} archivo${added.length === 1 ? '' : 's'}: ${added.slice(0, 8).join(', ')}${added.length > 8 ? '…' : ''}`);
    // Varias plantillas importadas: la vista previa no salta a ninguna sola; se avisa de cómo elegir.
    const entry = findEntryPath(current, this.editorState.activeTab()?.path, this.previewState.pinnedEntry());
    if (entry && !this.previewState.pinnedEntry() && added.some((p) => isPugFile(p) && p !== entry)) {
      this.terminalState.addEntry('info', 'Vista previa', `Se previsualiza ${entry}. Para ver otra plantilla, usa «Previsualizar este archivo» en el árbol de archivos o en la paleta.`);
    }
    void this.manualCompile();
  }

  addFile(path: string, name: string, content = ''): void {
    this.editorState.files.update((f) => { f.set(path, content); return f; });
    this.projectState.setProject(
      this.projectState.projectName(),
      this.editorState.files()
    );
    this.editorState.openFile(path, name, getFileType(name), content);
  }

  private pushFileOp(op: FileOp): void {
    this.fileOps.push(op);
    if (this.fileOps.length > 20) this.fileOps.shift();
    this.fileUndoLabel.set(describeFileOp(op));
  }

  /** Deshace la última operación de borrado o renombrado de archivos. */
  undoFileOp(): void {
    const op = this.fileOps.pop();
    this.fileUndoLabel.set(this.fileOps.length ? describeFileOp(this.fileOps[this.fileOps.length - 1]) : null);
    if (!op) return;
    if (op.kind === 'rename') {
      this.renameFile(op.to, op.from, false);
      return;
    }
    if (op.asset) {
      this.assetState.add(op.asset.path, op.asset.data, op.asset.mime);
      this.refreshTree();
      void this.manualCompile();
    } else if (op.content !== undefined && !this.editorState.files().has(op.path)) {
      const content = op.content;
      this.editorState.files.update((f) => { f.set(op.path, content); return f; });
      this.projectState.setProject(this.projectState.projectName(), this.editorState.files());
      this.editorState.openFile(op.path, op.path.split('/').pop() ?? op.path, getFileType(op.path), content);
    }
    this.terminalState.addEntry('info', 'Archivos', `Restaurado ${op.path}`);
  }

  renameFile(oldPath: string, newPath: string, record = true): void {
    if (this.assetState.has(oldPath)) {
      if (this.assetState.has(newPath)) return;
      this.assetState.rename(oldPath, newPath);
      if (record) this.pushFileOp({ kind: 'rename', from: oldPath, to: newPath });
      this.refreshTree();
      this.terminalState.addEntry('info', 'Archivos', `Renombrado ${oldPath} → ${newPath}`);
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
    const pid = this.projectState.projectId();
    if (pid) {
      void this.history.rename(pid, oldPath, newPath);
      const seenValue = this.seen.get(this.historyKey(pid, oldPath));
      if (seenValue !== undefined) this.seen.set(this.historyKey(pid, newPath), seenValue);
      this.seen.delete(this.historyKey(pid, oldPath));
    }
    this.editorState.renameOpenTab(oldPath, newPath, name);
    this.projectState.setProject(this.projectState.projectName(), this.editorState.files());
    this.previewState.pinnedEntry.set(pinnedAfterRename(this.previewState.pinnedEntry(), oldPath, newPath));
    // Lo que se está viendo cambió de ruta: la vista previa y su marca en el árbol lo siguen.
    if (this.previewState.entryPath() === oldPath) {
      this.previewState.entryPath.set(newPath);
      void this.manualCompile();
    }
    if (record) this.pushFileOp({ kind: 'rename', from: oldPath, to: newPath });
    this.terminalState.addEntry('info', 'Archivos', `Renombrado ${oldPath} → ${newPath}`);
    this.saveSession(); // el autoguardado no ve este cambio si el archivo no está abierto (el mapa se muta en sitio)
  }

  deleteFile(path: string): void {
    const asset = this.assetState.assets().get(path);
    if (asset) {
      this.pushFileOp({ kind: 'delete', path, asset });
      this.assetState.remove(path);
      this.refreshTree();
      this.terminalState.addEntry('info', 'Archivos', `Eliminado ${path}`);
      void this.manualCompile();
      return;
    }
    const files = this.editorState.files();
    if (!files.has(path)) return;
    const live = this.editorState.activeTab()?.path === path ? this.editorState.editorContent() : files.get(path);
    this.pushFileOp({ kind: 'delete', path, content: live ?? '' });
    this.editorState.files.update((f) => { f.delete(path); return f; });
    this.editorState.closeTabByPath(path);
    this.projectState.setProject(this.projectState.projectName(), this.editorState.files());
    if (this.previewState.pinnedEntry() === path) {
      this.previewState.pinnedEntry.set(pinnedAfterDelete(this.previewState.pinnedEntry(), path));
      this.terminalState.addEntry('info', 'Vista previa', `Se eliminó ${path}, que era el archivo elegido: la vista previa vuelve a ser automática.`);
    }
    this.terminalState.addEntry('info', 'Archivos', `Eliminado ${path}`);
    // Se borró la plantilla que se estaba viendo: se vuelve a renderizar con la que corresponda.
    if (this.previewState.entryPath() === path) void this.manualCompile();
    this.saveSession();
  }

  /**
   * Elige qué plantilla se previsualiza (`null`: automática, la de siempre). Se guarda con el proyecto y recompila.
   * No cambia el archivo abierto en el editor: la persona sigue editando lo que estaba editando.
   */
  setPreviewEntry(path: string | null): Promise<void> {
    const files = this.editorState.files();
    const next = validPinned(path, files);
    if (path && !next) return Promise.resolve();
    if (next === this.previewState.pinnedEntry()) return Promise.resolve();
    this.previewState.pinnedEntry.set(next);
    const auto = findEntryPath(files, this.editorState.activeTab()?.path);
    this.terminalState.addEntry('info', 'Vista previa', next ? `Vista previa: ${next}` : `Vista previa automática${auto ? `: ${auto}` : ''}`);
    this.saveSession();
    return this.manualCompile();
  }

  /** Plantillas que se pueden previsualizar y cuál se renderiza ahora (para la paleta y el árbol). */
  previewChoices(): { templates: string[]; current: string | null; pinned: string | null; auto: string | null } {
    const files = this.editorState.allFileContents();
    return {
      templates: listTemplates(files),
      current: this.previewState.entryPath(),
      pinned: this.previewState.pinnedEntry(),
      auto: findEntryPath(files, this.editorState.activeTab()?.path),
    };
  }

  /** Recupera la elección guardada en la sesión (si el archivo sigue ahí). */
  restorePreviewEntry(path: string | null | undefined): void {
    this.previewState.pinnedEntry.set(validPinned(path, this.editorState.files()));
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
    this.terminalState.addEntry('info', 'Archivos', `Duplicado ${path} como ${newPath}`);
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
      this.terminalState.addEntry('info', 'Archivos', `Include que faltaba creado: ${name}`);
      changed = true;
    }
    if (changed) {
      this.projectState.setProject(this.projectState.projectName(), this.editorState.files());
    }
  }

  /**
   * Con idiomas en `/locales/`: añade a cada `translations.json` las claves `t('…')` que le faltan (vacías, para
   * traducirlas) y devuelve las traducciones del idioma activo, que sustituyen a `data.translations` al compilar.
   */
  private syncLocales(files: Map<string, string>, locales: string[], keys: string[]): { translations: Record<string, unknown> | null; diagnostics: Diagnostic[] } {
    if (!locales.length) return { translations: null, diagnostics: [] };
    const diagnostics: Diagnostic[] = [];
    const parsed = new Map<string, Record<string, unknown>>();
    const changed: string[] = [];
    for (const code of locales) {
      const path = localePath(code);
      const r = parseTranslations(files.get(path) ?? '');
      if (r.error) {
        diagnostics.push({ path, line: r.error.line ?? 1, message: r.error.message, severity: 'error', source: 'json' });
        this.terminalState.addEntry('error', 'Idiomas', `${path}: ${r.error.message}`);
        parsed.set(code, {});
        continue;
      }
      // Una clave plana ("HOME.TITLE": "…") ya cuenta como definida.
      const missing = keys.filter((k) => !(k in r.value));
      if (addMissingKeys(r.value, buildTranslationSkeleton(missing))) {
        files.set(path, serializeTranslations(r.value));
        changed.push(path);
      }
      parsed.set(code, r.value);
    }
    if (changed.length) {
      this.editorState.notifyFileSync(changed);
      this.terminalState.addEntry('info', 'Idiomas', `Claves nuevas añadidas (vacías, por traducir) en: ${changed.join(', ')}`);
    }
    const active = resolveLocale(this.dataState.translationLocale(), locales)!;
    return { translations: parsed.get(active) ?? {}, diagnostics };
  }

  /** Idiomas del proyecto (`/locales/<código>/translations.json`); se actualiza en cada compilación (los archivos viven en un Map mutable). */
  readonly locales = signal<string[]>([]);
  /** Idioma que usa el preview: el elegido si existe, si no el primero. */
  readonly activeLocale = computed(() => resolveLocale(this.dataState.translationLocale(), this.locales()));

  /** Cambia el idioma de las traducciones del preview. */
  setTranslationLocale(code: string): void {
    if (this.dataState.translationLocale() === code) return;
    this.dataState.translationLocale.set(code);
    this.saveSession();
    void this.processCode(this.editorState.editorContent(), false);
  }

  /**
   * Añade un idioma. El primero recoge las traducciones que había en los datos (`translations`); los siguientes
   * copian la estructura del primero con los valores vacíos, para traducirlos.
   */
  addLocale(rawCode: string): boolean {
    const code = rawCode.trim();
    if (!isValidLocaleCode(code)) {
      this.terminalState.addEntry('error', 'Idiomas', `«${code}» no es un código de idioma válido (ejemplos: es-ES, es-CAT, en).`);
      return false;
    }
    const path = localePath(code);
    const files = this.editorState.files();
    if (files.has(path)) {
      this.editorState.openFile(path, 'translations.json', 'json', files.get(path) ?? '');
      this.setTranslationLocale(code);
      return true;
    }
    const existing = listLocales(files.keys());
    let seed: Record<string, unknown>;
    let note = '';
    if (existing.length) {
      seed = blankTranslations(parseTranslations(files.get(localePath(existing[0])) ?? '').value);
      note = ` con las claves de ${existing[0]} sin traducir`;
    } else {
      const legacy = this.dataState.data()[TRANSLATIONS_KEY];
      seed = legacy !== null && typeof legacy === 'object' && !Array.isArray(legacy) ? structuredClone(legacy as Record<string, unknown>) : {};
      this.dataState.stripTranslations(TRANSLATIONS_KEY);
      if (Object.keys(seed).length) note = ' con las traducciones que había en los datos';
    }
    this.addFile(path, 'translations.json', serializeTranslations(seed));
    this.locales.set(listLocales(this.editorState.files().keys()));
    this.dataState.translationLocale.set(code);
    this.terminalState.addEntry('success', 'Idiomas', `Idioma ${code} creado en ${path}${note}.`);
    this.saveSession();
    void this.manualCompile();
    return true;
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
  private deepMergeMissing(target: Record<string, unknown>, source: Record<string, unknown>, replacePlaceholders = true, isAutoLeaf?: (path: string, v: unknown) => boolean, prefix = ''): boolean {
    let changed = false;
    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      if (!(key in target)) {
        target[key] = sourceValue;
        changed = true;
        continue;
      }
      const targetValue = target[key];
      const path = prefix ? `${prefix}.${key}` : key;
      // An untouched placeholder ('' / null) read as a plain value earlier must give way once the template reads its members.
      if (replacePlaceholders && (targetValue === '' || targetValue === null || isAutoLeaf?.(path, targetValue)) && sourceValue !== null && typeof sourceValue === 'object') {
        target[key] = sourceValue;
        changed = true;
        continue;
      }
      const bothPlainObjects =
        sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
        targetValue !== null && typeof targetValue === 'object' && !Array.isArray(targetValue);
      if (bothPlainObjects) {
        if (this.deepMergeMissing(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>, replacePlaceholders, isAutoLeaf, path)) {
          changed = true;
        }
      } else if (Array.isArray(sourceValue) && Array.isArray(targetValue) && sourceValue[0] !== null && typeof sourceValue[0] === 'object' && !Array.isArray(sourceValue[0])) {
        // New fields the template reads on array items must exist on every existing item.
        targetValue.forEach((item, i) => {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            if (this.deepMergeMissing(item as Record<string, unknown>, sourceValue[0] as Record<string, unknown>, replacePlaceholders, isAutoLeaf, `${path}.${i}`)) changed = true;
          }
        });
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

/** Nombre que no coincide (sin distinguir mayúsculas) con ninguno de `existing`: `Nombre`, `Nombre (2)`, `Nombre (3)`... */
export function uniqueProjectName(base: string, existing: string[]): string {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} (${n})`.toLowerCase())) n++;
  return `${base} (${n})`;
}

type FileOp =
  | { kind: 'delete'; path: string; content?: string; asset?: AssetFile }
  | { kind: 'rename'; from: string; to: string };

function describeFileOp(op: FileOp): string {
  return op.kind === 'delete' ? `Deshacer borrar ${op.path}` : `Deshacer renombrar ${op.from} → ${op.to}`;
}
