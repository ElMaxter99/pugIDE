export interface PageSize {
  /** CSS px (96dpi). */
  width: number;
  height: number;
  label: string;
  /** `css`: read from the template's `@page { size }`; `default`: fallback A4. */
  source: 'css' | 'default';
}

const PX_PER_UNIT: Record<string, number> = {
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
};

const MM = 96 / 25.4;
const NAMED: Record<string, [number, number]> = {
  a3: [297 * MM, 420 * MM],
  a4: [210 * MM, 297 * MM],
  a5: [148 * MM, 210 * MM],
  b4: [250 * MM, 353 * MM],
  b5: [176 * MM, 250 * MM],
  letter: [8.5 * 96, 11 * 96],
  legal: [8.5 * 96, 14 * 96],
  ledger: [11 * 96, 17 * 96],
};

export function defaultPageSize(orientation: 'landscape' | 'portrait'): PageSize {
  const [w, h] = NAMED['a4'];
  const landscape = orientation === 'landscape';
  return {
    width: Math.round(landscape ? h : w),
    height: Math.round(landscape ? w : h),
    label: `A4 ${landscape ? 'horizontal' : 'vertical'}`,
    source: 'default',
  };
}

/**
 * Reads the print page size from the template's CSS (`@page { size: 841.9pt 595.3pt }`,
 * `size: A4 landscape`, `size: 210mm 297mm`…). Falls back to A4 in the given orientation.
 */
export function detectPageSize(html: string, orientation: 'landscape' | 'portrait' = 'landscape'): PageSize {
  const fallback = defaultPageSize(orientation);
  const rule = html.match(/@page[^{]*\{[^}]*?\bsize\s*:\s*([^;}]+)/i);
  if (!rule) return fallback;

  let width: number | null = null;
  let height: number | null = null;
  let named: [number, number] | null = null;
  let landscape = false;
  let name = '';
  const lengths: number[] = [];

  for (const token of rule[1].trim().toLowerCase().split(/\s+/)) {
    const len = token.match(/^(\d*\.?\d+)(px|pt|pc|in|mm|cm)$/);
    if (len) lengths.push(parseFloat(len[1]) * PX_PER_UNIT[len[2]]);
    else if (token === 'landscape') landscape = true;
    else if (token === 'portrait') landscape = false;
    else if (NAMED[token]) { named = NAMED[token]; name = token.toUpperCase(); }
  }

  if (lengths.length >= 1) {
    width = lengths[0];
    height = lengths[1] ?? lengths[0];
  } else if (named) {
    [width, height] = landscape ? [named[1], named[0]] : named;
  }
  if (!width || !height) return fallback;

  const w = Math.round(width);
  const h = Math.round(height);
  const mmW = Math.round((width / MM) * 10) / 10;
  const mmH = Math.round((height / MM) * 10) / 10;
  return {
    width: w,
    height: h,
    label: `${name ? name + ' ' : ''}${mmW}×${mmH} mm`,
    source: 'css',
  };
}
