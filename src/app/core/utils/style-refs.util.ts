/** Helpers to follow stylesheet references: `<link rel="stylesheet">` and CSS/SCSS `@import`. */
import { refToPath, isLocalRef } from './asset.util';

const STYLE_EXT = ['.scss', '.sass', '.less', '.css'];
const IMPORT_RE = /@import\s+(?:url\(\s*(["']?)([^"')]+)\1\s*\)|(["'])([^"']+)\3)\s*([^;]*);?/gi;
const LINK_RE = /<link\b[^>]*>/gi;

export function isStylePath(path: string): boolean {
  return STYLE_EXT.some((e) => path.toLowerCase().endsWith(e));
}

function dirOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/')) || '';
}

function normalize(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return '/' + out.join('/');
}

/** Finds the project stylesheet a reference points to (tries extension and `_partial` variants). */
export function resolveStyleFile(ref: string, fromPath: string, files: Map<string, string>): string | null {
  if (!isLocalRef(ref)) return null;
  const clean = ref.trim().split(/[?#]/)[0];
  const candidates = clean.startsWith('/') ? [normalize(clean)] : [normalize(dirOf(fromPath) + '/' + clean), refToPath(clean)];
  for (const base of candidates) {
    const slash = base.lastIndexOf('/');
    const dir = base.slice(0, slash + 1);
    const name = base.slice(slash + 1);
    const variants = [base, ...STYLE_EXT.map((e) => base + e), ...STYLE_EXT.map((e) => `${dir}_${name}${e}`)];
    if (name.startsWith('_') === false) variants.push(...STYLE_EXT.map((e) => `${dir}_${name.replace(/\.(scss|sass|css)$/i, '')}${e}`));
    for (const v of variants) if (isStylePath(v) && files.has(v)) return v;
  }
  return null;
}

export interface ResolvedImports {
  /** Source with every local `@import` inlined and every remote one removed. */
  source: string;
  /** Remote `@import` rules (must go first in the final stylesheet). */
  remote: string[];
  /** Project files that were inlined. */
  used: Set<string>;
  missing: string[];
}

/** Inlines local `@import`s recursively; remote ones (http/https/protocol-relative) are collected to be hoisted. */
export function resolveImports(path: string, files: Map<string, string>, stack: string[] = [], acc?: ResolvedImports): ResolvedImports {
  const res = acc ?? { source: '', remote: [], used: new Set<string>(), missing: [] };
  const src = files.get(path) ?? '';
  res.source = src.replace(IMPORT_RE, (_m, _q1, urlRef: string | undefined, _q2, strRef: string | undefined, media: string) => {
    const ref = (urlRef ?? strRef ?? '').trim();
    if (!isLocalRef(ref)) {
      res.remote.push(`@import url("${ref}")${media.trim() ? ' ' + media.trim() : ''};`);
      return '';
    }
    const target = resolveStyleFile(ref, path, files);
    if (!target) { res.missing.push(ref); return ''; }
    if (stack.includes(target) || target === path) return '';
    res.used.add(target);
    const inner = resolveImports(target, files, [...stack, path], { source: '', remote: res.remote, used: res.used, missing: res.missing });
    return inner.source;
  });
  return res;
}

/** True when the tag is a `<link rel="stylesheet">`; returns its href. */
function stylesheetHref(tag: string): string | null {
  if (!/\brel\s*=\s*["']?[^"'>]*stylesheet/i.test(tag)) return null;
  const m = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
  return m ? (m[1] ?? m[2]) : null;
}

/**
 * Replaces `<link rel="stylesheet" href="local.css">` by an inline `<style>` with the compiled file,
 * so the preview shows project stylesheets without a web server. Remote links are left untouched.
 */
export async function inlineLocalStylesheets(
  html: string,
  files: Map<string, string>,
  compile: (path: string) => Promise<{ css: string; used: Set<string> }>,
): Promise<{ html: string; used: Set<string>; missing: string[] }> {
  const used = new Set<string>();
  const missing: string[] = [];
  const cache = new Map<string, string>();
  const tags = [...new Set(html.match(LINK_RE) ?? [])];
  for (const tag of tags) {
    const href = stylesheetHref(tag);
    if (href === null || !isLocalRef(href)) continue;
    const target = resolveStyleFile(href, '/index.pug', files);
    if (!target) { missing.push(refToPath(href)); continue; }
    const r = await compile(target);
    used.add(target);
    r.used.forEach((u) => used.add(u));
    cache.set(tag, `<style data-href="${target}">\n${r.css}\n</style>`);
  }
  return { html: html.replace(LINK_RE, (tag) => cache.get(tag) ?? tag), used, missing };
}
