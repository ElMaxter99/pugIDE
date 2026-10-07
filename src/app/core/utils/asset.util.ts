/** Binary project assets (images, fonts) that the preview serves from memory instead of a web server. */
export const ASSET_EXT_RE = /\.(png|jpe?g|gif|webp|avif|bmp|ico|svg|woff2?|ttf|otf|eot)$/i;

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
};

export function mimeForPath(path: string): string {
  return MIME[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
}

export function isFontPath(path: string): boolean {
  return /\.(woff2?|ttf|otf|eot)$/i.test(path);
}

/** A reference that points into the project (not a URL, data/blob URI, anchor or protocol-relative). */
export function isLocalRef(ref: string): boolean {
  const r = ref.trim();
  if (!r || r.startsWith('#') || r.startsWith('//')) return false;
  return !/^[a-z][a-z0-9+.-]*:/i.test(r);
}

/** `images/a.png?v=2#x` → `/images/a.png` (root-relative, no query/hash, decoded). */
export function refToPath(ref: string): string {
  let p = ref.trim().split(/[?#]/)[0];
  try { p = decodeURIComponent(p); } catch { /* keep raw */ }
  const out: string[] = [];
  for (const part of p.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return '/' + out.join('/');
}

const ATTR_RE = /(\s(?:src|poster|data-src|href)\s*=\s*)(["'])([^"']*)\2/gi;
const CSS_URL_RE = /(url\(\s*)(["']?)([^"')]+)\2(\s*\))/gi;

/** Rewrites every local `src/poster/href` attribute and CSS `url(...)` through `fn` (return null to leave as is). */
export function rewriteRefs(html: string, fn: (ref: string) => string | null): string {
  const rewrite = (ref: string): string | null => (isLocalRef(ref) ? fn(ref) : null);
  return html
    .replace(ATTR_RE, (m, pre: string, q: string, ref: string) => {
      const out = rewrite(ref);
      return out === null ? m : `${pre}${q}${out}${q}`;
    })
    .replace(CSS_URL_RE, (m, pre: string, q: string, ref: string, post: string) => {
      const out = rewrite(ref);
      return out === null ? m : `${pre}${q}${out}${q}${post}`;
    });
}
