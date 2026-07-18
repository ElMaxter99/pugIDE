import { Injectable, signal } from '@angular/core';
import { PugVariable, DataNode, ParseResult, PugMixin } from '../models/index';

@Injectable({ providedIn: 'root' })
export class ParserState {
  readonly variables = signal<PugVariable[]>([]);
  readonly dataTree = signal<DataNode[]>([]);
  readonly mixins = signal<PugMixin[]>([]);
  readonly includes = signal<string[]>([]);
  readonly extendsPath = signal<string | undefined>(undefined);
  updateFromParseResult(result: ParseResult): void {
    this.variables.set(result.variables);
    this.mixins.set(result.mixins);
    this.includes.set(result.includes);
    this.extendsPath.set(result.extendsPath);
    this.dataTree.set(this.buildDataTree(result.variables));
  }

  setParsing(_parsing: boolean): void {
  }

  private buildDataTree(variables: PugVariable[]): DataNode[] {
    const map = new Map<string, DataNode>();

    for (const v of variables) {
      const parts = v.path.split('.');
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}.${part}` : part;

        if (!map.has(currentPath)) {
          const isLast = i === parts.length - 1;
          const node: DataNode = {
            key: part,
            path: currentPath,
            type: isLast ? v.type : 'object',
            value: isLast ? v.defaultValue : undefined,
            children: !isLast ? [] : undefined,
            isExpanded: parts.length <= 2,
          };
          map.set(currentPath, node);

          if (parentPath && map.has(parentPath)) {
            const parent = map.get(parentPath)!;
            if (!parent.children) parent.children = [];
            parent.children.push(node);
          }
        } else if (i < parts.length - 1) {
          const existing = map.get(currentPath)!;
          if (existing.type !== 'object') {
            existing.type = 'object';
            if (!existing.children) existing.children = [];
          }
        }
      }
    }

    const roots: DataNode[] = [];
    for (const [path, node] of map) {
      if (!path.includes('.')) {
        roots.push(node);
      }
    }
    return roots;
  }
}
