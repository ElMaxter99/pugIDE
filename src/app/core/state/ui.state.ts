import { Injectable, signal } from '@angular/core';
import type { SharePayload } from '../utils/share.util';

/** Abrir un enlace compartido (P-16): contraseña pendiente, elegir cómo abrirlo o decir por qué no se puede. */
export interface ShareOpenRequest {
  /** Contenido cifrado que espera la contraseña (null si el enlace no la pide o ya se descifró). */
  encrypted: string | null;
  payload: SharePayload | null;
  /** Hay un proyecto abierto o guardado que no se debe pisar: se pregunta cómo abrir. */
  hasSession: boolean;
  /** Por qué no se puede abrir (caducado, dañado). */
  problem: string | null;
}

export interface LocaleImportRequest {
  source: 'add' | 'drop';
  files: { name: string; text: string }[];
}

/** Estado de la interfaz compartido entre componentes (paneles flotantes y diálogos). */
/** Un archivo que se va a importar: su ruta relativa dentro de lo elegido y de dónde se leen sus bytes. */
export interface ImportEntry {
  relPath: string;
  /** Destino ya decidido: la ruta que una plantilla echa en falta (ver `PickedFile.fixedPath`). */
  fixedPath?: string;
  file?: File;
  bytes?: Uint8Array;
}

export interface ImportFilesRequest {
  /** Carpeta del proyecto donde se guardan (`/` = raíz). */
  target: string;
  /** Lo ya elegido o soltado; sin ello el diálogo empieza pidiendo qué importar. */
  entries?: ImportEntry[];
  /** Un `.zip` soltado: se pregunta si añadir su contenido o abrirlo como proyecto nuevo. */
  zip?: File;
}

@Injectable({ providedIn: 'root' })
export class UiState {
  /** Diálogo "Mis proyectos". */
  readonly projectsOpen = signal(false);
  /** Paleta de comandos (Ctrl+K). */
  readonly paletteOpen = signal(false);
  /** Diálogo de atajos de teclado. */
  readonly shortcutsOpen = signal(false);
  /** Diálogo para añadir un idioma (`/locales/<código>/translations.json`). */
  readonly addLocaleOpen = signal(false);
  /** Archivos de idioma por importar (P-14): `add` viene de «Añadir idioma», `drop` de soltar/subir un JSON de textos. */
  readonly localeImport = signal<LocaleImportRequest | null>(null);
  /** Diálogo «Compartir proyecto» (P-15): caducidad, contraseña y datos del enlace. */
  readonly shareCreateOpen = signal(false);
  /** «Idiomas del proyecto» (P-22): idioma por defecto y de reserva. */
  readonly localesOpen = signal(false);
  /** «Exportar para correo» (P-23). */
  readonly emailExportOpen = signal(false);
  /** «Exportar todas las plantillas» (P-24). */
  readonly exportAllOpen = signal(false);
  /** «Mis proyectos» se abre con el menú «Importar proyecto…» desplegado (P-29). */
  readonly projectsImportMenu = signal(false);
  /** «Importar archivos» (P-28): destino y, si ya se eligieron o se soltaron, lo que se importa. `null` = cerrado. */
  readonly importFiles = signal<ImportFilesRequest | null>(null);
  /** «Guardar como plantilla» (P-25). */
  readonly saveTemplateOpen = signal(false);
  /** Escritorio: «Espacios de trabajo» (P-26). */
  readonly workspacesOpen = signal(false);
  /** Escritorio: «Buscar actualizaciones» (P-27). */
  readonly updatesOpen = signal(false);
  /** Enlace compartido que se está abriendo (P-16). */
  readonly shareOpen = signal<ShareOpenRequest | null>(null);
  /** Diálogo con el historial de versiones del archivo activo. */
  readonly historyOpen = signal(false);
  /** Diálogo de instantáneas del proyecto (guardar, comparar, restaurar). */
  readonly snapshotsOpen = signal(false);
  /** Bienvenida de primer uso (P-06). */
  readonly welcomeOpen = signal(false);
  /** Recorrido guiado de 4 pasos (P-12). */
  readonly tourOpen = signal(false);
  /** Orden al editor desde fuera de él (paleta): `id` de la acción de Monaco o `pug.searchInProject`; `n` fuerza cada petición. */
  readonly editorCommand = signal<{ id: string; n: number } | null>(null);

  /** Acción que un menú pide a otro panel: `print` (vista previa). */
  readonly panelRequest = signal<{ id: 'print'; n: number } | null>(null);

  requestPanel(id: 'print'): void {
    this.panelRequest.set({ id, n: (this.panelRequest()?.n ?? 0) + 1 });
  }

  requestEditorCommand(id: string): void {
    this.editorCommand.set({ id, n: (this.editorCommand()?.n ?? 0) + 1 });
  }
}
