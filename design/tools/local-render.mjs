// Verificación local de una mesa: la abre en Chromium con las mismas fuentes (las del build) en vez de Google Fonts
// y de /_blob, y devuelve el HTML temporal que se puede fotografiar y comparar con la app real.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const media = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/pug-ide/browser/media');
const find = (re) => join(media, readdirSync(media).find((f) => re.test(f)));

export function localHtml(file, out) {
  let s = readFileSync(file, 'utf8');
  const faces = `<style>
@font-face{font-family:'Geist';font-weight:100 900;src:url('file://${find(/^geist-latin-wght/)}') format('woff2')}
@font-face{font-family:'JetBrains Mono';font-weight:100 800;src:url('file://${find(/^jetbrains-mono-latin-wght/)}') format('woff2')}
</style>`;
  s = s.replace(/<link rel="preconnect"[^>]*>\n?/, '').replace(/<link href="https:\/\/fonts[^>]*>/, faces);
  s = s.replace(/url\(\/_blob\/[0-9a-f]+\)/, `url('file://${find(/^material-symbols/)}')`);
  writeFileSync(out, s);
  return out;
}
