import { PersistenceService } from './persistence.service';
import { Injectable, inject } from '@angular/core';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { EditorState } from '../state/editor.state';
import { ProjectState } from '../state/project.state';
import { TerminalState } from '../state/terminal.state';
import { OrchestratorService } from './orchestrator.service';
import { AssetState, AssetFile } from '../state/asset.state';
import { ASSET_EXT_RE, TEXT_FILE_RE, mimeForPath } from '../utils/asset.util';
import { DataState } from '../state/data.state';
import { PreviewState } from '../state/preview.state';
import {
  SHARE_URL_WARN_LENGTH, SharePayload, ShareDecodeError, ShareExpiredError, ShareLink, ShareLinkOptions, buildShareUrl, decodeShare, encodeShare, encryptShare, encryptedFromHash, payloadFromHash, splitAssetsForShare,
} from '../utils/share.util';
import { formatShareDate } from '../utils/share-options.util';
import type { ShareOpenRequest } from '../state/ui.state';
import { captureHtmlToPng } from '../utils/capture.util';
import { collectDropped, DroppedFile, EntryLike, isZip } from '../utils/drop-import.util';
import { isStylePath } from '../utils/style-refs.util';
import { buildStandaloneHtml } from '../utils/export-html.util';
import { planZipImport } from '../utils/zip-import.util';
import { UiState } from '../state/ui.state';
import { EmailOptions, EmailResult, toEmailHtml } from '../utils/email-export.util';
import { looksLikeTranslations } from '../utils/locales.util';
import { DATASETS_PATH, parseDatasetsFile, serializeDatasets } from '../utils/datasets.util';


/**
 * Handles getting a project into and out of the browser: exports to a real
 * folder (File System Access API) or a .zip download, and imports from
 * either the same way. PugIDE otherwise only lives in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ProjectIoService {
  private persistence = inject(PersistenceService);
  private editorState = inject(EditorState);
  private projectState = inject(ProjectState);
  private terminalState = inject(TerminalState);
  private orchestrator = inject(OrchestratorService);
  private assetState = inject(AssetState);
  private dataState = inject(DataState);
  private previewState = inject(PreviewState);
  private ui = inject(UiState);

  get supportsFileSystemAccess(): boolean {
    return typeof (window as any).showDirectoryPicker === 'function';
  }

  async exportProject(): Promise<void> {
    const files = this.editorState.files();
    if (files.size === 0 && this.assetState.assets().size === 0) {
      this.terminalState.addEntry('warning', 'Exportar', 'No hay nada que exportar: el proyecto no tiene archivos.');
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
      this.terminalState.addEntry('error', 'Exportar', `No se pudo exportar: ${(err as Error).message ?? err}`);
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
    this.persistence.saveLastBackup();
    this.terminalState.addEntry('success', 'Exportar', `Exportado${files.size + this.assetState.assets().size === 1 ? '' : 's'} ${files.size + this.assetState.assets().size} archivo${files.size + this.assetState.assets().size === 1 ? '' : 's'} a la carpeta.`);
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

  /** Descarga siempre un .zip (aunque el navegador soporte carpetas): sirve para compartir el proyecto completo. */
  downloadZip(): void {
    const files = new Map(this.editorState.allFileContents());
    const active = this.editorState.activeTab()?.path;
    if (active && files.has(active)) files.set(active, this.editorState.editorContent());
    this.exportToZip(files);
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
    this.persistence.saveLastBackup();
    this.terminalState.addEntry('success', 'Exportar', `Exportados ${files.size + this.assetState.assets().size} archivo${files.size + this.assetState.assets().size === 1 ? '' : 's'} como ${fileName}.`);
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
      this.terminalState.addEntry('error', 'Importar', `No se pudo importar: ${(err as Error).message ?? err}`);
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

  /**
   * Lo que se suelta sobre el árbol de archivos. Una sola carpeta o un `.zip` se abren como proyecto nuevo (el actual se
   * guarda antes en «Mis proyectos»); varias cosas, o archivos sueltos, se añaden al proyecto actual sin sobrescribir.
   * `entries` y `loose` deben leerse del evento de forma síncrona: el navegador los invalida tras el primer `await`.
   */
  async importDropped(entries: EntryLike[], loose: File[]): Promise<void> {
    try {
      const dirs = entries.filter((e) => e.isDirectory);
      if (dirs.length === 1 && entries.length === 1) {
        const { files, assets, ignored } = await this.readDropped(await collectDropped(entries, { intoRoot: true }), true);
        if (ignored.length) this.terminalState.addEntry('info', 'Importar', `Sin importar (tipo no soportado): ${ignored.slice(0, 8).join(', ')}${ignored.length > 8 ? '…' : ''}`);
        this.finishImport(files, dirs[0].name, assets);
        if (files.size) this.terminalState.addEntry('info', 'Importar', 'El proyecto anterior está en «Mis proyectos».');
        return;
      }
      if (dirs.length === 0 && loose.length === 1 && isZip(loose[0].name)) {
        await this.importFromZipFile(loose[0]);
        return;
      }
      if (dirs.length) {
        const { files, assets } = await this.readDropped(await collectDropped(entries), true);
        this.orchestrator.addDroppedFiles(files, assets);
        return;
      }
      // Archivos sueltos: los de texto del proyecto (Pug, JSON, JS…) se añaden tal cual; hojas de estilo, imágenes y fuentes siguen su camino de siempre.
      const text = loose.filter((f) => TEXT_FILE_RE.test(f.name) && !isStylePath(f.name));
      const rest = loose.filter((f) => !text.includes(f));
      if (text.length) {
        const { files } = await this.readDropped(text.map((file) => ({ path: '/' + file.name.replace(/\s+/g, '-'), file })), false);
        // Un JSON que solo trae textos y se llama como un idioma (es-ES.json, translations.json…): se pregunta si es un idioma (P-14).
        const asLocale = [...files].filter(([path, content]) => looksLikeTranslations(path, content));
        if (asLocale.length) {
          for (const [path] of asLocale) files.delete(path);
          this.ui.localeImport.set({ source: 'drop', files: asLocale.map(([path, content]) => ({ name: path.slice(1), text: content })) });
        }
        if (files.size) this.orchestrator.addDroppedFiles(files, []);
      }
      if (rest.length) await this.orchestrator.addAssets(rest);
    } catch (err) {
      this.terminalState.addEntry('error', 'Importar', `No se pudo importar lo soltado: ${(err as Error).message ?? err}`);
    }
  }

  private async readDropped(list: DroppedFile[], includeStyles: boolean): Promise<{ files: Map<string, string>; assets: AssetFile[]; ignored: string[] }> {
    const files = new Map<string, string>();
    const assets: AssetFile[] = [];
    const ignored: string[] = [];
    for (const { path, file } of list) {
      if (TEXT_FILE_RE.test(path) && (includeStyles || !isStylePath(path))) files.set(path, await file.text());
      else if (ASSET_EXT_RE.test(path)) assets.push({ path, mime: mimeForPath(path), data: new Uint8Array(await file.arrayBuffer()) });
      else ignored.push(path);
    }
    return { files, assets, ignored };
  }

  async importFromZipFile(file: File): Promise<void> {
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const unzipped = unzipSync(buf);
      const files = new Map<string, string>();
      const assets: AssetFile[] = [];
      const plan = planZipImport(Object.keys(unzipped));
      const skipped: string[] = [];
      for (const { name, path } of plan.entries) {
        if (TEXT_FILE_RE.test(name)) files.set(path, strFromU8(unzipped[name]));
        else if (ASSET_EXT_RE.test(name)) assets.push({ path, mime: mimeForPath(name), data: unzipped[name] });
        else skipped.push(path);
      }
      if (plan.stripped) this.terminalState.addEntry('info', 'Importar', `Todo estaba dentro de la carpeta «${plan.stripped}»: se quita para que las rutas del proyecto (/partials/…) funcionen.`);
      if (skipped.length) this.terminalState.addEntry('info', 'Importar', `Sin importar (tipo no soportado): ${skipped.slice(0, 8).join(', ')}${skipped.length > 8 ? '…' : ''}`);
      if (plan.junk.length) this.terminalState.addEntry('info', 'Importar', `Ignorados ${plan.junk.length} archivos del sistema (__MACOSX, .DS_Store…).`);
      this.finishImport(files, file.name.replace(/\.zip$/i, ''), assets);
    } catch (err) {
      this.terminalState.addEntry('error', 'Importar', `No se pudo leer el .zip: ${(err as Error).message ?? err}`);
    }
  }

  private finishImport(files: Map<string, string>, projectName: string, assets: AssetFile[] = []): void {
    const datasetsText = files.get(DATASETS_PATH);
    files.delete(DATASETS_PATH);
    const datasets = datasetsText === undefined ? null : parseDatasetsFile(datasetsText);
    if (datasetsText !== undefined && !datasets) {
      this.terminalState.addEntry('warning', 'Importar', `${DATASETS_PATH} no es válido: se ignoran los juegos de datos.`);
    }
    if (files.size === 0) {
      this.terminalState.addEntry('warning', 'Importar', 'No hay archivos compatibles que importar.');
      return;
    }
    this.orchestrator.loadProject(files, projectName || 'Imported Project', assets, datasets);
  }

  /**
   * Enlace compartible del proyecto (archivos de texto + datos, comprimidos en el hash de la URL).
   * Los assets pequeños (hasta `SHARE_MAX_ASSET_BYTES` en total) viajan dentro; el resto se devuelve en `omitted`.
   * Sin opciones es el enlace de siempre; con `expiresAt`, `note`, `includeData` o `includeAssets` (P-15) cambia lo que lleva.
   */
  buildShareLink(base: string, opts: ShareLinkOptions = {}): ShareLink {
    return this.assembleShare(base, opts).link;
  }

  /** Como `buildShareLink`, y si hay `password` cifra el contenido (AES-GCM; el enlace pasa a `#e=`). */
  async buildShareLinkProtected(base: string, opts: ShareLinkOptions = {}): Promise<ShareLink> {
    const { link, payload } = this.assembleShare(base, opts);
    if (!opts.password) return link;
    const url = buildShareUrl(base, await encryptShare(payload, opts.password), true);
    return { ...link, url, length: url.length, tooLong: url.length > SHARE_URL_WARN_LENGTH, encrypted: true };
  }

  private assembleShare(base: string, opts: ShareLinkOptions): { link: ShareLink; payload: string } {
    const files = new Map(this.editorState.allFileContents());
    const active = this.editorState.activeTab()?.path;
    if (active && files.has(active)) files.set(active, this.editorState.editorContent()); // lo que se está escribiendo
    const { included, omitted } = opts.includeAssets === false ? { included: [], omitted: [] } : splitAssetsForShare(this.assetState.assets().values());
    const data = opts.includeData === false ? {} : this.dataState.data();
    const payload = encodeShare(this.projectState.projectName(), files, data, included, { expiresAt: opts.expiresAt, note: opts.note });
    const url = buildShareUrl(base, payload);
    return {
      payload,
      link: {
        url,
        length: url.length,
        tooLong: url.length > SHARE_URL_WARN_LENGTH,
        included: included.map((a) => a.path),
        omitted: omitted.map((a) => a.path),
        encrypted: false,
        expiresAt: opts.expiresAt,
      },
    };
  }

  /** Qué hay en el hash de la URL (P-16): un enlace con contraseña, uno abierto, uno que no se puede abrir o nada. */
  openRequestFromHash(hash: string, hasSession: boolean): ShareOpenRequest | null {
    const encrypted = encryptedFromHash(hash);
    if (encrypted !== null) return { encrypted, payload: null, hasSession, problem: null };
    const plain = payloadFromHash(hash);
    if (plain === null) return null;
    try {
      return { encrypted: null, payload: decodeShare(plain), hasSession, problem: null };
    } catch (err) {
      const problem = err instanceof ShareExpiredError
        ? `Este enlace caducó el ${formatShareDate(err.expiresAt)}. Pide uno nuevo a quien te lo envió.`
        : `${err instanceof ShareDecodeError ? err.message : 'No se pudo leer el enlace.'} Se ignora el enlace.`;
      this.terminalState.addEntry('error', 'Compartir', problem);
      return { encrypted: null, payload: null, hasSession, problem };
    }
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

  /** Abre un proyecto compartido: por defecto como proyecto nuevo (el actual se guarda antes en «Mis proyectos»). */
  loadShared(shared: SharePayload, mode: 'new' | 'replace' = 'new'): void {
    void this.orchestrator.openShared(shared, mode).then((name) => {
      const n = shared.assets.length;
      this.terminalState.addEntry(
        'info',
        'Compartir',
        `Proyecto «${name}» cargado desde un enlace ${mode === 'new' ? 'como proyecto nuevo' : 'en lugar del actual'} ` +
          (n > 0 ? `(${n} asset${n === 1 ? '' : 's'} incluido${n === 1 ? '' : 's'}).` : '(sin imágenes ni fuentes).'),
      );
    });
  }

  /** Quita el enlace compartido de la barra de direcciones. */
  clearShareHash(): void {
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch { /* ignore */ }
  }

  /** HTML renderizado autocontenido (sin inspector ni atributos data-pugide-*, assets locales como data URI). */
  buildStandaloneHtml(): string {
    return buildStandaloneHtml(this.previewState.compiledHtml(), this.assetState.blobToDataUri());
  }

  /**
   * HTML para correo (P-23) a partir de lo que se ve en la vista previa: CSS en línea, sin scripts y con avisos.
   * Sin incrustar las imágenes, sus URL pasan a ser la ruta del archivo en el proyecto (`images/logo.png`): hay que subirlas a un servidor.
   */
  buildEmailHtml(options: EmailOptions, embedImages: boolean): EmailResult | null {
    const compiled = this.previewState.compiledHtml();
    if (!compiled) return null;
    const urls = new Map<string, string>();
    if (embedImages) for (const [blob, uri] of this.assetState.blobToDataUri()) urls.set(blob, uri);
    else for (const a of this.assetState.assets().values()) { const url = this.assetState.urlFor(a.path); if (url) urls.set(url, a.path.replace(/^\//, '')); }
    const doc = new DOMParser().parseFromString(buildStandaloneHtml(compiled, urls), 'text/html');
    const result = toEmailHtml(doc, options, (d) => '<!doctype html>\n' + d.documentElement.outerHTML);
    const local = embedImages ? 0 : Array.from(doc.querySelectorAll('img')).filter((i) => !/^(https?:|data:|cid:)/i.test(i.getAttribute('src') ?? '')).length;
    if (local) result.warnings.push({ level: 'warning', title: `${local} ${local === 1 ? 'imagen local' : 'imágenes locales'} sin incrustar`, detail: 'Llevan la ruta del proyecto: súbelas a un servidor y pon su dirección https, o marca «Incrustar las imágenes locales».' });
    return result;
  }

  /** Descarga un texto como archivo. */
  downloadText(text: string, fileName: string, type = 'text/html;charset=utf-8'): void {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  /** Descarga una captura PNG (a doble resolución) del documento completo, con el ancho del dispositivo o de la hoja. */
  async exportPng(): Promise<boolean> {
    if (!this.previewState.compiledHtml()) {
      this.terminalState.addEntry('warning', 'Captura', 'No hay vista previa que capturar.');
      return false;
    }
    const pdf = this.previewState.isPdf();
    const width = pdf ? this.previewState.pageSize().width : this.previewState.deviceWidth();
    const viewportHeight = pdf ? this.previewState.pageSize().height : this.previewState.deviceHeight();
    try {
      const shot = await captureHtmlToPng(this.buildStandaloneHtml(), { width, viewportHeight, scale: 2 });
      const url = URL.createObjectURL(shot.blob);
      const device = pdf ? 'pdf' : this.previewState.deviceName().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const fileName = `${this.projectState.projectName() || 'pug-project'}-${device}.png`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const note = shot.scaleReduced ? ' (escala reducida: la página es muy larga)' : '';
      this.terminalState.addEntry('success', 'Captura', `${fileName}: ${shot.width}×${shot.height}px${note}.${pdf ? ' En modo PDF se captura el documento sin saltos de página.' : ''}`);
      return true;
    } catch (err) {
      this.terminalState.addEntry('error', 'Captura', `No se pudo generar la captura: ${(err as Error).message}`);
      return false;
    }
  }
}
