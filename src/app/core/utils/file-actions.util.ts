import type { DialogConfig } from '../../shared/components/dialogs/dialog.component';
import type { ContextMenuAction } from '../models/index';

/** Textos y reglas de las acciones sobre archivos del Workspace (nuevo, renombrar, borrar, importar), sin Angular. */

/** Ruta absoluta del proyecto a partir de lo que escribe el usuario (`components/card.pug` → `/components/card.pug`). */
export function toProjectPath(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('/') ? trimmed : '/' + trimmed;
}

/** Carpeta de la pestaña activa (con la barra final): donde se propone crear un archivo nuevo. */
export function defaultNewFileDir(activePath: string | undefined): string {
  const path = activePath ?? '/main.pug';
  return path.substring(0, path.lastIndexOf('/') + 1);
}

export function newFileDialog(baseDir: string): DialogConfig {
  return {
    title: 'Nuevo archivo',
    message: 'Escribe la ruta del archivo (por ejemplo components/card.pug)',
    confirmText: 'Crear',
    cancelText: 'Cancelar',
    showInput: true,
    inputLabel: 'Ruta del archivo',
    inputValue: baseDir + 'nuevo-archivo.pug',
  };
}

export function renameDialog(path: string): DialogConfig {
  return {
    title: 'Renombrar',
    message: `Escribe la nueva ruta de ${path}`,
    confirmText: 'Renombrar',
    cancelText: 'Cancelar',
    showInput: true,
    inputLabel: 'Nueva ruta',
    inputValue: path,
  };
}

export function deleteDialog(path: string): DialogConfig {
  return {
    title: 'Borrar archivo',
    message: `¿Seguro que quieres borrar ${path}? Después puedes deshacerlo desde la paleta de comandos (Ctrl+K).`,
    confirmText: 'Borrar',
    cancelText: 'Cancelar',
    showInput: false,
    type: 'warning',
  };
}

export function importDialog(supportsFolders: boolean): DialogConfig {
  return {
    title: 'Importar proyecto',
    message: `Elige ${supportsFolders ? 'una carpeta' : 'un archivo .zip'} para importar. Esto reemplaza todos los archivos abiertos en el editor.`,
    confirmText: 'Continuar',
    cancelText: 'Cancelar',
    showInput: false,
    type: 'warning',
  };
}

/** Entradas del menú contextual de un nodo del árbol. */
/** Lo que el menú de un archivo necesita saber de la vista previa para ofrecer «Previsualizar este archivo». */
export interface PreviewMenuContext {
  /** Archivo que se renderiza ahora. */
  current: string | null;
  /** Archivo elegido a mano (`null`: vista automática). */
  pinned: string | null;
  /** Nombre del archivo que elegiría la vista automática. */
  autoName: string | null;
}

export function contextMenuFor(node: { type: 'file' | 'directory'; isAsset?: boolean; path?: string }, preview?: PreviewMenuContext): ContextMenuAction[] {
  if (node.type === 'directory') return [{ label: 'Nuevo archivo', icon: 'note_add', action: 'newFile' }];
  if (node.isAsset) {
    return [
      { label: 'Renombrar', icon: 'edit', action: 'rename' },
      { label: 'Borrar', icon: 'delete', action: 'delete' },
    ];
  }
  const previewItems: ContextMenuAction[] = [];
  if (preview && node.path && /\.(pug|jade)$/i.test(node.path)) {
    if (node.path !== preview.pinned) previewItems.push({ label: 'Previsualizar este archivo', icon: 'visibility', action: 'preview' });
    if (preview.pinned) previewItems.push({ label: `Vista previa automática${preview.autoName ? ` (${preview.autoName})` : ''}`, icon: 'visibility_off', action: 'previewAuto' });
    if (previewItems.length) previewItems.push({ label: '', action: '', separator: true });
  }
  return [
    ...previewItems,
    { label: 'Renombrar', icon: 'edit', action: 'rename' },
    { label: 'Duplicar', icon: 'content_copy', action: 'duplicate' },
    { label: '', action: '', separator: true },
    { label: 'Borrar', icon: 'delete', action: 'delete' },
  ];
}
