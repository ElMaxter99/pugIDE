import { Injectable, signal } from '@angular/core';
import { InspectorNode } from '../models/index';

@Injectable({ providedIn: 'root' })
export class InspectorState {
  readonly isActive = signal(false);
  readonly selectedElement = signal<InspectorNode | null>(null);

  toggleInspector(): void {
    this.isActive.update((v) => !v);
    if (!this.isActive()) {
      this.clearSelection();
    }
  }

  selectElement(node: InspectorNode): void {
    this.selectedElement.set(node);
  }

  clearSelection(): void {
    this.selectedElement.set(null);
  }
}
