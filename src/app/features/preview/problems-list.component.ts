import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DiagnosticsState } from '../../core/state/diagnostics.state';
import { EditorState } from '../../core/state/editor.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import type { Diagnostic } from '../../core/utils/diagnostics.util';

/** Lista de todos los problemas de la última compilación: cada uno lleva al archivo y la línea, con su explicación y su arreglo. */
@Component({
  selector: 'app-problems-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="diag-list" aria-label="Problemas del proyecto">
      @for (d of diagnostics.diagnostics(); track $index) {
        <li class="diag-row" [class.warning]="d.severity === 'warning'">
          <button class="diag-go" type="button" (click)="go(d)" [attr.aria-label]="'Ir a ' + fileName(d.path) + ', línea ' + d.line">
            {{ fileName(d.path) }}:{{ d.line }}
          </button>
          <span class="diag-text">
            <span class="diag-msg">{{ d.message }}</span>
            @if (d.hint) {
              <span class="diag-hint">{{ d.hint }}</span>
            }
          </span>
          @if (d.fix; as fix) {
            <button class="diag-fix" type="button" (click)="orchestrator.applyFix(fix)">{{ fix.label }}</button>
          }
        </li>
      }
    </ul>
  `,
  styles: [`
    :host { display: block; }
    .diag-list {
      list-style: none;
      margin: 0;
      padding: 4px 12px 8px;
      max-height: 160px;
      overflow: auto;
      background: rgba(255, 82, 82, 0.06);
      border-bottom: 1px solid rgba(255, 82, 82, 0.4);
      font-size: 12px;
    }
    .diag-row { display: flex; align-items: baseline; gap: 8px; padding: 3px 0; color: var(--text-primary); }
    .diag-row.warning .diag-go { color: var(--warning-color); }
    .diag-go, .diag-fix {
      background: transparent;
      border: 1px solid currentColor;
      border-radius: 4px;
      font: inherit;
      font-size: 11px;
      padding: 1px 6px;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .diag-go { color: var(--error-color); }
    .diag-fix { color: var(--accent-color); }
    .diag-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    .diag-msg { display: block; }
    .diag-hint { display: block; color: var(--text-secondary); }
  `],
})
export class ProblemsListComponent {
  protected diagnostics = inject(DiagnosticsState);
  protected orchestrator = inject(OrchestratorService);
  private editorState = inject(EditorState);

  protected go(d: Diagnostic): void {
    this.editorState.revealLine(d.path, d.line);
  }

  protected fileName(path: string): string {
    return path.split('/').pop() ?? path;
  }
}
