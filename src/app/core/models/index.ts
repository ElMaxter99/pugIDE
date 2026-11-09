export interface PugVariable {
  name: string;
  path: string;
  type: DataType;
  defaultValue: unknown;
  parentPath?: string;
  isLeaf: boolean;
}

export type DataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'url'
  | 'color'
  | 'array'
  | 'object'
  | 'null';

export interface DataNode {
  key: string;
  path: string;
  type: DataType;
  value: unknown;
  children?: DataNode[];
  isExpanded?: boolean;
  arrayItemType?: DataType;
}

export interface PugAstNode {
  type: string;
  name?: string;
  val?: string | number | boolean | null;
  attrs?: PugAttribute[];
  block?: PugBlock;
  cases?: unknown[];
  vars?: unknown[];
  expr?: string;
  arg?: string;
  args?: string;
  body?: PugAstNode[];
  line?: number;
  column?: number;
  filename?: string;
  file?: string;
  tag?: string;
  text?: string;
  escape?: boolean;
  buffer?: boolean;
  call?: boolean;
  interpolate?: boolean;
  nodes?: PugAstNode[];
}

export interface PugAttribute {
  name: string;
  val: string | boolean | number;
  mustEscape?: boolean;
}

export interface PugBlock {
  nodes: PugAstNode[];
  line?: number;
}

export interface ParseResult {
  ast: PugAstNode | null;
  variables: PugVariable[];
  mixins: PugMixin[];
  includes: string[];
  extendsPath?: string;
  /** Free functions the template calls (`t('KEY')`, `formatDate(x)`…) that are not declared in it; the compiler stubs them. */
  calledFunctions: string[];
  /** Literal translation keys passed to `t('A.B')` / `i18n.t('A.B')`. */
  translationKeys: string[];
  errors: ParseError[];
  compilationTime: number;
}

export interface PugMixin {
  name: string;
  args: string[];
  body: PugAstNode[];
  line: number;
  callCount: number;
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  filename?: string;
  severity: 'error' | 'warning';
}

export interface CompileResult {
  html: string;
  css: string;
  errors: CompileError[];
  compilationTime: number;
}

export interface CompileError {
  message: string;
  source: 'pug' | 'scss' | 'javascript';
  /** Archivo del proyecto donde ocurrió (p. ej. un parcial incluido), si se conoce. */
  path?: string;
  line?: number;
  column?: number;
  /** Explicación de la causa probable y cómo arreglarla, cuando el mensaje de Pug es críptico. */
  hint?: string;
  /** Arreglo que PugIDE puede aplicar con un clic. */
  fix?: DiagnosticFix;
  severity: 'error' | 'warning';
}

/** Arreglo automático de un problema: se aplica sobre los archivos del proyecto (`OrchestratorService.applyFix`). */
export type DiagnosticFix =
  /** Añade `mixin name()` al final de `path` (lo crea si no existe) y, si `includeFrom` no lo incluye, añade el `include`. */
  | { kind: 'createMixin'; label: string; name: string; path: string; includeFrom?: string }
  /** Añade `include <target>` al principio de `path`. */
  | { kind: 'addInclude'; label: string; path: string; target: string }
  /** Sustituye `from` por `to` en la línea indicada de `path`. */
  | { kind: 'replaceOnLine'; label: string; path: string; line: number; from: string; to: string };

export interface TerminalEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'error' | 'warning' | 'success' | 'debug';
  source: string;
  message: string;
  /** Mensaje de detalle (arranque, compilaciones…): el filtro «Esenciales» del Registro lo oculta. */
  detail?: boolean;
  /** Ubicación en el proyecto: el Registro la convierte en un enlace que abre el archivo en esa línea. */
  path?: string;
  line?: number;
}

export interface InspectorNode {
  tagName: string;
  pugLine?: number;
  /** Pug file the line belongs to (may be an included file). */
  pugPath?: string;
  /** The Pug mapping is a best guess (loops, conditionals, mixins). */
  pugApproximate?: boolean;
  htmlLine?: number;
  attrs: Record<string, string>;
  children: InspectorNode[];
}

import type { DeviceMemory, LayoutId, PanelSizes } from '../utils/layout.util';
import type { JsonViewPrefs } from '../utils/json-view.util';

export interface AppPreferences {
  theme: 'dark' | 'light';
  fontSize: number;
  tabSize: number;
  minimap: boolean;
  wordWrap: boolean;
  formatOnSave: boolean;
  /** El formateador de Pug ordena los atributos de cada etiqueta. */
  sortAttributes: boolean;
  autoCompile: boolean;
  previewDevice: string;
  zoom: number;
  /** Panel lateral recogido en el raíl (Ctrl+B). */
  sidebarCollapsed: boolean;
  /** Columna de datos oculta (solo en la disposición «Editor + datos + vista previa»). */
  dataCollapsed: boolean;
  /** Disposición activa (P-08). */
  layout: LayoutId;
  /** Anchos que la persona ha elegido arrastrando los tiradores, por disposición. Solo del usuario: no viaja con el proyecto. */
  panelSizes: Partial<Record<LayoutId, Partial<PanelSizes>>>;
  /** Pestaña abierta del panel lateral. */
  sidebarTab: 'archivos' | 'datos';
  /** Dispositivo del preview al que volver al salir de «Foco en la vista previa · PDF» (`null`: nada que restaurar). Se borra al elegir un dispositivo a mano. */
  deviceBeforePdf: DeviceMemory | null;
  /** Vista de los archivos `.json`: árbol o código, por tipo de archivo (P-17). */
  jsonView: JsonViewPrefs;
}

export interface ContextMenuAction {
  label: string;
  icon?: string;
  action: string;
  separator?: boolean;
  disabled?: boolean;
  children?: ContextMenuAction[];
}
