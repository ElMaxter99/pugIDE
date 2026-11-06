import { Component, ChangeDetectionStrategy, inject, OnInit, AfterViewInit, OnDestroy, HostListener, effect, signal, untracked, viewChild, ElementRef } from '@angular/core';
import { LayoutService } from '../core/services/layout.service';
import { layoutShortcut, panelShortcut } from '../core/utils/layout.util';
import { ActivatedRoute } from '@angular/router';
import { TopbarComponent } from '../shared/components/topbar/topbar.component';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { StatusbarComponent } from '../shared/components/statusbar/statusbar.component';
import { EditorPanelComponent } from '../features/editor/editor-panel.component';
import { SmartDataEditorComponent } from '../features/smart-data-editor/smart-data-editor.component';
import { PreviewPanelComponent } from '../features/preview/preview-panel.component';
import { TerminalPanelComponent } from '../features/terminal/terminal-panel.component';
import { OrchestratorService } from '../core/services/orchestrator.service';
import { EditorState } from '../core/state/editor.state';
import { PreviewState } from '../core/state/preview.state';
import { TerminalState } from '../core/state/terminal.state';
import { AssetState } from '../core/state/asset.state';
import { DataState } from '../core/state/data.state';
import { ProjectState } from '../core/state/project.state';
import { PreferencesState } from '../core/services/preferences.state';
import { PersistenceService, ProjectSessionState } from '../core/services/persistence.service';
import { FileHistoryDialogComponent } from '../shared/components/file-history-dialog/file-history-dialog.component';
import { ProjectSnapshotsDialogComponent } from '../shared/components/project-snapshots-dialog/project-snapshots-dialog.component';
import { UpdateBarComponent } from '../shared/components/update-notice/update-bar.component';
import { WelcomeDialogComponent } from '../shared/components/welcome-dialog/welcome-dialog.component';
import { TourComponent } from '../shared/components/tour/tour.component';
import { AnalyticsService } from '../core/services/analytics.service';
import { ShortcutsDialogComponent } from '../shared/components/shortcuts-dialog/shortcuts-dialog.component';
import { UiState } from '../core/state/ui.state';
import { CommandPaletteComponent } from '../shared/components/command-palette/command-palette.component';
import { DialogComponent, DialogConfig } from '../shared/components/dialogs/dialog.component';
import { ProjectIoService } from '../core/services/project-io.service';
import { ProjectLibraryService } from '../core/services/project-library.service';
import { backupReminderDays } from '../core/utils/backup.util';
import { SharePayload, payloadFromHash } from '../core/utils/share.util';
import { getFileType } from '../core/models/tab.model';
import { parseDatasetsFile } from '../core/utils/datasets.util';
import { DEFAULT_MAIN_PUG, DEFAULT_MIXINS_PUG, DEFAULT_PROJECT_DATA, DEFAULT_PROJECT_NAME } from '../core/utils/default-project.util';

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
    DialogComponent,
    CommandPaletteComponent,
    ShortcutsDialogComponent,
    WelcomeDialogComponent,
    TourComponent,
    FileHistoryDialogComponent,
    ProjectSnapshotsDialogComponent,
    UpdateBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-layout">
      <app-topbar />
      <app-update-bar />
      <div class="app-content">
        <div class="app-body" #body>
          <app-sidebar data-tour="files" [style.flex]="'0 0 ' + layout.resolved().sidebar + 'px'" [style.width.px]="layout.resolved().sidebar" />
          <app-editor-panel data-tour="editor" [style.flex]="'1 1 0'" />
          @if (layout.dataVisible()) {
            <app-smart-data-editor [style.flex]="'0 0 ' + layout.resolved().data + 'px'" [style.width.px]="layout.resolved().data" />
          }
          <app-preview-panel data-tour="preview" [style.flex]="'0 0 ' + layout.resolved().preview + 'px'" [style.width.px]="layout.resolved().preview" />
        </div>
        @if (terminalState.isVisible()) {
          <section class="app-terminal" aria-label="Problemas y Registro" [class.maximized]="terminalState.isMaximized()">
            <app-terminal-panel />
          </section>
        }
      </div>
      <app-statusbar />
      <app-command-palette />
      <app-file-history-dialog [isOpen]="ui.historyOpen()" (closed)="ui.historyOpen.set(false)" />
      <app-project-snapshots-dialog [isOpen]="ui.snapshotsOpen()" (closed)="ui.snapshotsOpen.set(false)" />
      <app-welcome-dialog />
      <app-tour />
      <app-shortcuts-dialog [isOpen]="ui.shortcutsOpen()" (closed)="ui.shortcutsOpen.set(false)" />
      <app-dialog
        [config]="addLocaleDialog"
        [isOpen]="ui.addLocaleOpen()"
        (confirmed)="onAddLocale($event)"
        (cancelled)="ui.addLocaleOpen.set(false)" />
      <app-dialog
        [config]="shareDialog"
        [isOpen]="shareDialogOpen()"
        (confirmed)="onShareConfirm()"
        (cancelled)="onShareCancel()" />
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
      position: relative;
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .app-terminal {
      height: 240px;
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
export class MainLayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  protected ui = inject(UiState);
  private orchestrator = inject(OrchestratorService);
  private route = inject(ActivatedRoute);
  protected editorState = inject(EditorState);
  protected terminalState = inject(TerminalState);
  private previewState = inject(PreviewState);
  private dataState = inject(DataState);
  private projectState = inject(ProjectState);
  protected preferences = inject(PreferencesState);
  private persistence = inject(PersistenceService);
  private assetState = inject(AssetState);
  private projectIo = inject(ProjectIoService);
  private library = inject(ProjectLibraryService);
  protected layout = inject(LayoutService);
  private analytics = inject(AnalyticsService);
  /** Primer uso: la bienvenida espera a que se decida el aviso de privacidad para no solaparse con él. */
  private welcomePending = signal(false);
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');
  private bodyObserver: ResizeObserver | null = null;
  protected shareDialogOpen = signal(false);
  protected shareDialog: DialogConfig = {
    title: 'Abrir proyecto compartido',
    message: 'Este enlace contiene un proyecto. Si lo abres, reemplazará tu sesión guardada en este navegador (proyecto actual, archivos e imágenes). ¿Continuar?',
    confirmText: 'Reemplazar y abrir',
    cancelText: 'Mantener mi sesión',
    type: 'confirm',
  };
  protected addLocaleDialog: DialogConfig = {
    title: 'Añadir idioma',
    message: 'Código del idioma; se crea locales/<código>/translations.json (por ejemplo es-ES, es-CAT, en).',
    confirmText: 'Añadir',
    cancelText: 'Cancelar',
    showInput: true,
    inputLabel: 'Código de idioma',
    inputValue: '',
  };
  private pendingShare: SharePayload | null = null;
  private assetTimer: ReturnType<typeof setTimeout> | null = null;

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
      if (!this.welcomePending() || this.analytics.consent() === null) return;
      untracked(() => {
        this.welcomePending.set(false);
        this.ui.welcomeOpen.set(true);
      });
    });

    effect(() => {
      this.assetState.assets();
      if (this.assetTimer) clearTimeout(this.assetTimer);
      this.assetTimer = setTimeout(() => void this.orchestrator.saveAssets(), 800);
    });

    effect(() => {
      this.editorState.files();
      this.editorState.contentVersion();
      this.editorState.openTabs();
      this.editorState.activeTab();
      this.projectState.projectName();
      this.dataState.data();
      this.dataState.datasets();
      this.dataState.activeId();
      this.dataState.locale();
      if (this.restoringSession) return;

      if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
      this.autosaveTimer = setTimeout(() => this.orchestrator.saveSession(), 1000);
    });
  }

  ngAfterViewInit(): void {
    const el = this.body()?.nativeElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    this.layout.setContainerWidth(el.clientWidth);
    this.bodyObserver = new ResizeObserver(() => this.layout.setContainerWidth(el.clientWidth));
    this.bodyObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.bodyObserver?.disconnect();
  }

  ngOnInit(): void {
    this.orchestrator.initialize();

    const isDemo = this.route.snapshot.queryParamMap.get('demo') === 'true';
    if (isDemo) {
      this.orchestrator.markAssetsReady();
      this.orchestrator.adoptProjectId('demo');
      this.loadDemoProject();
      return;
    }

    this.persistence.ensureFirstUse();
    void this.persistence.requestPersistentStorage();
    setTimeout(() => this.remindBackup(), 2500);

    const saved = this.persistence.loadProjectState();
    const hasSaved = !!saved && Object.keys(saved.files).length > 0;
    const sharedPayload = payloadFromHash(location.hash);
    const shared = sharedPayload !== null ? this.projectIo.parseShare(sharedPayload) : null;
    if (sharedPayload !== null && !shared) this.clearShareHash();
    if (shared && !hasSaved) {
      this.orchestrator.markAssetsReady();
      this.projectIo.loadShared(shared);
      this.clearShareHash();
      return;
    }
    if (shared) this.pendingShare = shared; // se decide en el diálogo; mientras tanto se restaura la sesión

    if (saved && hasSaved) {
      this.restoreSession(saved);
    } else {
      void this.startFresh();
    }
  }

  /** Los proyectos solo viven en este navegador: si hace tiempo que no se exporta, se recuerda en el Registro. */
  protected onAddLocale(code: string): void {
    this.ui.addLocaleOpen.set(false);
    if (code.trim()) this.orchestrator.addLocale(code);
  }

  private remindBackup(): void {
    const days = backupReminderDays(this.persistence.loadBackupInfo(), Date.now(), this.editorState.files().size > 0);
    if (days === null) return;
    this.terminalState.addEntry('warning', 'Copia de seguridad',
      `Hace ${days} días que no exportas el proyecto. Tus proyectos solo existen en este navegador: usa «Exportar proyecto» de la paleta (Ctrl+K) para guardar una copia.`);
  }

  /**
   * Sin sesión en localStorage (borrada, cuota excedida...): se intenta recuperar el proyecto activo de la
   * biblioteca (IndexedDB); si tampoco está, empieza uno vacío.
   */
  private async startFresh(): Promise<void> {
    const id = this.persistence.loadCurrentProjectId();
    const snap = id ? await this.library.load(id) : null;
    if (id && snap && Object.keys(snap.session.files).length > 0) {
      this.restoreSession(snap.session);
      this.orchestrator.useAssets(snap.assets);
      return;
    }
    this.orchestrator.markAssetsReady();
    this.orchestrator.adoptProjectId();
    this.loadEmptyProject();
    // Primer uso (sin sesión ni proyecto que recuperar): se ofrece la bienvenida una sola vez.
    if (!this.persistence.loadWelcomeSeen()) this.welcomePending.set(true);
  }

  onShareConfirm(): void {
    this.shareDialogOpen.set(false);
    if (this.pendingShare) {
      this.projectIo.loadShared(this.pendingShare);
      this.pendingShare = null;
    }
    this.clearShareHash();
  }

  onShareCancel(): void {
    this.shareDialogOpen.set(false);
    this.pendingShare = null;
    this.clearShareHash();
  }

  private clearShareHash(): void {
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch { /* ignore */ }
  }

  private restoreSession(saved: ProjectSessionState): void {
    this.restoringSession = true;
    this.orchestrator.adoptProjectId(this.persistence.loadCurrentProjectId());
    this.editorState.openTabs.set([]);
    this.editorState.activeTabId.set(null);
    this.editorState.editorContent.set('');
    this.editorState.files.set(new Map(Object.entries(saved.files)));
    this.orchestrator.restorePreviewEntry(saved.previewEntry);

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
    const savedDatasets = saved.datasets ? parseDatasetsFile(saved.datasets) : null;
    if (savedDatasets) this.dataState.restoreDatasets(savedDatasets);
    this.orchestrator.markDataInitialized();
    this.terminalState.addEntry('info', 'Sistema', 'Sesión anterior restaurada.', undefined, true);
    void this.orchestrator.restoreAssets();
    this.orchestrator.manualCompile();
    this.restoringSession = false;
    if (this.pendingShare) this.shareDialogOpen.set(true);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    // Disposición y paneles (P-08): Ctrl+Alt+1…4, Ctrl+B y Ctrl+J. Con AltGr no se secuestra la tecla (ver `layoutShortcut`).
    const keys = {
      ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey, shiftKey: event.shiftKey,
      key: event.key, code: event.code, altGraph: !!event.getModifierState?.('AltGraph'),
    };
    const target = layoutShortcut(keys);
    if (target) {
      event.preventDefault();
      this.layout.apply(target);
      return;
    }
    const panel = panelShortcut(keys);
    if (panel) {
      event.preventDefault();
      if (panel === 'sidebar') this.layout.toggleSidebar();
      else this.layout.toggleBottom();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.orchestrator.saveFile();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.orchestrator.manualCompile();
    }
  }

  private loadEmptyProject(): void {
    this.editorState.openTabs.set([]);
    this.editorState.activeTabId.set(null);
    this.editorState.editorContent.set('');
    this.editorState.files.set(new Map());

    this.editorState.openFile('/main.pug', 'main.pug', 'pug', DEFAULT_MAIN_PUG);
    this.editorState.files.update((m) => { m.set('/mixins.pug', DEFAULT_MIXINS_PUG); return m; });
    this.projectState.setProject(DEFAULT_PROJECT_NAME, this.editorState.files());
    this.dataState.setInitialData({ ...DEFAULT_PROJECT_DATA });
    this.orchestrator.markDataInitialized();
    this.previewState.setDevice('Desktop', 1200, 800);
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

    const [demoCss, logoSvg] = await Promise.all([
      fetch('assets/demo/styles/demo.css').then(r => r.text()),
      fetch('assets/demo/images/logo.svg').then(r => r.arrayBuffer()),
    ]);
    this.assetState.replaceAll([{ path: '/images/logo.svg', mime: 'image/svg+xml', data: new Uint8Array(logoSvg) }]);

    const files: Array<{ path: string; name: string; content: string }> = [
      { path: '/main.pug', name: 'main.pug', content: mainPug },
      { path: '/components/card.pug', name: 'card.pug', content: cardPug },
      { path: '/components/navbar.pug', name: 'navbar.pug', content: navbarPug },
      { path: '/styles/demo.css', name: 'demo.css', content: demoCss },
    ];

    this.editorState.openFile(files[0].path, files[0].name, 'pug', files[0].content);
    for (let i = 1; i < files.length; i++) {
      this.editorState.files.update((m) => { m.set(files[i].path, files[i].content); return m; });
    }
    this.projectState.setProject('PugProject', this.editorState.files());
    this.dataState.setInitialData(rawData as Record<string, unknown>);
    this.orchestrator.markDataInitialized();
    this.previewState.setDevice('Desktop', 1200, 800);
    this.orchestrator.manualCompile();
  }
}
