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
  call?: string;
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
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface TerminalEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'error' | 'warning' | 'success' | 'debug';
  source: string;
  message: string;
}

export interface InspectorNode {
  tagName: string;
  pugLine: number;
  htmlLine: number;
  attrs: Record<string, string>;
  children: InspectorNode[];
}

export interface AppPreferences {
  theme: 'dark' | 'light';
  fontSize: number;
  tabSize: number;
  minimap: boolean;
  wordWrap: boolean;
  formatOnSave: boolean;
  autoCompile: boolean;
  previewDevice: string;
  zoom: number;
}

export interface ContextMenuAction {
  label: string;
  icon?: string;
  action: string;
  separator?: boolean;
  disabled?: boolean;
  children?: ContextMenuAction[];
}
