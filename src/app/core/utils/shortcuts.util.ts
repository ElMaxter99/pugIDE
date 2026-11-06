export interface Shortcut {
  label: string;
  keys: string;
}

export interface ShortcutGroup {
  title: string;
  items: Shortcut[];
}

/** Atajos que PugIDE añade (los propios de Monaco, como Ctrl+F o Ctrl+D, no se repiten). */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    items: [
      { label: 'Paleta de comandos', keys: 'Ctrl+K' },
      { label: 'Guardar (crea una versión en el historial) y compilar', keys: 'Ctrl+S' },
      { label: 'Compilar ahora', keys: 'Ctrl+Enter' },
    ],
  },
  {
    title: 'Editor',
    items: [
      { label: 'Buscar y reemplazar en el proyecto', keys: 'Ctrl+Shift+F' },
      { label: 'Ir a símbolo (mixins y bloques)', keys: 'Ctrl+Shift+O' },
      { label: 'Ir a la definición de include / extends / +mixin', keys: 'F12 o Ctrl+clic' },
      { label: 'Formatear Pug', keys: 'Shift+Alt+F' },
      { label: 'Tab mueve el foco fuera del editor (en vez de sangrar); otra vez para volver (en macOS: Ctrl+Mayús+M)', keys: 'Ctrl+M' },
    ],
  },
  {
    title: 'Datos y Registro',
    items: [
      { label: 'Alternar árbol / editor JSON', keys: 'Ctrl+Shift+J' },
      { label: 'Limpiar el Registro', keys: 'Ctrl+Shift+K' },
    ],
  },
];
