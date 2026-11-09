/**
 * Regiones de la pantalla del IDE que se recorren con F6 / Mayús+F6 y a las que llevan los enlaces de salto (P-21).
 * El orden es el del DOM: lateral, editor, datos, vista previa y panel inferior.
 */
export type RegionId = 'archivos' | 'editor' | 'datos' | 'preview' | 'problemas';

export const REGION_LABELS: Record<RegionId, string> = {
  archivos: 'Archivos y datos',
  editor: 'Editor',
  datos: 'Datos',
  preview: 'Vista previa',
  problemas: 'Problemas y Registro',
};

/** Dónde cae el foco al entrar en cada región (el primero que exista y se vea). */
export const REGION_FOCUS: Record<RegionId, string[]> = {
  archivos: ['.tabs-list [role="tab"][aria-selected="true"]', 'button'],
  editor: ['.monaco-editor textarea', '.editor-section button', 'button'],
  datos: ['.data-section textarea', '.data-section [role="treegrid"]', '.data-section button'],
  preview: ['.preview-canvas', 'button'],
  problemas: ['[role="tab"][aria-selected="true"]', 'button'],
};

/** Índice de la región siguiente (o anterior) con vuelta al principio. `current` -1: aún no se está en ninguna. */
export function nextRegionIndex(count: number, current: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return backwards ? count - 1 : 0;
  return (current + (backwards ? count - 1 : 1)) % count;
}
