// Browser shim for fs module
module.exports = {
  readFileSync: function () { return ''; },
  readSync: function () { return 0; },
  existsSync: function () { return false; },
  statSync: function () { return { isFile: function () { return false; }, isDirectory: function () { return false; } }; },
  readdirSync: function () { return []; },
  writeFileSync: function () {},
  openSync: function () { return 0; },
  closeSync: function () {},
  createReadStream: function () { return { on: function () { return this; }, pipe: function () {} }; },
  createWriteStream: function () { return { on: function () { return this; }, write: function () {} }; },
};
