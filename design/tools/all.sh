#!/bin/sh
# Regenera todo el lienzo versionado (requiere `npm run build:prod` antes):
# pantallas, tokens, componentes e índice. V-03 (diseño aún sin programar) no se regenera.
set -e
cd "$(dirname "$0")/../.."
node design/tools/build.mjs "$@"
node design/tools/tokens.mjs
node design/tools/components.mjs
node design/tools/layout.mjs
