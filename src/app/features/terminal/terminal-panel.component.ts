import {
  Component,
  ChangeDetectionStrategy,
  inject,
  ViewChild,
  ElementRef,
  effect,
  HostListener,
} from "@angular/core";

import { EditorState } from '../../core/state/editor.state';
import { TerminalState } from "../../core/state/terminal.state";

@Component({
  selector: "app-terminal-panel",
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="terminal-panel">
      <div class="terminal-header">
        <div class="terminal-tabs" role="group" aria-label="Filtro del Registro">
          <span class="terminal-title">Registro</span>
          <button
            class="terminal-tab"
            type="button"
            data-testid="log-filter-essential"
            [class.active]="terminalState.activeFilter() === 'essential'"
            [attr.aria-pressed]="terminalState.activeFilter() === 'essential'"
            (click)="terminalState.setFilter('essential')"
          >
            Esenciales
            @if (terminalState.errorCount() + terminalState.warningCount() > 0) {
              <span class="count" [class.error]="terminalState.errorCount() > 0" [class.warning]="terminalState.errorCount() === 0">{{ terminalState.errorCount() + terminalState.warningCount() }}</span>
            }
          </button>
          <button
            class="terminal-tab"
            type="button"
            data-testid="log-filter-all"
            [class.active]="terminalState.activeFilter() === 'all'"
            [attr.aria-pressed]="terminalState.activeFilter() === 'all'"
            (click)="terminalState.setFilter('all')"
          >
            Todo
          </button>
          @if (terminalState.hiddenDetailCount() > 0) {
            <span class="hidden-note" data-testid="log-hidden-note">{{ terminalState.hiddenDetailCount() }} mensaje{{ terminalState.hiddenDetailCount() === 1 ? '' : 's' }} de detalle oculto{{ terminalState.hiddenDetailCount() === 1 ? '' : 's' }}</span>
          }
        </div>
        <div class="terminal-actions">
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
          <button
            class="terminal-action"
            [class.active]="terminalState.isMaximized()"
            title="Maximizar el Registro"
            aria-label="Maximizar el Registro"
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
            title="Cerrar el Registro"
            aria-label="Cerrar el Registro"
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

      .terminal-title {
        display: flex;
        align-items: center;
        padding: 0 10px 0 4px;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .hidden-note {
        display: flex;
        align-items: center;
        padding: 0 10px;
        font-size: 11px;
        color: var(--text-secondary);
      }

      .log-detail {
        opacity: 0.7;
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
        opacity: 0.5;
      }
    `,
  ],
})
export class TerminalPanelComponent {
  @ViewChild("outputEl") outputEl!: ElementRef<HTMLDivElement>;

  protected terminalState = inject(TerminalState);
  private editorState = inject(EditorState);

  protected goTo(path: string, line: number): void {
    this.editorState.revealLine(path, line);
  }

  protected fileName(path: string): string {
    return path.split('/').pop() ?? path;
  }

  constructor() {
    effect(() => {
      this.terminalState.entries();
      queueMicrotask(() => this.scrollToBottom());
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
