import { Injectable, signal, computed } from '@angular/core';
import { InspectorNode } from '../models/index';

@Injectable({ providedIn: 'root' })
export class InspectorState {
  readonly isActive = signal(false);
  readonly selectedElement = signal<InspectorNode | null>(null);
  readonly hoveredElement = signal<InspectorNode | null>(null);
  readonly highlightedPugLine = signal<number | null>(null);
  readonly highlightedHtmlLine = signal<number | null>(null);
  readonly inspectorNodes = signal<InspectorNode[]>([]);

  readonly isInspecting = computed(() => this.isActive());

  toggleInspector(): void {
    this.isActive.update((v) => !v);
    if (!this.isActive()) {
      this.clearSelection();
    }
  }

  selectElement(node: InspectorNode): void {
    this.selectedElement.set(node);
    this.highlightedPugLine.set(node.pugLine);
    this.highlightedHtmlLine.set(node.htmlLine);
  }

  hoverElement(node: InspectorNode | null): void {
    this.hoveredElement.set(node);
  }

  clearSelection(): void {
    this.selectedElement.set(null);
    this.hoveredElement.set(null);
    this.highlightedPugLine.set(null);
    this.highlightedHtmlLine.set(null);
  }

  updateNodes(nodes: InspectorNode[]): void {
    this.inspectorNodes.set(nodes);
  }
}
