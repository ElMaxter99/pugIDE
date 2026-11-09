'use strict';
// Preload (con `sandbox` y `contextIsolation`): solo expone datos de solo lectura. Sin Node en la página.
const { contextBridge } = require('electron');

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--pugide-${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 10)) : '';
};

contextBridge.exposeInMainWorld('pugideDesktop', Object.freeze({
  platform: process.platform,
  version: arg('version'),
  webUrl: arg('web-url'),
}));
