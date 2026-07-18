// Entry point for bundling pug for browser use
// This file is processed by esbuild to create a browser-compatible pug bundle

// The polyfills banner is injected by esbuild before this code
// So process, assert, Buffer, require are available from the banner

const pug = require('pug');
module.exports = pug;
