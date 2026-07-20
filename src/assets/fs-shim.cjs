// Browser shim for fs module — delegates to globalThis.__pugFs for virtual file system
var pugFs = globalThis.__pugFs;
module.exports = {
  readFileSync: function (path, options) {
    if (pugFs && pugFs.readFileSync) return pugFs.readFileSync(path, options);
    if (globalThis.__pugReadFile) return globalThis.__pugReadFile(path, options);
    return '';
  },
  readSync: function () { return 0; },
  existsSync: function (path) {
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
