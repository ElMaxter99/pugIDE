import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { strFromU8 } from 'fflate';
import { ImportedFile, OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { AssetState } from '../../../core/state/asset.state';
import { EditorState } from '../../../core/state/editor.state';
import { ProjectState } from '../../../core/state/project.state';
import { ImportEntry, UiState } from '../../../core/state/ui.state';
import { EntryLike, MAX_IMPORT_FILES, isSkippedPath, isZip } from '../../../core/utils/drop-import.util';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { ImportConflict, importSummary, normalizeTarget, planFileImport, projectFolders, resolveImport } from '../../../core/utils/import-files.util';
import { looksLikeTranslations } from '../../../core/utils/locales.util';

const STATE_TEXT = { new: 'nuevo', exists: 'ya existe', unsupported: 'tipo no admitido' } as const;
/** Filas que se enseñan del resumen; el resto se cuenta. */
const MAX_ROWS = 60;

/**
 * «Importar archivos» (P-28): añade archivos sueltos o una carpeta al proyecto ABIERTO, en la carpeta que se elija.
 * Antes de escribir nada enseña qué es nuevo, qué ya existe y qué no se admite. Crear un proyecto con lo importado
 * es otra acción («Importar proyecto», en «Mis proyectos»).
 */
@Component({
  selector: 'app-import-files-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.importFiles(); as req) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="title()" tabindex="-1" data-testid="import-files"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">{{ title() }}</h2></div>
          <div class="body">
            @if (zip(); as z) {
              <p class="lead"><b>{{ z.name }}</b> es un archivo .zip. ¿Qué quieres hacer con él?</p>
              <div class="choices">
                <button type="button" class="btn primary" data-testid="import-zip-add" [disabled]="busy()" (click)="addZip(z)">Añadir su contenido a este proyecto</button>
                <button type="button" class="btn secondary" data-testid="import-zip-project" [disabled]="busy()" (click)="openZipAsProject(z)">Abrirlo como proyecto nuevo</button>
              </div>
              <p class="note">Como proyecto nuevo, «{{ projectState.projectName() }}» sigue guardado en «Mis proyectos».</p>
            } @else if (!entries()) {
              <p class="lead">Se añaden al proyecto abierto. Nada sale de tu equipo.</p>
              <div class="choices">
                <button type="button" class="btn primary" data-testid="import-pick-files" (click)="filesInput.click()">
                  <span aria-hidden="true" class="material-symbols-outlined">description</span>Elegir archivos…
                </button>
                <button type="button" class="btn secondary" data-testid="import-pick-folder" (click)="folderInput.click()">
                  <span aria-hidden="true" class="material-symbols-outlined">folder_open</span>Elegir una carpeta…
                </button>
              </div>
              <div class="dropzone" [class.over]="over()" data-testid="import-dropzone"
                (dragover)="onDragOver($event)" (dragleave)="over.set(false)" (drop)="onDrop($event)">o suelta aquí archivos o carpetas</div>
              <label class="label" for="import-target">Dónde se guardan</label>
              <select id="import-target" class="input" data-testid="import-target" [value]="target()" (change)="target.set($any($event.target).value)">
                @for (f of folders(); track f) { <option [value]="f" [selected]="f === target()">{{ folderLabel(f) }}</option> }
              </select>
              <p class="note">Plantillas (.pug, .jade), datos (.json, .js), estilos (.css, .scss, .sass, .less), imágenes y fuentes.</p>
            } @else {
              <p class="lead" data-testid="import-what">{{ what() }}</p>
              @if (plan().rootFolder; as folder) {
                <label class="check"><input type="checkbox" data-testid="import-keep-folder" [checked]="keepFolder()" (change)="keepFolder.set($any($event.target).checked)" />
                  Crear la carpeta <code>{{ folder }}</code> dentro del destino</label>
              }
              <label class="label" for="import-target">Dónde se guardan</label>
              <select id="import-target" class="input" data-testid="import-target" [value]="target()" (change)="target.set($any($event.target).value)">
                @for (f of folders(); track f) { <option [value]="f" [selected]="f === target()">{{ folderLabel(f) }}</option> }
              </select>
              <ul class="rows" data-testid="import-rows">
                @for (row of rows(); track row.index) {
                  <li class="row"><span class="path">{{ row.path || row.relPath }}</span><span class="state" [class]="'state ' + row.state">{{ stateText[row.state] }}</span></li>
                }
                @if (hidden() > 0) { <li class="row more">y {{ hidden() }} más</li> }
              </ul>
              <p class="note" data-testid="import-summary">{{ summary() }}</p>
              @if (plan().counts.exists > 0) {
                <fieldset class="conflict">
                  <legend>Con {{ plan().counts.exists === 1 ? 'el que ya existe' : 'los ' + plan().counts.exists + ' que ya existen' }}</legend>
                  <label class="radio"><input type="radio" name="import-conflict" value="skip" [checked]="conflict() === 'skip'" (change)="conflict.set('skip')" />
                    <span>No tocarlos<small>Se importan solo los nuevos.</small></span></label>
                  <label class="radio"><input type="radio" name="import-conflict" value="replace" data-testid="import-replace" [checked]="conflict() === 'replace'" (change)="conflict.set('replace')" />
                    <span>Sustituirlos<small>La versión actual de los de texto queda en «Historial del archivo».</small></span></label>
                  <label class="radio"><input type="radio" name="import-conflict" value="keep-both" data-testid="import-keep-both" [checked]="conflict() === 'keep-both'" (change)="conflict.set('keep-both')" />
                    <span>Conservar los dos<small>Los importados se guardan con otro nombre ({{ renameExample() }}).</small></span></label>
                </fieldset>
              }
            }
            @if (error(); as e) { <p class="problem" role="alert" data-testid="import-error">{{ e }}</p> }
            <input #filesInput type="file" multiple hidden data-testid="import-files-input" (change)="onPicked($any($event.target))" />
            <input #folderInput type="file" webkitdirectory hidden data-testid="import-folder-input" (change)="onPicked($any($event.target))" />
          </div>
          <div class="footer">
            @if (entries() && !req.entries && !req.zip) { <button type="button" class="btn secondary back" (click)="entries.set(null)">Elegir otros…</button> }
            <button type="button" class="btn secondary" (click)="close()">Cancelar</button>
            @if (entries()) {
              <button type="button" class="btn primary" data-testid="import-go" [disabled]="busy() || writes().length === 0" (click)="confirm()">{{ goText() }}</button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2100; }
    .dialog { width: 540px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .dialog:focus { outline: none; }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 10px; }
    .lead { margin: 0; color: var(--text-primary); }
    .choices { display: flex; gap: 8px; flex-wrap: wrap; }
    .dropzone { border: 1px dashed var(--border-color); border-radius: 8px; padding: 18px; text-align: center; }
    .dropzone.over { border-color: var(--accent-color); color: var(--text-primary); }
    .label { font-size: 12px; margin-top: 2px; }
    .input { width: 100%; padding: 8px 10px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; font-family: inherit; box-sizing: border-box; }
    .input:focus { border-color: var(--accent-color); outline: none; }
    .check { display: flex; gap: 8px; align-items: center; color: var(--text-primary); }
    .check input, .radio input { accent-color: var(--accent-color); }
    code { font-family: var(--font-mono); font-size: 12px; }
    .rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; max-height: 220px; overflow: auto; }
    .row { display: flex; gap: 12px; align-items: center; padding: 4px 8px; border-radius: 4px; background: var(--bg-input); }
    .row.more { color: var(--text-tertiary); }
    .path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: 12px; color: var(--text-primary); }
    .state { font-size: 12px; flex-shrink: 0; }
    .state.new { color: var(--success-color); }
    .state.exists { color: var(--warning-color); }
    .state.unsupported { color: var(--text-tertiary); }
    .note { margin: 0; font-size: 12px; line-height: 1.5; }
    .conflict { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .conflict legend { padding: 0; margin-bottom: 4px; font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .radio { display: flex; gap: 8px; align-items: flex-start; color: var(--text-primary); }
    .radio input { margin-top: 3px; }
    .radio small { display: block; font-size: 12px; color: var(--text-secondary); }
    .problem { margin: 0; font-size: 12px; color: var(--error-color); }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .back { margin-right: auto; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn .material-symbols-outlined { font-size: 16px; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: 1px solid transparent; color: var(--text-on-primary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn:focus-visible { outline: 2px solid var(--accent-color); outline-offset: 2px; }
  `],
})
export class ImportFilesDialogComponent {
  protected readonly ui = inject(UiState);
  protected readonly projectState = inject(ProjectState);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly projectIo = inject(ProjectIoService);
  private readonly editorState = inject(EditorState);
  private readonly assetState = inject(AssetState);

  protected readonly stateText = STATE_TEXT;
  protected readonly entries = signal<ImportEntry[] | null>(null);
  protected readonly zip = signal<File | null>(null);
  protected readonly target = signal('/');
  protected readonly keepFolder = signal(true);
  protected readonly conflict = signal<ImportConflict>('skip');
  protected readonly busy = signal(false);
  protected readonly over = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  protected readonly title = computed(() => `Importar archivos al proyecto «${this.projectState.projectName()}»`);
  /** Rutas que ya ocupa el proyecto (archivos de texto, imágenes y fuentes), tal como están al abrir el diálogo. */
  private readonly existing = signal<ReadonlySet<string>>(new Set());
  /** Se lee al abrir y al elegir: el mapa de archivos del editor se modifica en el sitio y no avisa de sus cambios. */
  private readExisting(): void {
    this.existing.set(new Set([...this.editorState.files().keys(), ...this.assetState.assets().keys()]));
  }
  protected readonly folders = computed(() => {
    const list = projectFolders(this.existing());
    const target = this.target();
    return list.includes(target) ? list : [...list, target];
  });
  protected readonly plan = computed(() => planFileImport(this.entries() ?? [], this.existing(), { target: this.target(), keepFolder: this.keepFolder() }));
  private readonly resolved = computed(() => resolveImport(this.plan(), this.existing(), this.conflict()));
  protected readonly writes = computed(() => this.resolved().writes);
  protected readonly rows = computed(() => this.plan().items.slice(0, MAX_ROWS));
  protected readonly hidden = computed(() => Math.max(0, this.plan().items.length - MAX_ROWS));
  protected readonly summary = computed(() => importSummary(this.plan().counts));
  protected readonly what = computed(() => {
    const plan = this.plan();
    const n = plan.items.length;
    const count = `${n} archivo${n === 1 ? '' : 's'}`;
    return plan.rootFolder ? `Carpeta ${plan.rootFolder} · ${count}` : count;
  });
  protected readonly goText = computed(() => {
    const n = this.writes().length;
    return n === 0 ? 'Nada que importar' : `Importar ${n} archivo${n === 1 ? '' : 's'}`;
  });
  protected readonly renameExample = computed(() => {
    const first = this.plan().items.find((i) => i.state === 'exists');
    const name = first?.path.split('/').pop() ?? 'tabla.pug';
    const dot = name.lastIndexOf('.');
    return dot > 0 ? `${name.slice(0, dot)}-2${name.slice(dot)}` : `${name}-2`;
  });

  constructor() {
    effect(() => {
      const req = this.ui.importFiles();
      if (req) {
        untracked(() => {
          this.readExisting();
          this.target.set(normalizeTarget(req.target));
          this.entries.set(req.entries ? this.usable(req.entries) : null);
          this.zip.set(req.zip ?? null);
          this.keepFolder.set(true);
          this.conflict.set('skip');
          this.busy.set(false);
          this.over.set(false);
          this.error.set(req.entries && !this.entries() ? 'No hay archivos que PugIDE pueda importar en lo elegido.' : null);
          this.restoreFocus ??= rememberFocus();
          setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected folderLabel(folder: string): string {
    return folder === '/' ? '/ (raíz del proyecto)' : folder;
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected close(): void {
    this.ui.importFiles.set(null);
  }

  /** Quita dependencias y control de versiones, y corta en el tope; `null` si no queda nada que enseñar. */
  private usable(list: ImportEntry[]): ImportEntry[] | null {
    const missing = this.assetState.missing();
    const kept = list.filter((e) => !isSkippedPath(e.relPath)).slice(0, MAX_IMPORT_FILES).map((e) => {
      // Un archivo suelto que alguna plantilla echa en falta va a la ruta que esa plantilla pide.
      if (e.fixedPath || e.relPath.includes('/')) return e;
      const wanted = missing.find((p) => p.split('/').pop()!.toLowerCase() === e.relPath.toLowerCase());
      return wanted ? { ...e, fixedPath: wanted } : e;
    });
    return kept.length ? kept : null;
  }

  private take(list: ImportEntry[]): void {
    this.readExisting();
    const kept = this.usable(list);
    if (!kept || planFileImport(kept, this.existing(), { target: this.target(), keepFolder: true }).items.every((i) => i.state === 'unsupported')) {
      this.error.set('No hay archivos que PugIDE pueda importar en lo elegido.');
      return;
    }
    this.error.set(list.length > MAX_IMPORT_FILES ? `Hay más de ${MAX_IMPORT_FILES} archivos: se importan los primeros ${MAX_IMPORT_FILES}.` : null);
    this.keepFolder.set(true);
    this.conflict.set('skip');
    this.entries.set(kept);
  }

  protected onPicked(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    if (files.length === 1 && !files[0].webkitRelativePath && isZip(files[0].name)) { this.zip.set(files[0]); return; }
    this.take(files.map((file) => ({ relPath: file.webkitRelativePath || file.name, file })));
  }

  protected onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.over.set(true);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.over.set(false);
    // Entradas y archivos se leen del evento antes de cualquier `await`: después el navegador los invalida.
    const dt = event.dataTransfer;
    const entries = Array.from(dt?.items ?? [])
      .filter((i) => i.kind === 'file')
      .map((i) => i.webkitGetAsEntry?.() as EntryLike | null | undefined)
      .filter((e): e is EntryLike => !!e);
    const files = Array.from(dt?.files ?? []);
    if (!files.length && !entries.length) return;
    await this.projectIo.importDropped(entries, files, this.target());
  }

  protected async addZip(file: File): Promise<void> {
    this.busy.set(true);
    try {
      const list = await this.projectIo.zipEntries(file);
      this.zip.set(null);
      this.take(list);
    } catch (err) {
      this.error.set(`No se pudo leer el .zip: ${(err as Error).message ?? err}`);
    }
    this.busy.set(false);
  }

  protected async openZipAsProject(file: File): Promise<void> {
    this.busy.set(true);
    await this.projectIo.importFromZipFile(file);
    this.close();
  }

  protected async confirm(): Promise<void> {
    const list = this.entries();
    const writes = this.writes();
    if (this.busy() || !list || !writes.length) return;
    this.busy.set(true);
    try {
      const loose = !this.plan().rootFolder;
      const items: ImportedFile[] = [];
      const locales: { name: string; text: string }[] = [];
      for (const write of writes) {
        const entry = list[write.index];
        const bytes = entry.bytes ?? new Uint8Array(await entry.file!.arrayBuffer());
        if (write.kind === 'asset') { items.push({ path: write.path, data: bytes }); continue; }
        const content = entry.bytes ? strFromU8(bytes) : await entry.file!.text();
        // Un JSON suelto que solo trae textos y se llama como un idioma (es-ES.json): se pregunta si es un idioma (P-14).
        if (loose && !write.replaces && looksLikeTranslations(write.path, content)) { locales.push({ name: write.path.split('/').pop()!, text: content }); continue; }
        items.push({ path: write.path, content });
      }
      const folder = this.target() === '/' && !(this.plan().rootFolder && this.keepFolder())
        ? undefined
        : (this.target() === '/' ? '' : this.target()) + (this.plan().rootFolder && this.keepFolder() ? '/' + this.plan().rootFolder : '');
      this.orchestrator.importFiles(items, { skipped: this.resolved().skipped.length, folder });
      this.close();
      if (locales.length) this.ui.localeImport.set({ source: 'drop', files: locales });
    } catch (err) {
      this.error.set(`No se pudo importar: ${(err as Error).message ?? err}`);
      this.busy.set(false);
    }
  }
}
