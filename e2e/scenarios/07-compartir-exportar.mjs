import { check, run, sleep, html } from '../lib.mjs';
// Compartir por enlace (hash #p=) y exportar HTML autocontenido
{
  const { encodeShare, decodeShare, buildShareUrl, payloadFromHash, SHARE_URL_WARN_LENGTH } = await import('../.build/services.mjs');
  const pug = 'doctype html\nhtml\n  head\n    link(rel="stylesheet" href="/s.css")\n  body\n    h1= titulo\n    img(src="/img/a.png")\n    p ñandú €\n';
  const files = { '/main.pug': pug, '/s.css': 'h1{color:red;background:url(/img/a.png)}' };
  const app = await run(files, '/main.pug', async (a) => {
    a.DataState.setInitialData({ titulo: 'Hola' });
    a.AssetState.add('/img/a.png', new Uint8Array([137, 80, 78, 71]), 'image/png');
    await a.orch.manualCompile();
  });

  // 26. Ida y vuelta del enlace
  const io = app.ProjectIoService;
  const link = io.buildShareLink('https://x.test/ide');
  const payload = payloadFromHash(new URL(link.url).hash);
  check('26 el enlace usa #p= base64url', !!payload && /^[A-Za-z0-9_-]+$/.test(payload) && link.url.startsWith('https://x.test/ide#p='), link.url.slice(0, 40));
  const dec = decodeShare(payload);
  check('26 ida y vuelta conserva archivos y datos', dec.files.get('/main.pug') === pug && dec.files.size === 2 && dec.data.titulo === 'Hola', JSON.stringify(dec.data));
  check('26 enlace corto no avisa', link.tooLong === false);
  app.EditorState.files.update((m) => { const n = new Map(m); let s = ''; for (let i = 0; i < 4000; i++) s += Math.random().toString(36).slice(2) + '\n'; n.set('/big.pug', s); return n; });
  check('26 enlace muy largo activa el aviso', io.buildShareLink('https://x.test/ide').tooLong === true && SHARE_URL_WARN_LENGTH === 8000);

  // 27. Validación del payload
  const bad = (p) => { try { decodeShare(p); return false; } catch { return true; } };
  check('27 rechaza basura y caracteres invalidos', bad('!!!') && bad('abc') && bad(''));
  const { deflateSync, strToU8 } = await import('fflate');
  const enc = (o) => Buffer.from(deflateSync(strToU8(JSON.stringify(o)))).toString('base64url');
  check('27 rechaza version, archivos vacios, tipos y rutas con ..', bad(enc({ v: 2, f: { '/a.pug': 'x' } })) && bad(enc({ v: 1, f: {} })) && bad(enc({ v: 1, f: { '/a.pug': 5 } })) && bad(enc({ v: 1, f: { '/../a.pug': 'x' } })) && bad(enc({ v: 1, f: { '/a.pug': 'x' }, d: [] })));
  check('27 rechaza bomba de descompresion', bad(enc({ v: 1, f: { '/a.pug': 'a'.repeat(6 * 1024 * 1024) } })));
  check('27 acepta sin datos y normaliza ruta', decodeShare(enc({ v: 1, f: { 'a.pug': 'p x' } })).files.has('/a.pug'));
  check('27 parseShare anota error en terminal y devuelve null', io.parseShare('zzz') === null && app.TerminalState.entries().some((e) => e.source === 'Compartir' && e.type === 'error'));

  // 28. Cargar el proyecto compartido en otra sesion
  const app2 = await run({ '/old.pug': 'p old' }, '/old.pug');
  app2.ProjectIoService.loadShared(app2.ProjectIoService.parseShare(payload));
  await sleep(50); await app2.orch.manualCompile();
  check('28 loadShared carga archivos, nombre y datos', app2.EditorState.files().has('/main.pug') && !app2.EditorState.files().has('/old.pug') && app2.DataState.data().titulo === 'Hola');
  check('28 el preview del proyecto cargado refleja los datos', html(app2).includes('<h1') && html(app2).includes('Hola'), html(app2).slice(0, 200));

  // 29. Exportar HTML autocontenido
  const out = io.buildStandaloneHtml();
  check('29 sin script del inspector ni data-pugide-*', !out.includes('pugide') && !out.includes('data-pugide') && !/<script/i.test(out), out.slice(-300));
  check('29 imagenes locales como data URI, sin blob:', out.includes('data:image/png;base64,iVBORw==') && !out.includes('blob:'), out.slice(0, 600));
  check('29 CSS inline y contenido intactos', out.includes('<style') && out.includes('color:red') && out.includes('Hola') && out.includes('ñandú €'));
  check('29 el preview sigue con inspector (no se muta el estado)', html(app).includes('data-pugide-line'));
}
