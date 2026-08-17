import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
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
import { PreferencesState } from '../../core/services/preferences.state';

declare const monaco: any;

@Component({
  selector: 'app-editor-panel',
  standalone: true,
  imports: [TabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="editor-section">
      <app-tabs />
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

  private editor: any = null;
  private updateDisposable: { dispose(): void } | null = null;
  private cursorDisposable: { dispose(): void } | null = null;
  private models = new Map<string, any>();

  protected editorReady = signal(false);

  private lastTabId: string | null = null;

  constructor() {
    effect(() => {
      const tab = this.editorState.activeTab();
      if (tab && this.editorReady() && tab.id !== this.lastTabId) {
        this.lastTabId = tab.id;
        this.loadModel(tab);
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
      const content = this.editor.getModel()?.getValue() ?? '';
      this.orchestrator.onCodeChange(content);
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

    // Click-to-navigate for include/extends lines
    this.editor.onMouseDown((e: any) => {
      const pos = e.target?.position;
      if (!pos) return;
      const model = this.editor.getModel();
      if (!model) return;
      const line = model.getLineContent(pos.lineNumber);
      const incMatch = line.match(/^\s*(?:include|extends)\s+['"]?([^'"]+)/);
      if (!incMatch) return;
      const rawPath = incMatch[1].trim();
      const path = rawPath.startsWith('/') ? rawPath : '/' + rawPath;
      const name = path.split('/').pop() ?? 'file';
      const files = this.editorState.files();
      if (!files.has(path)) {
        this.orchestrator.addFile(path, name);
        return;
      }
      this.editorState.openFile(path, name, getFileType(name), files.get(path) ?? '');
    });
  }

  private loadModel(tab: { path: string; type: string; name: string }): void {
    if (!this.editor) return;

    const langMap: Record<string, string> = {
      pug: 'pug',
      scss: 'scss',
      json: 'json',
      javascript: 'javascript',
      html: 'html',
      css: 'css',
    };

    const currentModel = this.editor.getModel();
    if (currentModel) {
      const currentPath = currentModel.uri.path;
      const currentContent = currentModel.getValue();
      this.editorState.files.update((f) => { f.set(currentPath, currentContent); return f; });
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
  }
}
