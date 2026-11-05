// Texto de cada página de un PDF generado por Chromium (`page.pdf()`), sin dependencias externas ni `pdftotext`.
// Solo entiende lo que Skia emite: objetos sin comprimir (los streams con Flate), fuentes Type0 con `ToUnicode` y
// texto como cadenas hexadecimales de 2 bytes en `Tj` / `TJ`. Sirve para comparar dónde empieza cada página.
import { inflateSync } from 'node:zlib';

/** Objetos del PDF: número → { dict, data (stream descomprimido o null) }. */
function readObjects(buf) {
  const raw = buf.toString('latin1');
  const objects = new Map();
  const re = /(\d+) 0 obj\b/g;
  let m;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('endobj', start);
    if (end === -1) break;
    const body = raw.slice(start, end);
    const s = body.indexOf('stream');
    let dict = body;
    let data = null;
    if (s !== -1 && /^\s*<</.test(body)) {
      dict = body.slice(0, s);
      let from = s + 'stream'.length;
      if (body[from] === '\r') from++;
      if (body[from] === '\n') from++;
      const to = body.lastIndexOf('endstream');
      const bytes = Buffer.from(body.slice(from, to), 'latin1');
      try { data = /FlateDecode/.test(dict) ? inflateSync(bytes).toString('latin1') : bytes.toString('latin1'); } catch { data = ''; }
    }
    objects.set(Number(m[1]), { dict, data });
    re.lastIndex = end;
  }
  return objects;
}

/** CMap `ToUnicode`: código de glifo → texto. */
function readToUnicode(cmap) {
  const map = new Map();
  const u = (hex) => String.fromCharCode(...(hex.match(/.{4}/g) ?? []).map((h) => parseInt(h, 16)));
  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const [, from, to] of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) map.set(parseInt(from, 16), u(to));
  }
  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const [, a, b, c] of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const base = parseInt(c, 16);
      for (let g = parseInt(a, 16); g <= parseInt(b, 16); g++) map.set(g, String.fromCharCode(base + g - parseInt(a, 16)));
    }
  }
  return map;
}

/** Texto de cada página: una cadena por página, con una línea por cada operador de texto. */
export function pdfPageTexts(buf) {
  const objects = readObjects(buf);
  const refs = (s) => [...s.matchAll(/(\d+) 0 R/g)].map((x) => Number(x[1]));
  const pages = [...objects.entries()].filter(([, o]) => /\/Type\s*\/Page\b(?!s)/.test(o.dict));
  // Orden de las páginas: el de /Kids del árbol de páginas.
  const kids = [...objects.values()].filter((o) => /\/Type\s*\/Pages\b/.test(o.dict)).flatMap((o) => refs((o.dict.match(/\/Kids\s*\[([^\]]*)\]/) ?? [, ''])[1]));
  const ordered = kids.length ? kids.map((n) => [n, objects.get(n)]).filter(([, o]) => o && /\/Type\s*\/Page\b(?!s)/.test(o.dict)) : pages;
  const fontMaps = new Map();
  const fontMap = (n) => {
    if (!fontMaps.has(n)) {
      const f = objects.get(n);
      const tu = f && /\/ToUnicode\s+(\d+) 0 R/.exec(f.dict);
      fontMaps.set(n, tu ? readToUnicode(objects.get(Number(tu[1]))?.data ?? '') : new Map());
    }
    return fontMaps.get(n);
  };
  return ordered.map(([, page]) => {
    // Fuentes de la página: /Resources puede ser un diccionario en línea o una referencia.
    let res = page.dict;
    const rr = /\/Resources\s+(\d+) 0 R/.exec(page.dict);
    if (rr) res = objects.get(Number(rr[1]))?.dict ?? '';
    const fontDict = /\/Font\s*<<([^>]*)>>/.exec(res)?.[1] ?? (/\/Font\s+(\d+) 0 R/.exec(res) ? objects.get(Number(/\/Font\s+(\d+) 0 R/.exec(res)[1]))?.dict ?? '' : '');
    const fonts = new Map([...fontDict.matchAll(/\/([\w.+-]+)\s+(\d+) 0 R/g)].map((x) => [x[1], Number(x[2])]));
    const contents = refs((/\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/.exec(page.dict) ?? [, ''])[1]);
    let out = '';
    for (const c of contents) {
      const stream = objects.get(c)?.data ?? '';
      let cur = new Map();
      for (const t of stream.matchAll(/\/([\w.+-]+)\s+[\d.]+\s+Tf|\[((?:[^\]\\]|\\.)*)\]\s*TJ|<([0-9a-fA-F]*)>\s*Tj/g)) {
        if (t[1]) { cur = fontMap(fonts.get(t[1])); continue; }
        const hexes = t[2] !== undefined ? [...t[2].matchAll(/<([0-9a-fA-F]*)>/g)].map((x) => x[1]) : [t[3]];
        let line = '';
        for (const h of hexes) for (const g of h.match(/.{4}/g) ?? []) line += cur.get(parseInt(g, 16)) ?? '';
        out += `${line}\n`;
      }
    }
    return out;
  });
}
