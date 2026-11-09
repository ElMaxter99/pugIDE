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
      { label: 'Ir a la región siguiente (lateral, editor, datos, vista previa, Problemas)', keys: 'F6' },
      { label: 'Ir a la región anterior', keys: 'Mayús+F6' },
      { label: 'Enlaces de salto «Saltar al editor / a la vista previa / a Problemas»', keys: 'Tab al cargar la página' },
    ],
  },
  {
    title: 'Editor',
    items: [
      { label: 'Buscar y reemplazar en el proyecto', keys: 'Ctrl+Shift+F' },
      { label: 'Ir a símbolo (mixins y bloques)', keys: 'Ctrl+Shift+O' },
      { label: 'Ir a la definición de include / extends / +mixin', keys: 'F12 o Ctrl+clic' },
      { label: 'Formatear Pug', keys: 'Shift+Alt+F' },
      { label: 'Previsualizar una plantilla del árbol (con teclado: menú de la fila → «Previsualizar este archivo»)', keys: 'Doble clic' },
      { label: 'Tab mueve el foco fuera del editor (en vez de sangrar); otra vez para volver (en macOS: Ctrl+Mayús+M)', keys: 'Ctrl+M' },
    ],
  },
  {
    title: 'Disposición',
    items: [
      { label: 'Editor + vista previa (con teclado con AltGr, Ctrl+Alt+cifra escribe «|», «@», «#» o «~»: usa el menú «Disposición» de la barra de estado)', keys: 'Ctrl+Alt+1' },
      { label: 'Editor + datos + vista previa', keys: 'Ctrl+Alt+2' },
      { label: 'Foco en el editor', keys: 'Ctrl+Alt+3' },
      { label: 'Foco en la vista previa · PDF', keys: 'Ctrl+Alt+4' },
      { label: 'Mostrar u ocultar el panel lateral', keys: 'Ctrl+B' },
      { label: 'Mostrar u ocultar el panel inferior (Registro)', keys: 'Ctrl+J' },
      { label: 'Mover un tirador entre paneles (← → 16 px, con Mayús 64; doble clic restablece)', keys: 'Tab hasta el tirador' },
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
