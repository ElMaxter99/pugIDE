// Browser shim for fs module — delegates to globalThis.__pugFs for virtual file system.
// __pugFs is read fresh on every call (not captured once at module-init time), since it
// is wired up by the app *after* this module has already loaded and cached.
module.exports = {
  readFileSync: function (path, options) {
    var pugFs = globalThis.__pugFs;
    if (pugFs && pugFs.readFileSync) return pugFs.readFileSync(path, options);
    if (globalThis.__pugReadFile) return globalThis.__pugReadFile(path, options);
    return '';
  },
  readSync: function () { return 0; },
  existsSync: function (path) {
    var pugFs = globalThis.__pugFs;
    if (pugFs && pugFs.existsSync) return pugFs.existsSync(path);
    if (globalThis.__pugReadFile) return true;
    return false;
  },
  statSync: function () { return { isFile: function () { return true; }, isDirectory: function () { return false; } }; },
  readdirSync: function () { return []; },
  writeFileSync: function () {},
  openSync: function () { return 0; },
  closeSync: function () {},
  createReadStream: function () { return { on: function () { return this; }, pipe: function () {} }; },
  createWriteStream: function () { return { on: function () { return this; }, write: function () {} }; },
};
