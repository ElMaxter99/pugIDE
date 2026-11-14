import { check, openApp, previewText, waitUntil } from '../lib.mjs';

// La zona de Datos como tabla CLAVE / VALOR (P-38): filtro, expandir y contraer todo, claves sin usar, editar en el
// sitio (Esc cancela), elementos de listas y buscar en el modo JSON.
const data = {
  cliente: { nombre: 'Clínica Aurora', email: 'facturas@aurora.example', dirección: 'Calle Mayor 3, Valencia' },
  factura: { numero: 'F-2026-0042', pagada: false, total: 45 },
  condiciones: 'El pago se realizará por transferencia bancaria en un plazo máximo de quince días naturales desde la fecha de emisión. '.repeat(12),
  lineas: [{ concepto: 'Consulta de fisioterapia', importe: 45 }, { concepto: 'Revisión', importe: 0 }],
  antiguo: 'ya no se usa',
};
const session = {
  projectName: 'Clínica Aurora',
  files: { '/main.pug': "doctype html\nhtml\n  body\n    h1= cliente.nombre\n    p= factura.numero\n    if factura.pagada\n      p.estado Pagada\n    each l in lineas\n      p.linea= l.concepto\n" },
  openTabPaths: ['/main.pug'], activeTabPath: '/main.pug',
  datasets: { version: 1, activeId: 'ds-1', locale: 'es', datasets: [{ id: 'ds-1', name: 'Por defecto', data }] },
};

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('[data-testid="tab-datos"]').click();
  const panel = page.locator('app-smart-data-editor');
  const table = panel.locator('[data-testid="data-table"]');
  await table.waitFor({ timeout: 8000 });
  await waitUntil(async () => (await previewText(page)).includes('Clínica Aurora'), 8000);
  const summary = () => panel.locator('[data-testid="data-summary"]').innerText();
  const row = (path) => table.locator(`.tree-row[data-path="${path}"]`);

  check('67 la tabla enseña cada grupo con cuántos elementos tiene', /cliente\s*\{3\}/.test(await row('cliente').innerText()) && /lineas\s*\[2\]/.test(await row('lineas').innerText()), await table.innerText());
  check('67 las claves que la plantilla no lee llevan su punto «sin usar» y la tira las cuenta', !!(await waitUntil(async () => (await row('antiguo').locator('.unused').count()) === 1 && /2 sin usar/.test(await summary()) && (await row('condiciones').locator('.unused').count()) === 1, 6000)), await summary());
  check('67 las que sí se usan no lo llevan', (await row('cliente').locator('.unused').count()) === 0);

  // Expandir y contraer todo.
  await panel.locator('[data-testid="data-expand-all"]').click();
  check('67 «Expandir todo» abre también los elementos de las listas', !!(await waitUntil(async () => (await row('lineas.1.concepto').count()) === 1, 3000)));
  await panel.locator('[data-testid="data-collapse-all"]').click();
  check('67 «Contraer todo» deja solo el primer nivel', !!(await waitUntil(async () => (await row('cliente.nombre').count()) === 0 && (await row('cliente').count()) === 1, 3000)));

  // Editar un valor dentro de una lista: la vista previa cambia.
  await row('lineas').locator('button').click();
  await row('lineas.0').locator('button').click();
  const concepto = row('lineas.0.concepto').locator('input');
  await concepto.fill('Sesión de osteopatía');
  await concepto.press('Enter');
  await concepto.dispatchEvent('change');
  check('67 editar el valor de un elemento de una lista actualiza la vista previa', !!(await waitUntil(async () => (await previewText(page)).includes('Sesión de osteopatía'), 8000)), await previewText(page));
  // Esc cancela lo escrito.
  await concepto.fill('No lo quiero');
  await concepto.press('Escape');
  await page.waitForTimeout(500);
  check('67 Esc deshace lo escrito en el campo sin guardarlo', (await concepto.inputValue()) === 'Sesión de osteopatía' && !(await previewText(page)).includes('No lo quiero'));
  // El interruptor cambia el sí/no.
  await row('factura').locator('button').click();
  await row('factura.pagada').locator('[role="switch"]').click();
  check('67 el interruptor de un sí/no actualiza la vista previa', !!(await waitUntil(async () => (await previewText(page)).includes('Pagada'), 8000)));

  // Filtro: en claves y valores, sin tildes, abre los grupos con coincidencias.
  const filter = panel.locator('[data-testid="data-filter"]');
  await filter.fill('direccion');
  check('67 el filtro encuentra sin tildes y abre el grupo donde está', !!(await waitUntil(async () => (await row('cliente.dirección').count()) === 1 && (await row('factura').count()) === 0, 3000)), await table.innerText());
  check('67 la tira dice cuántas coinciden', /^1 de \d+ claves/.test(await summary()), await summary());
  await filter.fill('aurora');
  check('67 también busca en los valores', !!(await waitUntil(async () => (await row('cliente.nombre').count()) === 1 && (await row('cliente.email').count()) === 1, 3000)));
  await filter.fill('nada parecido');
  check('67 si nada coincide, lo dice', !!(await waitUntil(async () => /Nada coincide/.test(await table.innerText()), 3000)));
  await filter.press('Escape');
  check('67 Esc limpia el filtro y vuelve la tabla', !!(await waitUntil(async () => (await filter.inputValue()) === '' && (await row('antiguo').count()) === 1, 3000)));

  // Modo JSON: el mismo campo busca en el texto.
  await panel.locator('[data-testid="data-mode-json"]').click();
  await panel.locator('textarea.json-textarea').waitFor({ state: 'visible' });
  check('67 en JSON el campo pasa a «Buscar en el JSON»', (await filter.getAttribute('placeholder')) === 'Buscar en el JSON');
  const before = await panel.locator('textarea.json-textarea').inputValue();
  await filter.fill('importe');
  check('67 y cuenta las coincidencias en el texto', !!(await waitUntil(async () => /^2 coincidencias/.test(await summary()), 3000)), await summary());
  await filter.press('Enter');
  const sel = await panel.locator('textarea.json-textarea').evaluate((t) => ({ s: t.selectionStart, e: t.selectionEnd, txt: t.value.slice(t.selectionStart, t.selectionEnd), len: t.value.length, act: document.activeElement?.tagName }));
  check('67 Intro selecciona la coincidencia en el texto', /importe/i.test(sel.txt), JSON.stringify(sel));
  const visible = await panel.locator('textarea.json-textarea').evaluate((t) => {
    const m = document.createElement('textarea'); const cs = getComputedStyle(t);
    Object.assign(m.style, { position: 'absolute', visibility: 'hidden', height: '0', width: t.clientWidth + 'px', padding: cs.padding, border: '0', boxSizing: 'border-box', font: cs.font, lineHeight: cs.lineHeight, whiteSpace: cs.whiteSpace, overflowWrap: cs.overflowWrap });
    document.body.appendChild(m); m.value = t.value.slice(0, t.selectionStart); const y = m.scrollHeight; m.remove();
    return y >= t.scrollTop && y <= t.scrollTop + t.clientHeight + 4;
  });
  check('67 la coincidencia queda a la vista aunque antes haya líneas largas partidas', visible);
  check('67 y buscar no cambia el JSON (Intro no escribe en él)', (await panel.locator('textarea.json-textarea').inputValue()) === before);
  await filter.press('Enter');
  check('67 otro Intro pasa a la coincidencia siguiente', (await panel.locator('textarea.json-textarea').evaluate((t) => t.selectionStart)) !== sel.s && (await panel.locator('textarea.json-textarea').inputValue()) === before);

  check('67 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
