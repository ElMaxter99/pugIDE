/** Elementos que reciben el foco con el teclado. */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Índice que recibe el foco al pulsar Tab (o Shift+Tab) dentro de un diálogo de `count` elementos
 * enfocables, estando en `current` (-1: el foco está fuera de la lista). Da la vuelta en los extremos.
 */
export function nextFocusIndex(count: number, current: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return backwards ? count - 1 : 0;
  if (backwards) return current === 0 ? count - 1 : current - 1;
  return current === count - 1 ? 0 : current + 1;
}

/** Elementos enfocables y visibles de `container`, en orden de tabulación del DOM. */
export function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.getClientRects().length > 0);
}

/** Mantiene el foco dentro de `container` con Tab / Shift+Tab (para diálogos modales). */
export function trapTab(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== 'Tab') return;
  const items = focusableElements(container);
  event.preventDefault();
  if (items.length === 0) {
    container.focus();
    return;
  }
  const next = nextFocusIndex(items.length, items.indexOf(document.activeElement as HTMLElement), event.shiftKey);
  items[next].focus();
}

/** Recuerda el elemento con el foco y devuelve la función que se lo devuelve (al cerrar un diálogo). */
export function rememberFocus(): () => void {
  const previous = document.activeElement as HTMLElement | null;
  return () => {
    if (previous && previous !== document.body && document.contains(previous)) previous.focus();
  };
}
