import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { main, parseArgs, pickVersionCommit } from '../../scripts/release.mjs';

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

/** Un «origin» de mentira (repositorio vacío) y una copia de trabajo con una versión 0.7.0 publicada y la 0.8.0 mergeada. */
function fixture() {
  const tmp = mkdtempSync(join(tmpdir(), 'pugide-deploy-'));
  const origin = join(tmp, 'origin.git');
  const work = join(tmp, 'work');
  mkdirSync(origin);
  git(origin, 'init', '--bare', '-b', 'master');
  mkdirSync(work);
  git(work, 'init', '-b', 'master');
  git(work, 'config', 'user.email', 'test@example.com');
  git(work, 'config', 'user.name', 'Test');
  git(work, 'remote', 'add', 'origin', origin);
  const write = (file, text) => { mkdirSync(join(work, file, '..'), { recursive: true }); writeFileSync(join(work, file), text); };
  const version = (v, notes) => {
    write('package.json', JSON.stringify({ version: v }));
    write('CHANGELOG.md', `# Changelog\n\n## [Sin publicar]\n\n## [${v}] - 2026-11-09\n\n${notes}\n\n## [0.7.0] - 2026-01-01\n\nViejo.\n`);
  };
  version('0.7.0', 'Notas 0.7.0.');
  git(work, 'add', '-A'); git(work, 'commit', '-m', 'v0.7.0');
  git(work, 'push', 'origin', 'master:master', 'master:release');
  git(work, 'checkout', '-b', 'feature');
  version('0.8.0', 'Notas 0.8.0 con **negrita**.');
  write('docs/releases/v0.8.0.md', 'guía');
  git(work, 'add', '-A'); git(work, 'commit', '-m', 'chore(release): 0.8.0');
  git(work, 'checkout', 'master');
  git(work, 'merge', '--no-ff', 'feature', '-m', 'Merge PR de la 0.8.0');
  const merge = git(work, 'rev-parse', 'HEAD');
  write('otra.txt', 'x'); git(work, 'add', '-A'); git(work, 'commit', '-m', 'trabajo posterior de la 0.9');
  git(work, 'push', 'origin', 'master:master');
  // `gh` de mentira: apunta lo que le piden y simula que la release existe después de crearla
  const gh = join(tmp, 'gh');
  writeFileSync(gh, `#!/usr/bin/env node
const fs = require('fs'); const d = ${JSON.stringify(tmp)};
const a = process.argv.slice(2); fs.appendFileSync(d + '/gh.log', a.join(' ') + '\\n');
if (a[0] === 'release' && a[1] === 'view') process.exit(fs.existsSync(d + '/created') ? 0 : 1);
if (a[0] === 'release' && a[1] === 'create') { fs.writeFileSync(d + '/created', '1'); fs.copyFileSync(a[a.indexOf('--notes-file') + 1], d + '/notas.copy'); process.exit(0); }
process.exit(2);
`);
  chmodSync(gh, 0o755);
  return { tmp, origin, work, merge, gh };
}

async function run(fx, argv) {
  const cwd = process.cwd();
  const out = [];
  const real = console.log;
  console.log = (...m) => out.push(m.join(' '));
  process.chdir(fx.work);
  try {
    const code = await main(argv, { ...process.env, PUGIDE_GH: fx.gh });
    return { code, out: out.join('\n'), error: null };
  } catch (err) {
    return { code: 1, out: out.join('\n'), error: err.message };
  } finally {
    process.chdir(cwd);
    console.log = real;
  }
}
const remoteRef = (fx, ref) => git(fx.origin, 'rev-parse', '--verify', '-q', ref);
const hasRemoteTag = (fx, tag) => spawnSync('git', ['rev-parse', '--verify', '-q', `refs/tags/${tag}`], { cwd: fx.origin }).status === 0;

test('parseArgs lee la versión y las opciones', () => {
  assert.deepEqual({ ...parseArgs(['0.9.0']) }, { version: '0.9.0', yes: false, dryRun: false, noProd: false, sha: '', remote: 'origin', error: '' });
  const a = parseArgs(['0.9.0', '--dry-run', '--no-prod', '--yes', '--sha', 'abc', '--remote', 'up']);
  assert.ok(a.dryRun && a.noProd && a.yes && a.sha === 'abc' && a.remote === 'up');
  assert.equal(parseArgs([]).version, '');
  assert.equal(parseArgs([]).error, '');
  assert.match(parseArgs(['0.9']).error, /Argumento no reconocido/);
});

test('pickVersionCommit elige el commit más antiguo de la racha que lleva la versión', () => {
  const list = [{ sha: 'd', version: '0.9.0' }, { sha: 'c', version: '0.8.0' }, { sha: 'b', version: '0.8.0' }, { sha: 'a', version: '0.7.0' }];
  assert.equal(pickVersionCommit(list, '0.8.0'), 'b');
  assert.equal(pickVersionCommit(list, '0.9.0'), 'd');
  assert.equal(pickVersionCommit(list, '1.0.0'), null);
});

test('simulacro: comprueba y cuenta, pero no cambia nada', async () => {
  const fx = fixture();
  const r = await run(fx, ['0.8.0', '--dry-run']);
  assert.equal(r.error, null, r.out);
  assert.match(r.out, /simulacro/);
  assert.equal(hasRemoteTag(fx, 'v0.8.0'), false);
  assert.equal(existsSync(join(fx.tmp, 'created')), false);
  assert.notEqual(remoteRef(fx, 'refs/heads/release'), fx.merge);
});

test('publica la versión con un solo comando: tag, release de GitHub y rama release en el merge de la versión', async () => {
  const fx = fixture();
  const r = await run(fx, ['0.8.0']);
  assert.equal(r.error, null, r.out);
  assert.equal(remoteRef(fx, 'v0.8.0^{commit}'), fx.merge, 'el tag apunta al merge de la versión, no a la punta de master');
  assert.equal(remoteRef(fx, 'refs/heads/release'), fx.merge, 'release queda en el merge de la versión');
  assert.notEqual(remoteRef(fx, 'refs/heads/master'), fx.merge, 'y master ha seguido adelante');
  assert.match(readFileSync(join(fx.tmp, 'gh.log'), 'utf8'), /release create v0\.8\.0 --title PugIDE 0\.8\.0 --notes-file .*--verify-tag/);
  const notes = readFileSync(join(fx.tmp, 'notas.copy'), 'utf8');
  assert.match(notes, /Notas 0\.8\.0 con \*\*negrita\*\*\./);
  assert.ok(!notes.includes('Viejo.') && !notes.includes('## ['), 'solo las notas de esa versión');
  assert.match(r.out, /Vercel/);
});

test('se puede repetir: lo que ya está hecho se salta', async () => {
  const fx = fixture();
  assert.equal((await run(fx, ['0.8.0'])).error, null);
  const again = await run(fx, ['0.8.0']);
  assert.equal(again.error, null, again.out);
  assert.match(again.out, /ya existe en el remoto/);
  assert.match(again.out, /nada que hacer/);
  assert.equal((readFileSync(join(fx.tmp, 'gh.log'), 'utf8').match(/release create/g) ?? []).length, 1);
});

test('--no-prod hace el tag y la release pero no toca release', async () => {
  const fx = fixture();
  const before = remoteRef(fx, 'refs/heads/release');
  const r = await run(fx, ['0.8.0', '--no-prod']);
  assert.equal(r.error, null, r.out);
  assert.equal(hasRemoteTag(fx, 'v0.8.0'), true);
  assert.equal(remoteRef(fx, 'refs/heads/release'), before);
});

test('si release no es fast-forward, no se fuerza nada y avisa', async () => {
  const fx = fixture();
  git(fx.work, 'checkout', '-b', 'otra', 'master~2');
  writeFileSync(join(fx.work, 'raro.txt'), 'r'); git(fx.work, 'add', '-A'); git(fx.work, 'commit', '-m', 'algo solo en release');
  git(fx.work, 'push', '-f', 'origin', 'otra:release');
  const diverged = remoteRef(fx, 'refs/heads/release');
  const r = await run(fx, ['0.8.0']);
  assert.match(r.error ?? '', /NO es fast-forward/);
  assert.equal(remoteRef(fx, 'refs/heads/release'), diverged, 'release queda como estaba');
});

test('un tag que ya apunta a otro commit se rechaza', async () => {
  const fx = fixture();
  git(fx.work, 'tag', '-a', 'v0.8.0', 'master', '-m', 'mal');
  git(fx.work, 'push', 'origin', 'v0.8.0');
  const r = await run(fx, ['0.8.0']);
  assert.match(r.error ?? '', /ya existe y apunta a/);
});

test('sin commit de esa versión en master, dice que falta el merge', async () => {
  const fx = fixture();
  const r = await run(fx, ['0.9.0']);
  assert.match(r.error ?? '', /ningún commit con la versión 0\.9\.0/);
});

test('sin pasarle nada lee la versión que declara master y se pone en master', async () => {
  const fx = fixture();
  git(fx.work, 'checkout', '-b', 'mi-rama');
  const r = await run(fx, []);
  assert.equal(r.error, null, r.out);
  assert.match(r.out, /versión: 0\.8\.0 {2}\(la que declara master\)/);
  assert.equal(git(fx.work, 'rev-parse', '--abbrev-ref', 'HEAD'), 'master', 'la copia local acaba en master');
  assert.equal(git(fx.work, 'rev-parse', 'HEAD'), remoteRef(fx, 'refs/heads/master'), 'y al día');
  assert.equal(remoteRef(fx, 'v0.8.0^{commit}'), fx.merge);
  assert.equal(remoteRef(fx, 'refs/heads/release'), fx.merge);
});

test('con cambios sin guardar no cambia de rama pero publica igual', async () => {
  const fx = fixture();
  git(fx.work, 'checkout', '-b', 'mi-rama');
  writeFileSync(join(fx.work, 'borrador.txt'), 'sin guardar');
  const r = await run(fx, []);
  assert.equal(r.error, null, r.out);
  assert.match(r.out, /cambios sin guardar/);
  assert.equal(git(fx.work, 'rev-parse', '--abbrev-ref', 'HEAD'), 'mi-rama');
  assert.equal(remoteRef(fx, 'refs/heads/release'), fx.merge);
});
