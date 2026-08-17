import { Injectable, signal, computed } from '@angular/core';
import { Tab, FileType } from '../models/tab.model';

@Injectable({ providedIn: 'root' })
export class EditorState {
  readonly openTabs = signal<Tab[]>([]);
  readonly activeTabId = signal<string | null>(null);
  readonly editorContent = signal<string>('');
  readonly cursorPosition = signal<{ line: number; column: number }>({ line: 0, column: 0 });
  readonly files = signal<Map<string, string>>(new Map());
  /** Bumped whenever the whole project is replaced (e.g. import), so the editor can drop stale Monaco models. */
  readonly resetToken = signal(0);
  /** Set to request the editor open a file and jump to a line (e.g. from the inspector); consumed once by the editor panel. */
  readonly goToRequest = signal<{ path: string; line: number } | null>(null);

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
    if (!this.files().has(path)) {
      this.files.update((f) => { f.set(path, content); return f; });
    }
    this.editorContent.set(this.files().get(path) ?? content);
  }

  private loadFileContent(path: string): void {
    const content = this.files().get(path) ?? '';
    this.editorContent.set(content);
  }

  selectTab(tabId: string): void {
    this.activeTabId.set(tabId);
    const tab = this.openTabs().find((t) => t.id === tabId);
    if (tab) {
      this.loadFileContent(tab.path);
    }
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
    this.editorContent.set(content);
    const activeId = this.activeTabId();
    if (activeId) {
      const active = this.openTabs().find((t) => t.id === activeId);
      if (active) {
        this.files.update((f) => { f.set(active.path, content); return f; });
        if (!active.isDirty) {
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

  closeTabByPath(path: string): void {
    const tab = this.openTabs().find((t) => t.path === path);
    if (tab) this.closeTab(tab.id);
  }

  closeOtherTabs(keepTabId: string): void {
    const keep = this.openTabs().find((t) => t.id === keepTabId);
    if (!keep) return;
    this.openTabs.set([keep]);
    this.activeTabId.set(keep.id);
    this.loadFileContent(keep.path);
  }

  closeAllTabs(): void {
    this.openTabs.set([]);
    this.activeTabId.set(null);
    this.editorContent.set('');
  }

  closeTabsToTheRight(fromTabId: string): void {
    const tabs = this.openTabs();
    const idx = tabs.findIndex((t) => t.id === fromTabId);
    if (idx === -1) return;
    const remaining = tabs.slice(0, idx + 1);
    const activeStillOpen = remaining.some((t) => t.id === this.activeTabId());
    this.openTabs.set(remaining);
    if (!activeStillOpen) {
      this.activeTabId.set(remaining[remaining.length - 1]?.id ?? null);
      const active = remaining[remaining.length - 1];
      this.editorContent.set(active ? this.files().get(active.path) ?? '' : '');
    }
  }

  renameOpenTab(oldPath: string, newPath: string, newName: string): void {
    this.openTabs.update((tabs) =>
      tabs.map((t) => (t.path === oldPath ? { ...t, path: newPath, name: newName } : t))
    );
  }

  bumpResetToken(): void {
    this.resetToken.update((v) => v + 1);
  }

  requestGoToLine(path: string, line: number): void {
    this.goToRequest.set({ path, line });
  }
}
