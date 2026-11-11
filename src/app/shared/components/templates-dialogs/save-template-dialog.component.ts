import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectState } from '../../../core/state/project.state';
import { UiState } from '../../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { formatBytes, measureSnapshot, plural } from '../../../core/utils/snapshot.util';
import { MAX_USER_TEMPLATE_BYTES, cleanTemplateName, templateContent } from '../../../core/utils/user-template.util';

/** «Guardar como plantilla» (P-25): el proyecto abierto como punto de partida de proyectos nuevos. Se guarda en este navegador. */
@Component({
  selector: 'app-save-template-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.saveTemplateOpen()) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Guardar como plantilla" tabindex="-1" data-testid="save-template"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Guardar como plantilla</h2></div>
          <div class="body">
            <label class="label" for="tpl-name">Nombre</label>
            <input id="tpl-name" class="input" type="text" maxlength="80" data-testid="save-template-name" [value]="name()" (input)="name.set($any($event.target).value)" (keydown.enter)="save()" />
            <label class="label" for="tpl-desc">Descripción (opcional)</label>
            <input id="tpl-desc" class="input" type="text" maxlength="200" [value]="description()" (input)="description.set($any($event.target).value)" />
            <label class="check"><input type="checkbox" [checked]="data()" (change)="data.set($any($event.target).checked)" /> Incluir los datos de ejemplo</label>
            <label class="check"><input type="checkbox" [checked]="assets()" (change)="assets.set($any($event.target).checked)" /> Incluir imágenes y fuentes</label>
            <label class="check"><input type="checkbox" [checked]="locales()" (change)="locales.set($any($event.target).checked)" /> Incluir los idiomas</label>
            <p class="note" [class.problem]="!fits()" data-testid="save-template-size">{{ sizeText() }}</p>
            @if (error(); as e) { <p class="problem" role="alert">{{ e }}</p> }
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" (click)="close()">Cancelar</button>
            <button type="button" class="btn primary" data-testid="save-template-go" [disabled]="busy() || !validName() || !fits()" (click)="save()">Guardar plantilla</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2100; }
    .dialog { width: 480px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 8px; }
    .label { font-size: 12px; margin-top: 4px; }
    .input { width: 100%; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; font-family: inherit; box-sizing: border-box; }
    .input:focus { border-color: var(--accent-color); outline: none; }
    .check { display: flex; gap: 8px; align-items: center; color: var(--text-primary); }
    .check input { accent-color: var(--accent-color); }
    .note { margin: 4px 0 0; font-size: 12px; line-height: 1.5; }
    .problem { margin: 2px 0 0; font-size: 12px; color: var(--error-color); }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--text-on-primary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class SaveTemplateDialogComponent {
  protected readonly ui = inject(UiState);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly projectState = inject(ProjectState);

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly data = signal(true);
  protected readonly assets = signal(true);
  protected readonly locales = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly tick = signal(0);

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  protected readonly validName = computed(() => !!cleanTemplateName(this.name()));
  private readonly content = computed(() => {
    this.tick();
    return templateContent(this.orchestrator.currentSnapshotContent(), { data: this.data(), assets: this.assets(), locales: this.locales() });
  });
  private readonly size = computed(() => measureSnapshot(this.content(), MAX_USER_TEMPLATE_BYTES));
  protected readonly fits = computed(() => this.size().fits);
  protected readonly sizeText = computed(() => {
    const c = this.content();
    const what = `${plural(Object.keys(c.files).length, 'archivo', 'archivos')}, ${plural(c.assets.length, 'imagen o fuente', 'imágenes y fuentes')}, ${formatBytes(this.size().bytes)}`;
    return this.fits() ? `Se guarda en este navegador. ${what}.` : `No cabe: ${what} y el tope por plantilla es ${formatBytes(MAX_USER_TEMPLATE_BYTES)}. Desmarca las imágenes.`;
  });

  constructor() {
    effect(() => {
      if (this.ui.saveTemplateOpen()) {
        untracked(() => {
          this.name.set(this.projectState.projectName() || '');
          this.description.set('');
          this.data.set(true); this.assets.set(true); this.locales.set(true);
          this.busy.set(false); this.error.set(null);
          this.tick.update((n) => n + 1);
          this.restoreFocus = rememberFocus();
          setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected close(): void { this.ui.saveTemplateOpen.set(false); }

  protected async save(): Promise<void> {
    if (this.busy() || !this.validName() || !this.fits()) return;
    this.busy.set(true);
    const outcome = await this.orchestrator.saveAsTemplate(this.name(), this.description(), { data: this.data(), assets: this.assets(), locales: this.locales() });
    this.busy.set(false);
    if (outcome.ok) { this.close(); return; }
    this.error.set(outcome.reason === 'full' ? `Ya tienes ${outcome.max} plantillas: borra alguna desde «Mis proyectos» para guardar otra.`
      : outcome.reason === 'too-big' ? 'La plantilla no cabe: desmarca las imágenes y fuentes.'
      : 'No se pudo guardar en el navegador (almacenamiento lleno o bloqueado).');
  }
}
