#!/usr/bin/env node
// Bundle pug + pug-lexer + pug-parser + prettier/plugin-pug for browser use
// with Node.js polyfills.
//
// This is NOT part of `npm run build` / `ng build` — it only needs to be
// re-run manually (`npm run bundle:pug`) whenever the pug/pug-lexer/pug-parser/
// prettier versions in package.json change, since the output
// (src/assets/pug-browser.js, src/assets/parser-browser.js,
// src/assets/formatter-browser.js) is checked into git and nothing else
// regenerates or verifies it against package.json.
//
// The formatter bundle needs one extra alias: `node:util` (the `node:`-
// prefixed form isn't resolved to the real npm `util` polyfill package the
// way the bare `util` specifier already is, so it's pointed at the same
// package explicitly). Angular's own esbuild-based app builder has no
// equivalent alias hook (tsconfig `paths` only affects first-party source,
// not third-party bundling), which is exactly the problem this
// standalone-bundle pattern already solves for the pug compiler.
//
// Uses esbuild's JS API rather than shelling out to the CLI: the polyfill
// banner is derived dynamically from src/polyfills.ts (see below) and passing
// that multi-line, quote-containing string through a shell command line is
// fragile across platforms (it silently truncated the build on Windows).

import { build, transformSync } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The banner polyfill (process/assert/Buffer/require shims) is derived from
// src/polyfills.ts — the same file Angular loads at app boot — via esbuild's
// TS-stripping transform, so there is exactly one hand-maintained copy of
// this logic instead of two that can silently drift apart.
const polyfillsSource = readFileSync(path.join(rootDir, 'src/polyfills.ts'), 'utf8');
const banner = transformSync(polyfillsSource, { loader: 'ts' }).code;

const shared = {
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  banner: { js: banner },
  alias: {
    path: 'path-browserify',
    fs: path.join(rootDir, 'src/assets/fs-shim.cjs'),
    os: path.join(rootDir, 'src/assets/os-shim.cjs'),
  },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
};

console.log('Building pug compiler bundle...');
await build({
  ...shared,
  entryPoints: [path.join(rootDir, 'src/assets/pug-entry.cjs')],
  outfile: path.join(rootDir, 'src/assets/pug-browser.js'),
});

console.log('\nBuilding pug lexer+parser bundle...');
await build({
  ...shared,
  entryPoints: [path.join(rootDir, 'src/assets/parser-entry.cjs')],
  outfile: path.join(rootDir, 'src/assets/parser-browser.js'),
});

console.log('\nBuilding formatter (prettier + plugin-pug) bundle...');
await build({
  ...shared,
  alias: {
    ...shared.alias,
    'node:util': 'util',
  },
  entryPoints: [path.join(rootDir, 'src/assets/formatter-entry.cjs')],
  outfile: path.join(rootDir, 'src/assets/formatter-browser.js'),
});

console.log('\nDone!');
