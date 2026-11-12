import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { AiRunEvent, AiService } from '../../../core/services/ai.service';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { DataState } from '../../../core/state/data.state';
import { EditorState } from '../../../core/state/editor.state';
import { PreviewState } from '../../../core/state/preview.state';
import { AiDialogRequest, UiState } from '../../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import {
  AiContextItem, AiProposal, AiProvider, AI_MODEL_RE, MODEL_OPTIONS, PROVIDER_LABEL, applyEdits, buildContextItems, buildPrompt,
  describeCliCommand, estimateTokens, formatContextKb, formatTokens, lineDiff, parseAiResponse,
} from '../../../core/utils/ai.util';

type Step = 'prepare' | 'running' | 'result';
interface LogLine { at: string; icon: string; text: string; sub?: string }
interface Checked { ok: boolean; reason: string }

const TRANSLATIONS_KEY = 'translations';
const clock = (): string => new Date().toLocaleTimeString('es-ES', { hour12: false });

/**
 * El asistente de IA (P-32 a P-34). Tres pasos, nunca un botón mágico:
 * 1) preparar: proveedor, modelo, qué se envía (marcable), indicaciones, estimación y la orden exacta;
 * 2) en curso: lo que hace la CLI, con tokens en vivo y «Detener»;
 * 3) propuestas: cambios con su porqué, «Probar» (sin tocar nada), «Revertir» y «Aplicar» (que se puede deshacer).
 */
@Component({
  selector: 'app-ai-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (request(); as req) {
      @if (!minimized()) {
        <div class="overlay" (click)="close()">
          <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="title()" tabindex="-1" data-testid="ai-dialog"
            (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
            <div class="header">
              <span aria-hidden="true" class="material-symbols-outlined icon">neurology</span>
              <h2 class="title">{{ title() }}</h2>
              <button type="button" class="x" aria-label="Cerrar" (click)="close()">×</button>
            </div>
            <ol class="steps" aria-label="Pasos">
              @for (s of stepNames; track s.id) { <li [class.on]="s.id === step()" [attr.aria-current]="s.id === step() ? 'step' : null">{{ s.label }}</li> }
            </ol>
            <div class="body">
              @switch (step()) {
                @case ('prepare') {
                  <div class="row">
                    <div class="field">
                      <span class="label" id="ai-prov-label">Proveedor</span>
                      <div class="seg" role="radiogroup" aria-labelledby="ai-prov-label">
                        @for (p of providers; track p) {
                          <button type="button" role="radio" [attr.aria-checked]="provider() === p" [class.on]="provider() === p" [attr.data-testid]="'ai-provider-' + p" (click)="setProvider(p)">{{ label[p] }}</button>
                        }
                      </div>
                    </div>
                    <label class="field grow"><span class="label">Modelo (por defecto el de tus ajustes)</span>
                      <select class="input" data-testid="ai-model" [value]="model()" (change)="model.set($any($event.target).value)">
                        @for (m of modelOptions(); track m.id) { <option [value]="m.id" [selected]="m.id === model()">{{ m.label }}</option> }
                      </select>
                    </label>
                  </div>
                  @if (cliMissing()) {
                    <p class="problem" role="alert" data-testid="ai-cli-missing">{{ cliMissing() }} <button type="button" class="link" (click)="openSettings()">Ajustes del asistente</button></p>
                  }
                  <span class="label">Qué se envía</span>
                  <ul class="items" data-testid="ai-items">
                    @for (it of items(); track it.id) {
                      <li><label><input type="checkbox" [checked]="it.checked" (change)="toggle(it.id)" />
                        <span aria-hidden="true" class="material-symbols-outlined">{{ icon(it) }}</span>
                        <span class="name">{{ it.label }}</span><span class="size">{{ kb(it.content.length) }}</span></label></li>
                    }
                  </ul>
                  <label class="field"><span class="label">Indicaciones (opcional)</span>
                    <textarea class="input" rows="2" data-testid="ai-instructions" [value]="instructions()" (input)="instructions.set($any($event.target).value)" placeholder="Por ejemplo: al menos 3 productos, precios en euros, nombres españoles."></textarea>
                  </label>
                  <div class="stats" data-testid="ai-estimate">
                    <div><span class="label">Entrada estimada</span><b>≈ {{ tokens(estimate()) }} tokens</b></div>
                    <div><span class="label">Salida máxima</span><b>{{ tokens(ai.settings().maxOutputTokens) }} tokens</b></div>
                    <div><span class="label">Herramientas</span><b>Ninguna (solo texto)</b></div>
                  </div>
                  @if (overLimit()) {
                    <p class="warn" role="alert" data-testid="ai-over-limit">Esta petición pasa de tus {{ tokens(ai.settings().confirmAboveTokens) }} tokens de entrada. Desmarca algo o confirma para enviarla igualmente.</p>
                  }
                  <details class="exact">
                    <summary data-testid="ai-show-exact">Ver la orden y el texto exactos que se envían</summary>
                    <pre class="cmd" data-testid="ai-command">{{ command() }}</pre>
                    <pre class="prompt" data-testid="ai-prompt">{{ prompt() }}</pre>
                  </details>
                }
                @case ('running') {
                  <ul class="log" data-testid="ai-log" aria-live="polite">
                    @for (l of log(); track $index) {
                      <li><span class="at">{{ l.at }}</span><span aria-hidden="true" class="material-symbols-outlined">{{ l.icon }}</span><span><span class="txt">{{ l.text }}</span>@if (l.sub) {<span class="sub">{{ l.sub }}</span>}</span></li>
                    }
                  </ul>
                  <div class="meter"><span>Entrada</span><b data-testid="ai-tokens-in">{{ tokens(usage().input) }} tokens</b></div>
                  <div class="bar"><span class="fill in" [style.width.%]="usage().input ? 100 : 0"></span></div>
                  <div class="meter"><span>Salida</span><b data-testid="ai-tokens-out">{{ tokens(usage().output) }} / {{ tokens(ai.settings().maxOutputTokens) }} tokens</b></div>
                  <div class="bar"><span class="fill" [style.width.%]="outPct()"></span></div>
                  <p class="note">Tiempo: {{ elapsed() }} s · los tokens son los que informa la CLI.</p>
                }
                @case ('result') {
                  @if (failure(); as f) {
                    <p class="problem" role="alert" data-testid="ai-error">{{ f }}</p>
                  } @else {
                    @if (summary()) { <p class="summary">{{ summary() }}</p> }
                    @if (proposals().length > 1) {
                      <div class="seg" role="tablist" aria-label="Propuestas">
                        @for (p of proposals(); track $index) {
                          <button type="button" role="tab" [attr.aria-selected]="selected() === $index" [class.on]="selected() === $index" [attr.data-testid]="'ai-proposal-' + $index" (click)="select($index)">{{ p.title }}</button>
                        }
                      </div>
                    }
                    @if (current(); as p) {
                      <p class="explain" data-testid="ai-explanation"><b>{{ p.title }}.</b> {{ p.explanation }}</p>
                      @for (d of diffs(); track d.title) {
                        <div class="diff" [attr.aria-label]="'Cambios en ' + d.title"><div class="diff-title">{{ d.title }}</div>
                          @for (l of d.lines; track $index) { <div class="dl" [class.add]="l.sign === '+'" [class.del]="l.sign === '-'">{{ l.sign }} {{ l.text }}</div> }
                        </div>
                      }
                      @if (checks()[selected()]; as c) {
                        <p class="check" [class.bad]="!c.ok" data-testid="ai-check"><span aria-hidden="true" class="material-symbols-outlined">{{ c.ok ? 'check_circle' : 'error' }}</span>{{ c.reason }}</p>
                      }
                    }
                  }
                  <p class="note">{{ usageText() }}</p>
                }
              }
            </div>
            <div class="footer">
              @switch (step()) {
                @case ('prepare') {
                  <span class="note">Solo sale lo marcado, por tu {{ label[provider()] }}, con tu sesión.</span>
                  <span class="push"></span>
                  <button type="button" class="btn secondary" (click)="close()">Cancelar</button>
                  <button type="button" class="btn primary" data-testid="ai-send" [disabled]="!canSend()" (click)="send()">{{ overLimit() && !confirmLarge() ? 'Enviar de todos modos' : 'Enviar con ' + label[provider()] }}</button>
                }
                @case ('running') {
                  <span class="note">Puedes cerrar el diálogo: sigue en segundo plano y avisa al terminar.</span>
                  <span class="push"></span>
                  <button type="button" class="btn secondary" data-testid="ai-stop" (click)="stop()">Detener</button>
                }
                @case ('result') {
                  <button type="button" class="btn link" data-testid="ai-again" (click)="again()">Pedir otra</button>
                  <span class="push"></span>
                  <button type="button" class="btn secondary" data-testid="ai-discard" (click)="discard()">Descartar</button>
                  @if (current()) {
                    <button type="button" class="btn secondary" data-testid="ai-try" [disabled]="!checks()[selected()]?.ok" (click)="tryIt()">Probar en la vista previa</button>
                    <button type="button" class="btn primary" data-testid="ai-apply" [disabled]="!checks()[selected()]?.ok" (click)="apply()">Aplicar</button>
                  }
                }
              }
            </div>
          </div>
        </div>
      } @else if (step() === 'running' || (step() === 'result' && !trying())) {
        <button type="button" class="chip" data-testid="ai-chip" (click)="minimized.set(false)">
          <span aria-hidden="true" class="material-symbols-outlined">neurology</span>{{ step() === 'running' ? 'IA trabajando…' : 'IA: propuesta lista · Ver' }}
        </button>
      }
      @if (trying()) {
        <div class="trial" role="status" data-testid="ai-trial">
          <span aria-hidden="true" class="material-symbols-outlined">science</span>
          <span class="grow">Probando <b>{{ current()?.title }}</b> de la IA. Tus {{ current()?.data ? 'datos' : 'archivos' }} no han cambiado.</span>
          <button type="button" class="btn secondary" data-testid="ai-trial-back" (click)="backToProposals()">Ver propuestas</button>
          <button type="button" class="btn secondary" data-testid="ai-revert" (click)="revert()">Revertir</button>
          <button type="button" class="btn primary" data-testid="ai-trial-apply" (click)="apply()">Aplicar</button>
        </div>
      }
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2100; }
    .dialog { width: 680px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); display: flex; flex-direction: column; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .dialog:focus { outline: none; }
    .header { display: flex; align-items: center; gap: 8px; padding: 14px 18px; border-bottom: 1px solid var(--border-color); }
    .icon { color: var(--accent-color); }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; flex: 1; }
    .x { width: 28px; height: 28px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 18px; }
    .steps { display: flex; gap: 6px; list-style: none; margin: 0; padding: 12px 18px 0; font-size: 12px; }
    .steps li { padding: 2px 10px; border-radius: 999px; border: 1px solid var(--border-color); color: var(--text-tertiary); }
    .steps li.on { border-color: var(--accent-color); color: var(--accent-color); }
    .body { padding: 12px 18px 16px; display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: var(--text-secondary); overflow: auto; }
    .row { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .grow { flex: 1; }
    .label { font-size: 12px; color: var(--text-secondary); }
    .input { width: 100%; padding: 7px 10px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; font-family: inherit; box-sizing: border-box; }
    .input:focus { border-color: var(--accent-color); outline: none; }
    .seg { display: inline-flex; border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; }
    .seg button { height: 32px; padding: 0 14px; border: 0; background: var(--bg-input); color: var(--text-primary); font: inherit; font-size: 13px; cursor: pointer; }
    .seg button.on { background: var(--bg-surface-container-high); color: var(--accent-color); font-weight: 600; }
    .items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
    .items label { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 4px; background: var(--bg-input); cursor: pointer; }
    .items input { accent-color: var(--accent-color); }
    .items .material-symbols-outlined { font-size: 16px; }
    .name { font-family: var(--font-mono); font-size: 12px; color: var(--text-primary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .size { font-size: 12px; color: var(--text-tertiary); }
    .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input); }
    .stats div { display: flex; flex-direction: column; gap: 2px; }
    .stats b { font-family: var(--font-mono); font-size: 14px; color: var(--text-primary); font-weight: 500; }
    .exact summary { cursor: pointer; color: var(--accent-color); font-size: 12px; }
    .cmd, .prompt { margin: 6px 0 0; padding: 8px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 6px; font-family: var(--font-mono); font-size: 12px; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; }
    .prompt { max-height: 220px; overflow: auto; }
    .log { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .log li { display: flex; gap: 10px; align-items: flex-start; }
    .at { font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); width: 58px; flex-shrink: 0; padding-top: 2px; }
    .log .material-symbols-outlined { font-size: 16px; color: var(--accent-color); }
    .txt { color: var(--text-primary); display: block; }
    .sub { font-size: 12px; display: block; }
    .meter { display: flex; justify-content: space-between; font-size: 12px; }
    .meter b { font-family: var(--font-mono); color: var(--text-primary); font-weight: 500; }
    .bar { height: 6px; border-radius: 3px; background: var(--bg-input); border: 1px solid var(--border-color); overflow: hidden; }
    .fill { display: block; height: 100%; background: var(--accent-color); transition: width 0.2s; }
    .fill.in { background: var(--secondary-color); }
    .summary, .explain { margin: 0; color: var(--text-primary); line-height: 1.5; }
    .diff { border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); padding: 4px 0; max-height: 240px; overflow: auto; }
    .diff-title { font-size: 12px; padding: 2px 8px 4px; color: var(--text-secondary); }
    .dl { font-family: var(--font-mono); font-size: 12px; line-height: 19px; padding: 0 8px; white-space: pre; color: var(--text-secondary); }
    .dl.add { color: var(--success-color); background: rgba(166, 227, 161, 0.1); }
    .dl.del { color: var(--error-color); background: rgba(255, 180, 171, 0.1); }
    .check { display: flex; gap: 6px; align-items: center; margin: 0; font-size: 12px; color: var(--success-color); }
    .check.bad { color: var(--error-color); }
    .check .material-symbols-outlined { font-size: 16px; }
    .note { margin: 0; font-size: 12px; color: var(--text-secondary); }
    .problem { margin: 0; font-size: 12px; color: var(--error-color); }
    .warn { margin: 0; font-size: 12px; color: var(--warning-color); }
    .link { background: none; border: 0; color: var(--accent-color); cursor: pointer; font: inherit; padding: 0 4px; }
    .footer { display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--border-color); }
    .push { flex: 1; }
    .btn { padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; white-space: nowrap; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: 1px solid transparent; color: var(--text-on-primary); }
    .btn.link { background: none; border: 0; color: var(--accent-color); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .chip { position: fixed; right: 16px; bottom: 44px; z-index: 2000; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--accent-color); background: var(--bg-secondary); color: var(--text-primary); font: inherit; font-size: 13px; cursor: pointer; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); }
    .chip .material-symbols-outlined { color: var(--accent-color); font-size: 18px; }
    .trial { position: fixed; top: 72px; right: 16px; z-index: 2000; width: min(640px, calc(100vw - 32px)); display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid var(--accent-color); border-radius: 8px; background: var(--bg-surface-container-high); color: var(--text-primary); font-size: 13px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); }
    .trial .material-symbols-outlined { color: var(--accent-color); }
  `],
})
export class AiDialogComponent {
  protected readonly ui = inject(UiState);
  protected readonly ai = inject(AiService);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly dataState = inject(DataState);
  private readonly editorState = inject(EditorState);
  private readonly previewState = inject(PreviewState);

  protected readonly providers: AiProvider[] = ['claude', 'copilot'];
  protected readonly label = PROVIDER_LABEL;
  protected readonly stepNames: { id: Step; label: string }[] = [{ id: 'prepare', label: '1 · Preparar' }, { id: 'running', label: '2 · En curso' }, { id: 'result', label: '3 · Propuestas' }];

  protected readonly request = signal<AiDialogRequest | null>(null);
  protected readonly step = signal<Step>('prepare');
  protected readonly minimized = signal(false);
  protected readonly provider = signal<AiProvider>('claude');
  protected readonly model = signal('sonnet');
  protected readonly items = signal<AiContextItem[]>([]);
  protected readonly instructions = signal('');
  protected readonly confirmLarge = signal(false);
  protected readonly log = signal<LogLine[]>([]);
  protected readonly usage = signal({ input: 0, output: 0 });
  protected readonly elapsed = signal(0);
  protected readonly failure = signal<string | null>(null);
  protected readonly summary = signal('');
  protected readonly proposals = signal<AiProposal[]>([]);
  protected readonly selected = signal(0);
  protected readonly checks = signal<Checked[]>([]);
  protected readonly trying = signal(false);
  private readonly finalUsage = signal<{ input: number; output: number; ms: number } | null>(null);

  private handle: { cancel: () => void } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  /** Archivos y datos con los que se preparó la petición: las propuestas se comparan y comprueban contra ellos. */
  private baseFiles = new Map<string, string>();
  private baseData: Record<string, unknown> = {};
  private entryPath = '';
  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  protected readonly title = computed(() => (this.request()?.task === 'fix' ? 'Proponer arreglo con IA' : 'Proponer datos con IA'));
  protected readonly modelOptions = computed(() => {
    const list = MODEL_OPTIONS[this.provider()];
    const m = this.model();
    return list.some((o) => o.id === m) ? list : [{ id: m, label: `${m} (de tus ajustes)` }, ...list];
  });
  protected readonly prompt = computed(() => buildPrompt(this.request()?.task ?? 'data', this.items(), this.instructions()));
  protected readonly estimate = computed(() => estimateTokens(this.prompt()));
  protected readonly overLimit = computed(() => this.estimate() > this.ai.settings().confirmAboveTokens);
  protected readonly command = computed(() => describeCliCommand(this.provider(), this.model()));
  protected readonly cliMissing = computed(() => {
    const d = this.ai.detection();
    if (this.ai.detecting()) return null;
    if (!d) return this.ai.mode === 'local' ? 'No responde el puente local: ábrelo con «npm run ia».' : 'No se han podido comprobar las CLI.';
    return d[this.provider()]?.available ? null : `No se encuentra «${this.provider()}» en este equipo.`;
  });
  protected readonly canSend = computed(() => !this.cliMissing() && AI_MODEL_RE.test(this.model()) && this.items().some((i) => i.checked));
  protected readonly outPct = computed(() => Math.min(100, (this.usage().output / Math.max(1, this.ai.settings().maxOutputTokens)) * 100));
  protected readonly current = computed(() => this.proposals()[this.selected()] ?? null);
  protected readonly diffs = computed(() => {
    const p = this.current();
    if (!p) return [];
    const out: { title: string; lines: { sign: ' ' | '-' | '+'; text: string }[] }[] = [];
    if (p.data) {
      const { [TRANSLATIONS_KEY]: _t, ...before } = this.baseData;
      out.push({ title: `Datos de «${this.dataState.activeDataset()?.name ?? 'datos'}»`, lines: lineDiff(JSON.stringify(before, null, 2), JSON.stringify(p.data, null, 2)) });
    }
    if (p.edits.length) {
      const applied = applyEdits(this.baseFiles, p.edits);
      if (applied.ok) for (const [path, after] of applied.changed) out.push({ title: path, lines: lineDiff(this.baseFiles.get(path) ?? '', after) });
    }
    return out;
  });
  protected readonly usageText = computed(() => {
    const u = this.finalUsage();
    return u ? `${PROVIDER_LABEL[this.provider()]} · ${this.model()} · ${formatTokens(u.input)} tokens de entrada · ${formatTokens(u.output)} de salida · ${Math.max(1, Math.round(u.ms / 1000))} s` : '';
  });

  constructor() {
    effect(() => {
      const req = this.ui.aiRequest();
      untracked(() => {
        if (req && req !== this.request()) this.open(req);
        else if (!req && this.request()) this.reset();
      });
    });
  }

  private open(req: AiDialogRequest): void {
    if (this.handle) this.handle.cancel();
    this.orchestrator.setAiTrial(null);
    this.request.set(req);
    const s = this.ai.settings();
    this.provider.set(s.provider);
    this.model.set(s.models[s.provider]);
    this.instructions.set('');
    this.prepareItems();
    this.toStep('prepare');
    this.minimized.set(false);
    if (!this.ai.detection()) void this.ai.detect();
    this.restoreFocus ??= rememberFocus();
    this.focusFirst();
  }

  private prepareItems(): void {
    const req = this.request();
    if (!req) return;
    const files = new Map(this.editorState.allFileContents());
    const active = this.editorState.activeTab()?.path;
    if (active && files.has(active)) files.set(active, this.editorState.editorContent());
    this.baseFiles = files;
    this.baseData = structuredClone(this.dataState.data());
    this.entryPath = this.previewState.entryPath() ?? [...files.keys()].find((p) => /\.(pug|jade)$/i.test(p)) ?? '';
    this.items.set(buildContextItems({ task: req.task, files, entryPath: this.entryPath, data: this.baseData, datasetName: this.dataState.activeDataset()?.name ?? 'datos', error: req.error }));
  }

  private toStep(step: Step): void {
    this.step.set(step);
    this.confirmLarge.set(false);
    if (step === 'prepare') {
      this.log.set([]);
      this.usage.set({ input: 0, output: 0 });
      this.failure.set(null);
      this.proposals.set([]);
      this.checks.set([]);
      this.finalUsage.set(null);
      this.summary.set('');
    }
  }

  protected setProvider(p: AiProvider): void {
    this.provider.set(p);
    this.model.set(this.ai.settings().models[p]);
  }

  protected toggle(id: string): void {
    this.items.update((list) => list.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  }

  protected icon(it: AiContextItem): string {
    return it.kind === 'template' ? 'description' : it.kind === 'translations' ? 'translate' : it.kind === 'error' ? 'error' : 'data_object';
  }

  protected kb(n: number): string { return formatContextKb(n); }
  protected tokens(n: number): string { return formatTokens(n); }

  protected openSettings(): void {
    this.ui.aiSettingsOpen.set(true);
  }

  protected send(): void {
    if (!this.canSend()) return;
    if (this.overLimit() && !this.confirmLarge()) { this.confirmLarge.set(true); return; }
    const req = this.request()!;
    const items = this.items().filter((i) => i.checked);
    const files = items.filter((i) => i.kind === 'template');
    this.toStep('running');
    const started = Date.now();
    this.elapsed.set(0);
    this.timer = setInterval(() => this.elapsed.set(Math.round((Date.now() - started) / 1000)), 1000);
    this.addLog('inventory_2', `Contexto preparado: ${files.length} archivo${files.length === 1 ? '' : 's'}${items.some((i) => i.kind === 'data') ? ', datos' : items.some((i) => i.kind === 'shape') ? ', forma de los datos' : ''}${req.error ? ' y el error' : ''}`, files.map((f) => f.path).join(', '));
    this.handle = this.ai.run(
      { provider: this.provider(), model: this.model(), prompt: this.prompt(), maxOutputTokens: this.ai.settings().maxOutputTokens },
      (e) => this.onEvent(e),
    );
  }

  private onEvent(e: AiRunEvent): void {
    switch (e.type) {
      case 'start': this.addLog('terminal', `Lanzado ${this.provider()} · modelo ${this.model()} · sin herramientas`, e.command); break;
      case 'status': this.addLog('neurology', e.text); break;
      case 'text': if (!this.log().some((l) => l.text === 'Recibiendo la propuesta…')) this.addLog('download', 'Recibiendo la propuesta…'); break;
      case 'usage': {
        const first = this.usage().input === 0 && e.input > 0;
        this.usage.set({ input: e.input, output: e.output });
        if (first) this.addLog('send', `Enviado: ${formatTokens(e.input)} tokens de entrada`, 'Según informa la CLI');
        break;
      }
      case 'done': this.finish(e.usage, e.durationMs); this.readAnswer(e.text); break;
      case 'error': this.finish(e.usage ?? this.usage(), e.durationMs ?? 0); this.failure.set(e.message); this.step.set('result'); break;
    }
  }

  private finish(usage: { input: number; output: number }, ms: number): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.handle = null;
    this.usage.set(usage);
    this.finalUsage.set({ ...usage, ms });
  }

  private readAnswer(text: string): void {
    const parsed = parseAiResponse(text);
    this.step.set('result');
    if (!parsed.ok) { this.failure.set(`${parsed.reason} Puedes pedir otra.`); return; }
    this.summary.set(parsed.value.summary);
    this.proposals.set(parsed.value.proposals);
    this.selected.set(0);
    this.checks.set(parsed.value.proposals.map(() => ({ ok: false, reason: 'Comprobando que compila…' })));
    // Una detrás de otra: el compilador es compartido y dos comprobaciones a la vez mezclarían sus resultados.
    void (async () => { for (const [i, p] of parsed.value.proposals.entries()) await this.check(p, i); })();
  }

  /** Antes de dejar probar o aplicar, se comprueba que la plantilla compila con la propuesta (sin tocar nada). */
  private async check(p: AiProposal, index: number): Promise<void> {
    let result: Checked;
    const edits = p.edits.length ? applyEdits(this.baseFiles, p.edits) : null;
    if (edits && !edits.ok) result = { ok: false, reason: edits.reason };
    else {
      const data = p.data ? this.withTranslations(p.data) : undefined;
      const r = await this.orchestrator.renderStandalone(this.entryPath, { data, files: edits?.ok ? edits.changed : undefined });
      result = r.html !== null ? { ok: true, reason: 'Compila sin errores con esta propuesta (comprobado sin aplicarla).' } : { ok: false, reason: `No compila con esta propuesta: ${r.errors[0] ?? 'error desconocido'}` };
    }
    this.checks.update((list) => list.map((c, i) => (i === index ? result : c)));
  }

  private withTranslations(data: Record<string, unknown>): Record<string, unknown> {
    const t = this.baseData[TRANSLATIONS_KEY];
    return t === undefined ? data : { ...data, [TRANSLATIONS_KEY]: t };
  }

  protected select(i: number): void {
    this.selected.set(i);
    if (this.trying()) this.tryIt();
  }

  protected tryIt(): void {
    const p = this.current();
    if (!p || !this.checks()[this.selected()]?.ok) return;
    const edits = p.edits.length ? applyEdits(this.baseFiles, p.edits) : null;
    this.orchestrator.setAiTrial({ label: p.title, data: p.data ? this.withTranslations(p.data) : undefined, files: edits?.ok ? edits.changed : undefined });
    this.trying.set(true);
    this.minimized.set(true);
  }

  protected backToProposals(): void {
    this.minimized.set(false);
    this.focusFirst();
  }

  protected revert(): void {
    this.orchestrator.setAiTrial(null);
    this.trying.set(false);
    this.minimized.set(false);
    this.focusFirst();
  }

  protected apply(): void {
    const p = this.current();
    if (!p || !this.checks()[this.selected()]?.ok) return;
    const label = `la propuesta «${p.title}» de la IA`;
    if (p.edits.length) {
      const edits = applyEdits(this.baseFiles, p.edits);
      if (edits.ok) this.orchestrator.applyAiEdits(edits.changed, label);
    }
    if (p.data) this.orchestrator.applyAiData(p.data, label);
    this.ui.aiRequest.set(null);
  }

  protected discard(): void {
    this.ui.aiRequest.set(null);
  }

  protected again(): void {
    this.orchestrator.setAiTrial(null);
    this.trying.set(false);
    this.toStep('prepare');
    this.focusFirst();
  }

  protected stop(): void {
    this.handle?.cancel();
  }

  /** Cerrar mientras trabaja la deja en segundo plano (un aviso abajo a la derecha); si no, cierra del todo. */
  protected close(): void {
    if (this.step() === 'running' || (this.step() === 'result' && this.proposals().length)) { this.minimized.set(true); this.restore(); return; }
    this.ui.aiRequest.set(null);
  }

  private reset(): void {
    this.handle?.cancel();
    this.handle = null;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.orchestrator.aiTrial()) this.orchestrator.setAiTrial(null);
    this.trying.set(false);
    this.request.set(null);
    this.restore();
  }

  private restore(): void {
    if (this.restoreFocus) { this.restoreFocus(); this.restoreFocus = null; }
  }

  private addLog(icon: string, text: string, sub?: string): void {
    this.log.update((l) => [...l, { at: clock(), icon, text, sub }]);
  }

  private focusFirst(): void {
    setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }
}
