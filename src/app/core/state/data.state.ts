import { Injectable, signal, computed } from '@angular/core';
import { DataNode, DataType } from '../models/index';

@Injectable({ providedIn: 'root' })
export class DataState {
  readonly data = signal<Record<string, unknown>>({});
  readonly selectedNodePath = signal<string | null>(null);
  readonly undoStack = signal<Record<string, unknown>[]>([]);
  readonly redoStack = signal<Record<string, unknown>[]>([]);

  readonly hasUndo = computed(() => this.undoStack().length > 0);
  readonly hasRedo = computed(() => this.redoStack().length > 0);

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

  addArrayItem(path: string): void {
    this.pushUndo();
    const current = structuredClone(this.data());
    const arr = this.getNestedValue(current, path);
    if (Array.isArray(arr)) {
      arr.push(this.defaultValueForArray(path, current));
    }
    this.data.set(current);
  }

  removeArrayItem(path: string, index: number): void {
    this.pushUndo();
    const current = structuredClone(this.data());
    const arr = this.getNestedValue(current, path);
    if (Array.isArray(arr)) {
      arr.splice(index, 1);
    }
    this.data.set(current);
  }

  duplicateArrayItem(path: string, index: number): void {
    this.pushUndo();
    const current = structuredClone(this.data());
    const arr = this.getNestedValue(current, path);
    if (Array.isArray(arr)) {
      const item = structuredClone(arr[index]);
      arr.splice(index + 1, 0, item);
    }
    this.data.set(current);
  }

  moveArrayItem(path: string, fromIndex: number, toIndex: number): void {
    this.pushUndo();
    const current = structuredClone(this.data());
    const arr = this.getNestedValue(current, path);
    if (Array.isArray(arr)) {
      const [item] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, item);
    }
    this.data.set(current);
  }

  selectNode(path: string | null): void {
    this.selectedNodePath.set(path);
  }

  undo(): void {
    const stack = this.undoStack();
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    this.redoStack.update((r) => [...r, structuredClone(this.data())]);
    this.undoStack.update((s) => s.slice(0, -1));
    this.data.set(prev);
  }

  redo(): void {
    const stack = this.redoStack();
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    this.undoStack.update((u) => [...u, structuredClone(this.data())]);
    this.redoStack.update((r) => r.slice(0, -1));
    this.data.set(next);
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

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private defaultValueForArray(_path: string, _data: Record<string, unknown>): unknown {
    return '';
  }
}
