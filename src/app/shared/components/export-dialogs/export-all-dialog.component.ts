import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { strToU8, zipSync } from 'fflate';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectState } from '../../../core/state/project.state';
import { TerminalState } from '../../../core/state/terminal.state';
import { UiState } from '../../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';

/**
 * «Exportar todas las plantillas» (P-24): compila cada plantilla que es una página (no los parciales) con los datos
 * actuales y descarga un `.zip` con un `.html` autocontenido por plantilla. Los enlaces entre plantillas pasan a `.html`.
 */
@Component({
  selector: 'app-export-all-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.exportAllOpen()) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Exportar todas las plantillas" tabindex="-1" data-testid="export-all"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Exportar todas las plantillas</h2></div>
          <div class="body">
            <p class="note">Cada plantilla se compila con los datos actuales y sale como un <code>.html</code> autocontenido dentro de un <code>.zip</code>. Los parciales (<code>include</code>, <code>extends</code>) no se exportan sueltos.</p>
            @for (p of pages(); track p) {
              <label class="check"><input type="checkbox" [attr.data-testid]="'export-all-' + p" [checked]="chosen().has(p)" (change)="toggle(p, $any($event.target).checked)" />
                <span>{{ p.slice(1) }}</span><span class="arrow">→ {{ htmlName(p) }}</span></label>
            } @empty {
              <p class="problem">Este proyecto no tiene ninguna plantilla que sea una página.</p>
            }
            @for (p of partials(); track p) {
              <div class="partial"><span aria-hidden="true" class="material-symbols-outlined">link</span>{{ p.slice(1) }} <span class="arrow">parcial, no se exporta</span></div>
            }
            @if (failed().length) {
              <div class="problem" role="alert">No se exportó:
                @for (f of failed(); track f) { <div>{{ f }}</div> }
              </div>
            }
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" (click)="close()">Cancelar</button>
            <button type="button" class="btn primary" data-testid="export-all-go" [disabled]="busy() || chosen().size === 0" (click)="run()">
              {{ busy() ? 'Exportando…' : 'Exportar ' + chosen().size + (chosen().size === 1 ? ' plantilla' : ' plantillas') }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 560px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 8px; }
    .note { margin: 0 0 4px; font-size: 12px; line-height: 1.5; }
    code { font-family: var(--font-mono); font-size: 12px; }
    .check { display: flex; gap: 8px; align-items: center; color: var(--text-primary); overflow-wrap: anywhere; }
    .check input { accent-color: var(--accent-color); flex-shrink: 0; }
    .arrow { color: var(--text-secondary); font-size: 12px; }
    .partial { display: flex; gap: 8px; align-items: center; }
    .partial .material-symbols-outlined { font-size: 15px; }
    .problem { margin: 4px 0 0; font-size: 12px; color: var(--error-color); line-height: 1.5; overflow-wrap: anywhere; }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--text-on-primary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ExportAllDialogComponent {
  protected readonly ui = inject(UiState);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly projectState = inject(ProjectState);
  private readonly terminal = inject(TerminalState);

  private readonly lists = signal<{ pages: string[]; partials: string[] }>({ pages: [], partials: [] });
  protected readonly pages = computed(() => this.lists().pages);
  protected readonly partials = computed(() => this.lists().partials);
  protected readonly chosen = signal<Set<string>>(new Set());
  protected readonly busy = signal(false);
  protected readonly failed = signal<string[]>([]);

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.ui.exportAllOpen()) {
        untracked(() => {
          const lists = this.orchestrator.templatePages();
          this.lists.set(lists);
          this.chosen.set(new Set(lists.pages));
          this.failed.set([]);
          this.busy.set(false);
          this.restoreFocus = rememberFocus();
          setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected htmlName(path: string): string { return this.orchestrator.htmlNameFor(path); }

  protected toggle(path: string, on: boolean): void {
    const next = new Set(this.chosen());
    if (on) next.add(path); else next.delete(path);
    this.chosen.set(next);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected close(): void { this.ui.exportAllOpen.set(false); }

  protected async run(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    const zip: Record<string, Uint8Array> = {};
    const failed: string[] = [];
    for (const path of this.pages().filter((p) => this.chosen().has(p))) {
      const r = await this.orchestrator.renderStandalone(path);
      if (r.html) zip[this.htmlName(path)] = strToU8(r.html);
      else failed.push(`${path.slice(1)}: ${r.errors[0] ?? 'no compila'}`);
    }
    this.busy.set(false);
    this.failed.set(failed);
    const done = Object.keys(zip).length;
    if (done === 0) {
      this.terminal.addEntry('error', 'Exportar', 'No se exportó ninguna plantilla: corrige los errores y vuelve a intentarlo.');
      return;
    }
    const fileName = `${this.projectState.projectName() || 'pug-project'}-html.zip`;
    const url = URL.createObjectURL(new Blob([zipSync(zip, { level: 6 }) as BlobPart], { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.terminal.addEntry(failed.length ? 'warning' : 'success', 'Exportar', `${fileName} descargado: ${done} ${done === 1 ? 'plantilla' : 'plantillas'}${failed.length ? `; ${failed.length} con errores, sin exportar` : ''}.`);
    if (!failed.length) this.close();
  }
}
