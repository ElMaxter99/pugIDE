// Browser shim for os module
module.exports = {
  platform: function () { return 'browser'; },
  arch: function () { return 'x64'; },
  type: function () { return 'Browser'; },
  release: function () { return ''; },
  hostname: function () { return 'localhost'; },
  tmpdir: function () { return '/tmp'; },
  EOL: '\n',
};
