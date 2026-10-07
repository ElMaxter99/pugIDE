export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
  content?: string;
  /** Uploaded binary (image / font): shown in the tree but not editable as text. */
  isAsset?: boolean;
  isExpanded?: boolean;
}
