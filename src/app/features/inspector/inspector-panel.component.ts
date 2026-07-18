import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InspectorState } from '../../core/state/inspector.state';
import { InspectorNode } from '../../core/models/index';

@Component({
  selector: 'app-inspector-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inspector-panel">
      <div class="panel-header">
        <span class="panel-title">INSPECTOR</span>
        <div class="panel-actions">
          <button
            class="panel-action"
            [class.active]="inspectorState.isActive()"
            title="Toggle Element Inspector"
            (click)="inspectorState.toggleInspector()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 2l7.586 7.586"/>
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="inspector-content">
        @if (!inspectorState.isActive()) {
          <div class="inspector-hint">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 2l7.586 7.586"/>
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>Click the inspector button to enable element selection</p>
          </div>
        } @else if (inspectorState.selectedElement()) {
          <div class="selected-info">
            <div class="element-header">
              <span class="tag-name">{{ inspectorState.selectedElement()!.tagName }}</span>
            </div>
            <div class="properties">
              <div class="prop-row">
                <span class="prop-label">Pug Line</span>
                <span class="prop-value clickable" (click)="goToPugLine()">
                  {{ inspectorState.selectedElement()!.pugLine }}
                </span>
              </div>
              <div class="prop-row">
                <span class="prop-label">HTML Line</span>
                <span class="prop-value">{{ inspectorState.selectedElement()!.htmlLine }}</span>
              </div>
              @for (entry of getAttributeEntries(); track entry[0]) {
                <div class="prop-row">
                  <span class="prop-label">{{ entry[0] }}</span>
                  <span class="prop-value attr-value">{{ entry[1] }}</span>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="no-selection">
            <p>Select an element in the preview</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .inspector-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      min-height: 32px;
    }

    .panel-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
    }

    .panel-actions {
      display: flex;
      gap: 2px;
    }

    .panel-action {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      background: none;
      color: var(--text-secondary);
      border-radius: 3px;
      cursor: pointer;
      padding: 0;
    }

    .panel-action:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .panel-action.active {
      color: var(--accent-color);
      background: var(--bg-active);
    }

    .inspector-content {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .inspector-hint, .no-selection {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 8px;
      color: var(--text-secondary);
      opacity: 0.6;
    }

    .inspector-hint svg {
      opacity: 0.4;
    }

    .inspector-hint p, .no-selection p {
      font-size: 11px;
      text-align: center;
      max-width: 160px;
      margin: 0;
    }

    .selected-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .element-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .tag-name {
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--tag-color, #569cd6);
      font-weight: 600;
    }

    .properties {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .prop-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
    }

    .prop-row:hover {
      background: var(--bg-hover);
    }

    .prop-label {
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    .prop-value {
      color: var(--text-primary);
      font-family: var(--font-mono);
    }

    .prop-value.clickable {
      color: var(--accent-color);
      cursor: pointer;
    }

    .prop-value.clickable:hover {
      text-decoration: underline;
    }

    .attr-value {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
})
export class InspectorPanelComponent {
  protected inspectorState = inject(InspectorState);

  getAttributeEntries(): [string, string][] {
    const node = this.inspectorState.selectedElement();
    if (!node) return [];
    return Object.entries(node.attrs);
  }

  goToPugLine(): void {
    const node = this.inspectorState.selectedElement();
    if (node) {
      // Would emit event to editor to go to line
    }
  }
}
