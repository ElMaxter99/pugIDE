// Publica una versión de PugIDE con UN comando: tag, release de GitHub y producción (rama `release`).
//
//   npm run release:deploy                       (lo hace todo, sin pasarle nada; ejecutarlo ya es la confirmación)
//   npm run release:deploy -- --dry-run          (solo comprueba y cuenta qué haría)
//   npm run release:deploy -- --no-prod          (tag y release de GitHub, sin avanzar `release`)
//   npm run release:deploy -- 0.9.0              (una versión concreta, por si master ya declara otra)
//   Opciones: --sha <commit> (por defecto, el merge de la versión en origin/master), --remote <nombre> (origin).
//   `--yes` se acepta y no hace nada (ya no se pregunta).
//
// Qué hace, en orden, y se puede repetir sin miedo (lo que ya está hecho se salta):
//   1. Se pone en `master` y lo actualiza (si no tienes cambios sin guardar), trae `release` y los tags, lee la versión que
//      declara master (o la que le pidas) y encuentra su commit: el primero de master con ese número. No hay que escribir ningún SHA.
//   2. Comprueba que ese commit lleva la versión en package.json, su sección fechada del CHANGELOG y su guía docs/releases.
//   3. Crea y sube el tag anotado vX.Y.Z (si ya existe, comprueba que apunta a ese commit).
//   4. Crea la release de GitHub con las notas del CHANGELOG (con `gh`; si ya existe, la deja).
//   5. Deja la rama `release` (la de producción en Vercel) en ese commit, solo si es fast-forward. Después, en Vercel
//      (Deployments), se despliega la rama `release` a mano.
// Necesita git con permiso de push de tags y de `release`, y `gh` con sesión iniciada. Es de Node: sin awk ni sed.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseNotes } from './release-notes.mjs';

export function parseArgs(argv) {
  const out = { version: '', yes: false, dryRun: false, noProd: false, sha: '', remote: 'origin', error: '' };
  const rest = [...argv];
  while (rest.length) {
    const a = rest.shift();
    if (a === '--yes' || a === '-y') out.yes = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--no-prod') out.noProd = true;
    else if (a === '--sha') out.sha = rest.shift() ?? '';
    else if (a === '--remote') out.remote = rest.shift() ?? 'origin';
    else if (/^\d+\.\d+\.\d+$/.test(a)) out.version = a;
    else out.error = `Argumento no reconocido: ${a}`;
  }
  return out;
}

/**
 * De los commits de la rama principal (del más nuevo al más viejo, con la versión de su package.json), el commit de la
 * versión es el más antiguo de la racha que la lleva: el merge del PR de la versión, aunque `master` ya haya avanzado.
 */
export function pickVersionCommit(commits, version) {
  let found = null;
  for (const c of commits) {
    if (c.version === version) found = c.sha;
    else if (found) break;
  }
  return found;
}

const log = (m = '') => console.log(m);
const step = (n, m) => log(`\n[${n}] ${m}`);

function run(cmd, args, { cwd, input, allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { cwd, input, encoding: 'utf8' });
  if (r.error) throw new Error(`No se pudo ejecutar «${cmd}»: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) throw new Error(`«${cmd} ${args.join(' ')}» falló:\n${(r.stderr || r.stdout || '').trim()}`);
  return { status: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

export async function main(argv, env = process.env) {
  const args = parseArgs(argv);
  if (args.error) {
    console.error(`${args.error}\nUso: npm run release:deploy [-- [X.Y.Z] [--dry-run] [--no-prod] [--sha COMMIT] [--remote origin]]`);
    return 2;
  }
  const { remote } = args;
  const GH = env.PUGIDE_GH || 'gh';
  const root = run('git', ['rev-parse', '--show-toplevel']).out;
  const git = (a, o = {}) => run('git', a, { cwd: root, ...o });
  const dry = args.dryRun;
  log(`Publicar versión${dry ? '  (simulacro: no se cambia nada)' : ''}`);

  // 1. Commit de la versión
  step(1, `Ponerse en master, traer ${remote}/master, ${remote}/release y los tags`);
  git(['fetch', remote, 'master', 'release', '--tags', '--force']);
  if (!dry) {
    if (git(['status', '--porcelain']).out) log('    hay cambios sin guardar en tu copia: no se cambia de rama (no hace falta para publicar)');
    else {
      if (git(['rev-parse', '--abbrev-ref', 'HEAD']).out !== 'master') git(['checkout', 'master'], { allowFail: true });
      const ff = git(['merge', '--ff-only', `${remote}/master`], { allowFail: true });
      log(ff.status === 0 ? '    ✓ tu copia está en master y al día' : '    ⚠ master local tiene commits propios: no se actualiza (no hace falta para publicar)');
    }
  }
  const version = args.version || JSON.parse(git(['show', `${remote}/master:package.json`]).out).version;
  const tag = `v${version}`;
  log(`    versión: ${version}${args.version ? '' : '  (la que declara master)'}`);
  let sha = args.sha ? git(['rev-parse', '--verify', `${args.sha}^{commit}`]).out : '';
  if (!sha) {
    const shas = git(['rev-list', '--first-parent', `${remote}/master`]).out.split('\n').filter(Boolean);
    const commits = [];
    for (const s of shas) {
      const pkg = git(['show', `${s}:package.json`], { allowFail: true });
      commits.push({ sha: s, version: pkg.status === 0 ? JSON.parse(pkg.out).version : null });
    }
    sha = pickVersionCommit(commits, version) ?? '';
  }
  if (!sha) throw new Error(`No hay en ${remote}/master ningún commit con la versión ${version} en package.json. ¿Está mergeado el PR de la versión?`);
  log(`    commit de la versión: ${sha.slice(0, 7)}  ${git(['log', '-1', '--format=%s', sha]).out}`);
  if (git(['merge-base', '--is-ancestor', sha, `${remote}/master`], { allowFail: true }).status !== 0) throw new Error(`${sha.slice(0, 7)} no está en ${remote}/master.`);

  // 2. Comprobaciones sobre ese commit
  step(2, 'Comprobar que la versión cuadra en ese commit');
  const pkgVersion = JSON.parse(git(['show', `${sha}:package.json`]).out).version;
  const changelog = git(['show', `${sha}:CHANGELOG.md`]).out;
  const checks = [
    [`package.json dice ${pkgVersion}`, pkgVersion === version],
    ['CHANGELOG con su sección fechada', new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\] - \\d{4}-\\d{2}-\\d{2}`, 'm').test(changelog)],
  ];
  for (const [name, ok] of checks) log(`    ${ok ? '✓' : '✗'} ${name}`);
  // La guía no es imprescindible para publicar (las versiones anteriores a la regla no la tienen): solo se avisa.
  if (git(['cat-file', '-e', `${sha}:docs/releases/${tag}.md`], { allowFail: true }).status !== 0) log(`    ⚠ ese commit no lleva docs/releases/${tag}.md (la guía de la versión)`);
  if (checks.some(([, ok]) => !ok)) throw new Error('La versión no cuadra en ese commit: corrige el PR de la versión antes de publicar.');
  const notes = releaseNotes(version, changelog);
  if (!notes) throw new Error(`No hay notas de ${version} en el CHANGELOG.`);

  // 3. Tag
  step(3, `Tag ${tag}`);
  const remoteTag = git(['ls-remote', '--tags', remote, `refs/tags/${tag}^{}`, `refs/tags/${tag}`]).out;
  const localTag = git(['rev-list', '-n', '1', tag], { allowFail: true });
  const tagSha = localTag.status === 0 ? localTag.out : '';
  if (tagSha && tagSha !== sha) throw new Error(`El tag ${tag} ya existe y apunta a ${tagSha.slice(0, 7)}, no a ${sha.slice(0, 7)}. Un tag publicado no se mueve: investígalo.`);
  if (remoteTag && !tagSha) throw new Error(`El tag ${tag} existe en ${remote} pero no se pudo leer: ejecuta «git fetch ${remote} --tags» y repite.`);
  if (tagSha && remoteTag) log('    ya existe en el remoto y apunta a ese commit: se deja');
  else if (dry) log(`    (simulacro) crearía y subiría el tag anotado ${tag} sobre ${sha.slice(0, 7)}`);
  else {
    if (!tagSha) git(['tag', '-a', tag, sha, '-m', `PugIDE ${version}`]);
    git(['push', remote, tag]);
    log(`    ✓ tag ${tag} subido`);
  }

  // 4. Release de GitHub
  step(4, 'Release de GitHub');
  const view = run(GH, ['release', 'view', tag], { cwd: root, allowFail: true });
  if (view.status === 0) log('    ya existe: se deja');
  else if (dry) log(`    (simulacro) crearía la release «PugIDE ${version}» con las notas del CHANGELOG`);
  else {
    const dir = mkdtempSync(join(tmpdir(), 'pugide-release-'));
    const file = join(dir, 'notas.md');
    writeFileSync(file, notes);
    try {
      run(GH, ['release', 'create', tag, '--title', `PugIDE ${version}`, '--notes-file', file, '--verify-tag'], { cwd: root });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    log('    ✓ release creada');
  }

  // 5. Producción
  step(5, `Rama de producción: dejar ${remote}/release en el commit de la versión`);
  if (args.noProd) {
    log('    --no-prod: no se toca la rama release');
    return 0;
  }
  const current = git(['rev-parse', `${remote}/release`], { allowFail: true }).out;
  if (current === sha) log(`    release ya está en ${sha.slice(0, 7)}: nada que hacer`);
  else {
    if (current && git(['merge-base', '--is-ancestor', current, sha], { allowFail: true }).status !== 0) {
      throw new Error(`release (${current.slice(0, 7)}) tiene algo que ${sha.slice(0, 7)} no tiene: NO es fast-forward. No se fuerza nada: investígalo.`);
    }
    log(`    release: ${current ? current.slice(0, 7) : '(nueva)'} → ${sha.slice(0, 7)}  (fast-forward)`);
    if (dry) log('    (simulacro) avanzaría release');
    else {
      git(['push', remote, `${sha}:refs/heads/release`]);
      log(`    ✓ la rama release está en ${sha.slice(0, 7)}`);
    }
  }

  log(`\nHecho${dry ? ' (simulacro)' : ''}. Lo único que queda es desplegar a mano en Vercel:`);
  log('  1. Vercel → proyecto pug-ide → Deployments → el despliegue de la rama «release» (commit ' + sha.slice(0, 7) + ') → Promote to Production / Redeploy,');
  log('     o, si la rama de producción es «release», el push ya lo habrá lanzado: comprueba que su despliegue está en verde.');
  log('  2. Comprobación en una ventana de incógnito: el Workspace muestra v' + version + ', Ctrl+V pega en el editor y la consola no enseña violaciones de CSP.');
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (err) => { console.error(`\n✗ ${err.message}`); process.exit(1); });
}
