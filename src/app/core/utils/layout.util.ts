/** Disposiciones de la interfaz (P-08): qué paneles se ven y cuánto miden. Todo son funciones puras. */
export type LayoutId = 'editor-preview' | 'editor-data-preview' | 'focus-editor' | 'focus-preview';
export type PanelKey = 'sidebar' | 'data' | 'preview';
export type PanelSizes = Record<PanelKey, number>;

export interface LayoutDef {
  id: LayoutId;
  label: string;
  /** Atajo que se enseña en el menú y la paleta. */
  keys: string;
  /** Con `true` el panel lateral se recoge en el raíl. */
  sidebarCollapsed: boolean;
  /** Con `true` los datos son una columna propia (junto al editor) y no una pestaña del panel lateral. */
  dataColumn: boolean;
  /** Pone el preview en modo PDF / página impresa. */
  pdf: boolean;
  /** Anchos de partida a 1440 px; el editor ocupa el resto. */
  defaults: PanelSizes;
}

export const DEFAULT_LAYOUT: LayoutId = 'editor-preview';
export const RAIL_WIDTH = 48;
export const MIN_SIZES = { sidebar: 200, editor: 360, data: 260, preview: 320 } as const;
/** Tope de cada columna mientras no se conozca el ancho de la ventana. */
const HARD_MAX = 4000;

export const LAYOUTS: readonly LayoutDef[] = [
  { id: 'editor-preview', label: 'Editor + vista previa', keys: 'Ctrl+Alt+1', sidebarCollapsed: false, dataColumn: false, pdf: false, defaults: { sidebar: 280, data: 300, preview: 660 } },
  { id: 'editor-data-preview', label: 'Editor + datos + vista previa', keys: 'Ctrl+Alt+2', sidebarCollapsed: true, dataColumn: true, pdf: false, defaults: { sidebar: 280, data: 300, preview: 672 } },
  { id: 'focus-editor', label: 'Foco en el editor', keys: 'Ctrl+Alt+3', sidebarCollapsed: true, dataColumn: false, pdf: false, defaults: { sidebar: 280, data: 300, preview: 472 } },
  { id: 'focus-preview', label: 'Foco en la vista previa · PDF', keys: 'Ctrl+Alt+4', sidebarCollapsed: true, dataColumn: false, pdf: true, defaults: { sidebar: 280, data: 300, preview: 1032 } },
];

export function isLayoutId(value: unknown): value is LayoutId {
  return LAYOUTS.some((l) => l.id === value);
}

export function layoutById(id: LayoutId): LayoutDef {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/** Quita de lo guardado lo que no sea una disposición conocida o un número razonable (preferencias antiguas o a mano). */
export function sanitizePanelSizes(raw: unknown): Partial<Record<LayoutId, Partial<PanelSizes>>> {
  const out: Partial<Record<LayoutId, Partial<PanelSizes>>> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, sizes] of Object.entries(raw as Record<string, unknown>)) {
    if (!isLayoutId(id) || !sizes || typeof sizes !== 'object') continue;
    const clean: Partial<PanelSizes> = {};
    for (const key of ['sidebar', 'data', 'preview'] as const) {
      const n = (sizes as Record<string, unknown>)[key];
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= HARD_MAX) clean[key] = Math.round(n);
    }
    if (Object.keys(clean).length) out[id] = clean;
  }
  return out;
}

export interface ResolvedLayout {
  /** Ancho real de cada columna (`sidebar` vale `RAIL_WIDTH` si está recogido; `data` es 0 si no hay columna). */
  sidebar: number;
  data: number;
  preview: number;
  editor: number;
  /** Mínimo y máximo que admite cada tirador ahora mismo (para `aria-valuemin/max` y para acotar el arrastre). */
  limits: Record<PanelKey, { min: number; max: number }>;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max));

/**
 * Reparte el ancho de la ventana. Los tamaños elegidos se respetan mientras el editor conserve su mínimo; si no caben,
 * se recorta primero el preview, luego los datos y por último el panel lateral, siempre sin bajar de sus mínimos.
 */
export function resolveLayout(
  def: LayoutDef,
  state: { sidebarCollapsed: boolean; dataVisible: boolean; sizes?: Partial<PanelSizes> },
  container: number,
): ResolvedLayout {
  const want: PanelSizes = { ...def.defaults, ...(state.sizes ?? {}) };
  const railOnly = state.sidebarCollapsed;
  let sidebar = railOnly ? RAIL_WIDTH : clamp(want.sidebar, MIN_SIZES.sidebar, HARD_MAX);
  let data = def.dataColumn && state.dataVisible ? clamp(want.data, MIN_SIZES.data, HARD_MAX) : 0;
  let preview = clamp(want.preview, MIN_SIZES.preview, HARD_MAX);

  let overflow = sidebar + data + preview + MIN_SIZES.editor - container;
  const shrink = (value: number, min: number) => {
    const take = Math.min(Math.max(overflow, 0), value - min);
    overflow -= take;
    return value - take;
  };
  preview = shrink(preview, MIN_SIZES.preview);
  if (data) data = shrink(data, MIN_SIZES.data);
  if (!railOnly) sidebar = shrink(sidebar, MIN_SIZES.sidebar);

  const editor = Math.max(0, container - sidebar - data - preview);
  const room = (others: number) => container - MIN_SIZES.editor - others;
  const limits = {
    sidebar: { min: MIN_SIZES.sidebar, max: Math.max(MIN_SIZES.sidebar, room(data + preview)) },
    data: { min: MIN_SIZES.data, max: Math.max(MIN_SIZES.data, room(sidebar + preview)) },
    preview: { min: MIN_SIZES.preview, max: Math.max(MIN_SIZES.preview, room(sidebar + data)) },
  };
  return { sidebar, data, preview, editor, limits };
}

/** Nuevo valor tras una tecla sobre un tirador: ← → mueven 16 px (Mayús, 64); Inicio y Fin van a los extremos. `grow` es +1 si → agranda. */
export function stepSize(current: number, key: string, shift: boolean, grow: 1 | -1, min: number, max: number): number | null {
  const step = shift ? 64 : 16;
  let next: number;
  if (key === 'ArrowRight') next = current + grow * step;
  else if (key === 'ArrowLeft') next = current - grow * step;
  else if (key === 'Home') next = min;
  else if (key === 'End') next = max;
  else return null;
  return Math.round(clamp(next, min, max));
}

/** Lo mínimo de un `KeyboardEvent` que necesitan los atajos (así se prueban sin navegador). */
export interface KeyLike {
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  key: string;
  code: string;
  /** `event.getModifierState('AltGraph')`. */
  altGraph?: boolean;
}

/**
 * Ctrl+Alt+1…4 (Cmd+Opción en Mac) → disposición. En teclados con AltGr (Windows, Linux) Ctrl+Alt+1 teclea «|», «@»,
 * «#» o «~» en el editor: ahí no se secuestra la tecla (la disposición se cambia desde el menú, la paleta o la barra de estado).
 */
export function layoutShortcut(e: KeyLike): LayoutId | null {
  if (!(e.ctrlKey || e.metaKey) || !e.altKey || e.shiftKey || e.altGraph) return null;
  let digit: string | null = null;
  if (/^[1-4]$/.test(e.key)) digit = e.key;
  // En Mac, Opción+1 escribe «¡»: la tecla física manda, pero solo si el carácter no es uno imprimible de ASCII (AltGr).
  else if (/^Digit[1-4]$/.test(e.code) && !/^[ -~]$/.test(e.key)) digit = e.code.slice(5);
  return digit ? LAYOUTS[Number(digit) - 1].id : null;
}

/** Ctrl/Cmd+B → panel lateral; Ctrl/Cmd+J → panel inferior. */
export function panelShortcut(e: KeyLike): 'sidebar' | 'bottom' | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return null;
  const k = e.key.toLowerCase();
  return k === 'b' ? 'sidebar' : k === 'j' ? 'bottom' : null;
}
