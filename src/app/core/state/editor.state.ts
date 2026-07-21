import { Injectable, signal, computed } from '@angular/core';
import { Tab, FileType } from '../models/tab.model';

@Injectable({ providedIn: 'root' })
export class EditorState {
  readonly openTabs = signal<Tab[]>([]);
  readonly activeTabId = signal<string | null>(null);
  readonly editorContent = signal<string>('');
  readonly cursorPosition = signal<{ line: number; column: number }>({ line: 0, column: 0 });
  readonly files = signal<Map<string, string>>(new Map());

  readonly activeTab = computed(() => {
    const id = this.activeTabId();
    return this.openTabs().find((t) => t.id === id) ?? null;
  });

  readonly hasUnsavedChanges = computed(() =>
    this.openTabs().some((t) => t.isDirty)
  );

  readonly allFileContents = computed(() => {
    return this.files();
  });

  openFile(path: string, name: string, type: FileType, content = ''): void {
    const existing = this.openTabs().find((t) => t.path === path);
    if (existing) {
      this.activeTabId.set(existing.id);
      this.loadFileContent(path);
      return;
    }
    const tab: Tab = {
      id: crypto.randomUUID(),
      name,
      path,
      type,
      isDirty: false,
    };
    this.openTabs.update((tabs) => [...tabs, tab]);
    this.activeTabId.set(tab.id);
    this.files.update((f) => { f.set(path, content); return f; });
    this.editorContent.set(content);
  }

  private loadFileContent(path: string): void {
    const content = this.files().get(path) ?? '';
    this.editorContent.set(content);
  }

  closeTab(tabId: string): void {
    const tabs = this.openTabs();
    const idx = tabs.findIndex((t) => t.id === tabId);
    const remaining = tabs.filter((t) => t.id !== tabId);
    this.openTabs.set(remaining);

    if (this.activeTabId() === tabId) {
      if (remaining.length > 0) {
        const newIdx = Math.min(idx, remaining.length - 1);
        this.activeTabId.set(remaining[newIdx].id);
        this.loadFileContent(remaining[newIdx].path);
      } else {
        this.activeTabId.set(null);
        this.editorContent.set('');
      }
    }
  }

  updateContent(content: string): void {
    console.log('[EditorState] updateContent, length:', content.length);
    this.editorContent.set(content);
    const activeId = this.activeTabId();
    if (activeId) {
      const active = this.openTabs().find((t) => t.id === activeId);
      if (active) {
        this.files.update((f) => { f.set(active.path, content); return f; });
        if (!active.isDirty) {
          console.log('[EditorState] first dirty - updating openTabs');
          this.openTabs.update((tabs) =>
            tabs.map((t) => (t.id === activeId ? { ...t, isDirty: true } : t))
          );
        }
      }
    }
  }

  saveCurrentFile(): void {
    const activeId = this.activeTabId();
    if (activeId) {
      this.openTabs.update((tabs) =>
        tabs.map((t) => (t.id === activeId ? { ...t, isDirty: false } : t))
      );
    }
  }

  setCursorPosition(line: number, column: number): void {
    this.cursorPosition.set({ line, column });
  }

  reorderTabs(fromIndex: number, toIndex: number): void {
    this.openTabs.update((tabs) => {
      const newTabs = [...tabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return newTabs;
    });
  }
}
