import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';

export interface ToolbarItem {
  id: string;
  icon: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
}

@Component({
  selector: 'app-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      @for (item of items(); track item.id) {
        <button
          class="toolbar-item"
          [class.active]="item.active"
          [class.disabled]="item.disabled"
          [disabled]="item.disabled"
          [title]="item.label"
          (click)="onItemClick(item.id)">
          <span class="toolbar-icon">{{ item.icon }}</span>
        </button>
      }
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px 4px;
    }

    .toolbar-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: none;
      color: var(--text-secondary);
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
      transition: background 0.1s;
    }

    .toolbar-item:hover:not(.disabled) {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .toolbar-item.active {
      color: var(--accent-color);
      background: var(--bg-active);
    }

    .toolbar-item.disabled {
      opacity: 0.3;
      cursor: default;
    }

    .toolbar-icon {
      font-size: 14px;
    }
  `],
})
export class ToolbarComponent {
  items = input<ToolbarItem[]>([]);
  itemClicked = output<string>();

  onItemClick(id: string): void {
    this.itemClicked.emit(id);
  }
}
