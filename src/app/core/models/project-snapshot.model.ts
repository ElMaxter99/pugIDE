import type { DatasetsFile } from '../utils/datasets.util';

/** Asset (imagen, fuente…) guardado dentro de una instantánea. */
export interface SnapshotAsset {
  path: string;
  mime: string;
  data: Uint8Array;
}

/** Todo lo que define un proyecto: archivos de texto, assets y juegos de datos (idiomas incluidos: viven en `/locales/`). */
export interface SnapshotContent {
  files: Record<string, string>;
  assets: SnapshotAsset[];
  datasets?: DatasetsFile;
}

/** Datos ligeros de una instantánea, para listarla sin cargar su contenido. */
export interface SnapshotMeta {
  id: string;
  /** Proyecto de la biblioteca al que pertenece. */
  projectId: string;
  name: string;
  /** Marca de tiempo (ms). */
  at: number;
  /** Creada por PugIDE («Antes de restaurar…») y no por la persona. */
  auto: boolean;
  fileCount: number;
  assetCount: number;
  /** Tamaño aproximado del contenido (texto en UTF-8 + assets + datos). */
  bytes: number;
}
