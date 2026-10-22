import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePageRules, parseLength, parseContent, boxesForPage, renderContent, hasPageChrome } from './.build/units.mjs';

const css = (c) => `<html><head><style>${c}</style></head><body></body></html>`;
const MM = 96 / 25.4;
const near = (a, b) => Math.abs(a - b) < 0.01;

test('parseLength convierte unidades y rechaza lo no soportado', () => {
  assert.ok(near(parseLength('20mm'), 20 * MM));
  assert.equal(parseLength('1in'), 96);
  assert.equal(parseLength('0'), 0);
  assert.equal(parseLength('auto'), null);
  assert.equal(parseLength('10%'), null);
});

test('parseContent lee cadenas, contadores y none', () => {
  assert.deepEqual(parseContent('"Página " counter(page) " de " counter(pages)'), [
    { kind: 'text', value: 'Página ' }, { kind: 'page' }, { kind: 'text', value: ' de ' }, { kind: 'pages' },
  ]);
  assert.deepEqual(parseContent("'a\\\\b'"), [{ kind: 'text', value: 'a\\b' }]);
  assert.deepEqual(parseContent('"\\201C hola \\201D"'), [{ kind: 'text', value: '“hola ”' }]);
  assert.equal(parseContent('none'), null);
  assert.deepEqual(parseContent('counter(page, upper-roman)'), [{ kind: 'page' }]);
});

test('sin @page no hay márgenes ni cajas', () => {
  const r = parsePageRules(css('p { color: red }'));
  assert.equal(hasPageChrome(r), false);
});

test('márgenes: shorthand de 1, 2 y 4 valores y propiedades sueltas', () => {
  assert.ok(near(parsePageRules(css('@page { margin: 10mm }')).margin.left, 10 * MM));
  const two = parsePageRules(css('@page { margin: 20mm 10mm }')).margin;
  assert.ok(near(two.top, 20 * MM) && near(two.bottom, 20 * MM) && near(two.left, 10 * MM) && near(two.right, 10 * MM));
  const four = parsePageRules(css('@page { margin: 1in 2in 3in 4in }')).margin;
  assert.deepEqual([four.top, four.right, four.bottom, four.left], [96, 192, 288, 384]);
  const sep = parsePageRules(css('@page { margin: 0; margin-bottom: 15mm }')).margin;
  assert.ok(sep.top === 0 && near(sep.bottom, 15 * MM));
});

test('cajas de margen con contenido, estilo y comentarios', () => {
  const r = parsePageRules(css(`
    /* cabecera */
    @page { size: A4; margin: 20mm; font-size: 9pt; color: #555;
      @top-center { content: "Informe"; font-weight: bold; background: url(x.png); }
      @bottom-right { content: "Página " counter(page) " de " counter(pages); }
    }`));
  assert.deepEqual(Object.keys(r.boxes).sort(), ['bottom-right', 'top-center']);
  assert.deepEqual(r.boxes['top-center'].style, { 'font-weight': 'bold' }); // url() descartado
  assert.equal(r.baseStyle['font-size'], '9pt');
  const page1 = boxesForPage(r, 0);
  assert.equal(renderContent(page1['bottom-right'].content, 2, 5), 'Página 2 de 5');
  assert.ok(hasPageChrome(r));
});

test('@page :first puede ocultar o cambiar cajas solo en la primera página', () => {
  const r = parsePageRules(css(`
    @page { margin: 15mm; @top-center { content: "Cabecera" } @bottom-center { content: counter(page) } }
    @page :first { @top-center { content: none } @bottom-center { color: red } }`));
  assert.equal(boxesForPage(r, 0)['top-center'], undefined);
  assert.equal(boxesForPage(r, 1)['top-center'].content[0].value, 'Cabecera');
  assert.equal(boxesForPage(r, 0)['bottom-center'].style.color, 'red');
  assert.equal(boxesForPage(r, 1)['bottom-center'].style.color, undefined);
});

test('lee @page dentro de @media print y varias hojas', () => {
  const html = `<style>@media print { @page { margin: 12mm; @top-left { content: "A" } } }</style><style>p{}</style>`;
  const r = parsePageRules(html);
  assert.ok(near(r.margin.top, 12 * MM));
  assert.equal(boxesForPage(r, 3)['top-left'].content[0].value, 'A');
});

test('CSS roto o sin cerrar no lanza', () => {
  assert.doesNotThrow(() => parsePageRules(css('@page { margin: 10mm; @top-center { content: "x"')));
  assert.doesNotThrow(() => parsePageRules('<style>@page {</style>'));
  assert.equal(parsePageRules(css('@page :blank { margin: 50mm }')).margin.top, 0);
});
