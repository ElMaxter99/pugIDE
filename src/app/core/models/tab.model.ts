export interface Tab {
  id: string;
  name: string;
  path: string;
  type: FileType;
  isDirty: boolean;
  icon?: string;
}

export type FileType = 'pug' | 'scss' | 'json' | 'javascript' | 'html' | 'css' | 'unknown';

export function getFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pug':
    case 'jade':
      return 'pug';
    case 'scss':
    case 'sass':
      return 'scss';
    case 'json':
      return 'json';
    case 'js':
    case 'ts':
      return 'javascript';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    default:
      return 'unknown';
  }
}
