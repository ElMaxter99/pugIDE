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
  check('27 rechaza version, archivos vacios, tipos y rutas con ..', bad(enc({ v: 4, f: { '/a.pug': 'x' } })) && bad(enc({ v: 1, f: {} })) && bad(enc({ v: 1, f: { '/a.pug': 5 } })) && bad(enc({ v: 1, f: { '/../a.pug': 'x' } })) && bad(enc({ v: 1, f: { '/a.pug': 'x' }, d: [] })));
  check('27 rechaza bomba de descompresion', bad(enc({ v: 1, f: { '/a.pug': 'a'.repeat(6 * 1024 * 1024) } })));
  check('27 acepta sin datos y normaliza ruta', decodeShare(enc({ v: 1, f: { 'a.pug': 'p x' } })).files.has('/a.pug'));
  check('27 parseShare anota error en terminal y devuelve null', io.parseShare('zzz') === null && app.TerminalState.entries().some((e) => e.source === 'Compartir' && e.type === 'error'));

  // 28. Cargar el proyecto compartido en otra sesion
  const app2 = await run({ '/old.pug': 'p old' }, '/old.pug');
  app2.ProjectIoService.loadShared(app2.ProjectIoService.parseShare(payload));
  await sleep(50); await app2.orch.manualCompile();
  check('28 loadShared carga archivos, nombre y datos', app2.EditorState.files().has('/main.pug') && !app2.EditorState.files().has('/old.pug') && app2.DataState.data().titulo === 'Hola');
  check('28 el preview del proyecto cargado refleja los datos', html(app2).includes('<h1') && html(app2).includes('Hola'), html(app2).slice(0, 200));

  // 28b. Assets pequeños viajan en el enlace; los grandes se omiten
  check('28b el asset pequeño viaja en el enlace', link.included.includes('/img/a.png') && link.omitted.length === 0, JSON.stringify(link));
  check('28b decodifica el asset con su mime', dec.assets.length === 1 && dec.assets[0].path === '/img/a.png' && dec.assets[0].mime === 'image/png' && dec.assets[0].data.length === 4);
  check('28b loadShared restaura el asset', app2.AssetState.has('/img/a.png'));
  app.AssetState.add('/img/big.png', new Uint8Array(70 * 1024), 'image/png');
  const link2 = io.buildShareLink('https://x.test/ide');
  check('28b el asset grande se omite y se avisa', link2.omitted.includes('/img/big.png') && link2.included.includes('/img/a.png'), JSON.stringify([link2.included, link2.omitted]));
  check('28b enlace v1 antiguo sigue abriendo (sin assets)', decodeShare(enc({ v: 1, f: { '/a.pug': 'p x' } })).assets.length === 0);
  check('28b rechaza assets con extensión o ruta no válidas', bad(enc({ v: 2, f: { '/a.pug': 'x' }, a: { '/x.exe': 'AAAA' } })) && bad(enc({ v: 2, f: { '/a.pug': 'x' }, a: { '/../x.png': 'AAAA' } })));

  // 29. Exportar HTML autocontenido
  const out = io.buildStandaloneHtml();
  check('29 sin script del inspector ni data-pugide-*', !out.includes('pugide') && !out.includes('data-pugide') && !/<script/i.test(out), out.slice(-300));
  check('29 imagenes locales como data URI, sin blob:', out.includes('data:image/png;base64,iVBORw==') && !out.includes('blob:'), out.slice(0, 600));
  check('29 CSS inline y contenido intactos', out.includes('<style') && out.includes('color:red') && out.includes('Hola') && out.includes('ñandú €'));
  check('29 el preview sigue con inspector (no se muta el estado)', html(app).includes('data-pugide-line'));
}

// 30. Opciones del enlace (P-15) y abrir como proyecto nuevo (P-16)
{
  const { decodeShare, decryptShare, payloadFromHash, encryptedFromHash, ShareExpiredError } = await import('../.build/services.mjs');
  const a = await run({ '/main.pug': 'h1= titulo\n' }, '/main.pug', async (x) => { x.DataState.setInitialData({ titulo: 'Hola' }); await x.orch.manualCompile(); });
  const io = a.ProjectIoService;
  const now = Date.now();
  const sin = io.buildShareLink('https://x.test/ide', { includeData: false, expiresAt: now + 1000, note: 'Hola' });
  const d1 = decodeShare(payloadFromHash(new URL(sin.url).hash));
  check('30 sin datos el enlace no los lleva, y trae caducidad y nota', Object.keys(d1.data).length === 0 && d1.expiresAt === now + 1000 && d1.note === 'Hola', JSON.stringify(d1.data));
  const prot = await io.buildShareLinkProtected('https://x.test/ide', { password: 'correcto-caballo', note: 'secreta' });
  const enc = encryptedFromHash(new URL(prot.url).hash);
  check('30 con contraseña el enlace es #e= y no deja ver el nombre del archivo', prot.encrypted && prot.url.includes('#e=') && !!enc && !prot.url.includes('main'), prot.url.slice(0, 40));
  check('30 se descifra con la contraseña correcta', decodeShare(await decryptShare(enc, 'correcto-caballo')).note === 'secreta');
  let caducado = false; try { decodeShare(payloadFromHash(new URL(sin.url).hash), now + 5000); } catch (e) { caducado = e instanceof ShareExpiredError; }
  check('30 pasada la fecha el enlace no se abre', caducado);
  const sinPass = await io.buildShareLinkProtected('https://x.test/ide', {});
  check('30 sin contraseña buildShareLinkProtected da el enlace de siempre', sinPass.url.includes('#p=') && !sinPass.encrypted);

  // Abrir como proyecto nuevo: nombre único y el actual queda en la biblioteca
  const b = await run({ '/old.pug': 'p old' }, '/old.pug');
  await b.orch.saveToLibrary();
  const shared = { projectName: 'Mi proyecto', files: new Map([['/main.pug', 'p nuevo']]), assets: [], data: {} };
  const first = await b.orch.openShared(shared, 'new');
  const second = await b.orch.openShared({ ...shared, projectName: first }, 'new');
  check('30 abrir como proyecto nuevo da un nombre', typeof first === 'string' && first.startsWith('Mi proyecto') && typeof second === 'string', `${first} | ${second}`);
  check('30 el proyecto abierto es el del enlace', b.EditorState.files().has('/main.pug') && !b.EditorState.files().has('/old.pug'));
}
