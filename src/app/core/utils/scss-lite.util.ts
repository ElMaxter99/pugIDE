/**
 * Minimal SCSS-subset preprocessor: nesting (including `&`), `$variables`,
 * and passthrough `@media` blocks. Deliberately does NOT support
 * @mixin/@include, @function, @if/@each/@for, @use/@forward, or Sass math —
 * those are out of scope for this lightweight, dependency-free implementation.
 */

interface RawNode {
  kind: 'decl' | 'rule' | 'media';
  selector?: string;
  prop?: string;
  value?: string;
  children?: RawNode[];
}

export function compileScssLite(source: string): string {
  const stripped = stripLineComments(source);
  const nodes = parseNodes(stripped);
  const vars = new Map<string, string>();
  collectVariables(nodes, vars);
  const out: string[] = [];
  emit(nodes, '', vars, out);
  return out.join('\n\n');
}

function stripLineComments(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('//');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

function parseNodes(text: string): RawNode[] {
  const nodes: RawNode[] = [];
  const n = text.length;
  let i = 0;

  while (i < n) {
    while (i < n && /\s/.test(text[i])) i++;
    if (i >= n) break;

    let j = i;
    let parenDepth = 0;
    while (j < n) {
      const ch = text[j];
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
      else if (parenDepth === 0 && (ch === '{' || ch === ';')) break;
      j++;
    }
    if (j >= n) break;

    const head = text.slice(i, j).trim();

    if (text[j] === '{') {
      let depth = 1;
      let k = j + 1;
      while (k < n && depth > 0) {
        if (text[k] === '{') depth++;
        else if (text[k] === '}') depth--;
        k++;
      }
      const inner = text.slice(j + 1, k - 1);
      const children = parseNodes(inner);
      if (head.startsWith('@media')) {
        nodes.push({ kind: 'media', selector: head, children });
      } else if (head) {
        nodes.push({ kind: 'rule', selector: head, children });
      }
      i = k;
    } else {
      if (head) {
        const colonIdx = head.indexOf(':');
        if (colonIdx > -1) {
          nodes.push({
            kind: 'decl',
            prop: head.slice(0, colonIdx).trim(),
            value: head.slice(colonIdx + 1).trim(),
          });
        }
      }
      i = j + 1;
    }
  }

  return nodes;
}

function collectVariables(nodes: RawNode[], vars: Map<string, string>): void {
  for (const node of nodes) {
    if (node.kind === 'decl' && node.prop?.startsWith('$')) {
      vars.set(node.prop.slice(1), node.value ?? '');
    }
    if (node.children) collectVariables(node.children, vars);
  }
}

function substituteVars(value: string, vars: Map<string, string>): string {
  return value.replace(/\$([a-zA-Z_-][\w-]*)/g, (match, name) => vars.get(name) ?? match);
}

function splitTopLevel(selector: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of selector) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === sep && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function combineSelectors(parent: string, child: string): string {
  const parentParts = parent ? splitTopLevel(parent, ',') : [''];
  const childParts = splitTopLevel(child, ',');
  const combined: string[] = [];
  for (const p of parentParts) {
    for (const c of childParts) {
      if (c.includes('&')) {
        combined.push(c.split('&').join(p).trim());
      } else if (p) {
        combined.push(`${p} ${c}`.trim());
      } else {
        combined.push(c.trim());
      }
    }
  }
  return combined.join(', ');
}

function emit(nodes: RawNode[], parentSelector: string, vars: Map<string, string>, out: string[]): void {
  const ownDecls: RawNode[] = [];
  const nested: RawNode[] = [];
  for (const node of nodes) {
    if (node.kind === 'decl') {
      if (!node.prop?.startsWith('$')) ownDecls.push(node);
    } else {
      nested.push(node);
    }
  }

  if (parentSelector && ownDecls.length > 0) {
    const lines = ownDecls.map((d) => `  ${d.prop}: ${substituteVars(d.value ?? '', vars)};`);
    out.push(`${parentSelector} {\n${lines.join('\n')}\n}`);
  }

  for (const node of nested) {
    if (node.kind === 'media') {
      const innerBlocks: string[] = [];
      emit(node.children ?? [], parentSelector, vars, innerBlocks);
      if (innerBlocks.length > 0) {
        const indented = innerBlocks
          .join('\n\n')
          .split('\n')
          .map((l) => (l ? `  ${l}` : l))
          .join('\n');
        out.push(`${node.selector} {\n${indented}\n}`);
      }
    } else if (node.kind === 'rule') {
      const combined = combineSelectors(parentSelector, node.selector ?? '');
      emit(node.children ?? [], combined, vars, out);
    }
  }
}
