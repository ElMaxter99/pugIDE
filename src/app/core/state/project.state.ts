import { Injectable, signal } from '@angular/core';
import { FileNode } from '../models/file-node.model';

@Injectable({ providedIn: 'root' })
export class ProjectState {
  readonly projectName = signal('untitled-project');
  readonly fileTree = signal<FileNode[]>([]);
  readonly expandedDirs = signal<Set<string>>(new Set());

  setProject(name: string, rootPath: string, files: FileNode[]): void {
    this.projectName.set(name);
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
}
