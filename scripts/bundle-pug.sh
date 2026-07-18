#!/bin/bash
# Bundle pug + pug-lexer + pug-parser for browser use with Node.js polyfills
set -e
cd "$(dirname "$0")/.."

POLYFILL='
if(typeof process==="undefined"){var process={env:{},version:"",versions:{node:"0.0.0"},platform:"browser",nextTick:function(fn){setTimeout(fn,0)},cwd:function(){return"/"},argv:[],stdout:{write:function(){}},stderr:{write:function(){}}};globalThis.process=process;}
if(typeof assert==="undefined"){var assert=function(v,m){if(!v)throw new Error(m||"Assertion failed")};assert.ok=assert;assert.strictEqual=function(a,b,m){if(a!==b)throw new Error(m||"Expected "+a+" === "+b)};assert.notStrictEqual=function(a,b,m){if(a===b)throw new Error(m||"Expected "+a+" !== "+b)};assert.deepStrictEqual=function(a,b,m){if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(m||"Deep strict equal failed")};assert.throws=function(fn,m){try{fn();throw new Error(m||"Expected error")}catch(e){if(e.message===(m||"Expected error"))throw e}};assert.ifError=function(v){if(v)throw v};globalThis.assert=assert;}
if(typeof Buffer==="undefined"){var Buffer={from:function(d,e){return typeof d==="string"?new TextEncoder().encode(d):new Uint8Array(d)},isBuffer:function(){return false},alloc:function(n){return new Uint8Array(n)}};globalThis.Buffer=Buffer;}
'

ALIAS_ARGS="--alias:path=path-browserify --alias:fs=./src/assets/fs-shim.cjs --alias:os=./src/assets/os-shim.cjs"
EXTRA="--define:process.env.NODE_ENV=\"production\" --platform=browser --target=es2020"

echo "Building pug compiler bundle..."
npx esbuild src/assets/pug-entry.cjs \
  --bundle \
  --format=iife \
  --outfile=src/assets/pug-browser.js \
  --banner:js="$POLYFILL" \
  $ALIAS_ARGS $EXTRA \
  --log-level=info 2>&1

echo ""
echo "Building pug lexer+parser bundle..."
npx esbuild src/assets/parser-entry.cjs \
  --bundle \
  --format=iife \
  --outfile=src/assets/parser-browser.js \
  --banner:js="$POLYFILL" \
  $ALIAS_ARGS $EXTRA \
  --log-level=info 2>&1

echo ""
echo "Done!"
ls -lh src/assets/pug-browser.js src/assets/parser-browser.js
