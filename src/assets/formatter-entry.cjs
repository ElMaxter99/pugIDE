try {
  var prettier = require('prettier/standalone');
  var pugPlugin = require('@prettier/plugin-pug');
  var postcssPlugin = require('prettier/plugins/postcss');
  var babelPlugin = require('prettier/plugins/babel');
  var estreePlugin = require('prettier/plugins/estree');
  self.formatterBundle = {
    format: prettier.format,
    plugins: [pugPlugin.default || pugPlugin, postcssPlugin, babelPlugin, estreePlugin],
  };
} catch (e) {
  console.error('[FormatterBundle] Error loading formatter:', e);
  self.formatterBundle = {
    format: function () {
      return Promise.reject(new Error('Formatter bundle failed to initialize: ' + e.message));
    },
  };
}
