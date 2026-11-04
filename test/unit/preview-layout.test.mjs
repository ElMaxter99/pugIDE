import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageCountFor, fitScale, buildPageChrome, describePageIssue, pageIssuesKey, a11yReport, parsePageRules } from './.build/units.mjs';

test('pageCountFor: páginas enteras, mínimo una', () => {
  assert.equal(pageCountFor(0, 1000), 1);
  assert.equal(pageCountFor(1000, 1000), 1);
  assert.equal(pageCountFor(1001, 1000), 2);
  assert.equal(pageCountFor(2500, 1000), 3);
});

test('fitScale: porcentaje fijo, ajuste al lienzo y PDF solo a lo ancho', () => {
  const frame = { width: 1000, height: 500 };
  assert.equal(fitScale(50, { width: 0, height: 0 }, frame, false), 0.5);
  assert.equal(fitScale('fit', { width: 0, height: 0 }, frame, false), 1);
  assert.equal(fitScale('fit', { width: 2000, height: 2000 }, frame, false), 1); // nunca amplía
  assert.equal(fitScale('fit', { width: 564, height: 2000 }, frame, false), 0.5);
  assert.equal(fitScale('fit', { width: 2000, height: 314 }, frame, false), 0.5); // limita el alto
  assert.equal(fitScale('fit', { width: 564, height: 100 }, { width: 1000, height: 5000 }, true), 0.5); // PDF: ignora el alto
});

test('buildPageChrome posiciona cabeceras y pies en cada hoja', () => {
  const html = '<style>@page { size: 200px 300px; margin: 20px 10px; @top-center { content: "Hola"; } @bottom-right { content: "Pág. " counter(page) " de " counter(pages); } }</style>';
  const rules = parsePageRules(html);
  const items = buildPageChrome(rules, { width: 200, height: 300 }, 2);
  assert.deepEqual(items.map((i) => i.id), ['0-top-center', '0-bottom-right', '1-top-center', '1-bottom-right']);
  const top1 = items.find((i) => i.id === '1-top-center');
  assert.equal(top1.text, 'Hola');
  assert.equal(top1.style.top, '300px');
  assert.equal(top1.style.height, '20px');
  const bottom0 = items.find((i) => i.id === '0-bottom-right');
  assert.equal(bottom0.text, 'Pág. 1 de 2');
  assert.equal(bottom0.style.top, '280px');
  assert.equal(bottom0.style['justify-content'], 'flex-end');
  assert.deepEqual(buildPageChrome(parsePageRules('<p>x</p>'), { width: 200, height: 300 }, 2), []);
});

test('avisos de PDF: texto y clave estable', () => {
  const cut = { kind: 'cut', page: 2, element: 'img', text: '' };
  const orphan = { kind: 'orphan', page: 3, element: 'h2', text: 'Título' };
  assert.match(describePageIssue(cut), /Página 2: <img> se corta entre páginas\. Prueba con la regla CSS `img \{ break-inside: avoid; \}`/);
  assert.match(describePageIssue({ ...cut, selector: 'img.logo' }), /`img\.logo \{ break-inside: avoid; \}`/);
  assert.match(describePageIssue(orphan), /Página 3: <h2> «Título» queda al final.*`h2 \{ break-after: avoid; \}`/);
  assert.equal(pageIssuesKey([cut, orphan]), 'cut:2:img:|orphan:3:h2:Título');
});

test('a11yReport: sin problemas, con ubicación en Pug y con línea de HTML', () => {
  assert.equal(a11yReport([], () => null)[0].type, 'success');
  const issues = [
    { rule: 'img-alt', message: 'Falta alt', element: 'img', severity: 'error', sig: 1 },
    { rule: 'contrast', message: 'Poco contraste', element: 'p', severity: 'warning', htmlLine: 7, sig: 2 },
  ];
  const lines = a11yReport(issues, (sig) => (sig === 1 ? { path: '/main.pug', line: 4, approximate: true } : null));
  assert.deepEqual(lines.map((l) => l.type), ['info', 'error', 'warning']);
  assert.equal(lines[1].message, '[img-alt] Falta alt <img> (/main.pug:4 ~)');
  assert.equal(lines[2].message, '[contrast] Poco contraste <p> (HTML linea 7)');
});

import { pinBaseUrl } from './.build/units.mjs';

test('pinBaseUrl fija la base del documento sin tocar el resto', () => {
  const base = '<base href="about:srcdoc">';
  assert.equal(pinBaseUrl('<!DOCTYPE html><html><head><title>x</title></head><body></body></html>'),
    `<!DOCTYPE html><html><head>${base}<title>x</title></head><body></body></html>`);
  assert.equal(pinBaseUrl('<html lang="es"><body>x</body></html>'), `<html lang="es"><head>${base}</head><body>x</body></html>`);
  assert.equal(pinBaseUrl('<p>fragmento</p>'), `${base}<p>fragmento</p>`);
  assert.equal(pinBaseUrl('<!doctype html><p>x</p>'), `<!doctype html>${base}<p>x</p>`);
  // <header> no es <head>
  assert.equal(pinBaseUrl('<header>h</header>'), `${base}<header>h</header>`);
  // si la plantilla ya tiene su <base>, se respeta
  const own = '<html><head><base href="https://ejemplo.com/"></head></html>';
  assert.equal(pinBaseUrl(own), own);
});
