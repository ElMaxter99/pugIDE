#!/usr/bin/env node
// Empaqueta los dos programas que corren dentro de iframes aislados (sin acceso al almacenamiento de la app):
//
//   src/app/core/render/sandbox-entry.ts  ->  src/assets/render-sandbox.js   (render de Pug)
//   src/app/core/render/preview-entry.ts  ->  src/assets/preview-runtime.js  (paginación, medidas e impresión del preview)
//                                          ->  src/assets/preview-frame.html   (documento del iframe del preview, con ese programa inline)
//
//   npm run bundle:runtime           regenera los dos archivos (se versionan, como pug-browser.js)
//   node scripts/bundle-runtime.mjs --check   falla si los archivos no corresponden a los fuentes (lo ejecuta `prebuild`)
//
// La cabecera de cada archivo lleva el hash de los fuentes de los que sale.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const TARGETS = [
  { entry: 'src/app/core/render/sandbox-entry.ts', out: 'src/assets/render-sandbox.js' },
  { entry: 'src/app/core/render/preview-entry.ts', out: 'src/assets/preview-runtime.js' },
];
const MARK = '// pugide-runtime source-hash: ';

async function compile({ entry }) {
  const r = await build({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    write: false,
    metafile: true,
    logLevel: 'silent',
  });
  const hash = createHash('sha256');
  for (const input of Object.keys(r.metafile.inputs).sort()) {
    hash.update(input).update('\0').update(readFileSync(path.join(root, input)));
  }
  const digest = hash.digest('hex').slice(0, 16);
  const code = r.outputFiles[0].text;
  // `</script` rompería la inyección inline del preview.
  if (/<\/script|<script|<!--/i.test(code)) throw new Error(`${entry}: el resultado contiene "</script", "<script" o "<!--"; no se puede inyectar inline.`);
  return { digest, text: `${MARK}${digest}\n${code}` };
}

/**
 * Documento del iframe del preview: lleva el programa INLINE. Su documento es de origen opaco (cabecera `sandbox`), así que
 * el service worker no sirve sus subrecursos y un `<script src>` no cargaría sin conexión; su CSP ya admite `unsafe-inline`
 * (el JavaScript de la plantilla). Ver docs/ARCHITECTURE.md, «Seguridad: CSP y cabeceras».
 */
function previewFrameHtml(runtime) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Vista previa</title>
</head>
<body>
<!-- Generado por scripts/bundle-runtime.mjs (no editar): documento propio del preview, con su Content-Security-Policy por cabecera (vercel.json). -->
<script>
${runtime}</script>
</body>
</html>
`;
}

const FRAME = 'src/assets/preview-frame.html';
let stale = false;
for (const target of TARGETS) {
  const built = await compile(target);
  if (target.out.endsWith('preview-runtime.js')) {
    const frameFile = path.join(root, FRAME);
    const html = previewFrameHtml(built.text);
    if (check) {
      const ok = existsSync(frameFile) && readFileSync(frameFile, 'utf8') === html;
      console.log(`  ${ok ? '✓' : '✗'} ${FRAME} ${ok ? 'está al día' : 'desactualizado: ejecuta "npm run bundle:runtime"'}`);
      if (!ok) stale = true;
    } else {
      writeFileSync(frameFile, html);
      console.log(`  ${FRAME} (${(html.length / 1024).toFixed(1)} KB)`);
    }
  }
  const file = path.join(root, target.out);
  if (check) {
    const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
    const have = current.startsWith(MARK) ? current.slice(MARK.length, current.indexOf('\n')) : null;
    const ok = have === built.digest;
    console.log(`  ${ok ? '✓' : '✗'} ${target.out} ${ok ? 'está al día' : `desactualizado (fuentes ${built.digest}, archivo ${have ?? 'sin hash'}): ejecuta "npm run bundle:runtime"`}`);
    if (!ok) stale = true;
  } else {
    writeFileSync(file, built.text);
    console.log(`  ${target.out} (${(built.text.length / 1024).toFixed(1)} KB, fuentes ${built.digest})`);
  }
}
if (stale) process.exit(1);
