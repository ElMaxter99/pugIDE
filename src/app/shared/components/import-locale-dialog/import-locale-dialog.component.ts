import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { UiState } from '../../../core/state/ui.state';
import { EditorState } from '../../../core/state/editor.state';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import {
  countTranslations, diffTranslations, isValidLocaleCode, localeCodeFromFileName, localePath, normalizeTranslations, parseTranslations,
} from '../../../core/utils/locales.util';

interface Row {
  name: string;
  text: string;
  count: number;
  error: string | null;
  incoming: Record<string, unknown>;
}

/**
 * Importar archivos de idioma (P-14): confirma el código de cada archivo (sale del nombre: `es-ES.json`), avisa de que se
 * convierten las claves planas y, si el idioma ya existe, deja elegir entre fusionar y reemplazar. Se abre desde
 * «Añadir idioma → Importar archivo…» o al soltar un JSON que solo trae textos.
 */
@Component({
  selector: 'app-import-locale-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (request(); as req) {
      <div class="overlay" (click)="dismiss()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="title()" tabindex="-1"
          (click)="$event.stopPropagation()" (keydown.escape)="dismiss()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">{{ title() }}</h2></div>
          <div class="body">
            @if (req.source === 'drop') {
              <p class="msg">
                @if (rows().length === 1) { Has soltado <strong>{{ rows()[0].name }}</strong>: solo contiene textos. ¿Lo añado como idioma del proyecto? }
                @else { Has soltado {{ rows().length }} archivos que solo contienen textos. ¿Los añado como idiomas del proyecto? }
              </p>
            }
            @for (row of rows(); track $index) {
              <div class="file">
                <span class="material-symbols-outlined" aria-hidden="true">description</span>
                <strong>{{ row.name }}</strong>
                @if (!row.error) { <span class="muted">· {{ row.count }} {{ row.count === 1 ? 'clave' : 'claves' }}</span> }
              </div>
              @if (row.error) {
                <p class="problem" role="alert">{{ row.error }}</p>
              } @else {
                <label class="label" [attr.for]="'import-locale-code-' + $index">
                  Código de idioma{{ codeFromName(row.name) ? ' (detectado del nombre del archivo)' : '' }}
                </label>
                <input class="input" [id]="'import-locale-code-' + $index" [value]="codes()[$index]" (input)="setCode($index, $any($event.target).value)"
                  [attr.aria-invalid]="codeProblem($index) ? 'true' : null" [attr.aria-describedby]="codeProblem($index) ? 'import-locale-err-' + $index : null"
                  placeholder="es-ES" (keydown.enter)="confirm()" />
                @if (codeProblem($index); as p) { <p class="problem" role="alert" [id]="'import-locale-err-' + $index">{{ p }}</p> }
              }
            }
            @if (existing().length) {
              <fieldset class="mode">
                <legend>El idioma {{ existing().join(', ') }} ya existe</legend>
                @for (e of existing(); track e.code) {
                  <p class="muted">{{ e.path }} tiene {{ e.have }} claves. El archivo importado trae {{ e.total }} ({{ e.added }} nuevas, {{ e.changed }} con otro valor).</p>
                }
                <label class="radio"><input type="radio" name="import-locale-mode" [checked]="mode() === 'merge'" (change)="mode.set('merge')" />
                  <span><strong>Fusionar</strong> (recomendado): añade las claves nuevas y rellena las vacías; no pisa lo que ya tienes.</span></label>
                <label class="radio"><input type="radio" name="import-locale-mode" [checked]="mode() === 'replace'" (change)="mode.set('replace')" />
                  <span><strong>Reemplazar</strong>: el archivo importado sustituye al actual.</span></label>
              </fieldset>
            } @else if (rows().length && !hasErrors()) {
              <p class="note"><span class="material-symbols-outlined" aria-hidden="true">info</span>
                Se guarda en <strong>{{ pathPreview() }}</strong>. Las claves planas («HOME.TITLE») se convierten a anidadas.</p>
            }
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" (click)="req.source === 'drop' ? keepAsData() : close()">{{ req.source === 'drop' ? 'Es un dato más' : 'Cancelar' }}</button>
            <button type="button" class="btn primary" [disabled]="!canConfirm()" (click)="confirm()">{{ req.source === 'drop' ? 'Añadir como idioma' : (existing().length && mode() === 'merge' ? 'Fusionar' : existing().length ? 'Reemplazar' : 'Importar') }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 520px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); }
    .msg { margin: 0 0 12px; line-height: 1.5; }
    .msg strong, .file strong, .note strong, .radio strong { color: var(--text-primary); }
    .file { display: flex; align-items: center; gap: 8px; margin-top: 8px; color: var(--text-primary); }
    .file .material-symbols-outlined, .note .material-symbols-outlined { font-size: 16px; color: var(--text-secondary); }
    .muted { color: var(--text-secondary); }
    .label { display: block; margin: 8px 0 6px; font-size: 12px; color: var(--text-secondary); }
    .input { width: 100%; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box; }
    .input:focus { border-color: var(--accent-color); }
    .problem { margin: 6px 0 0; font-size: 12px; color: var(--error-color, #ff8a80); }
    .note { display: flex; gap: 8px; align-items: flex-start; margin: 12px 0 0; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); font-size: 12px; line-height: 1.5; }
    .mode { margin: 12px 0 0; padding: 0; border: 0; }
    .mode legend { padding: 0; margin-bottom: 6px; font-weight: 600; color: var(--text-primary); }
    .mode p { margin: 0 0 8px; line-height: 1.5; }
    .radio { display: flex; gap: 8px; margin-top: 8px; line-height: 1.5; cursor: pointer; }
    .radio input { margin-top: 3px; accent-color: var(--accent-color); }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.secondary:hover { background: var(--bg-hover); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--bg-primary); }
    .btn.primary:hover:not(:disabled) { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ImportLocaleDialogComponent {
  private readonly ui = inject(UiState);
  private readonly editorState = inject(EditorState);
  private readonly orchestrator = inject(OrchestratorService);

  protected readonly request = this.ui.localeImport;
  protected readonly codes = signal<string[]>([]);
  protected readonly mode = signal<'merge' | 'replace'>('merge');
  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  protected readonly rows = computed<Row[]>(() =>
    (this.request()?.files ?? []).map((f) => {
      const parsed = parseTranslations(f.text);
      const incoming = normalizeTranslations(parsed.value);
      return { name: f.name, text: f.text, count: countTranslations(incoming), error: parsed.error ? `${f.name}: ${parsed.error.message}` : null, incoming };
    }),
  );
  protected readonly hasErrors = computed(() => this.rows().some((r) => r.error));
  protected readonly title = computed(() => (this.request()?.source === 'drop' ? (this.rows().length > 1 ? '¿Son archivos de idioma?' : '¿Es un archivo de idioma?') : 'Importar idioma'));
  protected readonly pathPreview = computed(() => localePath((this.codes()[0] ?? '').trim() || '<código>'));

  /** Idiomas que ya existen entre los que se importan, con lo que cambiaría. */
  protected readonly existing = computed(() => {
    const files = this.editorState.files();
    const out: { code: string; path: string; have: number; total: number; added: number; changed: number }[] = [];
    this.rows().forEach((row, i) => {
      const code = (this.codes()[i] ?? '').trim();
      const path = localePath(code);
      if (row.error || !isValidLocaleCode(code) || !files.has(path)) return;
      const current = parseTranslations(files.get(path) ?? '').value;
      const { added, changed } = diffTranslations(current, row.incoming);
      out.push({ code, path, have: countTranslations(current), total: row.count, added, changed });
    });
    return out;
  });

  constructor() {
    effect(() => {
      const req = this.request();
      if (req) {
        untracked(() => {
          this.codes.set(req.files.map((f) => localeCodeFromFileName(f.name) ?? ''));
          this.mode.set('merge');
          this.restoreFocus = rememberFocus();
          setTimeout(() => {
            const el = this.dlg()?.nativeElement;
            const items = el ? focusableElements(el) : [];
            (items.find((e) => e.tagName === 'INPUT') ?? items[items.length - 1] ?? el)?.focus();
          });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected codeFromName(name: string): string | null {
    return localeCodeFromFileName(name);
  }

  protected setCode(i: number, value: string): void {
    this.codes.update((c) => c.map((v, j) => (j === i ? value : v)));
  }

  protected codeProblem(i: number): string | null {
    const code = (this.codes()[i] ?? '').trim();
    if (!code) return 'Escribe el código del idioma (por ejemplo es-ES, es-CAT, en).';
    if (!isValidLocaleCode(code)) return `«${code}» no es un código de idioma válido (ejemplos: es-ES, es-CAT, en).`;
    if (this.codes().some((c, j) => j !== i && c.trim() === code)) return `Dos archivos usan el código ${code}.`;
    return null;
  }

  protected canConfirm(): boolean {
    const rows = this.rows();
    return rows.length > 0 && !this.hasErrors() && rows.every((_, i) => !this.codeProblem(i));
  }

  protected onKeydown(e: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(e, el);
  }

  protected confirm(): void {
    if (!this.canConfirm()) return;
    this.orchestrator.importLocales(this.rows().map((r, i) => ({ code: this.codes()[i], text: r.text })), this.mode());
    this.request.set(null);
  }

  /** Soltado como JSON de textos pero no es un idioma: se añade tal cual, como un archivo más. */
  protected keepAsData(): void {
    const req = this.request();
    this.request.set(null);
    if (req?.source === 'drop') this.orchestrator.addDroppedFiles(new Map(req.files.map((f) => ['/' + f.name, f.text])), []);
  }

  protected close(): void {
    this.request.set(null);
  }

  /** Esc o clic fuera: al importar se cancela; al soltar, el archivo no se pierde (se añade como dato). */
  protected dismiss(): void {
    if (this.request()?.source === 'drop') this.keepAsData();
    else this.close();
  }
}
