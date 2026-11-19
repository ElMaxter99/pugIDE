// Prueba de actualización de punta a punta (Linux, AppImage): construye de verdad una versión vieja (0.99.0) y una nueva
// (0.99.1), sirve la nueva desde un servidor local que hace de GitHub, abre la vieja, descarga e instala, y comprueba que
// el archivo .AppImage ha pasado a ser el de la nueva. Después repite con la huella (SHA-512) alterada: debe negarse a
// instalar y dejar el archivo viejo intacto. No toca la red real ni el código de la app: solo banderas de Chromium
// (`--host-resolver-rules`, `--ignore-certificate-errors`) que se pasan al lanzar la prueba.
//
//   npm run build:prod                      (en la raíz; la web compilada va dentro del AppImage)
//   cd desktop && xvfb-run -a node test/update-e2e.mjs
//
// Hace falta `openssl` y poder escuchar en un puerto (por defecto 8443, PUGIDE_UPDATE_E2E_PORT). Tarda unos minutos
// (construye dos AppImage). Guía: docs/ACTUALIZAR-ESCRITORIO.md, apartado 3.
import { _electron as electron } from 'playwright-core';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'linux') { console.log('SKIP esta prueba es de Linux (AppImage)'); process.exit(0); }
const desktopDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PUGIDE_UPDATE_E2E_PORT || 8443);
const OLD = '0.99.0';
const NEW = '0.99.1';
const REPO = 'ElMaxter99/pugIDE';
let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || !detail ? '' : `  -> ${detail}`}`); if (!ok) failed++; };
const step = (m) => console.log(`... ${m}`);
const wait = async (fn, ms = 60000) => { const end = Date.now() + ms; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 300)); } return null; };
const sha = (file) => createHash('sha512').update(readFileSync(file)).digest('base64');
let work = '';
const watchdog = setTimeout(() => { console.log('FAIL la prueba no terminó en 10 minutos'); spawnSync('pkill', ['-9', '-f', work]); process.exit(1); }, 10 * 60 * 1000);
watchdog.unref?.();

work = mkdtempSync(join(tmpdir(), 'pugide-update-e2e-'));
const out = { old: join(work, 'out-old'), new: join(work, 'out-new') };

function build(version, dir) {
  step(`construyendo el AppImage ${version}`);
  const r = spawnSync('npx', ['electron-builder', '--linux', 'AppImage', '--publish', 'never', `-c.extraMetadata.version=${version}`, `-c.directories.output=${dir}`], { cwd: desktopDir, encoding: 'utf8' });
  if (r.status !== 0) { console.log(r.stdout?.slice(-2000), r.stderr?.slice(-2000)); throw new Error(`no se pudo construir ${version}`); }
  const image = readdirSync(dir).find((f) => f.endsWith('.AppImage'));
  if (!image) throw new Error(`falta el AppImage de ${version}`);
  return { image: join(dir, image), name: image, yml: join(dir, 'latest-linux.yml') };
}

const oldBuild = build(OLD, out.old);
const newBuild = build(NEW, out.new);

// Certificado de usar y tirar para «github.com» y «api.github.com» (solo lo acepta el Electron de la prueba).
const key = join(work, 'key.pem');
const crt = join(work, 'crt.pem');
const ssl = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', crt, '-days', '1', '-subj', '/CN=github.com', '-addext', 'subjectAltName=DNS:github.com,DNS:api.github.com'], { encoding: 'utf8' });
if (ssl.status !== 0) throw new Error(`openssl: ${ssl.stderr}`);

let tamper = false;
const server = createServer({ key: readFileSync(key), cert: readFileSync(crt) }, (req, res) => {
  const url = new URL(req.url, 'https://x');
  if (url.pathname === `/repos/${REPO}/releases`) {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify([{ tag_name: `v${NEW}`, draft: false, prerelease: false }]));
    return;
  }
  const base = `/${REPO}/releases/download/v${NEW}/`;
  if (url.pathname.startsWith(base)) {
    const name = decodeURIComponent(url.pathname.slice(base.length));
    if (name === 'latest-linux.yml') {
      let text = readFileSync(newBuild.yml, 'utf8');
      if (tamper) text = text.replace(/sha512: \S+/g, 'sha512: AAAA' + 'A'.repeat(84) + '==');
      res.setHeader('content-type', 'text/yaml');
      res.end(text);
      return;
    }
    const file = join(out.new, name);
    if (name === newBuild.name && existsSync(file)) {
      res.setHeader('content-length', statSync(file).size);
      createReadStream(file).pipe(res);
      return;
    }
  }
  res.statusCode = 404; // también el .blockmap: sin él, la descarga es completa
  res.end('no');
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
step(`servidor falso de GitHub en https://127.0.0.1:${PORT}`);

async function run(label, expect) {
  const dir = join(work, label);
  mkdirSync(dir);
  const target = join(dir, 'PugIDE.AppImage');
  copyFileSync(oldBuild.image, target);
  const before = sha(target);
  const profile = mkdtempSync(join(tmpdir(), 'pugide-update-perfil-'));
  const app = await electron.launch({
    timeout: 120000,
    executablePath: target,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--user-data-dir=${profile}`, `--host-resolver-rules=MAP api.github.com 127.0.0.1:${PORT}, MAP github.com 127.0.0.1:${PORT}`, '--ignore-certificate-errors', '--no-proxy-server'],
    env: { ...process.env, APPIMAGE: target, APPIMAGE_EXTRACT_AND_RUN: '1', ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
  });
  try {
    const page = await app.firstWindow();
    await page.waitForURL(/^pugide:\/\/app\//, { timeout: 90000 });
    const invoke = (channel, payload) => page.evaluate(([c, p]) => window.pugideDesktop.invoke(c, p), [channel, payload ?? null]);
    const info = await page.evaluate(() => window.pugideDesktop.version);
    check(`${label}: abre la versión vieja (${OLD})`, info === OLD, info);
    await invoke('upd:answer', { enabled: true });
    const found = await wait(async () => { const s = await invoke('upd:state'); return s.latest?.version === NEW ? s : null; }, 30000);
    check(`${label}: encuentra la ${NEW} en el canal estable`, !!found, JSON.stringify(await invoke('upd:state')).slice(0, 300));
    if (!found) return;
    check(`${label}: esta instalación se actualiza sola (AppImage)`, found.install === 'appimage' && found.self?.canUpdate === true, `${found.install} ${found.self?.cannotReason}`);
    await invoke('upd:update');
    if (expect === 'ok') {
      const ready = await wait(async () => { const s = await invoke('upd:state'); return s.self?.phase === 'ready' ? s : null; }, 180000);
      check(`${label}: descarga la ${NEW} y queda lista`, !!ready && ready.self.version === NEW, JSON.stringify((await invoke('upd:state')).self));
      if (!ready) return;
      check(`${label}: el archivo viejo sigue intacto hasta reiniciar`, sha(target) === before);
      const exited = new Promise((r) => app.process().once('exit', r));
      await invoke('upd:install', { when: 'now' }).catch(() => undefined);
      await Promise.race([exited, new Promise((r) => setTimeout(r, 60000))]);
      const replaced = await wait(() => sha(target) === newBuild.sum, 60000);
      check(`${label}: tras reiniciar, el AppImage es el de la ${NEW}`, !!replaced);
    } else {
      const bad = await wait(async () => { const s = await invoke('upd:state'); return s.self?.phase === 'error' ? s : null; }, 180000);
      check(`${label}: con la huella alterada se niega («checksum»)`, !!bad && bad.self.error === 'checksum', JSON.stringify((await invoke('upd:state')).self));
      check(`${label}: el archivo viejo queda intacto`, sha(target) === before);
    }
  } finally {
    // La versión nueva se relanza sola tras instalar y queda huérfana: se mata primero, y cerrar la app no puede colgar la prueba
    // (en el runner de GitHub esperar a `app.close()` agotó el tiempo del paso aunque todo había pasado).
    spawnSync('pkill', ['-f', work]);
    await Promise.race([app.close().catch(() => undefined), new Promise((r) => setTimeout(r, 15000))]);
    spawnSync('pkill', ['-9', '-f', work]);
    rmSync(profile, { recursive: true, force: true });
  }
}

newBuild.sum = sha(newBuild.image);
try {
  tamper = true;
  await run('huella-alterada', 'checksum');
  tamper = false;
  await run('actualizacion-buena', 'ok');
} catch (err) {
  check('la prueba termina sin excepciones', false, String(err?.stack || err).slice(0, 600));
} finally {
  server.close();
  rmSync(work, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} FALLOS` : '\ntodo bien');
process.exit(failed ? 1 : 0);
