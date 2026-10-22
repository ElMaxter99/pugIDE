import { test } from 'node:test';
import assert from 'node:assert/strict';
import { straddlesPage, isOrphanHeading } from './.build/units.mjs';

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
