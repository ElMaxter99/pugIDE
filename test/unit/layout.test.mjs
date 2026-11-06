import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUTS, layoutById, resolveLayout, stepSize, sanitizePanelSizes, isLayoutId, RAIL_WIDTH, layoutShortcut, panelShortcut } from './.build/units.mjs';

const at = (id, container, extra = {}) => {
  const def = layoutById(id);
  return resolveLayout(def, { sidebarCollapsed: def.sidebarCollapsed, dataVisible: true, ...extra }, container);
};

test('las cuatro disposiciones a 1440 px reparten el ancho como en la mesa P-08', () => {
  const l1 = at('editor-preview', 1440);
  assert.deepEqual([l1.sidebar, l1.editor, l1.data, l1.preview], [280, 500, 0, 660]);
  const l2 = at('editor-data-preview', 1440);
  assert.deepEqual([l2.sidebar, l2.editor, l2.data, l2.preview], [RAIL_WIDTH, 420, 300, 672]);
  const l3 = at('focus-editor', 1440);
  assert.deepEqual([l3.sidebar, l3.editor, l3.preview], [RAIL_WIDTH, 920, 472]);
  const l4 = at('focus-preview', 1440);
  assert.deepEqual([l4.sidebar, l4.editor, l4.preview], [RAIL_WIDTH, 360, 1032]);
});

test('en una ventana más estrecha el preview cede primero y el editor no baja de 360', () => {
  const l = at('editor-preview', 1400);
  assert.deepEqual([l.sidebar, l.editor, l.preview], [280, 460, 660]);
  const small = at('editor-preview', 1100);
  assert.equal(small.editor, 360);
  assert.equal(small.preview, 460);
  const tiny = at('editor-data-preview', 900);
  assert.ok(tiny.preview >= 320 && tiny.data >= 260);
});

test('los tamaños elegidos mandan y se acotan a sus mínimos', () => {
  assert.equal(at('editor-preview', 1440, { sizes: { preview: 500 } }).preview, 500);
  assert.equal(at('editor-preview', 1440, { sizes: { preview: 100 } }).preview, 320);
  assert.equal(at('editor-preview', 1440, { sizes: { sidebar: 50 } }).sidebar, 200);
  const hidden = at('editor-data-preview', 1440, { dataVisible: false });
  assert.equal(hidden.data, 0);
  assert.equal(hidden.editor, 1440 - RAIL_WIDTH - hidden.preview);
});

test('los límites de cada tirador dejan siempre 360 px al editor', () => {
  const l = at('editor-preview', 1440);
  assert.equal(l.limits.preview.max, 1440 - 360 - 280);
  assert.equal(l.limits.sidebar.max, 1440 - 360 - 660);
  assert.deepEqual([l.limits.preview.min, l.limits.sidebar.min, l.limits.data.min], [320, 200, 260]);
});

test('stepSize: flechas de 16 px, Mayús 64, extremos y teclas ajenas', () => {
  assert.equal(stepSize(500, 'ArrowRight', false, 1, 320, 900), 516);
  assert.equal(stepSize(500, 'ArrowLeft', false, 1, 320, 900), 484);
  assert.equal(stepSize(500, 'ArrowRight', false, -1, 320, 900), 484); // panel a la derecha: → lo estrecha
  assert.equal(stepSize(500, 'ArrowRight', true, 1, 320, 900), 564);
  assert.equal(stepSize(890, 'ArrowRight', true, 1, 320, 900), 900);
  assert.equal(stepSize(500, 'Home', false, 1, 320, 900), 320);
  assert.equal(stepSize(500, 'End', false, 1, 320, 900), 900);
  assert.equal(stepSize(500, 'a', false, 1, 320, 900), null);
});

test('sanitizePanelSizes ignora lo desconocido y lo no numérico', () => {
  assert.deepEqual(sanitizePanelSizes(null), {});
  assert.deepEqual(sanitizePanelSizes({ 'focus-editor': { preview: 500.4, data: 'x', sidebar: -3 }, raro: { preview: 1 } }), { 'focus-editor': { preview: 500 } });
  assert.ok(LAYOUTS.every((l) => isLayoutId(l.id)) && !isLayoutId('raro'));
});

const key = (o) => ({ ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, key: '', code: '', ...o });

test('Ctrl+Alt+1…4 eligen la disposición; con AltGr (teclea | @ # ~) no se secuestra', () => {
  assert.equal(layoutShortcut(key({ ctrlKey: true, altKey: true, key: '1', code: 'Digit1' })), 'editor-preview');
  assert.equal(layoutShortcut(key({ ctrlKey: true, altKey: true, key: '4', code: 'Digit4' })), 'focus-preview');
  assert.equal(layoutShortcut(key({ metaKey: true, altKey: true, key: '¡', code: 'Digit1' })), 'editor-preview'); // Mac
  assert.equal(layoutShortcut(key({ ctrlKey: true, altKey: true, key: '|', code: 'Digit1' })), null); // teclado español con AltGr
  assert.equal(layoutShortcut(key({ ctrlKey: true, altKey: true, key: '2', code: 'Digit2', altGraph: true })), null);
  assert.equal(layoutShortcut(key({ ctrlKey: true, altKey: true, key: '5', code: 'Digit5' })), null);
  assert.equal(layoutShortcut(key({ ctrlKey: true, key: '1', code: 'Digit1' })), null);
  assert.equal(layoutShortcut(key({ ctrlKey: true, altKey: true, shiftKey: true, key: '1', code: 'Digit1' })), null);
});

test('Ctrl+B y Ctrl+J alternan los paneles, y solo ellos', () => {
  assert.equal(panelShortcut(key({ ctrlKey: true, key: 'b' })), 'sidebar');
  assert.equal(panelShortcut(key({ metaKey: true, key: 'J' })), 'bottom');
  assert.equal(panelShortcut(key({ ctrlKey: true, shiftKey: true, key: 'J' })), null); // Ctrl+Mayús+J es del editor de datos
  assert.equal(panelShortcut(key({ ctrlKey: true, altKey: true, key: 'b' })), null);
  assert.equal(panelShortcut(key({ key: 'b' })), null);
});
