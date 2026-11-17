'use strict';
// Preload (con `sandbox` y `contextIsolation`): solo expone datos de solo lectura. Sin Node en la página.
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--pugide-${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 10)) : '';
};

// Canales permitidos: espacios de trabajo (solo dentro de las carpetas que la persona eligió) y aviso de versión nueva.
const CHANNELS = new Set(['ws:list', 'ws:pick-folder', 'ws:create', 'ws:relocate', 'ws:update', 'ws:remove', 'ws:open', 'ws:read-paths', 'ws:write', 'ws:close', 'ws:reveal',
  'upd:state', 'upd:answer', 'upd:check', 'upd:dismiss', 'upd:download',
  // Actualizar dentro de la app (P-35/P-36): descargar, cancelar, instalar, abrir la release, ya visto «se ha actualizado».
  'upd:update', 'upd:cancel', 'upd:install', 'upd:open-release', 'upd:ack-updated',
  // Asistente de IA (solo escritorio y local): detectar las CLI, lanzar una petición y detenerla.
  'ai:detect', 'ai:run', 'ai:cancel',
  // Exportar PDF con el motor nativo (P-39): generar y guardar, cancelar, abrir o mostrar el PDF recién guardado.
  'pdf:export', 'pdf:cancel', 'pdf:open', 'pdf:reveal',
  // Varios PDF (P-42): destino del lote, nombres que ya existen, cada PDF y cierre.
  'pdf:batch-target', 'pdf:batch-existing', 'pdf:batch-item', 'pdf:batch-finish',
  // Abrir con PugIDE (P-40): lo que llega del sistema, una carpeta soltada en la ventana y leer la plantilla abierta.
  'open:pending', 'open:path', 'open:read-file',
  // Pasar un proyecto de «Mis proyectos» a una carpeta (P-41): comprobar la carpeta elegida antes de escribir.
  'ws:folder-check']);

contextBridge.exposeInMainWorld('pugideDesktop', Object.freeze({
  platform: process.platform,
  version: arg('version'),
  webUrl: arg('web-url'),
  /** Ruta en disco de un archivo o carpeta que la persona ha soltado en la ventana (P-40); null si no tiene. */
  pathForFile: (file) => { try { return webUtils.getPathForFile(file) || null; } catch { return null; } },
  invoke: (channel, payload) => (CHANNELS.has(channel) ? ipcRenderer.invoke(channel, payload) : Promise.reject(new Error('Canal no permitido'))),
  /** Avisos del sistema (un archivo cambió en disco, hay versión nueva, un menú pide abrir un diálogo). Devuelve cómo dejar de escuchar. */
  onEvent: (callback) => {
    const listener = (_event, payload) => { try { callback(payload); } catch { /* el fallo de quien escucha no es nuestro */ } };
    ipcRenderer.on('pugide:event', listener);
    return () => ipcRenderer.removeListener('pugide:event', listener);
  },
}));
