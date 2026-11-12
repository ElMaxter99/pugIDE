#!/usr/bin/env node
/**
 * Puente local del asistente de IA (P-30 a P-34) para cuando PugIDE se ejecuta en tu equipo con `npm start`.
 * El navegador no puede lanzar programas; este puente lanza la CLI que tengas instalada (`claude` o `copilot`) con tu
 * sesión, sin herramientas, y le pasa el texto que has visto en el diálogo. En la app de escritorio no hace falta.
 *
 *   npm run ia            (en otra terminal, junto a `npm start`)
 *
 * Solo escucha en 127.0.0.1 y solo atiende a PugIDE abierto en localhost / 127.0.0.1 (cabecera Origin). Nunca se
 * despliega: la web publicada no puede hablar con él (su CSP no permite conexiones fuera de su propio dominio).
 */
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
const aiCli = require('../desktop/src/ai-cli.cjs');

export const BRIDGE_PORT = Number(process.env.PUGIDE_AI_PORT ?? 4317);
const ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const runs = new Map();

function cors(req, res) {
  const origin = req.headers.origin ?? '';
  if (!ORIGIN_RE.test(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PugIDE-Bridge');
  // Chrome pide permiso explícito para que una página llame a 127.0.0.1 (Private Network Access).
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  return true;
}

function readJson(req, limit = 4_000_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (d) => { body += d; if (body.length > limit) { reject(new Error('Demasiado grande')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

export function createBridge({ bins } = {}) {
  return createServer(async (req, res) => {
    // Sin un Origin de PugIDE en local no se atiende nada (ni siquiera se dice qué CLI hay).
    if (!cors(req, res)) { res.writeHead(403).end(); return; }
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    // La cabecera propia obliga al navegador a preguntar antes (preflight): una página ajena no puede «colar» peticiones.
    if (req.headers['x-pugide-bridge'] !== '1') { res.writeHead(400).end(); return; }
    try {
      if (req.method === 'GET' && req.url === '/ai/detect') {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(await aiCli.detect(bins)));
        return;
      }
      if (req.method === 'POST' && req.url === '/ai/run') {
        const { provider, model, prompt, maxOutputTokens } = await readJson(req);
        if (typeof prompt !== 'string') throw new Error('Petición no válida');
        const runId = randomUUID();
        // Respuesta en streaming: una línea JSON por evento.
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' });
        res.write(JSON.stringify({ type: 'run', runId }) + '\n');
        const handle = aiCli.run({ provider, model, prompt, maxOutputTokens, bins }, (event) => {
          if (!res.writableEnded) res.write(JSON.stringify(event) + '\n');
          if (event.type === 'done' || event.type === 'error') { runs.delete(runId); res.end(); }
        });
        runs.set(runId, handle);
        // Si se cierra la pestaña, se para la CLI.
        res.on('close', () => { if (runs.has(runId)) { handle.cancel(); runs.delete(runId); } });
        return;
      }
      const cancel = req.method === 'POST' && /^\/ai\/cancel\/([\w-]+)$/.exec(req.url ?? '');
      if (cancel) {
        runs.get(cancel[1])?.cancel();
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(404).end();
    } catch (err) {
      if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ type: 'error', message: err.message }));
    }
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const server = createBridge();
  server.listen(BRIDGE_PORT, '127.0.0.1', async () => {
    const found = await aiCli.detect();
    const line = (p, name) => (found[p].available ? `  ✓ ${name}: ${found[p].version}` : `  · ${name}: no encontrada`);
    console.log(`Puente del asistente de IA de PugIDE en http://127.0.0.1:${BRIDGE_PORT} (solo este equipo).`);
    console.log(line('claude', 'Claude Code (claude)'));
    console.log(line('copilot', 'GitHub Copilot (copilot)'));
    console.log('Abre PugIDE con «npm start» y usa «Vista → Asistente de IA…». Ctrl+C para cerrar.');
  });
}
