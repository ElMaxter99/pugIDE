import { test } from 'node:test';
import assert from 'node:assert/strict';
import { straddlesPage, isOrphanHeading, selectorFor } from './.build/units.mjs';

const PAGE = 1000;

test('straddlesPage detecta bloques que cruzan el salto de página', () => {
  assert.equal(straddlesPage(100, 200, PAGE), false);
  assert.equal(straddlesPage(900, 200, PAGE), true);
  assert.equal(straddlesPage(1000, 200, PAGE), false); // empieza justo en el salto
  assert.equal(straddlesPage(800, 200, PAGE), false); // termina justo en el salto
  assert.equal(straddlesPage(500, 1200, PAGE), false); // más alto que una página: no se puede evitar
  assert.equal(straddlesPage(0, 0, PAGE), false);
  assert.equal(straddlesPage(10, 10, 0), false);
});

test('isOrphanHeading detecta encabezados pegados al final de la página', () => {
  assert.equal(isOrphanHeading(940, 40, PAGE), true);   // termina a 20px del final
  assert.equal(isOrphanHeading(100, 40, PAGE), false);
  assert.equal(isOrphanHeading(1940, 40, PAGE), true);  // segunda página
  assert.equal(isOrphanHeading(960, 40, PAGE), true);   // termina justo en el salto
  assert.equal(isOrphanHeading(960, 80, PAGE), false);  // cruza el salto: es otro caso (cut)
  assert.equal(isOrphanHeading(0, 40, 0), false);
});

import { pageGeometry, pushTarget, nextPageStart, pageTop, pageBottom, contentHeight } from './.build/units.mjs';

// Hoja de 1000 px con 100 px arriba y 80 px abajo: contenido de 100 a 920, 1100 a 2020…
const G = pageGeometry(1000, { top: 100, right: 50, bottom: 80, left: 50 });

test('geometría de página con márgenes', () => {
  assert.equal(pageTop(G, 0), 100);
  assert.equal(pageBottom(G, 0), 920);
  assert.equal(pageTop(G, 1), 1100);
  assert.equal(contentHeight(G), 820);
});

test('pushTarget baja los bloques que cruzan el final del contenido o empiezan en un margen', () => {
  assert.equal(pushTarget(G, 100, 200), null);
  assert.equal(pushTarget(G, 800, 120), null);        // acaba justo en 920
  assert.equal(pushTarget(G, 800, 130), 1100);        // cruza el margen inferior
  assert.equal(pushTarget(G, 930, 20), 1100);         // empieza dentro del margen inferior
  assert.equal(pushTarget(G, 1050, 20), 1100);        // empieza dentro del margen superior de la hoja 2
  assert.equal(pushTarget(G, 500, 900), null);        // más alto que el área de contenido
  assert.equal(pushTarget(G, 1900, 200), 2100);       // hoja 2 → hoja 3
});

test('nextPageStart: solo mueve lo que no está ya al principio del contenido', () => {
  assert.equal(nextPageStart(G, 100), null);
  assert.equal(nextPageStart(G, 400), 1100);
  assert.equal(nextPageStart(G, 1100), null);
  assert.equal(nextPageStart(G, 1150), 2100);
  assert.equal(nextPageStart(G, 1050), 1100);
  assert.equal(nextPageStart(pageGeometry(1000), 0), null);
  assert.equal(nextPageStart(pageGeometry(1000), 300), 1000);
});

test('con márgenes cero pushTarget coincide con el comportamiento anterior', () => {
  const g = pageGeometry(1000);
  assert.equal(pushTarget(g, 900, 200), 1000);
  assert.equal(pushTarget(g, 800, 200), null);
  assert.equal(pushTarget(g, 1000, 200), null);
});

test('isOrphanHeading respeta el margen inferior', () => {
  assert.equal(isOrphanHeading(850, 40, 1000, 40, 80), true);  // acaba a 890, el contenido llega a 920
  assert.equal(isOrphanHeading(700, 40, 1000, 40, 80), false);
});

test('selectorFor cita el elemento con su id, su primera clase o solo la etiqueta', () => {
  assert.equal(selectorFor({ tagName: 'IMG', id: 'logo', classList: ['a'] }), 'img#logo');
  assert.equal(selectorFor({ tagName: 'P', id: '', classList: ['1mal', 'nota'] }), 'p.nota');
  assert.equal(selectorFor({ tagName: 'H2', id: '', classList: [] }), 'h2');
  assert.equal(selectorFor({ tagName: 'DIV', id: 'a b', classList: [] }), 'div');
});

import { linesToKeep, planLineFragments } from './.build/units.mjs';

// Datos medidos con page.pdf() de Chromium 141 (Playwright): párrafo de 10 líneas, `k` caben en la hoja; resultado = líneas en la hoja 1.
test('linesToKeep: orphans y widows por defecto (2), como Chromium', () => {
  const kept = (k) => linesToKeep(10, k, 2, 2);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(kept), [0, 0, 2, 3, 4, 5, 6, 7, 8, 8, 10]);
});

test('linesToKeep: valores explícitos de orphans y widows', () => {
  const row = (o, w) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => linesToKeep(10, k, o, w));
  assert.deepEqual(row(1, 1), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(row(3, 3), [0, 0, 0, 3, 4, 5, 6, 7, 7, 7, 10]);
  assert.deepEqual(row(4, 4), [0, 0, 0, 0, 4, 5, 6, 6, 6, 6, 10]);
  assert.deepEqual(row(4, 1), [0, 0, 0, 0, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(row(1, 4), [0, 1, 2, 3, 4, 5, 6, 6, 6, 6, 10]);
});

test('linesToKeep: bloques de una o dos líneas y valores imposibles de cumplir a la vez', () => {
  assert.equal(linesToKeep(1, 0, 2, 2), 0); // una línea nunca se parte: o cabe o baja
  assert.equal(linesToKeep(1, 1, 2, 2), 1);
  assert.equal(linesToKeep(2, 1, 2, 2), 0); // 1+1 incumpliría las dos: baja entera
  assert.equal(linesToKeep(2, 1, 1, 1), 1); // con 1 y 1 sí se puede partir
  assert.equal(linesToKeep(3, 2, 2, 2), 2); // 2+1: se cumple orphans, las viudas se ignoran
  assert.equal(linesToKeep(3, 2, 3, 3), 0);
  assert.equal(linesToKeep(4, 3, 3, 3), 3);
  assert.equal(linesToKeep(5, 4, 3, 3), 3); // sube una línea para dejar 2 abajo (lo más cerca de 3 sin romper orphans)
  assert.equal(linesToKeep(5, 4, 4, 2), 4);
  assert.equal(linesToKeep(5, 3, 2, 4), 2);
  assert.equal(linesToKeep(0, 0, 2, 2), 0);
  assert.equal(linesToKeep(10, 5, 0, 0), 5); // valores no válidos se tratan como 1
});

test('planLineFragments: párrafos largos repartidos en hojas de 46 líneas (medido con Chromium)', () => {
  const plan = (n, k, o, w) => planLineFragments(n, k, 46, o, w);
  assert.deepEqual(plan(60, 20, 2, 2), [20, 40]);
  assert.deepEqual(plan(60, 3, 4, 4), [0, 46, 14]);
  assert.deepEqual(plan(60, 3, 3, 5), [3, 46, 11]);
  assert.deepEqual(plan(95, 2, 2, 2), [2, 46, 45, 2]);
  assert.deepEqual(plan(95, 3, 2, 2), [3, 46, 46]);
  assert.deepEqual(plan(95, 0, 2, 2), [0, 46, 46, 3]);
  assert.deepEqual(plan(95, 0, 4, 4), [0, 46, 45, 4]);
  assert.deepEqual(plan(95, 0, 3, 5), [0, 46, 44, 5]);
  assert.deepEqual(plan(95, 2, 1, 1), [2, 46, 46, 1]);
  assert.deepEqual(plan(100, 5, 2, 2), [5, 46, 46, 3]);
  assert.deepEqual(plan(2, 1, 2, 2), [0, 2]);
  assert.deepEqual(plan(5, 4, 3, 3), [3, 2]);
  // Siempre suman el total y ninguna hoja pasa de 46 líneas
  for (let n = 1; n <= 120; n++) for (let k = 0; k <= 46; k++) for (const [o, w] of [[1, 1], [2, 2], [3, 3], [4, 2], [2, 4]]) {
    const frags = plan(n, k, o, w);
    assert.equal(frags.reduce((a, b) => a + b, 0), n);
    assert.ok(frags.every((f, i) => f <= 46 && (f > 0 || i === 0)));
  }
});
