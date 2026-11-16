import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import type { SnapshotContent } from '../../../core/models/project-snapshot.model';
import { FolderCheck, MoveToFolderService } from '../../../core/services/move-to-folder.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { UiState } from '../../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { moveBytes } from '../../../core/utils/move-to-folder.util';
import { formatBytes } from '../../../core/utils/snapshot.util';

/**
 * «Pasar … a una carpeta» (P-41, solo escritorio): elegir la carpeta, el nombre del espacio y si se conserva la copia
 * en «Mis proyectos». Si la carpeta ya tiene archivos con los mismos nombres, se dice cuáles: nunca se sobrescriben.
 */
@Component({
  selector: 'app-move-to-folder-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.moveToFolder(); as p) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="'Pasar «' + p.name + '» a una carpeta'" tabindex="-1" data-testid="move-to-folder-dialog"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Pasar «{{ p.name }}» a una carpeta</h2></div>
          <div class="body">
            <div class="pick">
              <label class="field grow">Carpeta
                <input type="text" readonly data-testid="move-folder" [value]="folder()?.path ?? ''" placeholder="Elige una carpeta del disco" /></label>
              <button type="button" class="btn secondary" data-testid="move-pick" [disabled]="busy()" (click)="pick()">Elegir…</button>
            </div>
            <label class="field">Nombre del espacio de trabajo
              <input type="text" data-testid="move-name" [value]="name()" (input)="name.set($any($event.target).value)" [disabled]="busy()" /></label>
            <p class="note" data-testid="move-summary">{{ summary() }}</p>
            @if (check(); as c) {
              @if (c.conflicts.length) {
                <div class="bar warn" role="status" data-testid="move-conflicts">
                  <span aria-hidden="true" class="material-symbols-outlined">warning</span>
                  <span class="grow"><b>La carpeta ya tiene {{ c.fileCount }} {{ c.fileCount === 1 ? 'archivo' : 'archivos' }}.</b>
                    No se sobrescribe nada: {{ c.conflicts.length === 1 ? 'coincide 1 nombre' : 'coinciden ' + c.conflicts.length + ' nombres' }} ({{ conflictList() }}) y se guardarán con otro nombre ({{ example() }}).</span>
                </div>
              } @else if (c.fileCount > 0) {
                <p class="note" data-testid="move-alongside">La carpeta ya tiene {{ c.fileCount }} {{ c.fileCount === 1 ? 'archivo' : 'archivos' }}: los del proyecto se añadirán junto a lo que hay. Nunca se borra nada del disco.</p>
              }
            }
            <label class="radio"><input type="radio" name="move-keep" data-testid="move-keep" [checked]="keepCopy()" (change)="keepCopy.set(true)" [disabled]="busy()" />
              <span>Conservar también la copia en «Mis proyectos»<span class="sub">Recomendado la primera vez. Puedes borrarla después.</span></span></label>
            <label class="radio"><input type="radio" name="move-keep" data-testid="move-remove" [checked]="!keepCopy()" (change)="keepCopy.set(false)" [disabled]="busy()" />
              <span>Quitarla de «Mis proyectos» al terminar</span></label>
            @if (error()) {
              <div class="bar error" role="alert" data-testid="move-error">
                <span aria-hidden="true" class="material-symbols-outlined">error</span>
                <span class="grow">{{ error() }}</span>
                <button type="button" class="btn primary small" data-testid="move-repick" (click)="pick()">Elegir otra carpeta</button>
              </div>
            }
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" (click)="close()" [disabled]="busy()">Cancelar</button>
            <button type="button" class="btn primary" data-testid="move-go" [disabled]="busy() || !folder() || !content() || !name().trim()" (click)="run()">
              <span aria-hidden="true" class="material-symbols-outlined">folder_open</span>{{ busy() ? 'Pasando…' : 'Pasar y abrir' }}</button>
          </div>
        </div>
      </div>
    }
    @if (done(); as d) {
      <div class="toast" role="status" data-testid="move-done">
        <span aria-hidden="true" class="material-symbols-outlined ok-icon">check_circle</span>
        <div class="grow"><div><b>«{{ d.name }}» está ahora en el disco</b></div><div class="sub">{{ d.path }} · abierto como espacio de trabajo</div>
          <button type="button" class="btn link" data-testid="move-done-reveal" (click)="reveal()"><span aria-hidden="true" class="material-symbols-outlined">folder_open</span>Mostrar la carpeta</button></div>
        <button type="button" class="close" aria-label="Cerrar aviso" (click)="done.set(null)">×</button>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 500px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; overflow-wrap: anywhere; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-primary); display: flex; flex-direction: column; gap: 12px; }
    .pick { display: flex; gap: 8px; align-items: flex-end; }
    .grow { flex: 1; min-width: 0; }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-secondary); }
    .field input { height: 34px; padding: 0 10px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font: inherit; font-size: 13px; }
    .note { margin: 0; font-size: 12px; color: var(--text-secondary); line-height: 1.5; overflow-wrap: anywhere; }
    .radio { display: flex; gap: 8px; align-items: flex-start; }
    .radio input { accent-color: var(--accent-color); margin-top: 3px; }
    .sub { display: block; font-size: 12px; color: var(--text-secondary); }
    .bar { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-tertiary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
    .bar .material-symbols-outlined { font-size: 18px; }
    .bar.warn { border-color: var(--warning-color); } .bar.warn .material-symbols-outlined { color: var(--warning-color); }
    .bar.error { border-color: var(--error-color); } .bar.error .material-symbols-outlined { color: var(--error-color); }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; height: 34px; }
    .btn .material-symbols-outlined { font-size: 16px; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--text-on-primary); }
    .btn.link { background: none; border: none; color: var(--accent-color); padding: 6px 0 0; height: auto; }
    .btn.small { height: 28px; padding: 0 10px; flex-shrink: 0; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .toast { position: fixed; right: 16px; bottom: 40px; z-index: 2100; width: 440px; max-width: calc(100vw - 32px); display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); font-size: 13px; color: var(--text-primary); }
    .ok-icon { color: var(--success-color); font-size: 20px; }
    .close { width: 24px; height: 24px; border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 16px; }
  `],
})
export class MoveToFolderDialogComponent {
  protected readonly ui = inject(UiState);
  private readonly mover = inject(MoveToFolderService);
  private readonly workspace = inject(WorkspaceService);

  protected readonly folder = signal<{ token: string; path: string } | null>(null);
  protected readonly check = signal<FolderCheck | null>(null);
  protected readonly content = signal<SnapshotContent | null>(null);
  protected readonly name = signal('');
  protected readonly keepCopy = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal<{ name: string; path: string } | null>(null);

  protected readonly summary = computed(() => {
    const c = this.content();
    if (!c) return 'Leyendo el proyecto…';
    const files = Object.keys(c.files).length;
    const assets = c.assets.length;
    return `Se escriben ${files} ${files === 1 ? 'archivo' : 'archivos'}${assets ? ` y ${assets} ${assets === 1 ? 'imagen o fuente' : 'imágenes o fuentes'}` : ''} (${formatBytes(moveBytes(c))}).${c.datasets ? ' Los juegos de datos van a .pugide/datasets.json.' : ''}`;
  });
  protected readonly conflictList = computed(() => (this.check()?.conflicts ?? []).slice(0, 3).map((p) => p.slice(1)).join(', ') + ((this.check()?.conflicts.length ?? 0) > 3 ? '…' : ''));
  protected readonly example = computed(() => {
    const first = this.check()?.conflicts[0];
    if (!first) return '';
    const name = first.split('/').pop() ?? first;
    const dot = name.lastIndexOf('.');
    return dot > 0 ? `${name.slice(0, dot)} (2)${name.slice(dot)}` : `${name} (2)`;
  });

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      const p = this.ui.moveToFolder();
      if (p) {
        untracked(() => {
          this.folder.set(null);
          this.check.set(null);
          this.content.set(null);
          this.name.set(p.name);
          this.keepCopy.set(true);
          this.error.set(null);
          this.busy.set(false);
          void this.mover.content(p.id).then((c) => {
            if (this.ui.moveToFolder()?.id !== p.id) return;
            if (c) this.content.set(c); else this.error.set('No se pudo leer el proyecto guardado.');
          });
          this.restoreFocus = rememberFocus();
          setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected async pick(): Promise<void> {
    const picked = await this.workspace.pickFolder();
    if (!picked) return;
    this.error.set(null);
    this.folder.set({ token: picked.token, path: picked.path });
    const c = this.content();
    this.check.set(c ? await this.mover.check(picked.token, c) : null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected close(): void {
    if (this.busy()) return;
    this.ui.moveToFolder.set(null);
  }

  protected async run(): Promise<void> {
    const p = this.ui.moveToFolder();
    const f = this.folder();
    if (!p || !f || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const r = await this.mover.run({ projectId: p.id, projectName: p.name, workspaceName: this.name().trim() || p.name, color: this.workspace.colors()[0] ?? '#ddb7ff', token: f.token, keepCopy: this.keepCopy() });
    this.busy.set(false);
    if (r.ok) {
      this.ui.moveToFolder.set(null);
      this.done.set({ name: p.name, path: r.path });
    } else {
      this.error.set(r.message);
    }
  }

  protected reveal(): void {
    this.workspace.reveal();
  }
}
