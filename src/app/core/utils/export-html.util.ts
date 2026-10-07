import { INSPECTOR_SCRIPT } from './inspector-script.util';

/**
 * Convierte el HTML del preview en un documento autocontenido: quita el script del inspector y los
 * atributos `data-pugide-*` y sustituye las URLs `blob:` (assets locales) por data URIs.
 */
export function buildStandaloneHtml(compiledHtml: string, blobToDataUri: Map<string, string>): string {
  let out = compiledHtml.split(`<script>${INSPECTOR_SCRIPT}</script>`).join('');
  out = out.replace(/\sdata-pugide-[a-z-]+(?:="[^"]*")?/gi, '');
  for (const [blob, uri] of blobToDataUri) out = out.split(blob).join(uri);
  return out;
}

export function bytesToDataUri(data: Uint8Array, mime: string): string {
  let bin = '';
  for (let i = 0; i < data.length; i += 0x8000) bin += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(bin)}`;
}
