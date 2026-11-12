import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { AiService } from '../../../core/services/ai.service';
import { UiState } from '../../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { AI_MODEL_RE, AiProvider, AiSettings, MODEL_OPTIONS, PROVIDER_LABEL } from '../../../core/utils/ai.util';

/**
 * Ajustes del asistente de IA (P-30): las CLI que hay en el equipo (`claude`, `copilot`), su modelo por defecto,
 * el proveedor por defecto y los límites. Solo en escritorio y en local.
 */
@Component({
  selector: 'app-ai-settings-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.aiSettingsOpen()) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Asistente de IA" tabindex="-1" data-testid="ai-settings"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><span aria-hidden="true" class="material-symbols-outlined icon">neurology</span><h2 class="title">Asistente de IA</h2></div>
          <div class="body">
            <p class="note">PugIDE usa la CLI que ya tienes instalada, con tu sesión: <code>claude</code> (Claude Code) o <code>copilot</code> (GitHub Copilot). La lanza sin herramientas: la IA no puede leer ni escribir archivos ni ejecutar órdenes; solo recibe el texto que ves antes de enviar.</p>
            @if (ai.mode === 'local' && ai.bridgeUp() === false) {
              <p class="problem" role="alert" data-testid="ai-bridge-down">No responde el puente local. Ábrelo en otra terminal con <code>npm run ia</code> y pulsa «Comprobar».</p>
            }
            @for (p of providers; track p) {
              <section class="cli" [attr.data-testid]="'ai-cli-' + p">
                <div class="cli-head">
                  <span aria-hidden="true" class="material-symbols-outlined" [class.ok]="info(p)?.available" [class.warn]="!info(p)?.available">{{ info(p)?.available ? 'check_circle' : 'error' }}</span>
                  <div class="cli-name">
                    <b>{{ label[p] }}</b>
                    <span class="meta">{{ status(p) }}</span>
                  </div>
                  <button type="button" class="btn secondary" [disabled]="ai.detecting()" (click)="check()">Comprobar</button>
                </div>
                @if (info(p) && !info(p)!.available) {
                  <p class="meta">Instálala con <code>{{ install[p] }}</code> y, en una terminal, ejecuta <code>{{ p }}</code> para iniciar sesión.</p>
                }
                <label class="label" [for]="'ai-model-' + p">Modelo por defecto</label>
                <select class="input" [id]="'ai-model-' + p" [attr.data-testid]="'ai-model-' + p" [value]="modelChoice(p)" (change)="pickModel(p, $any($event.target).value)">
                  @for (m of options[p]; track m.id) { <option [value]="m.id" [selected]="m.id === modelChoice(p)">{{ m.label }}</option> }
                  <option value="__other" [selected]="modelChoice(p) === '__other'">Otro…</option>
                </select>
                @if (modelChoice(p) === '__other') {
                  <input class="input" type="text" [attr.aria-label]="'Nombre del modelo de ' + label[p]" [attr.data-testid]="'ai-model-other-' + p" [value]="draft().models[p]" (input)="setModel(p, $any($event.target).value)" />
                  @if (!validModel(p)) { <p class="problem">Solo letras, números, puntos, guiones y dos puntos (como lo escribe la CLI).</p> }
                }
              </section>
            }
            <label class="label" for="ai-provider">Proveedor por defecto</label>
            <select class="input" id="ai-provider" data-testid="ai-provider" [value]="draft().provider" (change)="patch({ provider: $any($event.target).value })">
              @for (p of providers; track p) { <option [value]="p" [selected]="p === draft().provider">{{ label[p] }}</option> }
            </select>
            <div class="row">
              <label class="label grow">Máximo de tokens de salida por petición
                <input class="input" type="number" min="256" step="500" data-testid="ai-max-output" [value]="draft().maxOutputTokens" (input)="patch({ maxOutputTokens: +$any($event.target).value })" /></label>
              <label class="label grow">Pedir confirmación si la entrada pasa de
                <input class="input" type="number" min="1000" step="1000" [value]="draft().confirmAboveTokens" (input)="patch({ confirmAboveTokens: +$any($event.target).value })" /></label>
            </div>
            <label class="check"><input type="checkbox" [checked]="draft().log" (change)="patch({ log: $any($event.target).checked })" /> Apuntar en el Registro cada petición (CLI, modelo, tokens y tiempo)</label>
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" (click)="close()">Cancelar</button>
            <button type="button" class="btn primary" data-testid="ai-settings-save" [disabled]="!validModel('claude') || !validModel('copilot')" (click)="save()">Guardar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2100; }
    .dialog { width: 600px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .dialog:focus { outline: none; }
    .header { display: flex; align-items: center; gap: 8px; padding: 16px 20px 8px; }
    .icon { color: var(--accent-color); }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 10px; }
    .note { margin: 0; line-height: 1.5; }
    code { font-family: var(--font-mono); font-size: 12px; }
    .cli { display: flex; flex-direction: column; gap: 6px; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input); }
    .cli-head { display: flex; align-items: center; gap: 10px; }
    .cli-name { flex: 1; display: flex; flex-direction: column; color: var(--text-primary); }
    .meta { font-size: 12px; color: var(--text-secondary); margin: 0; }
    .ok { color: var(--success-color); }
    .warn { color: var(--warning-color); }
    .label { font-size: 12px; display: flex; flex-direction: column; gap: 4px; }
    .grow { flex: 1; }
    .row { display: flex; gap: 12px; }
    .input { width: 100%; padding: 7px 10px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; font-family: inherit; box-sizing: border-box; }
    .input:focus { border-color: var(--accent-color); outline: none; }
    .check { display: flex; gap: 8px; align-items: center; color: var(--text-primary); }
    .check input { accent-color: var(--accent-color); }
    .problem { margin: 0; font-size: 12px; color: var(--error-color); }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: 1px solid transparent; color: var(--text-on-primary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class AiSettingsDialogComponent {
  protected readonly ui = inject(UiState);
  protected readonly ai = inject(AiService);
  protected readonly providers: AiProvider[] = ['claude', 'copilot'];
  protected readonly label = PROVIDER_LABEL;
  protected readonly options = MODEL_OPTIONS;
  protected readonly install: Record<AiProvider, string> = { claude: 'npm i -g @anthropic-ai/claude-code', copilot: 'npm i -g @github/copilot' };
  protected readonly draft = signal<AiSettings>(this.ai.settings());
  private readonly other = signal<Record<AiProvider, boolean>>({ claude: false, copilot: false });
  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.ui.aiSettingsOpen()) {
        untracked(() => {
          const s = this.ai.settings();
          this.draft.set(s);
          this.other.set({ claude: !this.isListed('claude', s.models.claude), copilot: !this.isListed('copilot', s.models.copilot) });
          void this.ai.detect();
          this.restoreFocus = rememberFocus();
          setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected info(p: AiProvider) {
    return this.ai.detection()?.[p] ?? null;
  }

  protected status(p: AiProvider): string {
    if (this.ai.detecting()) return 'Comprobando…';
    const i = this.info(p);
    if (!i) return this.ai.mode === 'local' ? 'Sin respuesta del puente local' : 'Sin comprobar';
    return i.available ? `Encontrada · ${i.version}` : `No se encuentra «${p}» en este equipo`;
  }

  private isListed(p: AiProvider, model: string): boolean {
    return MODEL_OPTIONS[p].some((m) => m.id === model);
  }

  protected modelChoice(p: AiProvider): string {
    return this.other()[p] ? '__other' : this.draft().models[p];
  }

  protected pickModel(p: AiProvider, value: string): void {
    if (value === '__other') { this.other.update((o) => ({ ...o, [p]: true })); return; }
    this.other.update((o) => ({ ...o, [p]: false }));
    this.setModel(p, value);
  }

  protected setModel(p: AiProvider, value: string): void {
    this.draft.update((d) => ({ ...d, models: { ...d.models, [p]: value.trim() } }));
  }

  protected validModel(p: AiProvider): boolean {
    return AI_MODEL_RE.test(this.draft().models[p]);
  }

  protected patch(part: Partial<AiSettings>): void {
    this.draft.update((d) => ({ ...d, ...part }));
  }

  protected check(): void {
    void this.ai.detect();
  }

  protected save(): void {
    this.ai.saveSettings(this.draft());
    this.close();
  }

  protected close(): void {
    this.ui.aiSettingsOpen.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }
}
