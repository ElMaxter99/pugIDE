import { PugAstNode } from '../models/index';

/**
 * Walks a *linked* Pug AST (i.e. after `pug-linker` has resolved
 * `include`/`extends`/`block` into a single tree) and stamps every Tag node
 * with a `data-pugide-src="file::line"` attribute pointing at its original
 * `.pug` source location.
 *
 * Each node keeps the `.filename`/`.line` of the file it was originally
 * parsed from even after pug-load splices it into another file's tree, and
 * mixin bodies keep their own source position regardless of how many times
 * (or where) the mixin is called. So stamping the attribute here — before
 * codegen — makes it correct through includes, extends/block, conditionals,
 * loops and mixins for free: whatever Pug's own compiler decides to render,
 * it renders with this attribute already attached.
 */
export function annotateTagSourceLines(root: PugAstNode): void {
  walk(root, (node) => {
    if (node.type !== 'Tag' && node.type !== 'InterpolatedTag') return;
    if (!node.filename || !node.line) return;
    if (!node.attrs) node.attrs = [];
    node.attrs.push({
      name: 'data-pugide-src',
      val: JSON.stringify(`${node.filename}::${node.line}`),
      mustEscape: false,
    });
  });
}

function walk(node: PugAstNode | undefined, visit: (node: PugAstNode) => void): void {
  if (!node || typeof node !== 'object') return;
  visit(node);
  if (Array.isArray(node.nodes)) {
    for (const child of node.nodes) walk(child, visit);
  }
  if (node.block) walk(node.block as unknown as PugAstNode, visit);
  const withBranches = node as PugAstNode & { consequent?: PugAstNode; alternate?: PugAstNode };
  if (withBranches.consequent) walk(withBranches.consequent, visit);
  if (withBranches.alternate) walk(withBranches.alternate, visit);
}
