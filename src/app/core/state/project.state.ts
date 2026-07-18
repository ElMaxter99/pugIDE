import { Injectable, signal, computed } from '@angular/core';
import { FileNode } from '../models/file-node.model';

@Injectable({ providedIn: 'root' })
export class ProjectState {
  readonly projectName = signal('untitled-project');
  readonly rootPath = signal('');
  readonly fileTree = signal<FileNode[]>([]);
  readonly isLoading = signal(false);
  readonly hasProject = computed(() => this.fileTree().length > 0);
  readonly expandedDirs = signal<Set<string>>(new Set());

  setProject(name: string, rootPath: string, files: FileNode[]): void {
    this.projectName.set(name);
    this.rootPath.set(rootPath);
    this.fileTree.set(files);
  }

  toggleDir(path: string): void {
    this.expandedDirs.update((dirs) => {
      const next = new Set(dirs);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  isExpanded(path: string): boolean {
    return this.expandedDirs().has(path);
  }

  updateFileContent(path: string, content: string): void {
    const update = (nodes: FileNode[]): FileNode[] =>
      nodes.map((n) => {
        if (n.path === path) return { ...n, content };
        if (n.children) return { ...n, children: update(n.children) };
        return n;
      });
    this.fileTree.update(update);
  }

  clearProject(): void {
    this.projectName.set('untitled-project');
    this.rootPath.set('');
    this.fileTree.set([]);
    this.expandedDirs.set(new Set());
  }
}
