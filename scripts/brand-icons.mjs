#!/usr/bin/env node
/**
 * Genera todos los iconos de la marca a partir de un solo dibujo (el de abajo): el SVG de la app, los favicons, los
 * iconos de la PWA, los de Apple/Android/Windows, la imagen para redes y el icono de la app de escritorio.
 *
 *   npm run brand:icons
 *
 * Logo «Mensajero» (mesa L-01 del lienzo, propuesta D): el pug trae la hoja en la boca. Colores: pelaje y máscara del
 * pug, y el morado de la app (`--accent-color`) en la hoja. Para cambiar el logo se cambia `symbol()` y se vuelve a lanzar.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUR = '#EBCBA4', FUR_DARK = '#D4AD82', MASK = '#4A3430', INK = '#1E1414', ACCENT = '#ddb7ff', ACCENT_DARK = '#8127cf', PAPER = '#ffffff';
const TILE = '#16111b';

const eye = (cx, cy, r = 6.5) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK}"/><circle cx="${cx + r * 0.3}" cy="${cy - r * 0.32}" r="${r * 0.3}" fill="#fff"/>`;

/** El dibujo, en una caja de 96×96. `simple`: sin arrugas ni renglones, para tamaños de 48 px o menos. */
export function symbol(simple = false) {
  return [
    `<path d="M14 26c-9-2-12 10-6 20 6-4 11-9 13-15z" fill="${MASK}"/><path d="M82 26c9-2 12 10 6 20-6-4-11-9-13-15z" fill="${MASK}"/>`,
    `<circle cx="48" cy="44" r="34" fill="${FUR}"/>`,
    simple ? '' : `<path d="M40 22h16M43 28h10" stroke="${FUR_DARK}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
    eye(33, 42, simple ? 7.5 : 6.5), eye(63, 42, simple ? 7.5 : 6.5),
    `<ellipse cx="48" cy="60" rx="18" ry="13" fill="${MASK}"/><ellipse cx="48" cy="53.5" rx="5.4" ry="3.7" fill="${INK}"/>`,
    `<g transform="rotate(-8 48 76)"><rect x="29" y="65" width="38" height="27" rx="4" fill="${PAPER}" stroke="${ACCENT}" stroke-width="1.6"/><path d="M57 65l10 10h-6a4 4 0 0 1-4-4z" fill="${ACCENT}"/>`,
    simple ? `<path d="M35 81.5h22" stroke="${ACCENT_DARK}" stroke-width="4" stroke-linecap="round" fill="none"/>` : `<path d="M35 76h16M35 81.5h26M35 87h20" stroke="${ACCENT_DARK}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
    `</g><path d="M32 63q16 9 32 0" fill="${MASK}"/>`,
  ].join('');
}

/** SVG cuadrado de `size` px: el dibujo ocupa `scale` del lado; `bg` pinta un fondo con esquinas de radio `radius` (0–0,5). */
export function logoSvg({ size = 96, scale = 1, bg = null, radius = 0, simple = false } = {}) {
  const pad = (96 * (1 - scale)) / 2;
  // El dibujo ocupa de y=10 a y=96 dentro de su caja: se sube 3 unidades para centrarlo.
  const inner = `<g transform="translate(${pad} ${pad - 3 * scale}) scale(${scale})">${symbol(simple)}</g>`;
  const back = bg ? `<rect width="96" height="96" rx="${96 * radius}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96" role="img" aria-label="PugIDE">${back}${inner}</svg>\n`;
}

const transparent = (size) => ({ size, scale: 0.98, simple: size <= 48 });
const tile = (size, radius = 0) => ({ size, scale: 0.76, bg: TILE, radius, simple: size <= 48 });

/** Archivo → cómo se dibuja. */
const targets = {
  ...Object.fromEntries([16, 32, 96].map((s) => [`src/assets/icons/favicon-${s}x${s}.png`, transparent(s)])),
  ...Object.fromEntries([36, 48, 72, 96, 144, 192].map((s) => [`src/assets/icons/android-icon-${s}x${s}.png`, transparent(s)])),
  // iOS y Windows pintan negro lo transparente: llevan el fondo de la app, a sangre.
  ...Object.fromEntries([57, 60, 72, 76, 114, 120, 144, 152, 180].map((s) => [`src/assets/icons/apple-icon-${s}x${s}.png`, tile(s)])),
  'src/assets/icons/apple-icon.png': tile(192),
  'src/assets/icons/apple-icon-precomposed.png': tile(192),
  ...Object.fromEntries([70, 144, 150, 310].map((s) => [`src/assets/icons/ms-icon-${s}x${s}.png`, tile(s)])),
  'src/assets/icons/pwa-192.png': tile(192, 0.22),
  'src/assets/icons/pwa-512.png': tile(512, 0.22),
  // Enmascarable: el sistema recorta hasta un círculo; el dibujo se queda en la zona segura (el 60 % central).
  'src/assets/icons/pwa-maskable-512.png': { size: 512, scale: 0.58, bg: TILE },
  'src/assets/icon-translucid.png': tile(1254, 0.22),
  'src/assets/icon-white.png': { size: 1254, scale: 0.76, bg: '#ffffff' },
  'desktop/build/icon.png': tile(512, 0.22),
};

/** Un .ico con varias imágenes PNG dentro (16, 32 y 48 px). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0); e.writeUInt8(size, 1);
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

async function main() {
  const { chromium } = createRequire(join(root, 'package.json'))('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const render = async (opts) => {
    await page.setViewportSize({ width: opts.size, height: opts.size });
    await page.setContent(`<body style="margin:0;background:transparent">${logoSvg(opts)}</body>`);
    return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: opts.size, height: opts.size } });
  };
  writeFileSync(join(root, 'src/assets/PugIDE.svg'), logoSvg({ size: 512, scale: 0.98 }));
  writeFileSync(join(root, 'docs/brand/logo.svg'), logoSvg({ size: 512, scale: 0.98 }));
  writeFileSync(join(root, 'docs/brand/logo-icono.svg'), logoSvg({ size: 512, scale: 0.76, bg: TILE, radius: 0.22 }));
  for (const [file, opts] of Object.entries(targets)) writeFileSync(join(root, file), await render(opts));
  const icoImages = [];
  for (const size of [16, 32, 48]) icoImages.push({ size, png: await render(transparent(size)) });
  writeFileSync(join(root, 'src/assets/icons/favicon.ico'), ico(icoImages));
  await browser.close();
  console.log(`${Object.keys(targets).length + 4} archivos de marca generados.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
