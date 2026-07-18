import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataState {
  readonly data = signal<Record<string, unknown>>({});
  private undoStack = signal<Record<string, unknown>[]>([]);
  private redoStack = signal<Record<string, unknown>[]>([]);

  setData(data: Record<string, unknown>): void {
    this.pushUndo();
    this.data.set(structuredClone(data));
  }

  updateValue(path: string, value: unknown): void {
    this.pushUndo();
    const current = structuredClone(this.data());
    this.setNestedValue(current, path, value);
    this.data.set(current);
  }

  private pushUndo(): void {
    this.undoStack.update((s) => [...s.slice(-49), structuredClone(this.data())]);
    this.redoStack.set([]);
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
  }
}
