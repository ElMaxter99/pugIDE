import { Component, ChangeDetectionStrategy, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectState } from '../../../core/state/project.state';
import { SnapshotState } from '../../../core/state/snapshot.state';
import type { SnapshotMeta } from '../../../core/models/project-snapshot.model';
import { rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { formatAgo } from '../../../core/utils/history.util';
import { MAX_SNAPSHOTS, MAX_SNAPSHOT_NAME, formatBytes, formatSnapshotDate, plural } from '../../../core/utils/snapshot.util';
import { SaveOutcome } from '../../../core/services/project-snapshot.service';
import { SnapshotCompareComponent } from './snapshot-compare.component';
import { SnapshotRestoreConfirmComponent } from './snapshot-restore-confirm.component';

type Problem = { title: string; text: string };

/** Instantáneas con nombre del proyecto entero: guardar, comparar con el proyecto actual, restaurar, renombrar y eliminar. */
@Component({
  selector: 'app-project-snapshots-dialog',
  standalone: true,
  imports: [SnapshotCompareComponent, SnapshotRestoreConfirmComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      @if (view() === 'list') {
        <div class="overlay" (click)="closed.emit()">
          <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Instantáneas del proyecto" tabindex="-1"
            (click)="$event.stopPropagation()" (keydown.escape)="closed.emit()" (keydown)="onKeydown($event)">
            <div class="header">
              <h2>Instantáneas · <span class="sub">{{ projectName() }}</span></h2>
              <button class="icon" title="Cerrar" aria-label="Cerrar" (click)="closed.emit()">&times;</button>
            </div>
            <p class="hint">Copias con nombre del proyecto entero (archivos, datos, idiomas y assets) guardadas solo en este navegador. Hasta {{ max }} por proyecto.</p>
            <div class="save-row">
              <div class="field">
                <label for="snapshot-name">Nombre</label>
                <input id="snapshot-name" type="text" data-testid="snapshot-name" autocomplete="off" [attr.maxlength]="maxName"
                  placeholder="Nombre de la instantánea (opcional)" [value]="nameValue()"
                  (input)="nameValue.set($any($event.target).value)" (keydown.enter)="save()" />
              </div>
              <button class="btn primary save-btn" type="button" data-testid="snapshot-save" (click)="save()">Guardar instantánea</button>
            </div>
            @if (pendingName() !== null && state.oldest(); as oldest) {
              <div class="panel warn" role="status" data-testid="snapshot-replace">
                <div class="panel-title">Ya tienes {{ max }} instantáneas</div>
                <div class="panel-text">Si guardas «{{ pendingLabel() }}», se eliminará la más antigua: «{{ oldest.name }}» ({{ dateOf(oldest) }}, {{ bytes(oldest.bytes) }}). Para conservarla, cancela y elimina otra antes.</div>
                <div class="panel-actions">
                  <button class="btn secondary" type="button" data-testid="snapshot-replace-cancel" (click)="dismiss('replace')">Cancelar</button>
                  <button class="btn dlg-primary" type="button" data-testid="snapshot-replace-confirm" (click)="confirmReplace()">Guardar y eliminar la más antigua</button>
                </div>
              </div>
            }
            @if (problem(); as p) {
              <div class="panel err" role="alert" data-testid="snapshot-problem">
                <div class="panel-title">{{ p.title }}</div>
                <div class="panel-text">{{ p.text }}</div>
                <div class="panel-actions"><button class="btn secondary" type="button" (click)="dismiss('failure')">Entendido</button></div>
              </div>
            }
            @if (notice(); as n) {
              <div class="panel ok" role="status" data-testid="snapshot-notice">{{ n }}</div>
            }
            <div class="counter" [class.full]="state.isFull()">
              <span data-testid="snapshot-count">{{ state.count() }} de {{ max }} instantáneas{{ state.isFull() ? ' · tope alcanzado' : '' }}</span>
              @if (state.count()) { <span>{{ bytes(state.totalBytes()) }} en total</span> }
            </div>
            <ul class="list" aria-label="Instantáneas">
              @for (s of state.items(); track s.id) {
                <li class="row" data-testid="snapshot-row">
                  <div class="info">
                    @if (renamingId() === s.id) {
                      <input class="name-input" data-testid="snapshot-rename-input" aria-label="Nuevo nombre de la instantánea" [attr.maxlength]="maxName" [value]="s.name" #nameInput
                        (keydown.enter)="rename(s, nameInput.value)" (keydown.escape)="cancelRename($event)" (blur)="rename(s, nameInput.value)" />
                    } @else {
                      <div class="title">
                        <span class="name" data-testid="snapshot-name-label">{{ s.name }}</span>
                        @if (s.auto) { <span class="tag">automática</span> }
                        @if (pendingName() !== null && state.oldest()?.id === s.id) { <span class="tag warn">se eliminará</span> }
                      </div>
                    }
                    <span class="meta">{{ ago(s.at) }} · {{ dateOf(s) }}</span>
                    <span class="meta">{{ plural(s.fileCount, 'archivo', 'archivos') }} · {{ plural(s.assetCount, 'asset', 'assets') }} · {{ bytes(s.bytes) }}</span>
                  </div>
                  <div class="actions">
                    <button class="btn" type="button" data-testid="snapshot-compare" (click)="openCompare(s)">Comparar</button>
                    <button class="btn" type="button" data-testid="snapshot-restore" (click)="askRestore(s)">Restaurar</button>
                    <button class="btn" type="button" data-testid="snapshot-rename" (click)="renamingId.set(s.id)">Renombrar</button>
                    @if (confirmDeleteId() === s.id) {
                      <button class="btn danger" type="button" data-testid="snapshot-delete-confirm" (click)="remove(s)">Confirmar</button>
                    } @else {
                      <button class="btn" type="button" data-testid="snapshot-delete" (click)="confirmDeleteId.set(s.id)">Eliminar</button>
                    }
                  </div>
                </li>
              } @empty {
                <li class="empty" data-testid="snapshot-empty">
                  @if (state.loading()) { Cargando… } @else {
                    Este proyecto aún no tiene instantáneas.<br />Guarda una antes de un cambio grande: podrás compararla con el proyecto actual y volver a ella.
                  }
                </li>
              }
            </ul>
            @if (state.count()) {
              <p class="footnote">Al restaurar se guarda antes una instantánea automática, para poder volver. Ctrl+Z en el editor sigue deshaciendo cada archivo.</p>
            }
          </div>
        </div>
      } @else if (compareFor(); as target) {
        <app-snapshot-compare [snapshot]="target" (back)="view.set('list')" (restore)="askRestore(target)" />
      }
      @if (confirmFor(); as target) {
        <app-snapshot-restore-confirm [snapshot]="target" (cancelled)="restoreId.set(null)" (restored)="onRestored()" />
      }
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: min(760px, calc(100vw - 32px)); max-height: calc(100vh - 64px); display: flex; flex-direction: column; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 4px; }
    h2 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); overflow-wrap: anywhere; }
    .sub { font-weight: 400; color: var(--text-secondary); }
    .icon { font-size: 20px; line-height: 1; color: var(--text-secondary); padding: 0 6px; }
    .hint { margin: 0; padding: 0 20px 12px; font-size: 12px; color: var(--text-secondary); }
    .save-row { display: flex; align-items: flex-end; gap: 8px; padding: 0 20px 12px; }
    .field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
    .field label { font-size: 12px; color: var(--text-secondary); }
    .field input { height: 32px; padding: 6px 10px; font-size: 13px; color: var(--text-primary); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 4px; min-width: 0; }
    .field input:focus, .name-input:focus { outline: none; border-color: var(--accent-color); }
    .save-btn { height: 32px; padding: 0 14px; }
    .panel { margin: 0 20px 12px; padding: 10px 12px; border: 1px solid var(--accent-color); border-radius: 6px; background: var(--bg-primary); font-size: 12px; line-height: 1.5; color: var(--text-primary); }
    .panel.warn { border-color: var(--warning-color); }
    .panel.err { border-color: var(--error-color); }
    .panel.ok { border-color: var(--border-color); color: var(--text-secondary); }
    .panel-title { font-size: 13px; font-weight: 600; }
    .panel.warn .panel-title { color: var(--warning-color); }
    .panel.err .panel-title { color: var(--error-color); }
    .panel-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
    .counter { display: flex; justify-content: space-between; padding: 0 20px 6px; font-size: 12px; color: var(--text-secondary); }
    .counter.full { color: var(--warning-color); font-weight: 600; }
    .counter.full span:last-child { font-weight: 400; }
    .list { list-style: none; margin: 0; padding: 0 12px; overflow-y: auto; max-height: 44vh; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 8px; border-radius: 6px; flex-wrap: wrap; }
    .row:hover { background: var(--bg-hover); }
    .info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .name { font-size: 14px; color: var(--text-primary); font-weight: 600; overflow-wrap: anywhere; }
    .tag { font-size: 11px; line-height: 16px; padding: 0 6px; color: var(--accent-color); border: 1px solid var(--accent-color); border-radius: 999px; }
    .tag.warn { color: var(--warning-color); border-color: var(--warning-color); }
    .meta { font-size: 12px; color: var(--text-secondary); }
    .name-input { font-size: 14px; padding: 4px 6px; color: var(--text-primary); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 4px; }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .btn { padding: 4px 10px; font-size: 12px; color: var(--text-primary); background: var(--bg-surface-container-highest, var(--bg-hover)); border-radius: 4px; }
    .btn:hover { filter: brightness(1.15); }
    .btn:disabled { opacity: 0.5; cursor: default; }
    .btn.primary { background: var(--accent-color); color: var(--text-on-primary); font-weight: 700; padding: 6px 14px; font-size: 13px; }
    .btn.dlg-primary { background: var(--accent-color); color: var(--bg-primary); padding: 6px 16px; font-weight: 500; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); padding: 6px 16px; font-weight: 500; }
    .btn.danger { background: #b3261e; color: #fff; }
    .empty { padding: 24px 20px 32px; text-align: center; color: var(--text-secondary); font-size: 13px; line-height: 1.5; }
    .footnote { margin: 0; padding: 8px 20px 16px; font-size: 12px; color: var(--text-tertiary); }
  `],
})
export class ProjectSnapshotsDialogComponent {
  readonly isOpen = input(false);
  readonly closed = output<void>();

  private orchestrator = inject(OrchestratorService);
  private projectState = inject(ProjectState);
  protected state = inject(SnapshotState);

  protected readonly max = MAX_SNAPSHOTS;
  protected readonly maxName = MAX_SNAPSHOT_NAME;
  protected readonly plural = plural;
  protected projectName = this.projectState.projectName;
  protected view = signal<'list' | 'detail'>('list');
  protected nameValue = signal('');
  protected saving = signal(false);
  /** Nombre que se quiere guardar cuando ya hay 20: espera a que se confirme la sustitución de la más antigua. */
  protected pendingName = signal<string | null>(null);
  protected problem = signal<Problem | null>(null);
  protected notice = signal<string | null>(null);
  protected renamingId = signal<string | null>(null);
  protected confirmDeleteId = signal<string | null>(null);
  protected compareId = signal<string | null>(null);
  protected restoreId = signal<string | null>(null);

  protected pendingLabel = computed(() => this.pendingName()?.trim() || 'la instantánea nueva');
  protected compareFor = computed(() => this.state.items().find((s) => s.id === this.compareId()) ?? null);
  protected confirmFor = computed(() => this.state.items().find((s) => s.id === this.restoreId()) ?? null);

  private dialog = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        untracked(() => {
          this.restoreFocus = rememberFocus();
          this.reset();
          void this.orchestrator.refreshSnapshots();
          setTimeout(() => this.dialog()?.nativeElement.focus());
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
    // Al volver de la comparación a la lista, el foco vuelve al diálogo.
    effect(() => {
      if (this.isOpen() && this.view() === 'list') setTimeout(() => this.dialog()?.nativeElement.focus());
    });
  }

  private reset(): void {
    this.view.set('list');
    this.nameValue.set('');
    this.pendingName.set(null);
    this.problem.set(null);
    this.notice.set(null);
    this.renamingId.set(null);
    this.confirmDeleteId.set(null);
    this.compareId.set(null);
    this.restoreId.set(null);
  }

  protected ago(at: number): string {
    return formatAgo(at, Date.now());
  }

  protected dateOf(s: SnapshotMeta): string {
    return formatSnapshotDate(s.at);
  }

  protected bytes(n: number): string {
    return formatBytes(n);
  }

  protected save(): Promise<void> {
    return this.runSave(this.nameValue(), false);
  }

  protected confirmReplace(): Promise<void> {
    return this.runSave(this.pendingName() ?? '', true);
  }

  private async runSave(name: string, replaceOldest: boolean): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.problem.set(null);
    this.notice.set(null);
    const outcome = await this.orchestrator.saveSnapshot(name, { replaceOldest });
    this.saving.set(false);
    this.report(outcome, name);
    this.keepFocus();
  }

  /** Si el botón pulsado desapareció (aviso, confirmación…), el foco vuelve al diálogo para que Escape y Tab sigan funcionando. */
  private keepFocus(): void {
    setTimeout(() => {
      const dlg = this.dialog()?.nativeElement;
      if (dlg && !dlg.contains(document.activeElement)) dlg.focus();
    });
  }

  private report(outcome: SaveOutcome, name: string): void {
    if (outcome.ok) {
      this.pendingName.set(null);
      this.nameValue.set('');
      const saved = outcome.meta.name;
      this.notice.set(`Instantánea «${saved}» guardada.${outcome.replaced ? ` Se eliminó la más antigua: «${outcome.replaced.name}».` : ''}`);
    } else if (outcome.reason === 'full') {
      this.pendingName.set(name);
    } else if (outcome.reason === 'too-big') {
      this.pendingName.set(null);
      const heavy = outcome.heaviest.map((h) => `${h.path} (${formatBytes(h.bytes)})`).join(' y ');
      this.problem.set({
        title: 'No se guardó la instantánea: no cabe',
        text: `El proyecto ocupa ${formatBytes(outcome.bytes)} y el tope por instantánea es ${formatBytes(outcome.max)}. Lo que más pesa: ${heavy}. Reduce o quita assets, o exporta un .zip con Workspace › Exportar proyecto.`,
      });
    } else {
      this.pendingName.set(null);
      this.problem.set({
        title: 'No se pudo guardar la instantánea',
        text: 'El navegador no permitió escribir (almacenamiento lleno o bloqueado, por ejemplo en una ventana privada). Libera espacio o exporta un .zip del proyecto.',
      });
    }
  }

  protected dismiss(what: 'replace' | 'failure'): void {
    if (what === 'replace') this.pendingName.set(null);
    else this.problem.set(null);
    this.keepFocus();
  }

  protected openCompare(s: SnapshotMeta): void {
    this.compareId.set(s.id);
    this.view.set('detail');
  }

  protected askRestore(s: SnapshotMeta): void {
    this.restoreId.set(s.id);
  }

  protected onRestored(): void {
    this.restoreId.set(null);
    this.closed.emit();
  }

  protected async rename(s: SnapshotMeta, value: string): Promise<void> {
    if (this.renamingId() !== s.id) return;
    this.renamingId.set(null);
    if (value.trim() && value.trim() !== s.name) await this.orchestrator.renameSnapshot(s.id, value);
    this.keepFocus();
  }

  protected cancelRename(e: Event): void {
    e.stopPropagation(); // Escape cancela el cambio de nombre sin cerrar el diálogo
    this.renamingId.set(null);
    this.keepFocus();
  }

  protected async remove(s: SnapshotMeta): Promise<void> {
    this.confirmDeleteId.set(null);
    await this.orchestrator.deleteSnapshot(s.id);
    this.keepFocus();
  }

  protected onKeydown(e: KeyboardEvent): void {
    const dlg = this.dialog()?.nativeElement;
    if (dlg) trapTab(e, dlg);
  }
}
