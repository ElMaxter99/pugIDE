import { check, openApp, previewText, waitUntil } from '../lib.mjs';
import { readFileSync } from 'node:fs';

const readPng = (buf) => ({ signature: buf.subarray(0, 8).toString('hex'), width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) });

const session = {
  projectName: 'Captura',
  files: {
    '/main.pug': "doctype html\nhtml\n  head\n    style.\n      body { font-family: sans-serif; background: #fff4e0; } h1 { color: #b00020; } .box { background: #1a73e8; color: #fff; padding: 24px; margin: 16px 0; } @media (max-width: 500px) { .box { background: #0b8043; } }\n  body\n    h1 Hola captura\n    .box Caja azul\n    p Texto de ejemplo\n",
  },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};

const pngStats = (page, buf) => page.evaluate(async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(bmp, 0, 0);
  const col = ctx.getImageData(Math.round(bmp.width * 0.5), 0, 1, bmp.height).data;
  const seen = new Set();
  for (let i = 0; i < col.length; i += 4) seen.add(`${col[i]},${col[i + 1]},${col[i + 2]}`);
  return { width: bmp.width, height: bmp.height, corner: Array.from(ctx.getImageData(Math.round(bmp.width * 0.99), 2, 1, 1).data.slice(0, 3)), colors: [...seen] };
}, buf.toString('base64'));

async function runCommand(page, text, title) {
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type(text);
  // Enter solo cuando el comando buscado es el primer resultado (si no, ejecutaría otro)
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts())[0] === title);
  await page.keyboard.press('Enter');
  await waitUntil(async () => (await page.locator('[aria-label="Paleta de comandos"]').count()) === 0);
}

// Captura PNG del preview: tamaño correcto y contenido real (no un lienzo en blanco)
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await waitUntil(async () => (await previewText(page)).includes('Hola captura'));

  const download = page.waitForEvent('download', { timeout: 20000 });
  await page.locator('button[title="Descargar captura PNG de la vista previa"]').click();
  const file = await download;
  check('13 se descarga un .png con el nombre del proyecto y el dispositivo', file.suggestedFilename() === 'Captura-desktop.png', file.suggestedFilename());
  const buf = readFileSync(await file.path());
  const png = readPng(buf);
  check('13 es un PNG válido', png.signature === '89504e470d0a1a0a', png.signature);
  check('13 mide el ancho del dispositivo a doble resolución (1440 × 2)', png.width === 2880, String(png.width));
  const st = await pngStats(page, buf);
  check('13 el fondo de la página sale en la imagen (#fff4e0)', st.corner.join() === '255,244,224', JSON.stringify(st));
  check('13 y también los colores de los elementos (caja azul #1a73e8)', st.colors.includes('26,115,232'), JSON.stringify(st));
  check('13 la página corta ocupa al menos el alto del dispositivo (900 × 2)', st.height === 1800, String(st.height));

  // En móvil se aplican las media queries del dispositivo (caja verde) y el ancho es 390 × 2
  await runCommand(page, 'Móvil', 'Cambiar dispositivo: Móvil (390×844)');
  await waitUntil(async () => (await page.locator('select.device-select').inputValue()) === 'Mobile');
  const second = page.waitForEvent('download', { timeout: 20000 });
  await runCommand(page, 'captura PNG', 'Exportar captura PNG del preview');
  const f2 = await second;
  const buf2 = readFileSync(await f2.path());
  const st2 = await pngStats(page, buf2);
  check('13 desde la paleta y en móvil mide 390 × 2', f2.suggestedFilename() === 'Captura-mobile.png' && st2.width === 780, `${f2.suggestedFilename()} ${st2.width}`);
  check('13 la media query del móvil se aplica en la captura (caja verde)', st2.colors.includes('11,128,67') && !st2.colors.includes('26,115,232'), JSON.stringify(st2));
  check('13 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();

  // Una página muy larga baja la escala en vez de fallar
  const demo = await openApp(env, { path: '/ide?demo=true' });
  await waitUntil(async () => (await previewText(demo.page)).includes('Demo Completo'));
  const d = demo.page.waitForEvent('download', { timeout: 30000 });
  await demo.page.locator('button[title="Descargar captura PNG de la vista previa"]').click();
  const big = readPng(readFileSync(await (await d).path()));
  check('13 una página larga no pasa el límite del canvas (16384 px)', big.height <= 16384 && big.width <= 16384 && big.height > 1800, JSON.stringify(big));
  await demo.close();
}
