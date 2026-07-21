import { Component, ChangeDetectionStrategy, inject, OnInit, HostListener, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TopbarComponent } from '../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { StatusbarComponent } from '../shared/components/statusbar/statusbar.component';
import { EditorPanelComponent } from '../features/editor/editor-panel.component';
import { SmartDataEditorComponent } from '../features/smart-data-editor/smart-data-editor.component';
import { PreviewPanelComponent } from '../features/preview/preview-panel.component';
import { TerminalPanelComponent } from '../features/terminal/terminal-panel.component';
import { inject as vercelInject } from '@vercel/analytics';
import { OrchestratorService } from '../core/services/orchestrator.service';
import { EditorState } from '../core/state/editor.state';
import { PreviewState } from '../core/state/preview.state';
import { TerminalState } from '../core/state/terminal.state';
import { DataState } from '../core/state/data.state';
import { ProjectState } from '../core/state/project.state';
import { PreferencesState } from '../core/services/preferences.state';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    TopbarComponent,
    SidebarComponent,
    StatusbarComponent,
    EditorPanelComponent,
    SmartDataEditorComponent,
    PreviewPanelComponent,
    TerminalPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-layout">
      <app-topbar />
      <div class="app-content">
        <div class="app-body">
          <app-sidebar />
          <app-editor-panel />
          <app-smart-data-editor />
          <app-preview-panel />
        </div>
        @if (terminalState.isVisible()) {
          <div class="app-terminal">
            <app-terminal-panel />
          </div>
        }
      </div>
      <app-statusbar />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .app-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-family);
    }

    .app-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .app-body {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .app-terminal {
      height: 180px;
      min-height: 100px;
      border-top: 1px solid var(--border-color);
      flex-shrink: 0;
    }
  `],
})
export class MainLayoutComponent implements OnInit {
  private orchestrator = inject(OrchestratorService);
  private route = inject(ActivatedRoute);
  protected editorState = inject(EditorState);
  protected terminalState = inject(TerminalState);
  private previewState = inject(PreviewState);
  private dataState = inject(DataState);
  private projectState = inject(ProjectState);
  private preferences = inject(PreferencesState);

  constructor() {
    const theme = this.preferences.theme();
    document.documentElement.classList.toggle('light-mode', theme === 'light');
    effect(() => {
      const t = this.preferences.theme();
      document.documentElement.classList.toggle('light-mode', t === 'light');
    });
  }

  ngOnInit(): void {
    vercelInject();
    this.orchestrator.initialize();

    const isDemo = this.route.snapshot.queryParamMap.get('demo') === 'true';
    if (isDemo) {
      this.loadDemoProject();
    } else {
      this.loadEmptyProject();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    console.log('[MainLayout] window:keydown', event.key, 'ctrl:', event.ctrlKey, 'meta:', event.metaKey);
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.editorState.saveCurrentFile();
      this.orchestrator.manualCompile();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.orchestrator.manualCompile();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
    }
  }

  private loadEmptyProject(): void {
    const defaultPug = `doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title PugIDE
  body
    h1 Hola, #{nombre}
    p Empieza a editar tu plantilla Pug y los datos aqui.`;

    this.editorState.openTabs.set([]);
    this.editorState.activeTabId.set(null);
    this.editorState.editorContent.set('');
    this.editorState.files.set(new Map());

    this.editorState.openFile('/main.pug', 'main.pug', 'pug', defaultPug);
    this.projectState.setProject('MiProyecto', this.editorState.files());
    this.dataState.setData({ nombre: 'Mundo' });
    this.orchestrator.markDataInitialized();
    this.previewState.setDevice('Desktop', 1200, 800);
    this.terminalState.addEntry('info', 'PugIDE', 'Welcome to PugIDE! Open a project or start coding.');
    this.orchestrator.manualCompile();
  }

  private async loadDemoProject(): Promise<void> {
    this.editorState.openTabs.set([]);
    this.editorState.activeTabId.set(null);
    this.editorState.editorContent.set('');
    this.editorState.files.set(new Map());

    const [mainPug, cardPug, navbarPug, rawData] = await Promise.all([
      fetch('assets/demo/main.pug').then(r => r.text()),
      fetch('assets/demo/components/card.pug').then(r => r.text()),
      fetch('assets/demo/components/navbar.pug').then(r => r.text()),
      fetch('assets/demo/demo-data.json').then(r => r.json()),
    ]);

    const files: Array<{ path: string; name: string; content: string }> = [
      { path: '/main.pug', name: 'main.pug', content: mainPug },
      { path: '/components/card.pug', name: 'card.pug', content: cardPug },
      { path: '/components/navbar.pug', name: 'navbar.pug', content: navbarPug },
    ];

    // Resolve includes manually for compilation
    const resolvedMain = mainPug.replace(
      /^include (.+\.pug)$/gm,
      (_, includePath: string) => {
        const match = files.find(f => f.path.endsWith('/' + includePath) || f.path === '/' + includePath);
        return match ? match.content : '// include not found: ' + includePath;
      }
    );

    this.editorState.openFile(files[0].path, files[0].name, 'pug', resolvedMain);
    for (let i = 1; i < files.length; i++) {
      this.editorState.files.update((m) => { m.set(files[i].path, files[i].content); return m; });
    }
    this.projectState.setProject('PugProject', this.editorState.files());
    this.dataState.setData(rawData as Record<string, unknown>);
    this.orchestrator.markDataInitialized();
    this.previewState.setDevice('Desktop', 1200, 800);
    this.terminalState.addEntry('info', 'PugIDE', 'Welcome to PugIDE! Open a project or start coding.');
    this.orchestrator.manualCompile();
  }
}
