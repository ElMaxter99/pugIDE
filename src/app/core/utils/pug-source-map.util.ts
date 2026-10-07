import { resolveVirtualPath } from './pug-vfs.util';

/**
 * Approximate DOM element -> Pug source line mapping.
 *
 * Pug's compiler does not emit source maps, so we do a heuristic match: the
 * project's .pug files are flattened in `include` order (same order the
 * compiler sees them), every line that opens a tag is turned into a
 * candidate (tag, id, classes), and the clicked element is matched to the
 * N-th candidate with a compatible signature, where N is the element's index
 * among same-signature elements in the rendered DOM.
 *
 * Limitations (documented, not bugs):
 *  - Loops (`each`/`while`) render one DOM element per iteration but have one
 *    source line: the ordinal wraps around (modulo), result flagged approximate.
 *  - Conditionals (`if`/`case`) that hide branches shift ordinals: approximate.
 *  - Mixins: the line reported is the tag inside the mixin definition, not the call site.
 *  - Dynamic tags/ids/classes (`#{...}`, `class=expr`) are matched loosely.
 *  - `extends`/`block` layouts are matched in include order, not render order.
 *  - Tags created by JS in the preview have no Pug origin (no result).
 */

export interface PugSourceLocation {
  path: string;
  line: number;
  /** True when the match is a best guess (loops/conditionals/ambiguity). */
  approximate: boolean;
}

export interface ElementSignature {
  tag: string;
  id?: string;
  classes: string[];
  /** Zero-based index among DOM elements with the same tag+id+classes signature. */
  ordinal: number;
  /** How many DOM elements share this signature. */
  total: number;
}

interface Candidate {
  path: string;
  line: number;
  tag: string;
  id?: string;
  classes: string[];
}

interface FlatLine {
  path: string;
  line: number;
  text: string;
}

const INCLUDE_RE = /^(\s*)(include|extends)\s+['"]?([^'"]+)/;
const NON_TAG_KEYWORDS = new Set([
  'include', 'extends', 'mixin', 'block', 'append', 'prepend', 'if', 'else', 'unless',
  'each', 'for', 'while', 'case', 'when', 'default', 'doctype', 'yield',
]);
const TAG_RE = /^([a-zA-Z][\w:-]*)?((?:[.#][\w-]+)*)/;

/** Flattens a pug file and its includes into source-ordered lines, remembering origin. */
export function flattenPugSource(
  code: string,
  files: Map<string, string>,
  activePath: string,
  maxDepth = 20,
): FlatLine[] {
  const out: FlatLine[] = [];
  const walk = (src: string, path: string, indent: string, depth: number, visited: Set<string>): void => {
    src.split('\n').forEach((text, i) => {
      const m = text.match(INCLUDE_RE);
      if (m) {
        const target = resolveVirtualPath(m[3].trim(), path, files);
        const content = target ? files.get(target) : undefined;
        if (target && content !== undefined && m[2] === 'include' && target.endsWith('.pug') && depth > 0 && !visited.has(target)) {
          walk(content, target, indent + m[1], depth - 1, new Set(visited).add(target));
          return;
        }
      }
      out.push({ path, line: i + 1, text: indent + text });
    });
  };
  walk(code, activePath, '', maxDepth, new Set([activePath]));
  return out;
}

function parseCandidates(lines: FlatLine[]): Candidate[] {
  const result: Candidate[] = [];
  let blockIndent: number | null = null; // inside a // comment or text block (`tag.`)

  for (const { path, line, text } of lines) {
    if (!text.trim()) continue;
    const indent = text.length - text.trimStart().length;
    if (blockIndent !== null && indent > blockIndent) continue;
    blockIndent = null;

    const body = text.trim();
    if (body.startsWith('//')) {
      blockIndent = indent;
      continue;
    }
    if (/^[|\-=!+:<]/.test(body) || body.startsWith('#{')) continue;
    const first = body.match(/^[a-zA-Z]+/)?.[0];
    if (first && NON_TAG_KEYWORDS.has(first) && !/^[a-zA-Z]+[.#(]/.test(body)) continue;

    // `tag: child` block expansion produces multiple tags on one line.
    for (const part of body.split(/:\s+(?=[a-zA-Z.#])/)) {
      const m = part.match(TAG_RE);
      if (!m || (!m[1] && !m[2])) continue;
      const tag = (m[1] ?? 'div').toLowerCase();
      let id: string | undefined;
      const classes: string[] = [];
      for (const tok of m[2].match(/[.#][\w-]+/g) ?? []) {
        if (tok[0] === '#') id = tok.slice(1);
        else classes.push(tok.slice(1));
      }
      const rest = part.slice(m[0].length);
      if (rest.startsWith('(')) {
        const end = rest.indexOf(')');
        const attrs = end === -1 ? rest.slice(1) : rest.slice(1, end);
        const idm = attrs.match(/\bid\s*=\s*(['"])([\w-]+)\1/);
        if (idm) id = idm[2];
        const cm = attrs.match(/\bclass\s*=\s*(['"])([^'"]*)\1/);
        if (cm) classes.push(...cm[2].split(/\s+/).filter(Boolean));
      }
      result.push({ path, line, tag, id, classes });
      if (/^[\w:.#-]+(\(.*\))?\.$/.test(part)) blockIndent = indent;
    }
  }
  return result;
}

/** Finds the most likely Pug source location for a rendered element, or null. */
export function findPugSource(
  code: string,
  files: Map<string, string>,
  activePath: string,
  el: ElementSignature,
): PugSourceLocation | null {
  const candidates = parseCandidates(flattenPugSource(code, files, activePath));
  const matches = candidates.filter(
    (c) =>
      c.tag === el.tag &&
      (c.id === undefined || c.id === el.id) &&
      c.classes.every((cls) => el.classes.includes(cls)),
  );
  if (matches.length === 0) return null;

  // Prefer the most specific candidates (same id/class set size) when available.
  const exact = matches.filter(
    (c) => (c.id ?? null) === (el.id ?? null) && c.classes.length === el.classes.length,
  );
  const pool = exact.length > 0 ? exact : matches;
  const picked = pool[el.ordinal % pool.length];
  return { path: picked.path, line: picked.line, approximate: pool.length !== el.total };
}
