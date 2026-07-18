import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from '@angular/core';

export interface DialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'confirm';
  inputValue?: string;
  inputLabel?: string;
  showInput?: boolean;
}

@Component({
  selector: 'app-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="dialog-overlay" (click)="onCancel()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3 class="dialog-title">{{ config().title }}</h3>
            <button class="dialog-close" (click)="onCancel()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="dialog-body">
            <p class="dialog-message">{{ config().message }}</p>
            @if (config().showInput) {
              <label class="dialog-label">{{ config().inputLabel }}</label>
              <input
                class="dialog-input"
                [value]="inputValue()"
                (input)="inputValue.set($any($event.target).value)"
                (keydown.enter)="onConfirm()" />
            }
          </div>
          <div class="dialog-footer">
            <button class="dialog-btn secondary" (click)="onCancel()">
              {{ config().cancelText ?? 'Cancel' }}
            </button>
            <button class="dialog-btn primary" (click)="onConfirm()">
              {{ config().confirmText ?? 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.1s ease-out;
    }

    .dialog {
      min-width: 360px;
      max-width: 480px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 8px;
    }

    .dialog-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .dialog-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: none;
      color: var(--text-secondary);
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
    }

    .dialog-close:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .dialog-body {
      padding: 8px 20px 16px;
    }

    .dialog-message {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .dialog-label {
      display: block;
      margin-top: 12px;
      margin-bottom: 6px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .dialog-input {
      width: 100%;
      padding: 8px 12px;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
      font-family: inherit;
    }

    .dialog-input:focus {
      border-color: var(--accent-color);
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 0 20px 16px;
    }

    .dialog-btn {
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
    }

    .dialog-btn.secondary {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .dialog-btn.secondary:hover {
      background: var(--bg-hover);
    }

    .dialog-btn.primary {
      background: var(--accent-color);
      border: none;
      color: var(--bg-primary);
    }

    .dialog-btn.primary:hover {
      opacity: 0.9;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
})
export class DialogComponent {
  config = input.required<DialogConfig>();
  isOpen = input(false);
  confirmed = output<string>();
  cancelled = output<void>();

  inputValue = signal('');

  onConfirm(): void {
    this.confirmed.emit(this.inputValue());
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
