import {
  Component,
  ChangeDetectionStrategy,
  inject,
  ViewChild,
  ElementRef,
  effect,
  HostListener,
} from "@angular/core";

import { DiagnosticsState } from '../../core/state/diagnostics.state';
import { EditorState } from '../../core/state/editor.state';
import { TerminalState } from "../../core/state/terminal.state";
import { ProblemsPanelComponent } from './problems-panel.component';

@Component({
  selector: "app-terminal-panel",
  standalone: true,
  imports: [ProblemsPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="terminal-panel">
      <div class="terminal-header">
        <div class="terminal-tabs" role="tablist" aria-label="Panel inferior" (keydown)="onTabKey($event)">
          <button
            #tabProblems
            class="terminal-tab"
            type="button"
            role="tab"
            id="tab-problems"
            aria-controls="panel-problems"
            data-testid="tab-problems"
            [class.active]="terminalState.activeTab() === 'problems'"
            [attr.aria-selected]="terminalState.activeTab() === 'problems'"
            [attr.tabindex]="terminalState.activeTab() === 'problems' ? 0 : -1"
            (click)="terminalState.activeTab.set('problems')"
          >
            Problemas
            @if (diagnostics.counts().total > 0) {
              <span class="count" data-testid="tab-problems-count" [class.error]="diagnostics.counts().errors > 0" [class.warning]="diagnostics.counts().errors === 0">{{ diagnostics.counts().total }}</span>
            }
          </button>
          <button
            #tabLog
            class="terminal-tab"
            type="button"
            role="tab"
            id="tab-log"
            aria-controls="panel-log"
            data-testid="tab-log"
            [class.active]="terminalState.activeTab() === 'log'"
            [attr.aria-selected]="terminalState.activeTab() === 'log'"
            [attr.tabindex]="terminalState.activeTab() === 'log' ? 0 : -1"
            (click)="terminalState.activeTab.set('log')"
          >
            Registro
            @if (terminalState.essentialIssueCount() > 0) {
              <span class="count warning">{{ terminalState.essentialIssueCount() }}</span>
            }
          </button>
        </div>
        <div class="terminal-actions">
          @if (terminalState.activeTab() === 'log') {
          <button
            class="terminal-action"
            title="Limpiar el Registro (Ctrl+Shift+K)"
            aria-label="Limpiar el Registro (Ctrl+Shift+K)"
            (click)="terminalState.clear()"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 6h18" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
            </svg>
          </button>
          }
          <button
            class="terminal-action"
            [class.active]="terminalState.isMaximized()"
            title="Maximizar el panel"
            aria-label="Maximizar el panel"
            (click)="terminalState.toggleMaximized()"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
          <button
            class="terminal-action"
            title="Cerrar el panel"
            aria-label="Cerrar el panel"
            (click)="terminalState.toggle()"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      @if (terminalState.activeTab() === 'problems') {
        <div class="tabpanel" role="tabpanel" id="panel-problems" aria-labelledby="tab-problems">
          <app-problems-panel />
        </div>
      } @else {
      <div class="tabpanel" role="tabpanel" id="panel-log" aria-labelledby="tab-log">
      <div class="log-toolbar" role="group" aria-label="Filtro del Registro">
        <button type="button" class="log-chip" data-testid="log-filter-essential" [attr.aria-pressed]="terminalState.activeFilter() === 'essential'" (click)="terminalState.setFilter('essential')">Esenciales</button>
        <button type="button" class="log-chip" data-testid="log-filter-all" [attr.aria-pressed]="terminalState.activeFilter() === 'all'" (click)="terminalState.setFilter('all')">Todo</button>
        @if (terminalState.hiddenDetailCount() > 0) {
          <span class="hidden-note" data-testid="log-hidden-note">{{ terminalState.hiddenDetailCount() }} mensaje{{ terminalState.hiddenDetailCount() === 1 ? '' : 's' }} de detalle oculto{{ terminalState.hiddenDetailCount() === 1 ? '' : 's' }}</span>
        }
      </div>
      <div class="terminal-output" #outputEl>
        @for (entry of terminalState.filteredEntries(); track entry.id) {
          <div class="log-entry" [class]="'log-' + entry.type" [class.log-detail]="entry.detail">
            <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
            <span class="log-source">[{{ entry.source }}]</span>
            <span class="log-message">{{ entry.message }}</span>
            @if (entry.path && entry.line) {
              <button class="log-link" type="button" (click)="goTo(entry.path, entry.line)"
                [attr.aria-label]="'Ir a ' + fileName(entry.path) + ', línea ' + entry.line">{{ fileName(entry.path) }}:{{ entry.line }}</button>
            }
          </div>
        }
        @if (terminalState.filteredEntries().length === 0) {
          <div class="empty-terminal">
            <span>Sin mensajes</span>
          </div>
        }
      </div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }

      .terminal-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--bg-secondary);
      }

      .terminal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--border-color);
        min-height: 32px;
        padding: 0 8px;
      }

      .terminal-tabs {
        display: flex;
        gap: 0;
      }

      .tabpanel {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
      }

      .log-toolbar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-bottom: 1px solid var(--border-color);
      }

      .log-chip {
        min-height: 24px;
        padding: 0 10px;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        background: transparent;
        color: var(--text-primary);
        font: inherit;
        font-size: 12px;
        cursor: pointer;
      }

      .log-chip[aria-pressed='true'] {
        background: var(--bg-active);
        border-color: var(--accent-color);
        color: var(--accent-color);
      }

      .hidden-note {
        display: flex;
        align-items: center;
        padding: 0 10px;
        font-size: 11px;
        color: var(--text-secondary);
      }

      /* Las filas de detalle se distinguen por el color, no por la opacidad (que baja el contraste bajo 4,5:1). */
      .log-detail.log-info .log-message {
        color: var(--text-secondary);
      }

      .terminal-tab {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        border: none;
        background: none;
        color: var(--text-secondary);
        font-size: 11px;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        font-family: inherit;
      }

      .terminal-tab:hover {
        color: var(--text-primary);
      }

      .terminal-tab.active {
        color: var(--text-primary);
        border-bottom-color: var(--accent-color);
      }

      .count {
        font-size: 10px;
        padding: 0 5px;
        border-radius: 8px;
        background: var(--bg-badge);
        color: var(--text-secondary);
      }

      .count.error {
        background: var(--error-bg, rgba(243, 139, 168, 0.2));
        color: var(--error-color);
      }

      .count.warning {
        background: var(--warning-bg, rgba(249, 226, 175, 0.2));
        color: var(--warning-color);
      }

      .terminal-actions {
        display: flex;
        gap: 2px;
      }

      .terminal-action {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        background: none;
        color: var(--text-secondary);
        border-radius: 3px;
        cursor: pointer;
        padding: 0;
      }

      .terminal-action:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }

      .terminal-action.active {
        color: var(--accent-color);
        background: var(--bg-active);
      }

      .terminal-output {
        flex: 1;
        overflow-y: auto;
        padding: 4px 0;
        font-family: var(--font-mono);
        font-size: 12px;
      }

      .log-entry {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 3px 12px;
        line-height: 1.4;
      }

      .log-entry:hover {
        background: var(--bg-hover);
      }

      .log-time {
        color: var(--text-tertiary);
        white-space: nowrap;
        flex-shrink: 0;
        font-size: 11px;
      }

      .log-source {
        color: var(--accent-color);
        white-space: nowrap;
        flex-shrink: 0;
      }

      .log-message {
        color: var(--text-primary);
        word-break: break-word;
        white-space: pre-wrap;
      }
      .log-link {
        background: transparent;
        border: none;
        padding: 0 2px;
        color: var(--accent-color);
        font: inherit;
        text-decoration: underline;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .log-info .log-message {
        color: var(--text-primary);
      }
      .log-success .log-message {
        color: var(--success-color, #a6e3a1);
      }
      .log-error .log-message {
        color: var(--error-color);
      }
      .log-warning .log-message {
        color: var(--warning-color);
      }
      .log-debug .log-message {
        color: var(--text-secondary);
      }

      .empty-terminal {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--text-secondary);
        font-size: 12px;
      }
    `,
  ],
})
export class TerminalPanelComponent {
  @ViewChild("outputEl") outputEl!: ElementRef<HTMLDivElement>;
  @ViewChild("tabProblems") private tabProblems?: ElementRef<HTMLButtonElement>;
  @ViewChild("tabLog") private tabLog?: ElementRef<HTMLButtonElement>;

  protected terminalState = inject(TerminalState);
  protected diagnostics = inject(DiagnosticsState);
  private editorState = inject(EditorState);

  /** Flechas, Inicio y Fin cambian de pestaña y llevan el foco a la nueva (patrón de pestañas de WAI-ARIA). */
  protected onTabKey(e: KeyboardEvent): void {
    const order: ('problems' | 'log')[] = ['problems', 'log'];
    const at = order.indexOf(this.terminalState.activeTab());
    let next = at;
    if (e.key === 'ArrowRight') next = (at + 1) % order.length;
    else if (e.key === 'ArrowLeft') next = (at - 1 + order.length) % order.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = order.length - 1;
    else return;
    e.preventDefault();
    this.terminalState.activeTab.set(order[next]);
    this.focusActiveTab();
  }

  private focusActiveTab(): void {
    const el = this.terminalState.activeTab() === 'problems' ? this.tabProblems : this.tabLog;
    queueMicrotask(() => el?.nativeElement.focus());
  }

  protected goTo(path: string, line: number): void {
    this.editorState.revealLine(path, line);
  }

  protected fileName(path: string): string {
    return path.split('/').pop() ?? path;
  }

  constructor() {
    effect(() => {
      this.terminalState.entries();
      this.terminalState.activeTab();
      queueMicrotask(() => this.scrollToBottom());
    });
    // «Ver» en la franja del preview y los contadores de la barra de estado piden llevar el foco a la pestaña activa.
    effect(() => {
      if (this.terminalState.focusRequest() > 0) setTimeout(() => this.focusActiveTab());
    });
  }

  @HostListener("window:keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();
      this.terminalState.clear();
    }
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-ES", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  private scrollToBottom(): void {
    const el = this.outputEl?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
