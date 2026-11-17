import { check, openApp, openLogTab, previewText, waitUntil } from '../lib.mjs';

// «Importar de OpenAPI» (P-43): se elige la operación y su respuesta, y el juego de datos sale con esa forma. Web y escritorio.
const factura = `doctype html
html
  body
    h1 Factura #{numero}
    p= paciente.nombre
    p= cliente.email
    each l in lineas
      p #{l.concepto}: #{l.importe}
`;
const session = {
  projectName: 'Clínica Aurora',
  files: { '/main.pug': factura },
  openTabPaths: ['/main.pug'], activeTabPath: '/main.pug',
  datasets: { version: 1, activeId: 'ds-1', locale: 'es', datasets: [{ id: 'ds-1', name: 'Por defecto', data: { numero: 'FA-0', paciente: { nombre: 'Marta Gil Peña' }, cliente: { email: 'marta@example.com' }, lineas: [{ concepto: 'x', importe: 1 }] } }] },
};

const yaml = `openapi: 3.0.3
info:
  title: API de Clínica Aurora
  version: "2.3"
paths:
  /facturas:
    get:
      tags: [Facturas]
      summary: Lista de facturas de un paciente
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: array
                items: { $ref: "#/components/schemas/Factura" }
  /facturas/{id}:
    get:
      tags: [Facturas]
      summary: Una factura con sus líneas
      responses:
        "404":
          description: no existe
          content:
            application/json:
              schema: { type: object, properties: { mensaje: { type: string } } }
        "200":
          description: ok
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Factura" }
              examples:
                aurora:
                  value:
                    numero: FA-2026-0312
                    paciente: { nombre: Lucía Romero Vidal, nif: 48211905K }
                    lineas:
                      - { concepto: Revisión anual, importe: 85 }
                    total: 212.5
    delete:
      tags: [Facturas]
      summary: Borrar una factura
      responses:
        "204": { description: sin contenido }
  /informes/{id}/pdf:
    get:
      summary: Informe en PDF
      responses:
        "200":
          description: ok
          content:
            application/pdf:
              schema: { type: string, format: binary }
components:
  schemas:
    Factura:
      type: object
      properties:
        numero: { type: string, example: FA-0001 }
        total: { type: number }
        paciente: { $ref: "#/components/schemas/Paciente" }
        lineas:
          type: array
          items: { type: object, properties: { concepto: { type: string }, importe: { type: number } } }
    Paciente:
      type: object
      properties:
        nombre: { type: string }
        nif: { type: string }
`;
const soloEsquemas = JSON.stringify({ openapi: '3.0.3', info: { title: 'Solo esquemas', version: '1' }, components: { schemas: { Cita: { type: 'object', properties: { motivo: { type: 'string' } } }, Paciente: { type: 'object', properties: { nombre: { type: 'string' } } } } } });

// Sube un archivo por «Importar JSON, Schema u OpenAPI…». Tras otra subida el menú puede tardar en cerrarse: se espera a que
// no haya ninguno abierto y, si el selector de archivos no llega, se reintenta (en Firefox, en CI, a veces se pierde el clic).
async function upload(page, name, content, mime = 'application/octet-stream') {
  await page.locator('[data-testid="tab-datos"]').click(); // los datos viven en la pestaña «Datos» del panel lateral
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    await waitUntil(async () => (await page.locator('[role="menu"]').count()) === 0, 4000);
    await page.locator('[data-testid="data-more-menu"]').click();
    const item = page.getByRole('menuitem', { name: /Importar JSON/ });
    await item.waitFor({ timeout: 5000 });
    const chooser = page.waitForEvent('filechooser', { timeout: 8000 });
    chooser.catch(() => undefined);
    await item.click();
    try {
      await (await chooser).setFiles({ name, mimeType: mime, buffer: Buffer.from(content) });
      return;
    } catch (err) {
      last = err;
      await page.keyboard.press('Escape');
    }
  }
  throw last;
}

export default async function (env) {
  let app = await openApp(env, { path: '/ide', session, storage: { 'pug-ide-workspaces-intro': '1' } });
  let page = app.page;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  await upload(page, 'clinica-api.yaml', yaml);
  const dlg = page.locator('[data-testid="openapi-import"]');
  await dlg.waitFor({ timeout: 8000 });
  const text = async () => (await dlg.innerText()).replace(/\n/g, ' ');
  check('74 un .yaml con operaciones abre su diálogo con el resumen de la API', /Importar de OpenAPI · clinica-api\.yaml/.test(await text()) && /API de Clínica Aurora 2\.3 · 4 operaciones · 2 esquemas\./.test(await text()) && /no se llama a la API/.test(await text()), await text());
  check('74 la primera operación que sirve ya está elegida, con la respuesta 200 (aunque la 404 vaya antes)', (await page.locator('[data-testid="openapi-op-GET /facturas"]').getAttribute('aria-pressed')) === 'true' && /200 · application\/json · lista de Factura/.test(await page.locator('[data-testid="openapi-response"]').evaluate((el) => el.options[el.selectedIndex].text)));
  check('74 las operaciones que no sirven salen apagadas y con el motivo', await page.locator('[data-testid="openapi-op-DELETE /facturas/{id}"]').isDisabled() && /sin respuesta con datos \(204\)/.test(await page.locator('[data-testid="openapi-op-DELETE /facturas/{id}"]').innerText()) && /responde application\/pdf, no JSON/.test(await page.locator('[data-testid="openapi-op-GET /informes/{id}/pdf"]').innerText()));
  await page.locator('[data-testid="openapi-filter"]').fill('líneas');
  check('74 el filtro deja solo las operaciones que coinciden', !!(await waitUntil(async () => /1 de 4/.test(await text()), 3000)) && (await page.locator('[data-testid="openapi-op-GET /facturas"]').count()) === 0);
  await page.locator('[data-testid="openapi-filter"]').fill('');
  await page.locator('[data-testid="openapi-op-GET /facturas/{id}"]').click();
  const selected = () => page.locator('[data-testid="openapi-response"]').evaluate((el) => el.options[el.selectedIndex]?.text ?? '');
  check('74 al elegir una operación se propone su respuesta 200 y su nombre', !!(await waitUntil(async () => /^200 · application\/json · Factura$/.test(await selected()), 4000)) && (await page.locator('[data-testid="openapi-name"]').inputValue()) === 'GET /facturas/{id}', await selected());
  const preview = page.locator('[data-testid="openapi-preview"]');
  const pv = async () => (await preview.innerText()).replace(/\s+/g, ' ');
  check('74 la vista previa enseña los ejemplos del documento y la forma exacta de la respuesta', /numero "FA-2026-0312"/.test(await pv()) && /paciente \{ 2 claves \}/.test(await pv()) && /nombre "Lucía Romero Vidal"/.test(await pv()) && /lineas \[ 1 elemento \]/.test(await pv()), await pv());
  check('74 avisa de lo que la plantilla usa y la respuesta no trae', !!(await waitUntil(async () => /cliente\.email.*no trae/.test(await page.locator('[data-testid="openapi-missing"]').innerText().catch(() => '')), 5000)), await pv());
  await page.locator('[data-testid="openapi-values"]').selectOption('generated');
  check('74 con «Generados» ya no salen los ejemplos y la forma es la misma', !!(await waitUntil(async () => !/FA-2026-0312/.test(await pv()) && /^.*numero/.test(await pv()) && /paciente \{ 2 claves \}/.test(await pv()), 3000)), await pv());
  await page.locator('[data-testid="openapi-values"]').selectOption('examples');
  await page.locator('[data-testid="openapi-go"]').click();
  check('74 el diálogo se cierra y el juego nuevo se ve en la vista previa', !!(await waitUntil(async () => (await dlg.count()) === 0 && (await previewText(page)).includes('Lucía Romero Vidal') && (await previewText(page)).includes('FA-2026-0312'), 10000)), await previewText(page));
  check('74 el juego se llama como la operación', (await page.locator('app-dataset-bar select').first().evaluate((el) => el.options[el.selectedIndex]?.text ?? '').catch(() => '')).includes('GET /facturas/{id}'));
  await openLogTab(page);
  const log = page.locator('#panel-log');
  check('74 el Registro dice la operación, la respuesta y que usó los ejemplos', !!(await waitUntil(async () => /Importado clinica-api\.yaml \(OpenAPI\): GET \/facturas\/\{id\} → 200, con los ejemplos del documento/.test(await log.innerText()), 4000)), await log.innerText().catch(() => ''));
  check('74 y avisa de la clave que falta', /La plantilla usa cliente\.email, que esta respuesta no trae\./.test(await log.innerText()));
  check('74 sin errores no controlados', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();

  // Un OpenAPI sin operaciones: se avisa y se importan los esquemas, como siempre.
  app = await openApp(env, { path: '/ide', session, storage: { 'pug-ide-workspaces-intro': '1' } });
  page = app.page;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  await upload(page, 'solo-esquemas.json', soloEsquemas, 'application/json');
  const dlg2 = page.locator('[data-testid="openapi-import"]');
  await dlg2.waitFor({ timeout: 8000 });
  check('74 un OpenAPI sin operaciones lo dice y ofrece importar sus esquemas', /no declara operaciones/.test(await dlg2.innerText()) && /sus 2 esquemas/.test(await dlg2.innerText()) && (await page.locator('[data-testid="openapi-go"]').count()) === 0);
  await page.locator('[data-testid="openapi-schemas"]').click();
  check('74 «Importar esquemas» crea el juego con una clave por esquema (como antes)', !!(await waitUntil(async () => (await dlg2.count()) === 0 && (await previewText(page)).length > 0, 6000)));
  await openLogTab(page);
  check('74 y queda en el Registro', !!(await waitUntil(async () => /Importado solo-esquemas\.json \(OpenAPI\) como juego de datos nuevo, con una clave por esquema/.test(await page.locator('#panel-log').innerText()), 4000)));
  check('74 sin errores no controlados (sin operaciones)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // «Importar todos los esquemas» sigue disponible junto a las operaciones, y un JSON normal no abre el diálogo.
  app = await openApp(env, { path: '/ide', session, storage: { 'pug-ide-workspaces-intro': '1' } });
  page = app.page;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  await upload(page, 'clinica-api.yml', yaml);
  await page.locator('[data-testid="openapi-import"]').waitFor({ timeout: 8000 });
  await page.locator('[data-testid="openapi-schemas"]').click();
  await openLogTab(page);
  check('74 «Importar todos los esquemas» sigue estando (el comportamiento de antes)', !!(await waitUntil(async () => /Importado clinica-api\.yml \(OpenAPI\) como juego de datos nuevo, con una clave por esquema/.test(await page.locator('#panel-log').innerText()), 6000)));
  await upload(page, 'cliente.json', JSON.stringify({ numero: 'FA-7', paciente: { nombre: 'Carla Soto' } }), 'application/json');
  check('74 un JSON normal se importa directo, sin diálogo', !!(await waitUntil(async () => (await previewText(page)).includes('Carla Soto'), 6000)) && (await page.locator('[data-testid="openapi-import"]').count()) === 0);
  await upload(page, 'roto.yaml', 'openapi: 3.0.0\npaths: [unclosed');
  check('74 un YAML roto da un error en el Registro, no una excepción', !!(await waitUntil(async () => /No se pudo importar roto\.yaml/.test(await page.locator('#panel-log').innerText()), 6000)) && app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
