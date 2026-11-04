import { Component, ChangeDetectionStrategy, DestroyRef, ElementRef, OnInit, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { RestoreOutcome } from '../../../core/services/project-snapshot.service';
import { ProjectState } from '../../../core/state/project.state';
import { SnapshotState } from '../../../core/state/snapshot.state';
import type { SnapshotMeta } from '../../../core/models/project-snapshot.model';
import { rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { MAX_SNAPSHOTS, SnapshotComparison, autoSnapshotName, compareSnapshot, formatBytes, formatSnapshotDate, measureSnapshot, restoreSummary } from '../../../core/utils/snapshot.util';

/** Confirmación de restaurar una instantánea: qué cambia y aviso de la copia automática «Antes de restaurar…». */
@Component({
  selector: 'app-snapshot-restore-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Restaurar instantánea" tabindex="-1"
        (click)="$event.stopPropagation()" (keydown.escape)="cancelled.emit()" (keydown)="onKeydown($event)">
        <div class="header">
          <h2>Restaurar instantánea</h2>
          <button class="icon" title="Cerrar" aria-label="Cerrar" (click)="cancelled.emit()">&times;</button>
        </div>
        <div class="body">
          <p class="lead">El proyecto «{{ projectName() }}» vuelve al estado de «{{ snapshot().name }}» ({{ date() }}):</p>
          @if (lines().length) {
            <ul class="changes" data-testid="restore-summary">
              @for (l of lines(); track l) { <li>{{ l }}</li> }
            </ul>
          } @else if (comparison()) {
            <p class="lead">El proyecto ya es igual a esta instantánea: no cambia nada.</p>
          } @else {
            <p class="lead">Calculando los cambios…</p>
          }
        </div>
        <div class="note" role="status" data-testid="restore-note">
          <strong>Antes se guarda una copia automática.</strong>
          Se llamará «{{ safetyName() }}» y tendrá el estado de ahora ({{ size() }}), para que puedas volver con un clic. Ctrl+Z en el editor también deshace cada archivo.
        </div>
        @if (willReplace(); as oldest) {
          <div class="note limit" role="status" data-testid="restore-limit">
            <strong>Tienes {{ max }} instantáneas.</strong>
            Para guardar esa copia se eliminará la más antigua: «{{ oldest.name }}» ({{ dateOf(oldest) }}).
          </div>
        }
        @if (failure(); as f) {
          <div class="note problem" role="alert" data-testid="restore-error">{{ f }}</div>
        }
        <div class="footer">
          <button class="btn secondary" data-testid="restore-cancel" (click)="cancelled.emit()">Cancelar</button>
          <button class="btn primary" data-testid="restore-confirm" [disabled]="busy()" (click)="confirm()">Restaurar proyecto</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2100; }
    .dialog { width: min(520px, calc(100vw - 32px)); max-height: calc(100vh - 64px); overflow-y: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 8px; }
    h2 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .icon { font-size: 20px; line-height: 1; color: var(--text-secondary); padding: 0 6px; }
    .body { padding: 8px 20px 12px; }
    .lead { margin: 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
    .changes { margin: 8px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
    .changes li { margin: 2px 0; }
    .note { margin: 0 20px 16px; padding: 10px 12px; border: 1px solid var(--accent-color); border-radius: 6px; background: var(--bg-primary); font-size: 12px; line-height: 1.5; color: var(--text-primary); }
    .note strong { font-weight: 600; color: var(--accent-color); }
    .note.limit { border-color: var(--warning-color); }
    .note.limit strong { color: var(--warning-color); }
    .note.problem { border-color: var(--error-color); color: var(--error-color); }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); color: var(--bg-primary); }
    .btn:disabled { opacity: 0.5; cursor: default; }
  `],
})
export class SnapshotRestoreConfirmComponent implements OnInit {
  readonly snapshot = input.required<SnapshotMeta>();
  readonly cancelled = output<void>();
  readonly restored = output<RestoreOutcome & { ok: true }>();

  private orchestrator = inject(OrchestratorService);
  private projectState = inject(ProjectState);
  private snapshotState = inject(SnapshotState);

  protected readonly max = MAX_SNAPSHOTS;
  protected projectName = this.projectState.projectName;
  protected comparison = signal<SnapshotComparison | null>(null);
  protected busy = signal(false);
  protected failure = signal<string | null>(null);
  protected lines = computed(() => {
    const c = this.comparison();
    return c ? restoreSummary(c) : [];
  });
  protected date = computed(() => formatSnapshotDate(this.snapshot().at));
  protected safetyName = computed(() => autoSnapshotName(this.snapshot().name));
  protected size = signal('');
  /** Con el tope alcanzado, la copia automática elimina la más antigua: se avisa aquí, antes de confirmar. */
  protected willReplace = computed(() => (this.snapshotState.isFull() ? this.snapshotState.oldest() : null));

  private dialog = viewChild<ElementRef<HTMLElement>>('dlg');

  constructor() {
    const restoreFocus = rememberFocus();
    inject(DestroyRef).onDestroy(() => restoreFocus());
    afterNextRender(() => this.dialog()?.nativeElement.focus());
  }

  async ngOnInit(): Promise<void> {
    const base = await this.orchestrator.loadSnapshotContent(this.snapshot().id);
    const current = this.orchestrator.currentSnapshotContent();
    this.size.set(formatBytes(measureSnapshot(current).bytes));
    if (base) this.comparison.set(compareSnapshot(base, current));
    else this.failure.set('La instantánea ya no está en el navegador.');
  }

  protected dateOf(s: SnapshotMeta): string {
    return formatSnapshotDate(s.at);
  }

  protected async confirm(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.failure.set(null);
    const outcome = await this.orchestrator.restoreSnapshot(this.snapshot().id, { replaceOldest: this.snapshotState.isFull() });
    this.busy.set(false);
    if (outcome.ok) { this.restored.emit(outcome); return; }
    this.failure.set(
      outcome.reason === 'missing' ? 'La instantánea ya no está en el navegador.'
        : outcome.reason === 'too-big' ? `No se restauró nada: no cabe la copia de seguridad del estado actual (${formatBytes(outcome.bytes)}; tope ${formatBytes(outcome.max)}). Reduce o quita assets e inténtalo de nuevo.`
          : outcome.reason === 'full' ? 'No se restauró nada: ya hay 20 instantáneas. Elimina alguna e inténtalo de nuevo.'
            : 'No se restauró nada: no se pudo guardar la copia de seguridad en el navegador (almacenamiento lleno o bloqueado).',
    );
  }

  protected onKeydown(e: KeyboardEvent): void {
    const dlg = this.dialog()?.nativeElement;
    if (dlg) trapTab(e, dlg);
  }
}
