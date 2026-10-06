import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { ContextMenuAction } from '../../../core/models/index';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="context-overlay" (click)="close()"></div>
      <div class="context-menu" [style.left.px]="clampedX()" [style.top.px]="clampedY()">
        @for (item of items(); track item.label) {
          @if (item.separator) {
            <div class="context-separator"></div>
          } @else {
            <button
              class="context-item"
              [class.disabled]="item.disabled"
              [disabled]="item.disabled"
              (click)="onAction(item)">
              @if (item.icon) {
                <span class="context-icon material-symbols-outlined">{{ item.icon }}</span>
              }
              <span class="context-label">{{ item.label }}</span>
              @if (item.children) {
                <span class="context-arrow">▸</span>
              }
            </button>
          }
        }
      </div>
    }
  `,
  styles: [`
    .context-overlay {
      position: fixed;
      inset: 0;
      z-index: 999;
    }

    .context-menu {
      position: fixed;
      z-index: 1000;
      min-width: 190px;
      max-width: calc(100vw - 16px);
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 4px 0;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      animation: fadeIn 0.1s ease-out;
    }

    .context-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 12px;
      border: none;
      background: none;
      color: var(--text-primary);
      font-size: 13px;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
    }

    .context-item:hover:not(.disabled) {
      background: var(--accent-color);
      color: var(--bg-primary);
    }

    .context-item.disabled {
      opacity: 0.4;
      cursor: default;
    }

    .context-icon {
      width: 18px;
      height: 18px;
      overflow: hidden;
      text-align: center;
      font-size: 18px;
      line-height: 18px;
      flex-shrink: 0;
    }

    .context-label {
      flex: 1;
    }

    .context-arrow {
      font-size: 10px;
      opacity: 0.6;
    }

    .context-separator {
      height: 1px;
      background: var(--border-color);
      margin: 4px 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `],
})
export class ContextMenuComponent {
  items = input.required<ContextMenuAction[]>();
  positionX = input(0);
  positionY = input(0);
  isOpen = input(false);
  actionSelected = output<string>();

  /** Keeps the menu inside the viewport (approximate size: 200px wide, 34px per row). */
  clampedX = computed(() => Math.max(8, Math.min(this.positionX(), window.innerWidth - 208)));
  clampedY = computed(() => {
    const height = this.items().length * 34 + 8;
    return Math.max(8, Math.min(this.positionY(), window.innerHeight - height - 8));
  });

  close(): void {
    this.actionSelected.emit('');
  }

  onAction(item: ContextMenuAction): void {
    if (!item.disabled) {
      this.actionSelected.emit(item.action);
    }
  }
}
