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
import { PersistenceService, ProjectSessionState } from '../core/services/persistence.service';
import { getFileType } from '../core/models/tab.model';

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
          <div class="app-terminal" [class.maximized]="terminalState.isMaximized()">
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
      transition: height 0.15s ease;
    }

    .app-terminal.maximized {
      height: 70vh;
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
  private persistence = inject(PersistenceService);

  private restoringSession = false;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const theme = this.preferences.theme();
    document.documentElement.classList.toggle('light-mode', theme === 'light');
    effect(() => {
      const t = this.preferences.theme();
      document.documentElement.classList.toggle('light-mode', t === 'light');
    });

    effect(() => {
      this.editorState.files();
      this.editorState.openTabs();
      this.editorState.activeTab();
      this.projectState.projectName();
      if (this.restoringSession) return;

      if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
      this.autosaveTimer = setTimeout(() => this.orchestrator.saveSession(), 1000);
    });
  }

  ngOnInit(): void {
    vercelInject();
    this.orchestrator.initialize();

    const isDemo = this.route.snapshot.queryParamMap.get('demo') === 'true';
    if (isDemo) {
      this.loadDemoProject();
      return;
    }

    const saved = this.persistence.loadProjectState();
    if (saved && Object.keys(saved.files).length > 0) {
      this.restoreSession(saved);
    } else {
      this.loadEmptyProject();
    }
  }

  private restoreSession(saved: ProjectSessionState): void {
    this.restoringSession = true;
    this.editorState.openTabs.set([]);
    this.editorState.activeTabId.set(null);
    this.editorState.editorContent.set('');
    this.editorState.files.set(new Map(Object.entries(saved.files)));

    const pathsToOpen = saved.openTabPaths.length > 0 ? saved.openTabPaths : Object.keys(saved.files);
    for (const path of pathsToOpen) {
      const content = saved.files[path];
      if (content === undefined) continue;
      const name = path.split('/').pop() ?? path;
      this.editorState.openFile(path, name, getFileType(name), content);
    }
    if (saved.activeTabPath) {
      const tab = this.editorState.openTabs().find((t) => t.path === saved.activeTabPath);
      if (tab) this.editorState.selectTab(tab.id);
    }

    this.projectState.setProject(saved.projectName, this.editorState.files());
    this.orchestrator.markDataInitialized();
    this.previewState.setDevice('Desktop', 1200, 800);
    this.terminalState.addEntry('info', 'PugIDE', 'Restored your previous session.');
    this.orchestrator.manualCompile();
    this.restoringSession = false;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.editorState.saveCurrentFile();
      this.orchestrator.manualCompile();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.orchestrator.manualCompile();
    }
  }

  private loadEmptyProject(): void {
    this.orchestrator.resetToEmptyProject();
    this.terminalState.addEntry('info', 'PugIDE', 'Welcome to PugIDE! Open a project or start coding.');
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

    this.editorState.openFile(files[0].path, files[0].name, 'pug', files[0].content);
    for (let i = 1; i < files.length; i++) {
      this.editorState.files.update((m) => { m.set(files[i].path, files[i].content); return m; });
    }
    this.projectState.setProject('PugProject', this.editorState.files());
    this.dataState.setInitialData(rawData as Record<string, unknown>);
    this.orchestrator.markDataInitialized();
    this.previewState.setDevice('Desktop', 1200, 800);
    this.terminalState.addEntry('info', 'PugIDE', 'Welcome to PugIDE! Open a project or start coding.');
    this.orchestrator.manualCompile();
  }
}
