import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { detect, run, describeCommand, cliArgs, parseLine, MODEL_RE } = require('../../desktop/src/ai-cli.cjs');
const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const bins = { claude: fixture('fake-claude.cjs'), copilot: fixture('fake-copilot.cjs') };
const runAll = (opts) => new Promise((resolve) => {
  const events = [];
  const handle = run({ bins, ...opts }, (e) => { events.push(e); if (e.type === 'done' || e.type === 'error') resolve({ events, last: e, handle }); });
  opts.onHandle?.(handle);
});

test('las CLI se lanzan sin herramientas, sin ajustes del proyecto y con el modelo elegido', () => {
  const c = cliArgs('claude', 'sonnet');
  assert.deepEqual(c.slice(c.indexOf('--tools'), c.indexOf('--tools') + 2), ['--tools', '']);
  for (const flag of ['-p', '--safe-mode', '--strict-mcp-config', '--no-session-persistence']) assert.ok(c.includes(flag), flag);
  assert.equal(c[c.indexOf('--model') + 1], 'sonnet');
  const p = cliArgs('copilot', 'claude-sonnet-5.5');
  for (const flag of ['--available-tools', '--disable-builtin-mcps', '--no-custom-instructions', '--no-ask-user']) assert.ok(p.includes(flag), flag);
  assert.ok(!p.includes('-p'), 'el texto va por la entrada estándar, no como argumento');
  assert.match(describeCommand('claude', 'sonnet'), /^claude -p .*--tools "" .*< mensaje\.txt$/);
});

test('solo se aceptan nombres de modelo sin nada que el shell pueda leer', () => {
  for (const ok of ['sonnet', 'claude-sonnet-5.5', 'gpt-5.2', 'opus']) assert.ok(MODEL_RE.test(ok), ok);
  for (const bad of ['', 'a b', 'x;rm', '$(id)', 'a&b', '-p']) assert.ok(!MODEL_RE.test(bad), bad);
  assert.throws(() => run({ provider: 'claude', model: 'x;rm', prompt: '' }, () => {}), /modelo/);
  assert.throws(() => run({ provider: 'otro', model: 'x', prompt: '' }, () => {}), /Proveedor/);
});

test('lee la salida real de Claude Code (stream-json): estado, texto, tokens y resultado', () => {
  const state = {};
  const events = readFileSync(fixture('claude-stream.jsonl'), 'utf8').split('\n').filter(Boolean).flatMap((l) => parseLine('claude', l, state));
  assert.ok(events.some((e) => e.type === 'status' && /claude-sonnet-5-5/.test(e.text)));
  assert.ok(events.some((e) => e.type === 'text' && e.delta.includes('"ok"')));
  const final = events.find((e) => e.type === 'final');
  assert.equal(final.text, '{"ok": true}');
  assert.equal(final.output, 9);
  assert.ok(final.input > 2000, 'la entrada cuenta también la caché');
  assert.ok(final.costUsd > 0);
});

test('lee la salida de Copilot (JSONL de eventos)', () => {
  const state = {};
  const lines = [
    { type: 'assistant.message_delta', data: { deltaContent: 'a' } },
    { type: 'assistant.message', data: { content: 'abc' } },
    { type: 'assistant.usage', data: { inputTokens: 5, outputTokens: 7 } },
  ].map((o) => JSON.stringify(o));
  const events = lines.flatMap((l) => parseLine('copilot', l, state));
  assert.deepEqual(events.find((e) => e.type === 'usage'), { type: 'usage', input: 5, output: 7 });
  assert.equal(state.message, 'abc');
  assert.deepEqual(parseLine('copilot', 'no es json', {}), []);
});

test('detecta las CLI instaladas y su versión; una que no está se dice', async () => {
  const found = await detect(bins);
  assert.equal(found.claude.available, true);
  assert.match(found.claude.version, /Claude Code/);
  assert.equal(found.copilot.available, true);
  const missing = await detect({ claude: '/no/existe/claude', copilot: '/no/existe/copilot' });
  assert.equal(missing.claude.available, false);
  assert.equal(missing.copilot.version, null);
});

test('una petición con Claude Code: el texto entra por la entrada estándar y llega el resultado con sus tokens', async () => {
  const { events, last } = await runAll({ provider: 'claude', model: 'sonnet', prompt: 'x'.repeat(5000), env: { ...process.env, FAKE_REPLY: '{"proposals":[]}' } });
  assert.equal(events[0].type, 'start');
  assert.match(events[0].command, /^claude -p/);
  assert.equal(last.type, 'done', JSON.stringify(last));
  assert.equal(last.text, '{"proposals":[]}');
  assert.deepEqual(last.usage, { input: 100, output: 100 });
  assert.ok(events.some((e) => e.type === 'usage'));
});

test('una petición con Copilot: sin resultado final, vale la respuesta recibida', async () => {
  const { last } = await runAll({ provider: 'copilot', model: 'claude-sonnet-5.5', prompt: 'hola' });
  assert.equal(last.type, 'done', JSON.stringify(last));
  assert.equal(last.text, 'Hola mundo');
  assert.deepEqual(last.usage, { input: 1200, output: 34 });
});

test('si la CLI falla, se ve su mensaje', async () => {
  const { last } = await runAll({ provider: 'copilot', model: 'gpt-5.2', prompt: 'hola', env: { ...process.env, FAKE_FAIL: '1' } });
  assert.equal(last.type, 'error');
  assert.match(last.message, /not logged in/);
});

test('se corta al superar el límite de salida y se puede detener', async () => {
  const limited = await runAll({ provider: 'claude', model: 'sonnet', prompt: 'x', maxOutputTokens: 250, env: { ...process.env, FAKE_CHUNKS: '10', FAKE_DELAY: '30' } });
  assert.equal(limited.last.type, 'error');
  assert.match(limited.last.message, /límite de 250/);
  let handle;
  const stopped = runAll({ provider: 'claude', model: 'sonnet', prompt: 'x', env: { ...process.env, FAKE_CHUNKS: '50', FAKE_DELAY: '40' }, onHandle: (h) => { handle = h; } });
  setTimeout(() => handle.cancel(), 120);
  const { last } = await stopped;
  assert.equal(last.type, 'error');
  assert.equal(last.cancelled, true);
  assert.ok(last.usage.output > 0, 'cuenta lo que llegó a gastar');
});

test('puente local: solo atiende a PugIDE en localhost y transmite los eventos', async () => {
  const { createBridge } = await import('../../scripts/ai-bridge.mjs');
  const server = createBridge({ bins });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Origin: 'http://localhost:4200', 'X-PugIDE-Bridge': '1', 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(`${base}/ai/detect`, { headers: { Origin: 'https://pug-ide.vercel.app', 'X-PugIDE-Bridge': '1' } })).status, 403, 'otra web: rechazada');
    assert.equal((await fetch(`${base}/ai/detect`)).status, 403, 'sin Origin: rechazada');
    assert.equal((await fetch(`${base}/ai/detect`, { headers: { Origin: 'http://localhost:4200' } })).status, 400, 'sin la cabecera propia: rechazada');
    const detected = await (await fetch(`${base}/ai/detect`, { headers })).json();
    assert.equal(detected.claude.available, true);
    const res = await fetch(`${base}/ai/run`, { method: 'POST', headers, body: JSON.stringify({ provider: 'claude', model: 'sonnet', prompt: 'hola' }) });
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:4200');
    const lines = (await res.text()).trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(lines[0].type, 'run');
    assert.equal(lines.at(-1).type, 'done');
    const bad = await fetch(`${base}/ai/run`, { method: 'POST', headers, body: JSON.stringify({ provider: 'claude', model: '$(id)', prompt: 'x' }) });
    assert.match(await bad.text(), /modelo/);
  } finally {
    server.close();
  }
});

test('la orden que enseña la interfaz es la misma que se lanza', async () => {
  const { describeCliCommand } = await import('./.build/units.mjs');
  for (const [p, m] of [['claude', 'sonnet'], ['copilot', 'claude-sonnet-5.5']]) assert.equal(describeCliCommand(p, m), describeCommand(p, m));
});
