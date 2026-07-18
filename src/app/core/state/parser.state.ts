import { Injectable, signal, computed } from '@angular/core';
import { PugVariable, DataNode, DataTree, ParseResult, PugMixin } from '../models/index';

@Injectable({ providedIn: 'root' })
export class ParserState {
  readonly variables = signal<PugVariable[]>([]);
  readonly dataTree = signal<DataNode[]>([]);
  readonly mixins = signal<PugMixin[]>([]);
  readonly includes = signal<string[]>([]);
  readonly extendsPath = signal<string | undefined>(undefined);
  readonly isParsing = signal(false);
  readonly parseTime = signal(0);
  readonly rawAst = signal<unknown>(null);

  readonly variableCount = computed(() => this.variables().length);
  readonly mixinCount = computed(() => this.mixins().length);

  updateFromParseResult(result: ParseResult): void {
    this.variables.set(result.variables);
    this.mixins.set(result.mixins);
    this.includes.set(result.includes);
    this.extendsPath.set(result.extendsPath);
    this.parseTime.set(result.compilationTime);
    this.rawAst.set(result.ast);
    this.isParsing.set(false);
    this.dataTree.set(this.buildDataTree(result.variables));
  }

  setParsing(parsing: boolean): void {
    this.isParsing.set(parsing);
  }

  updateDataTree(tree: DataNode[]): void {
    this.dataTree.set(tree);
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
