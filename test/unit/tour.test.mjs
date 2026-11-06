import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOUR_STEPS, placePopover, templateBadge, WELCOME_TEMPLATE_ORDER } from './.build/units.mjs';

const view = { width: 1440, height: 900 };
const pop = { width: 360, height: 220 };

test('el recorrido tiene cuatro pasos con zona y título, y el último lista cuatro atajos', () => {
  assert.equal(TOUR_STEPS.length, 4);
  assert.ok(TOUR_STEPS.every((s) => s.target.startsWith('[data-tour=') && s.title));
  assert.equal(TOUR_STEPS[3].shortcuts.length, 4);
  assert.equal(new Set(TOUR_STEPS.map((s) => s.id)).size, 4);
});

test('el aviso va a la derecha de la zona si cabe y no la tapa', () => {
  const target = { left: 0, top: 56, width: 280, height: 700 };
  const p = placePopover(target, pop, view);
  assert.equal(p.side, 'right');
  assert.ok(p.left >= target.left + target.width);
  assert.ok(p.top >= 12 && p.top + pop.height <= view.height - 12);
});

test('si a la derecha no cabe, prueba a la izquierda y luego debajo', () => {
  assert.equal(placePopover({ left: 1100, top: 100, width: 330, height: 600 }, pop, view).side, 'left');
  assert.equal(placePopover({ left: 12, top: 60, width: 1416, height: 40 }, pop, view).side, 'bottom');
});

test('en una ventana pequeña el aviso sigue dentro de la ventana', () => {
  const small = { width: 1024, height: 640 };
  const targets = [
    { left: 0, top: 56, width: 240, height: 560 },
    { left: 240, top: 56, width: 500, height: 560 },
    { left: 700, top: 56, width: 320, height: 560 },
    { left: 300, top: 8, width: 300, height: 40 },
  ];
  for (const target of targets) {
    const p = placePopover(target, pop, small);
    assert.ok(p.left >= 12 && p.top >= 12 && p.left + pop.width <= small.width - 12 && p.top + pop.height <= small.height - 12, JSON.stringify(p));
  }
});

test('sin zona (panel oculto) el aviso se centra', () => {
  const p = placePopover(null, pop, view);
  assert.equal(p.side, 'center');
  assert.equal(p.left, (view.width - pop.width) / 2);
  assert.equal(placePopover({ left: 0, top: 0, width: 0, height: 0 }, pop, view).side, 'center');
});

test('etiquetas de plantilla y orden de la bienvenida', () => {
  assert.equal(templateBadge('report', 3), 'A4 · 3 archivos');
  assert.equal(templateBadge('email', 3), 'Correo · 3 archivos');
  assert.equal(templateBadge('x', 1), 'A4 · 1 archivo');
  assert.deepEqual(WELCOME_TEMPLATE_ORDER, ['report', 'invoice', 'email']);
});
