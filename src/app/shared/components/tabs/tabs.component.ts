import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { EditorState } from '../../../core/state/editor.state';
import { Tab } from '../../../core/models/tab.model';

@Component({
  selector: 'app-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tabs-bar">
      <div class="tabs-scroll">
        @for (tab of editorState.openTabs(); track tab.id) {
          <div
            class="tab"
            [class.active]="tab.id === editorState.activeTabId()"
            (click)="selectTab(tab)"
            (mousedown)="onMouseDown($event, tab)"
            draggable="true"
            (dragstart)="onDragStart($event, $index)"
            (dragover)="onDragOver($event, $index)"
            (drop)="onDrop($event, $index)">
            <span class="material-symbols-outlined tab-file-icon" style="font-size: 14px;">description</span>
            <span class="tab-name">{{ tab.name }}</span>
            @if (tab.isDirty) {
              <span class="dirty-dot"></span>
            }
            <button class="tab-close" (click)="closeTab($event, tab.id)" title="Close">
              <span class="material-symbols-outlined" style="font-size: 14px;">close</span>
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .tabs-bar {
      display: flex;
      height: 36px;
      background: var(--bg-surface-container-low);
      border-bottom: 1px solid var(--border-color);
      overflow: hidden;
      flex-shrink: 0;
    }

    .tabs-scroll {
      display: flex;
      flex: 1;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .tabs-scroll::-webkit-scrollbar {
      display: none;
    }

    .tab {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      padding: 0 16px;
      font-size: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      border-right: 1px solid var(--border-color);
      white-space: nowrap;
      min-width: 0;
      user-select: none;
      flex-shrink: 0;
      transition: all 0.1s;
    }

    .tab:hover {
      background: var(--bg-hover);
    }

    .tab.active {
      background: var(--bg-surface);
      color: var(--accent-color);
    }

    .tab-file-icon {
      color: var(--accent-color);
      flex-shrink: 0;
    }

    .tab:not(.active) .tab-file-icon {
      color: var(--text-secondary);
    }

    .tab-name {
      font-family: var(--font-mono);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dirty-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-color);
      flex-shrink: 0;
    }

    .tab-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 3px;
      color: var(--text-tertiary);
      flex-shrink: 0;
      opacity: 0;
      transition: all 0.1s;
    }

    .tab:hover .tab-close {
      opacity: 1;
    }

    .tab-close:hover {
      background: var(--bg-surface-variant);
      color: var(--text-primary);
    }
  `],
})
export class TabsComponent {
  protected editorState = inject(EditorState);
  private dragIndex = signal<number>(-1);

  selectTab(tab: Tab): void {
    this.editorState.activeTabId.set(tab.id);
  }

  closeTab(event: Event, tabId: string): void {
    event.stopPropagation();
    this.editorState.closeTab(tabId);
  }

  onMouseDown(event: MouseEvent, tab: Tab): void {
    if (event.button === 1) {
      event.preventDefault();
      this.editorState.closeTab(tab.id);
    }
  }

  onDragStart(event: DragEvent, index: number): void {
    this.dragIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDrop(event: DragEvent, toIndex: number): void {
    event.preventDefault();
    const fromIndex = this.dragIndex();
    if (fromIndex >= 0 && fromIndex !== toIndex) {
      this.editorState.reorderTabs(fromIndex, toIndex);
    }
    this.dragIndex.set(-1);
  }
}
