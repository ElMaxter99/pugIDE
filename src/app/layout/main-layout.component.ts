import { Component, ChangeDetectionStrategy, inject, OnInit, AfterViewInit, OnDestroy, HostListener, effect, signal, untracked, viewChild, ElementRef, Injector, afterNextRender } from '@angular/core';
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
import { AnnouncerComponent } from '../shared/components/announcer/announcer.component';
import { ImportLocaleDialogComponent } from '../shared/components/import-locale-dialog/import-locale-dialog.component';
import { DialogComponent, DialogConfig } from '../shared/components/dialogs/dialog.component';
import { ProjectIoService } from '../core/services/project-io.service';
import { ProjectLibraryService } from '../core/services/project-library.service';
import { REGION_FOCUS, RegionId, nextRegionIndex } from '../core/utils/regions.util';
import { backupReminderDays } from '../core/utils/backup.util';
import { DiagnosticsState } from '../core/state/diagnostics.state';
import { ViewportState } from '../core/state/viewport.state';
import { EmailExportDialogComponent } from '../shared/components/export-dialogs/email-export-dialog.component';
import { ExportAllDialogComponent } from '../shared/components/export-dialogs/export-all-dialog.component';
import { AiService } from '../core/services/ai.service';
import { AiDialogComponent } from '../shared/components/ai/ai-dialog.component';
import { AiSettingsDialogComponent } from '../shared/components/ai/ai-settings-dialog.component';
import { ImportFilesDialogComponent } from '../shared/components/import-files-dialog/import-files-dialog.component';
import { SaveTemplateDialogComponent } from '../shared/components/templates-dialogs/save-template-dialog.component';
import { DesktopBarsComponent } from '../shared/components/desktop/desktop-bars.component';
import { WorkspacesDialogComponent } from '../shared/components/desktop/workspaces-dialog.component';
import { UpdatesDialogComponent } from '../shared/components/desktop/updates-dialog.component';
import { ConflictDiffDialogComponent } from '../shared/components/desktop/conflict-diff-dialog.component';
import { WorkspaceService } from '../core/services/workspace.service';
import { DesktopUpdateService } from '../core/services/desktop-update.service';
import { LocalesDialogComponent } from '../shared/components/locales-dialog/locales-dialog.component';
import { ShareCreateDialogComponent } from '../shared/components/share-dialogs/share-create-dialog.component';
import { ShareOpenDialogComponent } from '../shared/components/share-dialogs/share-open-dialog.component';
import type { ShareOpenRequest } from '../core/state/ui.state';
import { getFileType } from '../core/models/tab.model';
import { parseDatasetsFile } from '../core/utils/datasets.util';
import { DEFAULT_MAIN_PUG, DEFAULT_MIXINS_PUG, DEFAULT_PROJECT_DATA, DEFAULT_PROJECT_NAME } from '../core/utils/default-project.util';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    ShareCreateDialogComponent,
    LocalesDialogComponent,
    EmailExportDialogComponent,
    ExportAllDialogComponent,
    SaveTemplateDialogComponent,
    ImportFilesDialogComponent,
    AiDialogComponent,
    AiSettingsDialogComponent,
    DesktopBarsComponent,
    WorkspacesDialogComponent,
    UpdatesDialogComponent,
    ConflictDiffDialogComponent,
    ShareOpenDialogComponent,
    AnnouncerComponent,
    ImportLocaleDialogComponent,
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
      <nav class="skip-links" aria-label="Enlaces de salto">
        <a href="#region-editor" data-testid="skip-editor" (click)="skipTo($event, 'editor')">Saltar al editor</a>
        <a href="#region-preview" data-testid="skip-preview" (click)="skipTo($event, 'preview')">Saltar a la vista previa</a>
        <a href="#region-problemas" data-testid="skip-problemas" (click)="skipTo($event, 'problemas')">Saltar a Problemas</a>
      </nav>
      <app-topbar />
      <app-update-bar />
      <app-desktop-bars />
      <div class="app-content">
        <div class="app-body" #body>
          <app-sidebar data-tour="files" data-region="archivos" [style.flex]="'0 0 ' + layout.resolved().sidebar + 'px'" [style.width.px]="layout.resolved().sidebar" />
          <app-editor-panel data-tour="editor" data-region="editor" id="region-editor" [style.flex]="'1 1 0'" />
          @if (layout.dataVisible()) {
            <app-smart-data-editor data-region="datos" [style.flex]="'0 0 ' + layout.resolved().data + 'px'" [style.width.px]="layout.resolved().data" />
          }
          <app-preview-panel data-tour="preview" data-region="preview" id="region-preview" [style.flex]="'0 0 ' + layout.resolved().preview + 'px'" [style.width.px]="layout.resolved().preview" />
        </div>
        @if (terminalState.isVisible()) {
          @if (terminalState.bottomCompact() && !terminalState.overlayOpen()) {
            <!-- Ventana baja (P-19): el panel inferior se recoge en una franja de 34 px y se abre sobre el editor. -->
            <button type="button" class="bottom-strip" data-testid="bottom-strip" aria-expanded="false" aria-label="Mostrar el panel Problemas y Registro" (click)="terminalState.overlayOpen.set(true)">
              <span class="strip-errors" [class.has-errors]="diagnostics.counts().errors > 0">{{ diagnostics.counts().errors }} {{ diagnostics.counts().errors === 1 ? 'error' : 'errores' }}</span>
              <span class="strip-title">Problemas · Registro</span>
              <span class="strip-show">Mostrar <span aria-hidden="true" class="material-symbols-outlined">keyboard_arrow_up</span></span>
            </button>
          } @else {
            <section class="app-terminal" data-region="problemas" id="region-problemas" aria-label="Problemas y Registro" [class.maximized]="terminalState.isMaximized()" [class.overlay]="terminalState.bottomCompact()" (keydown.escape)="onBottomEscape()">
              <app-terminal-panel />
            </section>
          }
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
        (extra)="pickLocaleFiles()"
        (cancelled)="ui.addLocaleOpen.set(false)" />
      <app-import-locale-dialog />
      <app-announcer />
      <app-share-create-dialog />
      <app-locales-dialog />
      <app-email-export-dialog />
      <app-export-all-dialog />
      <app-save-template-dialog />
      <app-import-files-dialog />
      @if (ai.available) {
        <app-ai-dialog />
        <app-ai-settings-dialog />
      }
      <app-workspaces-dialog />
      <app-updates-dialog />
      <app-conflict-diff-dialog />
      <app-share-open-dialog />
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

    /* Enlaces de salto: fuera de la vista hasta que reciben el foco con el teclado. */
    .skip-links { position: absolute; top: 0; left: 0; z-index: 3000; display: flex; gap: 8px; }
    .skip-links a {
      position: absolute; left: -9999px; top: 8px; padding: 8px 14px; border-radius: var(--radius);
      background: var(--accent-color); color: var(--text-on-primary); font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap;
    }
    .skip-links a:focus { position: static; margin: 8px 0 0 8px; outline: 2px solid var(--text-primary); outline-offset: 2px; }

    .app-content {
      position: relative;
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
      height: clamp(120px, 33vh, 240px);
      min-height: 100px;
      border-top: 1px solid var(--border-color);
      flex-shrink: 0;
      transition: height 0.15s ease;
    }

    .app-terminal.maximized {
      height: 70vh;
    }

    /* Ventana baja: el panel se abre sobre el editor (como mucho el 60 % del alto) en vez de quitarle el sitio. */
    .app-terminal.overlay {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 60%;
      z-index: 40;
      background: var(--bg-primary);
      box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
    }

    .app-terminal.overlay.maximized {
      height: 90%;
    }

    .bottom-strip {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 34px;
      flex-shrink: 0;
      padding: 0 12px;
      border: 0;
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font: inherit;
      font-size: 12px;
      cursor: pointer;
      text-align: left;
    }

    .bottom-strip:hover {
      background: var(--bg-hover);
    }

    .strip-errors.has-errors {
      color: var(--error-color);
    }

    .strip-show {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--accent-color);
    }

    .strip-show .material-symbols-outlined {
      font-size: 16px;
    }
  `],
})
export class MainLayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  /** Asistente de IA: solo en escritorio y con `npm start` (nunca en la web publicada). */
  protected readonly ai = inject(AiService);
  protected ui = inject(UiState);
  private orchestrator = inject(OrchestratorService);
  private route = inject(ActivatedRoute);
  protected editorState = inject(EditorState);
  protected terminalState = inject(TerminalState);
  protected diagnostics = inject(DiagnosticsState);
  private viewport = inject(ViewportState);
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
  private workspace = inject(WorkspaceService);
  /** Se crea aquí para que escuche los menús nativos de la app de escritorio desde el arranque. */
  protected desktopUpdates = inject(DesktopUpdateService);
  private injector = inject(Injector);
  /** Primer uso: la bienvenida espera a que se decida el aviso de privacidad para no solaparse con él. */
  private welcomePending = signal(false);
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');
  private bodyObserver: ResizeObserver | null = null;
  protected addLocaleDialog: DialogConfig = {
    title: 'Añadir idioma',
    message: 'Código del idioma; se crea locales/<código>/translations.json (por ejemplo es-ES, es-CAT, en).',
    confirmText: 'Añadir',
    cancelText: 'Cancelar',
    showInput: true,
    inputLabel: 'Código de idioma',
    inputValue: '',
    extraText: 'Importar archivo .json…',
    extraIcon: 'upload_file',
  };
  private pendingShareOpen: ShareOpenRequest | null = null;
  private assetTimer: ReturnType<typeof setTimeout> | null = null;

  private restoringSession = false;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Ventana baja (P-19): el panel inferior se recoge en una franja; al volver a haber sitio se enseña entero.
    effect(() => {
      const compact = this.viewport.bottomCompact();
      untracked(() => {
        this.terminalState.bottomCompact.set(compact);
        if (!compact) this.terminalState.overlayOpen.set(false);
      });
    });
    const theme = this.preferences.resolvedTheme();
    document.documentElement.classList.toggle('light-mode', theme === 'light');
    effect(() => {
      const t = this.preferences.resolvedTheme();
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
    const bad = this.persistence.sessionProblem;
    if (bad) {
      this.terminalState.addEntry('warning', 'Sesión',
        `La sesión guardada no se pudo leer entera: ${bad.reason}. ${hasSaved ? 'Se recuperaron los archivos de texto válidos.' : 'Se abre el proyecto por defecto.'} ${bad.copied ? 'Se guardó una copia del original en este navegador (clave pug-ide-project-corrupt).' : 'No hubo espacio para guardar una copia del original.'}`);
    }
    // Enlace compartido (P-16): sin sesión se abre directo; con sesión, o con contraseña, o si no se puede abrir, se pregunta.
    const share = this.projectIo.openRequestFromHash(location.hash, hasSaved);
    if (share?.payload && !hasSaved) {
      this.orchestrator.markAssetsReady();
      this.projectIo.loadShared(share.payload, 'new');
      this.projectIo.clearShareHash();
      return;
    }
    if (share) this.pendingShareOpen = share; // se decide en el diálogo; mientras tanto se restaura la sesión

    if (saved && hasSaved) {
      this.restoreSession(saved);
      void this.resumeWorkspace();
    } else {
      void this.startFresh();
      this.openPendingShare();
    }
  }

  /** Escritorio: se vuelve a abrir el último espacio de trabajo (la carpeta manda sobre la copia guardada en la app). */
  private async resumeWorkspace(): Promise<void> {
    if (!this.workspace.available || this.pendingShareOpen) return;
    await this.workspace.refresh();
    const last = this.workspace.lastWorkspaceId();
    if (last) { await this.workspace.open(last); return; }
    // Sin ningún espacio todavía: se enseña la pantalla una vez (después, desde «Espacios de trabajo…»).
    if (this.workspace.workspaces().length === 0 && !this.persistence.workspacesIntroSeen() && !this.ui.welcomeOpen()) {
      this.persistence.markWorkspacesIntroSeen();
      this.ui.workspacesOpen.set(true);
    }
  }

  private openPendingShare(): void {
    if (!this.pendingShareOpen) return;
    this.ui.shareOpen.set(this.pendingShareOpen);
    this.pendingShareOpen = null;
  }

  /** Los proyectos solo viven en este navegador: si hace tiempo que no se exporta, se recuerda en el Registro. */
  protected onAddLocale(code: string): void {
    this.ui.addLocaleOpen.set(false);
    if (code.trim()) this.orchestrator.addLocale(code);
  }

  /** Esc dentro del panel inferior abierto sobre el editor (ventana baja) lo recoge. */
  protected onBottomEscape(): void {
    if (this.terminalState.bottomCompact()) this.terminalState.overlayOpen.set(false);
  }

  /** «Importar archivo .json…» del diálogo «Añadir idioma»: lee los archivos y abre la confirmación (P-14). */
  protected pickLocaleFiles(): void {
    // Un selector que no vive en el DOM: no estorba a los demás `input[type=file]` de la página.
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.multiple = true;
    input.addEventListener('change', () => void this.onLocaleFiles(Array.from(input.files ?? [])));
    input.click();
  }

  private async onLocaleFiles(list: File[]): Promise<void> {
    if (!list.length) return;
    try {
      const files = await Promise.all(list.map(async (f) => ({ name: f.name, text: await f.text() })));
      this.ui.addLocaleOpen.set(false);
      this.ui.localeImport.set({ source: 'add', files });
    } catch (err) {
      this.terminalState.addEntry('error', 'Idiomas', `No se pudo leer el archivo: ${(err as Error).message ?? err}`);
    }
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
    this.openPendingShare();
  }

  /** Regiones con marco que se ven ahora, en el orden de la pantalla. */
  private visibleRegions(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('app-main-layout [data-region]'))
      .filter((el) => el.getClientRects().length > 0);
  }

  private focusRegion(el: HTMLElement): void {
    const id = el.getAttribute('data-region') as RegionId;
    for (const sel of REGION_FOCUS[id] ?? ['button']) {
      const target = Array.from(el.querySelectorAll<HTMLElement>(sel)).find((t) => t.getClientRects().length > 0 || t.tagName === 'TEXTAREA');
      if (target) { target.focus({ preventScroll: true }); break; }
    }
    if (!el.contains(document.activeElement)) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    el.classList.add('region-flash');
    setTimeout(() => el.classList.remove('region-flash'), 1200);
  }

  /** Enlaces de salto: llevan el foco a una región (el problema panel se abre si estaba recogido). */
  protected skipTo(event: Event, id: RegionId): void {
    event.preventDefault();
    if (id === 'problemas') {
      if (!this.terminalState.isVisible()) this.terminalState.isVisible.set(true);
      if (this.terminalState.bottomCompact()) this.terminalState.overlayOpen.set(true);
      this.terminalState.activeTab.set('problems');
    }
    afterNextRender(() => {
      const el = document.querySelector<HTMLElement>(`app-main-layout [data-region="${id}"]`);
      if (el) this.focusRegion(el);
    }, { injector: this.injector });
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    // F6 / Mayús+F6: de una región con marco a la siguiente (lateral, editor, datos, vista previa, Problemas).
    if (event.key === 'F6' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const regions = this.visibleRegions();
      const current = regions.findIndex((r) => r.contains(document.activeElement));
      const next = nextRegionIndex(regions.length, current, event.shiftKey);
      if (next >= 0) {
        event.preventDefault();
        this.focusRegion(regions[next]);
      }
      return;
    }
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
