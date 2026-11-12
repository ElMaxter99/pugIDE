import { check, openApp, openProblemsTab, previewText, waitUntil } from '../lib.mjs';

// Asistente de IA (P-30 a P-34). Se simula la app de escritorio (window.pugideDesktop) con una CLI falsa: así se
// prueban los tres pasos sin lanzar ninguna IA. En la web (sin escritorio ni `npm start`) no debe aparecer nada.
const files = {
  '/main.pug': 'doctype html\nhtml\n  body\n    include mixins/lista\n    h1= cliente.nombre\n    +lista(productos)\n',
  '/mixins/lista.pug': 'mixin lista(items)\n  ul\n    each it in items\n      li= it.name\n',
};
const session = { projectName: 'Norte', files, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug',
  datasets: { version: 1, activeId: 'ds-1', locale: 'es', datasets: [{ id: 'ds-1', name: 'Cliente Norte', data: { cliente: { nombre: 'Norte Analytics' }, productos: [{ name: 'Licencia anual' }] } }] } };
const REPLY = '```json\n' + JSON.stringify({ summary: 'La lista necesita más productos.', proposals: [
  { title: 'Tres productos', explanation: 'mixins/lista.pug:4 recorre productos; con 3 se ve la lista completa.', data: { cliente: { nombre: 'Norte Analytics', cif: 'B12345678' }, productos: [{ name: 'Licencia anual' }, { name: 'Soporte 24/7' }, { name: 'Formación (8 h)' }] } },
  { title: 'Rota', explanation: 'no compila', edits: [{ path: '/mixins/lista.pug', find: 'li= it.name', replace: 'li= it.name.x.y' }] },
] }) + '\n```';

/** `window.pugideDesktop` falso: espacios y avisos vacíos; `ai:*` responde como la CLI de verdad (eventos por `onEvent`). */
function fakeDesktop(reply) {
  const listeners = new Set();
  const emit = (payload) => listeners.forEach((cb) => cb(payload));
  window.__aiPrompts = [];
  window.pugideDesktop = Object.freeze({
    platform: 'linux', version: '0.13.0', webUrl: 'https://pug-ide.vercel.app',
    onEvent: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    invoke: async (channel, payload) => {
      if (channel === 'ws:list') return { workspaces: [], lastId: null, colors: [] };
      if (channel === 'upd:state') return { current: '0.13.0', asked: true, enabled: false, lastCheck: 0, latest: null, dismissed: null };
      if (channel === 'ai:detect') return { claude: { available: true, version: '2.1.322 (Claude Code)', command: 'claude' }, copilot: { available: false, version: null, command: 'copilot' } };
      if (channel === 'ai:run') {
        window.__aiPrompts.push(payload);
        const runId = 'run-' + window.__aiPrompts.length;
        const send = (event, ms) => setTimeout(() => emit({ type: 'ai', runId, event }), ms);
        send({ type: 'start', command: 'claude -p --model sonnet --tools "" < mensaje.txt' }, 20);
        send({ type: 'status', text: 'Sesión de Claude Code lista · modelo claude-sonnet-5-5' }, 40);
        send({ type: 'usage', input: 1238, output: 0 }, 60);
        send({ type: 'text', delta: '```json' }, 80);
        send({ type: 'usage', input: 1238, output: 742 }, 100);
        send({ type: 'done', text: reply, usage: { input: 1238, output: 1106 }, durationMs: 8000 }, 600);
        return { runId };
      }
      if (channel === 'ai:cancel') return { ok: true };
      throw new Error('Canal no permitido');
    },
  });
}

export default async function (env) {
  // --- En la web (build de producción, sin escritorio): nada de IA ---
  const web = await openApp(env, { path: '/ide', session });
  await web.page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  await web.page.locator('[data-testid="preview-view-menu"], button[aria-label^="Vista"]').first().click().catch(() => {});
  check('63 en la web no hay «Asistente de IA» en ningún menú', (await web.page.getByText('Asistente de IA').count()) === 0 && (await web.page.locator('app-ai-dialog, app-ai-settings-dialog').count()) === 0);
  await web.close();

  // --- En escritorio (simulado) ---
  const app = await openApp(env, { path: '/ide', session, storage: { 'pug-ide-workspaces-intro': '1' } });
  const { page } = app;
  await page.addInitScript(fakeDesktop, REPLY);
  await page.reload();
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  await waitUntil(async () => (await previewText(page)).includes('Licencia anual'), 10000);

  // Entrada: menú «⋯» de Datos
  await page.locator('[data-testid="tab-datos"]').click().catch(() => {});
  await page.locator('[data-testid="data-more-menu"]').first().click();
  const item = page.locator('[role="menuitem"]', { hasText: 'Proponer datos con IA' });
  check('63 «⋯» de Datos ofrece «Proponer datos con IA…»', !!(await waitUntil(async () => (await item.count()) === 1, 4000)));
  await item.click();
  const dlg = page.locator('[data-testid="ai-dialog"]');
  await dlg.waitFor({ timeout: 5000 });

  // Paso 1: preparar
  check('63 el diálogo empieza en «Preparar» con Claude Code y el modelo por defecto', (await dlg.locator('[data-testid="ai-provider-claude"]').getAttribute('aria-checked')) === 'true' && (await dlg.locator('[data-testid="ai-model"]').inputValue()) === 'sonnet');
  const items = await dlg.locator('[data-testid="ai-items"] li').allInnerTexts();
  check('63 enseña qué se envía: las plantillas (con sus mixins) y la forma de los datos', items.some((t) => t.includes('main.pug')) && items.some((t) => t.includes('mixins/lista.pug') && t.includes('mixin lista')) && items.some((t) => t.includes('Forma de los datos')), items.join(' | '));
  check('63 los valores actuales no van marcados por defecto', !(await dlg.locator('[data-testid="ai-items"] li', { hasText: 'Valores actuales' }).locator('input').isChecked()));
  check('63 enseña la estimación de tokens antes de enviar', /≈ \d/.test(await dlg.locator('[data-testid="ai-estimate"]').innerText()));
  await dlg.locator('[data-testid="ai-show-exact"]').click();
  check('63 «Ver la orden exacta» enseña la CLI sin herramientas', /^claude -p .*--tools "" .*< mensaje\.txt$/.test((await dlg.locator('[data-testid="ai-command"]').innerText()).trim()));
  await dlg.locator('[data-testid="ai-provider-copilot"]').click();
  check('63 si la CLI elegida no está, se dice y no deja enviar', !!(await waitUntil(async () => /No se encuentra «copilot»/.test(await dlg.locator('[data-testid="ai-cli-missing"]').innerText().catch(() => '')) && (await dlg.locator('[data-testid="ai-send"]').isDisabled()), 4000)), await dlg.locator('[data-testid="ai-cli-missing"]').innerText().catch(() => 'sin aviso'));
  await dlg.locator('[data-testid="ai-provider-claude"]').click();
  await dlg.locator('[data-testid="ai-instructions"]').fill('Al menos 3 productos');
  await dlg.locator('[data-testid="ai-send"]').click();

  // Paso 2: en curso
  check('63 en curso: se ve qué hace la CLI', !!(await waitUntil(async () => /Lanzado claude · modelo sonnet · sin herramientas/.test(await dlg.locator('[data-testid="ai-log"]').innerText()), 4000)));
  check('63 y los tokens que informa', !!(await waitUntil(async () => /1238 tokens/.test(await dlg.locator('[data-testid="ai-tokens-in"]').innerText()), 4000)));
  const sent = await page.evaluate(() => window.__aiPrompts[0]);
  check('63 se envía lo marcado y las indicaciones, con el modelo y el límite de los ajustes', sent.provider === 'claude' && sent.model === 'sonnet' && sent.maxOutputTokens === 8000 && sent.prompt.includes('Archivo /mixins/lista.pug') && sent.prompt.includes('Al menos 3 productos') && !sent.prompt.includes('Licencia anual'));

  // Paso 3: propuestas
  await dlg.locator('[data-testid="ai-explanation"]').waitFor({ timeout: 6000 });
  check('63 la propuesta explica el porqué', /lista\.pug:4/.test(await dlg.locator('[data-testid="ai-explanation"]').innerText()));
  check('63 y enseña los cambios en los datos', /Soporte 24\/7/.test(await dlg.innerText()));
  check('63 se comprueba que compila antes de dejar probar', !!(await waitUntil(async () => /Compila sin errores/.test(await dlg.locator('[data-testid="ai-check"]').innerText().catch(() => '')), 6000)), await dlg.locator('[data-testid="ai-check"]').innerText().catch(() => 'sin comprobación'));
  await dlg.locator('[data-testid="ai-proposal-1"]').click();
  check('63 una propuesta que no compila se dice y no se deja aplicar', !!(await waitUntil(async () => /No compila/.test(await dlg.locator('[data-testid="ai-check"]').innerText().catch(() => '')), 6000)) && (await dlg.locator('[data-testid="ai-apply"]').isDisabled()));
  await dlg.locator('[data-testid="ai-proposal-0"]').click();

  // Probar: la vista previa cambia, los datos no
  await dlg.locator('[data-testid="ai-try"]').click();
  check('63 «Probar» enseña la propuesta en la vista previa', !!(await waitUntil(async () => (await previewText(page)).includes('Formación (8 h)'), 8000)), (await previewText(page)) + ' || ' + (await page.locator('[data-testid="pb-list"]').innerText().catch(() => '')).slice(0, 400) + ' || ' + (await page.locator('#panel-log').innerText().catch(() => '')).slice(-600));
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('pug-ide-project') ?? '{}')?.datasets?.datasets?.[0]?.data?.productos?.length ?? null);
  check('63 mientras se prueba, tus datos no cambian', (await page.locator('[data-testid="ai-trial"]').count()) === 1 && (await stored()) === 1);
  await page.locator('[data-testid="ai-revert"]').click();
  check('63 «Revertir» vuelve a tu vista previa', !!(await waitUntil(async () => !(await previewText(page)).includes('Formación (8 h)'), 8000)));
  await dlg.locator('[data-testid="ai-apply"]').click();
  check('63 «Aplicar» cambia los datos', !!(await waitUntil(async () => (await stored()) === 3, 8000)) && (await previewText(page)).includes('Formación (8 h)'));
  check('63 la barra de estado cuenta lo gastado en la sesión', /IA: 1 petición/.test(await page.locator('[data-testid="status-ai"]').innerText()));

  // Entrada desde un error: «Proponer arreglo con IA…» con el error dentro
  await page.evaluate(() => {
    const m = window.monaco.editor.getModels().find((x) => x.uri.path === '/main.pug');
    m.setValue(m.getValue() + '    - const vacio = null\n    p= vacio.nombre\n');
  });
  await openProblemsTab(page);
  const ask = page.locator('[data-testid="pb-ai"]').first();
  check('63 un error en Problemas ofrece «Proponer arreglo con IA…»', !!(await waitUntil(async () => (await ask.count()) > 0, 10000)));
  if (await ask.count()) {
    await ask.click();
    await dlg.waitFor({ timeout: 5000 });
    check('63 el arreglo lleva el error y los valores actuales', !!(await dlg.locator('[data-testid="ai-items"] li', { hasText: 'Error:' }).count()) && (await dlg.locator('[data-testid="ai-items"] li', { hasText: 'Valores actuales' }).locator('input').isChecked()));
    await page.keyboard.press('Escape');
  }

  // Ajustes: las CLI encontradas y el modelo por defecto
  await page.keyboard.press(process.env.PUGIDE_BROWSER === 'webkit' ? 'Meta+k' : 'Control+k');
  await page.keyboard.type('ajustes del asistente');
  await page.keyboard.press('Enter');
  const settings = page.locator('[data-testid="ai-settings"]');
  await settings.waitFor({ timeout: 5000 });
  check('63 ajustes: Claude Code encontrada con su versión', !!(await waitUntil(async () => /Encontrada · 2\.1\.322/.test(await settings.locator('[data-testid="ai-cli-claude"]').innerText()), 5000)));
  check('63 ajustes: Copilot no encontrada, con cómo instalarla', /npm i -g @github\/copilot/.test(await settings.locator('[data-testid="ai-cli-copilot"]').innerText()));
  await settings.locator('[data-testid="ai-model-claude"]').selectOption('opus');
  await settings.locator('[data-testid="ai-settings-save"]').click();
  check('63 el modelo por defecto se guarda', !!(await waitUntil(() => page.evaluate(() => JSON.parse(localStorage.getItem('pug-ide-ai') ?? '{}')?.models?.claude === 'opus'), 4000)));

  check('63 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
