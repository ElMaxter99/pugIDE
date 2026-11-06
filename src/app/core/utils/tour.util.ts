/** Fragmento del texto de un paso del recorrido: texto normal, tecla o código. */
export type TourPart = string | { kbd: string } | { code: string };

export interface TourStep {
  id: string;
  /** Selector (atributo `data-tour`) de la zona que se ilumina. */
  target: string;
  title: string;
  body: TourPart[];
  /** Atajos que se listan bajo el texto (último paso). */
  shortcuts?: Array<{ keys: string; label: string }>;
}

/** Los cuatro pasos del recorrido (mesa P-12). */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'files',
    target: '[data-tour="files"]',
    title: 'Archivos y datos',
    body: ['Aquí viven los archivos del proyecto y, en la pestaña «Datos», los datos de ejemplo. PugIDE detecta las variables y las claves ', { code: "t('…')" }, ' de tu plantilla y las rellena por ti; tú las editas después.'],
  },
  {
    id: 'editor',
    target: '[data-tour="editor"]',
    title: 'El editor',
    body: ['Escribe Pug con completado y ayuda al pasar el ratón. ', { kbd: 'F12' }, ' o ', { kbd: 'Ctrl+clic' }, ' llevan a una definición. Los errores se subrayan y se explican en el panel «Problemas».'],
  },
  {
    id: 'preview',
    target: '[data-tour="preview"]',
    title: 'La vista previa',
    body: ['Se actualiza al escribir. Cambia entre Escritorio, Tableta, Móvil y PDF; en «Vista» tienes el idioma, el color, la captura y el inspector.'],
  },
  {
    id: 'keys',
    target: '[data-tour="search"]',
    title: 'Todo con el teclado',
    body: [],
    shortcuts: [
      { keys: 'Ctrl+K', label: 'busca comandos y archivos' },
      { keys: 'Ctrl+S', label: 'guarda y crea una versión' },
      { keys: 'Ctrl+Enter', label: 'compila al momento' },
      { keys: 'Ctrl+Shift+F', label: 'busca en todo el proyecto' },
    ],
  },
];

export interface Box { left: number; top: number; width: number; height: number }

export interface PopoverPlacement {
  left: number;
  top: number;
  /** Lado de la zona iluminada donde queda el aviso (`center` si no hay zona; `inside` si no cabe en ningún lado). */
  side: 'right' | 'left' | 'bottom' | 'top' | 'center' | 'inside';
}

/**
 * Coloca el aviso del recorrido junto a la zona iluminada sin taparla: prueba a su derecha, izquierda, debajo
 * y encima, y se queda con el primer lado donde cabe entero en la ventana. Si no cabe en ninguno, lo deja en
 * la esquina inferior derecha de la ventana. Sin zona (panel oculto), lo centra.
 */
export function placePopover(
  target: Box | null,
  pop: { width: number; height: number },
  view: { width: number; height: number },
  gap = 12,
  margin = 12,
): PopoverPlacement {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, Math.max(min, max)));
  if (!target || target.width <= 0 || target.height <= 0) {
    return {
      left: clamp((view.width - pop.width) / 2, margin, view.width - pop.width - margin),
      top: clamp((view.height - pop.height) / 2, margin, view.height - pop.height - margin),
      side: 'center',
    };
  }
  const fits = (l: number, t: number) => l >= margin && t >= margin && l + pop.width <= view.width - margin && t + pop.height <= view.height - margin;
  const midX = clamp(target.left + target.width / 2 - pop.width / 2, margin, view.width - pop.width - margin);
  const topY = clamp(target.top, margin, view.height - pop.height - margin);
  const candidates: PopoverPlacement[] = [
    { left: target.left + target.width + gap, top: topY, side: 'right' },
    { left: target.left - pop.width - gap, top: topY, side: 'left' },
    { left: midX, top: target.top + target.height + gap, side: 'bottom' },
    { left: midX, top: target.top - pop.height - gap, side: 'top' },
  ];
  const ok = candidates.find((c) => fits(c.left, c.top));
  if (ok) return ok;
  return { left: Math.max(margin, view.width - pop.width - margin), top: Math.max(margin, view.height - pop.height - margin), side: 'inside' };
}

/** Etiqueta de una plantilla en la bienvenida: «A4 · 3 archivos» o «Correo · 3 archivos». */
export function templateBadge(id: string, fileCount: number): string {
  const kind = id === 'email' ? 'Correo' : 'A4';
  return `${kind} · ${fileCount} ${fileCount === 1 ? 'archivo' : 'archivos'}`;
}

/** Orden de las plantillas en la bienvenida (mesa P-06): Informe, Factura, Correo electrónico. */
export const WELCOME_TEMPLATE_ORDER = ['report', 'invoice', 'email'];
