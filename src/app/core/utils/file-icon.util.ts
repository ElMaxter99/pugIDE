import { FileType } from '../models/tab.model';

const ICONS: Record<FileType, string> = {
  pug: 'code',
  scss: 'palette',
  json: 'data_object',
  javascript: 'javascript',
  html: 'html',
  css: 'css',
  unknown: 'description',
};

export function getFileIcon(type: FileType): string {
  return ICONS[type] ?? ICONS.unknown;
}
