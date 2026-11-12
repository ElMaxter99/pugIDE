'use strict';
/**
 * Asistente de IA (P-30 a P-34): lanza la CLI que la persona ya tiene instalada y con sesión iniciada
 * (`claude` de Claude Code o `copilot` de GitHub Copilot), en modo no interactivo y SIN herramientas: la IA no puede
 * leer ni escribir archivos ni ejecutar órdenes; solo recibe por la entrada estándar el texto que la persona ha visto
 * y devuelve una respuesta. Lo usan la app de escritorio (proceso principal) y el puente local de `npm run ia`.
 *
 * Nada de esto existe en la web publicada: allí no hay proceso que pueda lanzar una CLI.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** Nombres de modelo aceptados: alias (`sonnet`) o nombres completos (`claude-sonnet-5.5`). Nada que el shell pueda leer. */
const MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const PROVIDERS = ['claude', 'copilot'];

/**
 * Argumentos de cada CLI. El texto va por la entrada estándar (no como argumento), así no hay límites de longitud de la
 * línea de órdenes de Windows ni nada que el shell pueda interpretar.
 */
function cliArgs(provider, model) {
  if (provider === 'claude') {
    return [
      '-p',
      '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
      '--model', model,
      // Sin herramientas, sin CLAUDE.md/hooks/MCP/ajustes del proyecto y sin guardar la sesión.
      '--tools', '',
      '--safe-mode',
      '--strict-mcp-config',
      '--no-session-persistence',
    ];
  }
  return [
    '--output-format', 'json',
    '--model', model,
    // Sin herramientas ni servidores MCP, sin instrucciones del repositorio y sin preguntas.
    '--available-tools',
    '--disable-builtin-mcps',
    '--no-custom-instructions',
    '--no-ask-user',
    '--no-auto-update',
  ];
}

/** Orden tal como se enseña a la persona («Ver la orden exacta»). */
function describeCommand(provider, model) {
  const quote = (a) => (a === '' ? '""' : /[\s"]/.test(a) ? JSON.stringify(a) : a);
  return [provider, ...cliArgs(provider, model)].map(quote).join(' ') + ' < mensaje.txt';
}

/**
 * Lanza un ejecutable de npm. En Windows las CLI globales de npm son `.cmd`, que Node solo arranca con `shell: true`;
 * los argumentos son fijos (el modelo se valida con MODEL_RE) y el texto va por la entrada estándar.
 */
function launch(bin, args, options) {
  const win = process.platform === 'win32';
  if (!win) return spawn(bin, args, { ...options, shell: false });
  const quoted = args.map((a) => (a === '' ? '""' : /[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a));
  return spawn(bin, quoted, { ...options, shell: true, windowsHide: true });
}

/** Ejecuta `<bin> --version` y devuelve la primera línea, o null si la CLI no está. */
function version(bin, env = process.env, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let out = '';
    let child;
    try {
      child = launch(bin, ['--version'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => { child.kill(); resolve(null); }, timeoutMs);
    child.stdout.on('data', (d) => { out += d; });
    child.on('error', () => { clearTimeout(timer); resolve(null); });
    child.on('close', (code) => {
      clearTimeout(timer);
      const line = out.split(/\r?\n/).find((l) => l.trim()) ?? '';
      resolve(code === 0 && line ? line.trim() : null);
    });
  });
}

/** Qué CLI hay en este equipo. `bins` permite usar otras rutas (pruebas, CLI fuera del PATH). */
async function detect(bins = {}, env = process.env) {
  const out = {};
  for (const p of PROVIDERS) {
    const v = await version(bins[p] ?? p, env);
    out[p] = { available: !!v, version: v ?? null, command: bins[p] ?? p };
  }
  return out;
}

/** Busca en un objeto cualquiera (eventos JSON de forma desconocida) un número bajo alguno de los nombres. */
function findNumber(obj, names, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) return undefined;
  for (const n of names) if (typeof obj[n] === 'number') return obj[n];
  for (const v of Object.values(obj)) {
    const hit = findNumber(v, names, depth + 1);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/**
 * Traduce una línea JSON de la CLI a eventos para la interfaz:
 * `{ type: 'status', text }`, `{ type: 'text', delta }`, `{ type: 'usage', input, output }`, `{ type: 'final', text, input, output, costUsd }`.
 * `state` acumula entre líneas.
 */
function parseLine(provider, line, state) {
  let msg;
  try { msg = JSON.parse(line); } catch { return []; }
  const events = [];
  if (provider === 'claude') {
    if (msg.type === 'system' && msg.subtype === 'init') {
      events.push({ type: 'status', text: `Sesión de Claude Code lista · modelo ${msg.model ?? '¿?'}` });
    } else if (msg.type === 'stream_event' && msg.event) {
      const ev = msg.event;
      if (ev.type === 'message_start' && ev.message?.usage) {
        state.input = (ev.message.usage.input_tokens ?? 0) + (ev.message.usage.cache_read_input_tokens ?? 0) + (ev.message.usage.cache_creation_input_tokens ?? 0);
        events.push({ type: 'usage', input: state.input, output: state.output ?? 0 });
      } else if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
        state.text = (state.text ?? '') + ev.delta.text;
        events.push({ type: 'text', delta: ev.delta.text });
      } else if (ev.type === 'content_block_start' && ev.content_block?.type === 'thinking') {
        events.push({ type: 'status', text: 'Pensando…' });
      } else if (ev.type === 'message_delta' && ev.usage) {
        state.output = ev.usage.output_tokens ?? state.output;
        events.push({ type: 'usage', input: state.input ?? 0, output: state.output ?? 0 });
      }
    } else if (msg.type === 'result') {
      const u = msg.usage ?? {};
      const input = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
      if (msg.is_error || (msg.subtype && msg.subtype !== 'success')) {
        events.push({ type: 'error', message: typeof msg.result === 'string' && msg.result ? msg.result : `La CLI terminó con «${msg.subtype ?? 'error'}».` });
      } else {
        events.push({ type: 'final', text: typeof msg.result === 'string' ? msg.result : (state.text ?? ''), input: input || state.input || 0, output: u.output_tokens ?? state.output ?? 0, costUsd: typeof msg.total_cost_usd === 'number' ? msg.total_cost_usd : undefined });
      }
    }
    return events;
  }
  // Copilot: JSONL con eventos de la sesión (`assistant.message_delta`, `assistant.message`, `assistant.usage`…).
  const type = typeof msg.type === 'string' ? msg.type : '';
  const data = msg.data ?? msg;
  if (type.includes('delta') && typeof (data.deltaContent ?? data.delta ?? data.text) === 'string') {
    const delta = data.deltaContent ?? data.delta ?? data.text;
    state.text = (state.text ?? '') + delta;
    events.push({ type: 'text', delta });
  } else if (type === 'assistant.message' && typeof data.content === 'string') {
    state.message = data.content;
  } else if (type.includes('reasoning') || type.includes('thinking')) {
    if (!state.thinking) { state.thinking = true; events.push({ type: 'status', text: 'Pensando…' }); }
  } else if (type.includes('session.start') || type.includes('session.info')) {
    const model = data.model ?? data.selectedModel;
    events.push({ type: 'status', text: `Sesión de Copilot lista${model ? ` · modelo ${model}` : ''}` });
  }
  const input = findNumber(data, ['inputTokens', 'input_tokens', 'promptTokens', 'prompt_tokens']);
  const output = findNumber(data, ['outputTokens', 'output_tokens', 'completionTokens', 'completion_tokens']);
  if (input !== undefined || output !== undefined) {
    state.input = (state.input ?? 0) + (input ?? 0);
    state.output = (state.output ?? 0) + (output ?? 0);
    events.push({ type: 'usage', input: state.input, output: state.output });
  }
  return events;
}

/**
 * Lanza una petición. `onEvent` recibe `start`, `status`, `text`, `usage`, `done` o `error` (siempre uno de los dos
 * últimos, una vez). Devuelve `cancel()`. `maxOutputTokens`: si la salida lo supera, se corta (y se dice).
 */
function run({ provider, model, prompt, maxOutputTokens = 8000, bins = {}, env = process.env }, onEvent) {
  if (!PROVIDERS.includes(provider)) throw new Error('Proveedor no válido');
  if (!MODEL_RE.test(model ?? '')) throw new Error('Nombre de modelo no válido');
  const started = Date.now();
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pugide-ia-'));
  const state = {};
  let finished = false;
  let stopped = null;
  let stderr = '';
  let buffer = '';
  const finish = (event) => {
    if (finished) return;
    finished = true;
    try { fs.rmSync(cwd, { recursive: true, force: true }); } catch { /* temporal */ }
    onEvent({ ...event, durationMs: Date.now() - started });
  };
  const childEnv = { ...env };
  if (provider === 'claude') childEnv.CLAUDE_CODE_MAX_OUTPUT_TOKENS = String(maxOutputTokens);
  let child;
  try {
    child = launch(bins[provider] ?? provider, cliArgs(provider, model), { cwd, env: childEnv, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    finish({ type: 'error', message: `No se pudo lanzar ${provider}: ${err.message}` });
    return { cancel() {} };
  }
  onEvent({ type: 'start', command: describeCommand(provider, model), pid: child.pid });
  const handle = (line) => {
    if (!line.trim()) return;
    for (const ev of parseLine(provider, line, state)) {
      if (ev.type === 'final') finish({ type: 'done', text: ev.text, usage: { input: ev.input, output: ev.output }, costUsd: ev.costUsd });
      else if (ev.type === 'error') finish(ev);
      else onEvent(ev);
      if (ev.type === 'usage' && ev.output > maxOutputTokens && !stopped) {
        stopped = 'limit';
        child.kill();
      }
    }
  };
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) { handle(buffer.slice(0, nl)); buffer = buffer.slice(nl + 1); }
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (d) => { stderr = (stderr + d).slice(-4000); });
  child.on('error', (err) => finish({ type: 'error', message: err.code === 'ENOENT' ? `No se encuentra «${provider}» en este equipo.` : err.message }));
  child.on('close', (code) => {
    if (buffer) handle(buffer);
    if (stopped === 'cancel') return finish({ type: 'error', message: 'Detenida por ti.', cancelled: true, usage: { input: state.input ?? 0, output: state.output ?? 0 } });
    if (stopped === 'limit') return finish({ type: 'error', message: `Cortada: superó tu límite de ${maxOutputTokens} tokens de salida.`, usage: { input: state.input ?? 0, output: state.output ?? 0 } });
    // Copilot no manda un «resultado» final: lo que se haya recibido es la respuesta.
    const text = state.message ?? state.text ?? '';
    if (code === 0 && text) return finish({ type: 'done', text, usage: { input: state.input ?? 0, output: state.output ?? 0 } });
    finish({ type: 'error', message: (stderr.trim().split(/\r?\n/).slice(-3).join(' ') || `La CLI terminó con el código ${code}.`).slice(0, 600) });
  });
  child.stdin.on('error', () => { /* la CLI puede cerrar la entrada antes de leerla entera */ });
  child.stdin.end(prompt);
  return {
    cancel() {
      if (finished || stopped) return;
      stopped = 'cancel';
      child.kill();
    },
  };
}

module.exports = { detect, run, describeCommand, cliArgs, parseLine, MODEL_RE, PROVIDERS };
