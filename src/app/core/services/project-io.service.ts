import { Injectable, inject } from '@angular/core';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { EditorState } from '../state/editor.state';
import { ProjectState } from '../state/project.state';
import { TerminalState } from '../state/terminal.state';
import { OrchestratorService } from './orchestrator.service';

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

  get supportsFileSystemAccess(): boolean {
    return typeof (window as any).showDirectoryPicker === 'function';
  }

  async exportProject(): Promise<void> {
    const files = this.editorState.files();
    if (files.size === 0) {
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
    this.terminalState.addEntry('success', 'Export', `Exported ${files.size} file(s) to disk.`);
  }

  private async writeFileToDirectory(root: any, path: string, content: string): Promise<void> {
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
    this.terminalState.addEntry('success', 'Export', `Exported ${files.size} file(s) as ${fileName}.`);
  }

  async importFromDirectory(): Promise<void> {
    if (!this.supportsFileSystemAccess) return;
    try {
      const dirHandle: any = await (window as any).showDirectoryPicker({ mode: 'read' });
      const files = new Map<string, string>();
      await this.readDirectoryRecursive(dirHandle, '', files);
      this.finishImport(files, dirHandle.name);
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
      this.terminalState.addEntry('error', 'Import', `Import failed: ${(err as Error).message ?? err}`);
    }
  }

  private async readDirectoryRecursive(dir: any, prefix: string, out: Map<string, string>): Promise<void> {
    for await (const [name, handle] of dir.entries()) {
      const path = `${prefix}/${name}`;
      if (handle.kind === 'directory') {
        await this.readDirectoryRecursive(handle, path, out);
      } else if (TEXT_FILE_RE.test(name)) {
        const file = await handle.getFile();
        out.set(path, await file.text());
      }
    }
  }

  async importFromZipFile(file: File): Promise<void> {
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const unzipped = unzipSync(buf);
      const files = new Map<string, string>();
      for (const [name, data] of Object.entries(unzipped)) {
        if (name.endsWith('/') || !TEXT_FILE_RE.test(name)) continue;
        files.set('/' + name, strFromU8(data));
      }
      this.finishImport(files, file.name.replace(/\.zip$/i, ''));
    } catch (err) {
      this.terminalState.addEntry('error', 'Import', `Could not read zip file: ${(err as Error).message ?? err}`);
    }
  }

  private finishImport(files: Map<string, string>, projectName: string): void {
    if (files.size === 0) {
      this.terminalState.addEntry('warning', 'Import', 'No supported files found to import.');
      return;
    }
    this.orchestrator.loadProject(files, projectName || 'Imported Project');
  }
}
