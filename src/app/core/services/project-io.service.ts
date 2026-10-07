import { Injectable, inject } from '@angular/core';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { EditorState } from '../state/editor.state';
import { ProjectState } from '../state/project.state';
import { TerminalState } from '../state/terminal.state';
import { OrchestratorService } from './orchestrator.service';
import { AssetState, AssetFile } from '../state/asset.state';
import { ASSET_EXT_RE, mimeForPath } from '../utils/asset.util';
import { DataState } from '../state/data.state';
import { PreviewState } from '../state/preview.state';
import {
  SHARE_URL_WARN_LENGTH, SharePayload, ShareDecodeError, buildShareUrl, decodeShare, encodeShare,
} from '../utils/share.util';
import { buildStandaloneHtml, bytesToDataUri } from '../utils/export-html.util';
import { DATASETS_PATH, parseDatasetsFile, serializeDatasets } from '../utils/datasets.util';

const TEXT_FILE_RE = /\.(pug|jade|scss|sass|css|json|js|html|htm|md|txt)$/i;

/**
 * Handles getting a project into and out of the browser: exports to a real
 * folder (File System Access API) or a .zip download, and imports from
 * either the same way. PugIDE otherwise only lives in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ProjectIoService {
  private editorState = inject(EditorState);
  private projectState = inject(ProjectState);
  private terminalState = inject(TerminalState);
  private orchestrator = inject(OrchestratorService);
  private assetState = inject(AssetState);
  private dataState = inject(DataState);
  private previewState = inject(PreviewState);

  get supportsFileSystemAccess(): boolean {
    return typeof (window as any).showDirectoryPicker === 'function';
  }

  async exportProject(): Promise<void> {
    const files = this.editorState.files();
    if (files.size === 0 && this.assetState.assets().size === 0) {
      this.terminalState.addEntry('warning', 'Export', 'Nothing to export — the project has no files.');
      return;
    }
    try {
      if (this.supportsFileSystemAccess) {
        await this.exportToDirectory(files);
      } else {
        this.exportToZip(files);
      }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
      this.terminalState.addEntry('error', 'Export', `Export failed: ${(err as Error).message ?? err}`);
    }
  }

  private async exportToDirectory(files: Map<string, string>): Promise<void> {
    const dirHandle: any = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    for (const [path, content] of files) {
      await this.writeFileToDirectory(dirHandle, path, content);
    }
    for (const a of this.assetState.assets().values()) {
      await this.writeFileToDirectory(dirHandle, a.path, a.data);
    }
    await this.writeFileToDirectory(dirHandle, DATASETS_PATH, this.datasetsText());
    this.terminalState.addEntry('success', 'Export', `Exported ${files.size + this.assetState.assets().size} file(s) to disk.`);
  }

  /** Juegos de datos del proyecto, como `/.pugide/datasets.json` (no es un archivo del proyecto). */
  private datasetsText(): string {
    return serializeDatasets(this.dataState.snapshotDatasets());
  }

  private async writeFileToDirectory(root: any, path: string, content: string | Uint8Array): Promise<void> {
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    let dir = root;
    for (const segment of parts) {
      dir = await dir.getDirectoryHandle(segment, { create: true });
    }
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  private exportToZip(files: Map<string, string>): void {
    const zipInput: Record<string, Uint8Array> = {};
    for (const [path, content] of files) {
      zipInput[path.replace(/^\//, '')] = strToU8(content);
    }
    for (const a of this.assetState.assets().values()) zipInput[a.path.replace(/^\//, '')] = a.data;
    zipInput[DATASETS_PATH.replace(/^\//, '')] = strToU8(this.datasetsText());
    const zipped = zipSync(zipInput, { level: 6 });
    const blob = new Blob([zipped as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const fileName = `${this.projectState.projectName() || 'pug-project'}.zip`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.terminalState.addEntry('success', 'Export', `Exported ${files.size + this.assetState.assets().size} file(s) as ${fileName}.`);
  }

  async importFromDirectory(): Promise<void> {
    if (!this.supportsFileSystemAccess) return;
    try {
      const dirHandle: any = await (window as any).showDirectoryPicker({ mode: 'read' });
      const files = new Map<string, string>();
      const assets: AssetFile[] = [];
      await this.readDirectoryRecursive(dirHandle, '', files, assets);
      this.finishImport(files, dirHandle.name, assets);
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
      this.terminalState.addEntry('error', 'Import', `Import failed: ${(err as Error).message ?? err}`);
    }
  }

  private async readDirectoryRecursive(dir: any, prefix: string, out: Map<string, string>, assets: AssetFile[]): Promise<void> {
    for await (const [name, handle] of dir.entries()) {
      const path = `${prefix}/${name}`;
      if (handle.kind === 'directory') {
        await this.readDirectoryRecursive(handle, path, out, assets);
      } else if (TEXT_FILE_RE.test(name)) {
        const file = await handle.getFile();
        out.set(path, await file.text());
      } else if (ASSET_EXT_RE.test(name)) {
        const file = await handle.getFile();
        assets.push({ path, mime: mimeForPath(path), data: new Uint8Array(await file.arrayBuffer()) });
      }
    }
  }

  async importFromZipFile(file: File): Promise<void> {
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const unzipped = unzipSync(buf);
      const files = new Map<string, string>();
      const assets: AssetFile[] = [];
      for (const [name, data] of Object.entries(unzipped)) {
        if (name.endsWith('/')) continue;
        if (TEXT_FILE_RE.test(name)) files.set('/' + name, strFromU8(data));
        else if (ASSET_EXT_RE.test(name)) assets.push({ path: '/' + name, mime: mimeForPath(name), data });
      }
      this.finishImport(files, file.name.replace(/\.zip$/i, ''), assets);
    } catch (err) {
      this.terminalState.addEntry('error', 'Import', `Could not read zip file: ${(err as Error).message ?? err}`);
    }
  }

  private finishImport(files: Map<string, string>, projectName: string, assets: AssetFile[] = []): void {
    const datasetsText = files.get(DATASETS_PATH);
    files.delete(DATASETS_PATH);
    const datasets = datasetsText === undefined ? null : parseDatasetsFile(datasetsText);
    if (datasetsText !== undefined && !datasets) {
      this.terminalState.addEntry('warning', 'Import', `${DATASETS_PATH} no es válido: se ignoran los juegos de datos.`);
    }
    if (files.size === 0) {
      this.terminalState.addEntry('warning', 'Import', 'No supported files found to import.');
      return;
    }
    this.orchestrator.loadProject(files, projectName || 'Imported Project', assets, datasets);
  }

  /**
   * Enlace compartible del proyecto (archivos de texto + datos, comprimidos en el hash de la URL).
   * Los assets binarios (imágenes y fuentes) no se incluyen.
   */
  buildShareLink(base: string): { url: string; length: number; tooLong: boolean } {
    const files = new Map(this.editorState.allFileContents());
    const active = this.editorState.activeTab()?.path;
    if (active && files.has(active)) files.set(active, this.editorState.editorContent()); // lo que se está escribiendo
    const payload = encodeShare(this.projectState.projectName(), files, this.dataState.data());
    const url = buildShareUrl(base, payload);
    return { url, length: url.length, tooLong: url.length > SHARE_URL_WARN_LENGTH };
  }

  /** Decodifica un payload de enlace; en caso de error lo anota en el terminal y devuelve null. */
  parseShare(payload: string): SharePayload | null {
    try {
      return decodeShare(payload);
    } catch (err) {
      const msg = err instanceof ShareDecodeError ? err.message : 'No se pudo leer el enlace.';
      this.terminalState.addEntry('error', 'Compartir', `${msg} Se ignora el enlace.`);
      return null;
    }
  }

  loadShared(shared: SharePayload): void {
    this.orchestrator.loadProject(shared.files, shared.projectName, [], null, shared.data);
    this.terminalState.addEntry('info', 'Compartir', 'Proyecto cargado desde un enlace (sin imágenes ni fuentes).');
  }

  /** HTML renderizado autocontenido (sin inspector ni atributos data-pugide-*, assets locales como data URI). */
  buildStandaloneHtml(): string {
    const map = new Map<string, string>();
    for (const a of this.assetState.assets().values()) {
      const url = this.assetState.urlFor(a.path);
      if (url) map.set(url, bytesToDataUri(a.data, a.mime));
    }
    return buildStandaloneHtml(this.previewState.compiledHtml(), map);
  }

  exportHtml(): boolean {
    if (!this.previewState.compiledHtml()) {
      this.terminalState.addEntry('warning', 'Exportar HTML', 'No hay HTML renderizado que exportar.');
      return false;
    }
    const blob = new Blob([this.buildStandaloneHtml()], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const fileName = `${this.projectState.projectName() || 'pug-project'}.html`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.terminalState.addEntry('success', 'Exportar HTML', `HTML exportado como ${fileName}.`);
    return true;
  }
}
