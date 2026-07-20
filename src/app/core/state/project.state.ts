import { Injectable, signal } from '@angular/core';
import { FileNode } from '../models/file-node.model';

@Injectable({ providedIn: 'root' })
export class ProjectState {
  readonly projectName = signal('untitled-project');
  readonly fileTree = signal<FileNode[]>([]);
  readonly expandedDirs = signal<Set<string>>(new Set());

  setProject(name: string, files: Map<string, string>): void {
    this.projectName.set(name);
    const tree = this.buildFileTree(files);
    this.fileTree.set(tree);
    this.expandedDirs.set(new Set(tree.flatMap((n) => this.collectDirPaths(n))));
  }

  private buildFileTree(files: Map<string, string>): FileNode[] {
    const root: Record<string, any> = {};
    for (const [path, content] of files.entries()) {
      const parts = path.split('/').filter(Boolean);
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = { type: 'file', content };
        } else {
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      }
    }

    const toNodes = (obj: Record<string, any>, parentPath: string): FileNode[] => {
      return Object.entries(obj).map(([name, val]) => {
        const nodePath = parentPath ? `${parentPath}/${name}` : `/${name}`;
        if (val.type === 'file') {
          return { name, path: nodePath, type: 'file', content: val.content, extension: name.split('.').pop() };
        }
        return {
          name,
          path: nodePath,
          type: 'directory',
          children: toNodes(val, nodePath),
        };
      });
    };

    return toNodes(root, '');
  }

  private collectDirPaths(node: FileNode): string[] {
    if (node.type !== 'directory') return [];
    return [node.path, ...(node.children ?? []).flatMap((c) => this.collectDirPaths(c))];
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
