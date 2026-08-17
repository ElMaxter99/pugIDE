const INCLUDE_RE = /^(\s*)(include|extends)\s+['"]?([^'"]+)/;

/**
 * Resolves `include`/`extends` directives by splicing in the referenced file's
 * content, recursively (so includes-within-includes are resolved) and
 * re-indented to match the indentation of the directive line (Pug is
 * whitespace-sensitive, so a naive splice would break nested includes).
 */
export function resolvePugIncludes(
  code: string,
  files: Map<string, string>,
  activeFilePath?: string,
  maxDepth = 20,
): string {
  const baseDir = activeFilePath ? activeFilePath.substring(0, activeFilePath.lastIndexOf('/') + 1) : '/';
  const visited = new Set<string>(activeFilePath ? [activeFilePath] : []);
  return resolveLines(code, files, baseDir, maxDepth, visited);
}

function resolveLines(
  code: string,
  files: Map<string, string>,
  baseDir: string,
  depth: number,
  visited: Set<string>,
): string {
  const lines = code.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const match = line.match(INCLUDE_RE);
    if (match) {
      const [, indent, , rawPath] = match;
      const trimmedPath = rawPath.trim();
      const resolvedPath = trimmedPath.startsWith('/') ? trimmedPath : baseDir + trimmedPath;
      const content = files.get(resolvedPath) ?? files.get('/' + trimmedPath);

      if (content !== undefined && depth > 0 && !visited.has(resolvedPath)) {
        const childBaseDir = resolvedPath.substring(0, resolvedPath.lastIndexOf('/') + 1);
        const childVisited = new Set(visited);
        childVisited.add(resolvedPath);
        const resolvedContent = resolveLines(content, files, childBaseDir, depth - 1, childVisited);
        const reindented = resolvedContent
          .split('\n')
          .map((l) => (l.length > 0 ? indent + l : l))
          .join('\n');
        result.push(reindented);
        continue;
      }
    }
    result.push(line);
  }

  return result.join('\n');
}
