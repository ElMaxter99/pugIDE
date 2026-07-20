import { Component, ChangeDetectionStrategy, inject, OnInit, HostListener, effect } from '@angular/core';
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
    this.loadDemoProject();
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
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
    }
  }

  private loadDemoProject(): void {
    const files: Array<{ path: string; name: string; content: string }> = [
      {
        path: '/main.pug',
        name: 'main.pug',
        content: `doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    title PugIDE Dashboard
  body
    h1 Pug Project
    include components/card.pug
    include components/navbar.pug`,
      },
      {
        path: '/components/card.pug',
        name: 'card.pug',
        content: `mixin card(data)
  .card-container
    .card-header
      h2= data.title
      if data.price
        .price-badge= '$' + data.price
    .card-body
      p= data.description
    .card-footer
      each item in data.items
        +product-item(item)

mixin product-item(item)
  .product-row
    span= item.name
    span= item.price`,
      },
      {
        path: '/components/navbar.pug',
        name: 'navbar.pug',
        content: `mixin navbar(links)
  nav.navbar
    .nav-brand PugIDE
    ul.nav-links
      each link in links
        li
          a(href=link.url)= link.label`,
      },
    ];

    const defaultData: Record<string, unknown> = {
      usuario: {
        nombre: 'Carlos',
        edad: 28,
        email: 'carlos@email.com',
        activo: true,
        hobbies: ['Programar', 'Leer', 'Viajar'],
        direccion: {
          calle: 'Av. Siempre Viva 742',
          ciudad: 'Madrid',
        },
        amigos: [
          { nombre: 'Ana', edad: 25 },
          { nombre: 'Luis', edad: 30 },
        ],
      },
    };

    this.editorState.openFile(files[0].path, files[0].name, 'pug', files[0].content);
    for (let i = 1; i < files.length; i++) {
      this.editorState.files.update((m) => { m.set(files[i].path, files[i].content); return m; });
    }
    this.projectState.setProject('PugProject', this.editorState.files());
    this.dataState.setData(defaultData);
    this.previewState.setDevice('Desktop', 1200, 800);
    this.terminalState.addEntry('info', 'PugIDE', 'Welcome to PugIDE! Open a project or start coding.');
    this.orchestrator.manualCompile();
  }
}
