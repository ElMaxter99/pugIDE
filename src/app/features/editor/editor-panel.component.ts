import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { TabsComponent } from '../../shared/components/tabs/tabs.component';
import { EditorState } from '../../core/state/editor.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { getFileType } from '../../core/models/tab.model';
import { ParserState } from '../../core/state/parser.state';
import {
  DefinitionTarget,
  SearchMatch,
  collectMixins,
  findDefinition,
  formatPug,
  searchProject,
} from '../../core/utils/pug-editor.util';
import { TerminalState } from '../../core/state/terminal.state';
import { PreferencesState } from '../../core/services/preferences.state';

declare const monaco: any;

@Component({
  selector: 'app-editor-panel',
  standalone: true,
  imports: [TabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="editor-section" (keydown)="onHostKeydown($event)">
      <app-tabs />
      @if (searchOpen()) {
        <div class="search-panel" role="search">
          <div class="search-bar">
            <input #searchInput class="search-input" data-testid="project-search" type="text" placeholder="Search in project (Enter: first result, Esc: close)"
              [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" (keydown)="onSearchKey($event)" />
            <button type="button" class="opt" [class.on]="searchCase()" title="Match case" (click)="searchCase.set(!searchCase())">Aa</button>
            <button type="button" class="opt" [class.on]="searchWord()" title="Whole word" (click)="searchWord.set(!searchWord())">ab</button>
            <button type="button" class="opt" [class.on]="searchRegex()" title="Regular expression" (click)="searchRegex.set(!searchRegex())">.*</button>
            <button type="button" class="opt" title="Close" (click)="closeSearch()">&times;</button>
          </div>
          <div class="search-summary">{{ searchResults().length }} results in {{ searchGroups().length }} files</div>
          <div class="search-results">
            @for (g of searchGroups(); track g.path) {
              <div class="result-file">{{ g.path }}</div>
              @for (m of g.matches; track m.line + ':' + m.column) {
                <button type="button" class="result-line" (click)="openAt(m.path, m.line, m.column)">
                  <span class="ln">{{ m.line }}</span>
                  <span class="txt">{{ highlight(m).pre }}<mark>{{ highlight(m).hit }}</mark>{{ highlight(m).post }}</span>
                </button>
              }
            }
          </div>
        </div>
      }
      <div class="editor-canvas">
        @if (!editorState.activeTab()) {
          <div class="empty-editor">
            <span class="material-symbols-outlined empty-icon">description</span>
            <h3>No file open</h3>
            <p>Open a file from the explorer</p>
          </div>
        }
        <div #editorContainer class="monaco-host" [class.hidden]="!editorState.activeTab()"></div>
      </div>
    </section>
  `,
  styles: [`
    .search-panel { border-bottom: 1px solid var(--border-color); background: var(--bg-surface); max-height: 40%; display: flex; flex-direction: column; }
    .search-bar { display: flex; gap: 4px; padding: 6px 8px; }
    .search-input { flex: 1; min-width: 0; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font: inherit; font-size: 13px; }
    .opt { background: transparent; color: var(--text-secondary); border: 1px solid transparent; border-radius: 4px; padding: 0 8px; cursor: pointer; font-size: 12px; }
    .opt.on { color: var(--text-primary); border-color: var(--accent-color); }
    .search-summary { padding: 0 10px 4px; font-size: 11px; color: var(--text-secondary); }
    .search-results { overflow: auto; font-size: 12px; }
    .result-file { padding: 4px 10px; color: var(--text-primary); font-weight: 600; }
    .result-line { display: flex; gap: 8px; width: 100%; text-align: left; background: transparent; border: 0; color: var(--text-secondary); padding: 2px 10px 2px 18px; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .result-line:hover { background: rgba(255, 255, 255, 0.06); }
    .result-line .ln { min-width: 28px; color: var(--text-tertiary); }
    .result-line .txt { white-space: pre; overflow: hidden; text-overflow: ellipsis; }
    mark { background: rgba(221, 183, 255, 0.35); color: inherit; }
    :host {
      display: flex;
      flex-direction: column;
      flex: 1.5;
      min-width: 0;
      border-right: 1px solid var(--border-color);
      height: 100%;
      overflow: hidden;
    }

    .editor-section {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .editor-canvas {
      flex: 1;
      min-height: 0;
      position: relative;
      background: #0a0a0a;
    }

    .monaco-host {
      position: absolute;
      inset: 0;
    }

    .monaco-host.hidden {
      visibility: hidden;
      pointer-events: none;
    }

    :host ::ng-deep .pug-include-link {
      text-decoration: underline;
      cursor: pointer;
      color: #4fc1ff !important;
    }

    .empty-editor {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-secondary);
    }

    .empty-icon {
      font-size: 48px;
      color: var(--text-tertiary);
      opacity: 0.5;
    }

    .empty-editor h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .empty-editor p {
      margin: 0;
      font-size: 13px;
    }
  `],
})
export class EditorPanelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef<HTMLDivElement>;

  protected editorState = inject(EditorState);
  private orchestrator = inject(OrchestratorService);
  private preferences = inject(PreferencesState);
  private terminalState = inject(TerminalState);
  private parserState = inject(ParserState);
  private extraDisposables: { dispose(): void }[] = [];
  private pendingReveal: { path: string; line: number; column: number } | null = null;

  private editor: any = null;
  private updateDisposable: { dispose(): void } | null = null;
  private cursorDisposable: { dispose(): void } | null = null;
  private models = new Map<string, any>();

  protected editorReady = signal(false);

  private lastTabId: string | null = null;
  private lastResetToken = 0;

  constructor() {
    effect(() => {
      const tab = this.editorState.activeTab();
      if (tab && this.editorReady() && tab.id !== this.lastTabId) {
        this.lastTabId = tab.id;
        this.loadModel(tab);
      }
    });

    effect(() => {
      const token = this.editorState.resetToken();
      if (token !== this.lastResetToken) {
        this.lastResetToken = token;
        this.disposeAllModels();
      }
    });

    effect(() => {
      const theme = this.preferences.monacoTheme();
      if (this.editorReady() && typeof monaco !== 'undefined') {
        monaco.editor.setTheme(theme === 'vs-dark' ? 'pugIDE-dark' : 'pugIDE-light');
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.loadMonaco();
  }

  ngOnDestroy(): void {
    this.updateDisposable?.dispose();
    this.cursorDisposable?.dispose();
    this.extraDisposables.forEach((d) => d.dispose());
    this.editor?.dispose();
  }

  private loadMonaco(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof (window as any).monaco !== 'undefined') {
        this.initEditor();
        resolve();
        return;
      }

      const onGotAmdLoader = () => {
        (window as any).require.config({
          paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' },
        });
        (window as any).require(['vs/editor/editor.main'], () => {
          this.initEditor();
          resolve();
        });
      };

      if (!(window as any).require) {
        const loaderScript = document.createElement('script');
        loaderScript.type = 'text/javascript';
        loaderScript.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js';
        loaderScript.addEventListener('load', onGotAmdLoader);
        document.body.appendChild(loaderScript);
      } else {
        onGotAmdLoader();
      }
    });
  }

  private initEditor(): void {
    monaco.editor.defineTheme('pugIDE-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'tag', foreground: '9cdcfe' },
        { token: 'attribute.name', foreground: '9cdcfe' },
        { token: 'attribute.value', foreground: 'ce9178' },
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c586c0' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'delimiter', foreground: 'd4d4d4' },
      ],
      colors: {
        'editor.background': '#0a0a0a',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#ffffff08',
        'editor.selectionBackground': '#45475a',
        'editorCursor.foreground': '#ddb7ff',
        'editorLineNumber.foreground': '#4d4354',
        'editorLineNumber.activeForeground': '#988d9f',
        'editorGutter.background': '#0a0a0a',
        'editorIndentGuide.background': '#262626',
        'editorIndentGuide.activeBackground': '#4d4354',
      },
    });

    monaco.editor.defineTheme('pugIDE-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'tag', foreground: '267f99' },
        { token: 'attribute.name', foreground: '267f99' },
        { token: 'attribute.value', foreground: 'a31515' },
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'af00db' },
        { token: 'string', foreground: 'a31515' },
        { token: 'number', foreground: '098658' },
        { token: 'delimiter', foreground: '000000' },
      ],
      colors: {},
    });

    const initialTheme = this.preferences.monacoTheme() === 'vs-dark' ? 'pugIDE-dark' : 'pugIDE-light';

    this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
      value: '',
      language: 'pug',
      theme: initialTheme,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      wordWrap: 'on',
      tabSize: 2,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      padding: { top: 16 },
      lineHeight: 20,
      suggest: {
        showMethods: true,
        showFunctions: true,
        showVariables: true,
      },
    });

    this.updateDisposable = this.editor.onDidChangeModelContent(() => {
      // Monaco swallows exceptions thrown here and can stop accepting edits (e.g. paste) without
      // any trace, so catch them and surface them in the terminal instead.
      try {
        const content = this.editor.getModel()?.getValue() ?? '';
        this.orchestrator.onCodeChange(content);
      } catch (err) {
        console.error('[PugIDE] Error handling editor change', err);
        this.terminalState.addEntry('error', 'Editor', `Error handling editor change: ${(err as Error)?.message ?? err}`);
      }
    });

    this.cursorDisposable = this.editor.onDidChangeCursorPosition((e: any) => {
      this.editorState.setCursorPosition(e.position.lineNumber, e.position.column);
    });

    this.editor.onKeyDown((e: any) => {
      if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyS) {
        e.preventDefault();
        e.stopPropagation();
        this.editorState.saveCurrentFile();
        this.orchestrator.manualCompile();
      }
    });

    this.editorReady.set(true);

    this.setupNavigation();
    this.setupCompletion();
    this.setupFormatting();
    this.editor.addAction({
      id: 'pug.searchInProject',
      label: 'Search in Project',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: () => this.openSearch(),
    });
  }

  /** Writes the live content of the active model back into the project files so features see unsaved edits. */
  private liveFiles(): Map<string, string> {
    const model = this.editor?.getModel();
    const files = this.editorState.files();
    if (model && model.uri.scheme !== 'inmemory' && files.has(model.uri.path)) {
      files.set(model.uri.path, model.getValue());
    }
    return files;
  }

  private definitionAt(lineNumber: number, column: number): DefinitionTarget | null {
    const model = this.editor.getModel();
    const tab = this.editorState.activeTab();
    if (!model || !tab) return null;
    return findDefinition(this.liveFiles(), tab.path, model.getLineContent(lineNumber), column);
  }

  private goTo(target: DefinitionTarget): void {
    const name = target.path.split('/').pop() ?? 'file';
    if (target.missing) {
      this.orchestrator.addFile(target.path, name);
      return;
    }
    this.openAt(target.path, target.line, target.column);
  }

  /** Opens a file and puts the cursor at line/column (1-based). */
  protected openAt(path: string, line: number, column = 1): void {
    const files = this.editorState.files();
    const name = path.split('/').pop() ?? 'file';
    this.pendingReveal = { path, line, column };
    this.editorState.openFile(path, name, getFileType(name), files.get(path) ?? '');
    const active = this.editorState.activeTab();
    // Same tab already loaded: the model effect will not fire, so reveal now.
    if (active && active.id === this.lastTabId) this.applyReveal();
  }

  private applyReveal(): void {
    const r = this.pendingReveal;
    const model = this.editor?.getModel();
    if (!r || !model || model.uri.path !== r.path) return;
    this.pendingReveal = null;
    const pos = { lineNumber: r.line, column: r.column };
    this.editor.setPosition(pos);
    this.editor.revealPositionInCenter(pos);
    this.editor.focus();
  }

  /** Ctrl/Cmd+click and F12 navigate to include/extends targets and mixin definitions. */
  private setupNavigation(): void {
    const linkDecorations = this.editor.createDecorationsCollection([]);
    const clearLink = () => linkDecorations.clear();

    this.editor.onMouseMove((e: any) => {
      const pos = e.target?.position;
      const ctrl = e.event?.ctrlKey || e.event?.metaKey;
      const hit = pos && ctrl ? this.definitionAt(pos.lineNumber, pos.column) : null;
      if (!hit || !pos) return clearLink();
      linkDecorations.set([{
        range: new monaco.Range(pos.lineNumber, hit.range[0], pos.lineNumber, hit.range[1]),
        options: { inlineClassName: 'pug-include-link' },
      }]);
    });
    this.editor.onMouseLeave(clearLink);
    this.editor.onKeyUp(clearLink);

    this.editor.onMouseDown((e: any) => {
      if (!(e.event?.ctrlKey || e.event?.metaKey)) return;
      const pos = e.target?.position;
      if (!pos) return;
      const hit = this.definitionAt(pos.lineNumber, pos.column);
      if (!hit) return;
      e.event.preventDefault?.();
      clearLink();
      this.goTo(hit);
    });

    this.editor.addAction({
      id: 'pug.goToDefinition',
      label: 'Go to Definition',
      keybindings: [monaco.KeyCode.F12],
      run: () => {
        const pos = this.editor.getPosition();
        const hit = pos ? this.definitionAt(pos.lineNumber, pos.column) : null;
        if (hit) this.goTo(hit);
      },
    });
  }

  /** Completion of parser-detected variables and project mixins. */
  private setupCompletion(): void {
    const provider = monaco.languages.registerCompletionItemProvider('pug', {
      triggerCharacters: ['+'],
      provideCompletionItems: (model: any, position: any) => {
        if (model !== this.editor?.getModel()) return { suggestions: [] };
        const word = model.getWordUntilPosition(position);
        const before: string = model.getLineContent(position.lineNumber).substring(0, position.column - 1);
        const afterPlus = /\+[\w-]*$/.test(before);
        const wordRange = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, position.column);
        const plusRange = new monaco.Range(
          position.lineNumber, word.startColumn - (before.endsWith('+') ? 1 : 0), position.lineNumber, position.column,
        );
        const kind = monaco.languages.CompletionItemKind;
        const suggestions: any[] = [];

        const seen = new Set<string>();
        for (const m of collectMixins(this.liveFiles())) {
          if (seen.has(m.name)) continue;
          seen.add(m.name);
          const params = m.args ? m.args.split(',').map((a) => a.trim()).filter(Boolean) : [];
          const snippet = params.length
            ? `${m.name}(${params.map((p, i) => '${' + (i + 1) + ':' + p.replace(/[}$\\]/g, '') + '}').join(', ')})`
            : m.name;
          suggestions.push({
            label: '+' + m.name,
            filterText: '+' + m.name,
            kind: kind.Function,
            detail: `mixin ${m.name}(${m.args}) - ${m.path}`,
            insertText: '+' + snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: plusRange,
            sortText: '0' + m.name,
          });
        }
        if (afterPlus) return { suggestions };

        for (const v of this.parserState.variables()) {
          suggestions.push({
            label: v.path,
            kind: kind.Variable,
            detail: `${v.type} (detected variable)`,
            insertText: v.path,
            range: wordRange,
            sortText: '1' + v.path,
          });
        }
        return { suggestions };
      },
    });
    this.extraDisposables.push(provider);
  }

  /** Document formatter (Shift+Alt+F / "Format Document"); see formatPug for its limits. */
  private setupFormatting(): void {
    const provider = monaco.languages.registerDocumentFormattingEditProvider('pug', {
      provideDocumentFormattingEdits: (model: any, options: any) => {
        const text = model.getValue();
        const unit = options?.insertSpaces === false ? '\t' : ' '.repeat(options?.tabSize ?? 2);
        const formatted = formatPug(text, unit);
        if (formatted === text) return [];
        return [{ range: model.getFullModelRange(), text: formatted }];
      },
    });
    this.extraDisposables.push(provider);
  }

  // ---- Project search (Ctrl+Shift+F) ----
  protected searchOpen = signal(false);
  protected searchQuery = signal('');
  protected searchCase = signal(false);
  protected searchWord = signal(false);
  protected searchRegex = signal(false);
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  protected searchResults = computed(() => {
    if (!this.searchOpen()) return [];
    return searchProject(this.liveFiles(), this.searchQuery(), {
      caseSensitive: this.searchCase(),
      wholeWord: this.searchWord(),
      regex: this.searchRegex(),
    });
  });
  protected searchGroups = computed(() => {
    const groups: { path: string; matches: SearchMatch[] }[] = [];
    for (const m of this.searchResults()) {
      const last = groups[groups.length - 1];
      if (last && last.path === m.path) last.matches.push(m);
      else groups.push({ path: m.path, matches: [m] });
    }
    return groups;
  });

  openSearch(): void {
    const sel = this.editor?.getSelection();
    const model = this.editor?.getModel();
    if (sel && model && !sel.isEmpty() && sel.startLineNumber === sel.endLineNumber) {
      this.searchQuery.set(model.getValueInRange(sel));
    }
    this.searchOpen.set(true);
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
      this.searchInput?.nativeElement.select();
    });
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.editor?.focus();
  }

  protected onSearchKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.closeSearch();
    if (e.key === 'Enter') {
      const first = this.searchResults()[0];
      if (first) this.openAt(first.path, first.line, first.column);
    }
  }

  protected onHostKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      this.openSearch();
    }
  }

  protected highlight(m: SearchMatch): { pre: string; hit: string; post: string } {
    const start = Math.max(0, m.column - 1 - 30);
    return {
      pre: (start > 0 ? '…' : '') + m.text.substring(start, m.column - 1).trimStart(),
      hit: m.text.substr(m.column - 1, m.length),
      post: m.text.substring(m.column - 1 + m.length, m.column - 1 + m.length + 80),
    };
  }

  private disposeAllModels(): void {
    if (!this.editor) return;
    this.editor.setModel(null);
    for (const model of this.models.values()) {
      model.dispose();
    }
    this.models.clear();
  }

  private loadModel(tab: { path: string; type: string; name: string }): void {
    if (!this.editor) return;

    const langMap: Record<string, string> = {
      pug: 'pug',
      scss: 'scss',
      less: 'less',
      json: 'json',
      javascript: 'javascript',
      html: 'html',
      css: 'css',
    };

    // Monaco auto-creates an implicit `inmemory://` model when the editor is
    // constructed without one — skip it, it's not a real file (see initEditor).
    const currentModel = this.editor.getModel();
    if (currentModel && currentModel.uri.scheme !== 'inmemory') {
      const currentPath = currentModel.uri.path;
      const currentContent = currentModel.getValue();
      // Only write back files that still exist: after a delete, the old model is still the
      // current one here and writing it back would resurrect the file as an invisible ghost.
      if (this.editorState.files().has(currentPath)) {
        this.editorState.files.update((f) => { f.set(currentPath, currentContent); return f; });
      }
    }

    // Drop Monaco models of files that were deleted so a recreated file starts clean.
    const liveFiles = this.editorState.files();
    for (const [path, m] of Array.from(this.models.entries())) {
      if (!liveFiles.has(path) && m !== this.editor.getModel()) {
        m.dispose();
        this.models.delete(path);
      }
    }

    const lang = langMap[tab.type] ?? 'plaintext';
    const uri = monaco.Uri.parse(tab.path);
    let model = this.models.get(tab.path) ?? monaco.editor.getModel(uri);

    if (!model) {
      const content = this.editorState.files().get(tab.path) ?? '';
      model = monaco.editor.createModel(content, lang, uri);
      this.models.set(tab.path, model);
    } else {
      const content = this.editorState.files().get(tab.path);
      if (content !== undefined && model.getValue() !== content) {
        model.setValue(content);
      }
    }

    if (this.editor.getModel() !== model) {
      this.editor.setModel(model);
    }
    this.applyReveal();
  }
}
