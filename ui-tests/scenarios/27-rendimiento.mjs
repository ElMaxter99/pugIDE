import { check, previewFrame } from '../lib.mjs';
import {
  ASSET_PUG, changeAndWait, imgLoaded, openAssetProject, openPdfProject, repaginate, tablePug,
} from '../perf-lib.mjs';

export const browsers = ['chromium'];
export const why = 'los presupuestos se calibraron en Chromium; Firefox y WebKit paginan a otro ritmo (y en CI compartido el reloj varía)';

// Presupuestos MUY holgados (unas 10 veces lo medido, ver «Rendimiento (medido)» en docs/ARCHITECTURE.md): solo detectan
// regresiones graves, como volver a forzar una maquetación de la tabla por fila o a reenviar los assets en cada compilación.
const PAGINATE_2000_MS = 5000;
const ASSET_CHANGE_MS = 3000;

export default async function (env) {
  // Tabla grande con cabecera repetida en modo PDF
  const app = await openPdfProject(env, tablePug(2000));
  const { page } = app;
  const pages = Number((await page.locator('.pdf-bar').innerText()).match(/Página\s+de\s+(\d+)/)?.[1]);
  check('27 la tabla de 2000 filas ocupa muchas hojas', pages > 30, `páginas=${pages}`);
  const copies = await (await previewFrame(page)).evaluate(
    () => [...document.querySelectorAll('tr[data-pg-spacer]')].filter((r) => r.textContent.includes('Referencia')).length,
  );
  check('27 la cabecera se repite en cada hoja menos la primera', copies === pages - 1, `copias=${copies} páginas=${pages}`);
  const ms = await repaginate(page);
  console.log(`  paginado de 2000 filas: ${Math.round(ms)} ms (presupuesto ${PAGINATE_2000_MS} ms)`);
  check(`27 paginar 2000 filas con cabecera tarda menos de ${PAGINATE_2000_MS / 1000} s`, ms < PAGINATE_2000_MS, `${Math.round(ms)} ms`);
  check('27 sin errores de página (tabla)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // Un cambio de solo código con un asset de ~3 MB en el proyecto
  const withAsset = await openAssetProject(env);
  await changeAndWait(withAsset.page, ASSET_PUG('calentamiento'), 'calentamiento', { ready: imgLoaded });
  const change = await changeAndWait(withAsset.page, ASSET_PUG('cambio medido'), 'cambio medido', { ready: imgLoaded });
  console.log(`  cambio de código con asset de 3 MB: ${Math.round(change)} ms (presupuesto ${ASSET_CHANGE_MS} ms)`);
  check(`27 un cambio de código con un asset de 3 MB se ve en menos de ${ASSET_CHANGE_MS / 1000} s`, change < ASSET_CHANGE_MS, `${Math.round(change)} ms`);
  check('27 sin errores de página (asset)', withAsset.errors.length === 0, withAsset.errors.join(' | '));
  await withAsset.close();
}
