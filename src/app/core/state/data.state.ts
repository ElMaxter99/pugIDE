import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataState {
  readonly data = signal<Record<string, unknown>>({});
  /** Dotted paths auto-filled with an empty default because the template referenced them — shown as a badge until edited. */
  readonly autoCreatedPaths = signal<Set<string>>(new Set());
  private undoStack = signal<Record<string, unknown>[]>([]);
  private redoStack = signal<Record<string, unknown>[]>([]);

  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);

  setData(data: Record<string, unknown>): void {
    this.pushUndo();
    this.data.set(structuredClone(data));
  }

  /** Like setData, but doesn't create an undo step — for project bootstrap/auto-seeding, not user edits. */
  setInitialData(data: Record<string, unknown>): void {
    this.data.set(structuredClone(data));
    this.undoStack.set([]);
    this.redoStack.set([]);
  }

  /** Like setInitialData, but preserves undo/redo history — for silently auto-healing missing paths mid-session. */
  patchMissingData(data: Record<string, unknown>, newPaths: string[] = []): void {
    this.data.set(structuredClone(data));
    if (newPaths.length > 0) {
      this.autoCreatedPaths.update((set) => new Set([...set, ...newPaths]));
    }
  }

  updateValue(path: string, value: unknown): void {
    this.pushUndo();
    const current = structuredClone(this.data());
    this.setNestedValue(current, path, value);
    this.data.set(current);
    this.clearAutoCreated(path);
  }

  clearAutoCreated(path: string): void {
    if (this.autoCreatedPaths().size === 0) return;
    this.autoCreatedPaths.update((set) => {
      const next = new Set(set);
      next.delete(path);
      return next;
    });
  }

  isAutoCreated(path: string): boolean {
    return this.autoCreatedPaths().has(path);
  }

  undo(): void {
    const stack = this.undoStack();
    if (stack.length === 0) return;
    const previous = stack[stack.length - 1];
    this.undoStack.set(stack.slice(0, -1));
    this.redoStack.update((s) => [...s, structuredClone(this.data())]);
    this.data.set(previous);
  }

  redo(): void {
    const stack = this.redoStack();
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    this.redoStack.set(stack.slice(0, -1));
    this.undoStack.update((s) => [...s, structuredClone(this.data())]);
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
}
