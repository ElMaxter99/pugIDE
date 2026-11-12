import { Injectable, inject, isDevMode, signal } from '@angular/core';
import { desktopHasSystem, desktopInvoke, onDesktopEvent } from '../utils/desktop.util';
import { AiProvider, AiSettings, normalizeAiSettings, usageLine } from '../utils/ai.util';
import { TerminalState } from '../state/terminal.state';

/** Lo que dice cada CLI al comprobarla. */
export interface AiCliInfo { available: boolean; version: string | null; command: string }
export type AiDetection = Record<AiProvider, AiCliInfo>;

/** Eventos de una petición (los mismos en escritorio y en el puente local; ver desktop/src/ai-cli.cjs). */
export type AiRunEvent =
  | { type: 'start'; command: string }
  | { type: 'status'; text: string }
  | { type: 'text'; delta: string }
  | { type: 'usage'; input: number; output: number }
  | { type: 'done'; text: string; usage: { input: number; output: number }; costUsd?: number; durationMs: number }
  | { type: 'error'; message: string; cancelled?: boolean; usage?: { input: number; output: number }; durationMs?: number };

export interface AiRunRequest { provider: AiProvider; model: string; prompt: string; maxOutputTokens: number }

const SETTINGS_KEY = 'pug-ide-ai';
const BRIDGE = 'http://127.0.0.1:4317';
const BRIDGE_HEADERS = { 'X-PugIDE-Bridge': '1' };

/**
 * Asistente de IA (P-30 a P-34). Solo existe en la app de escritorio (las CLI las lanza su proceso principal) y al
 * ejecutar PugIDE en tu equipo con `npm start` (modo desarrollo, en localhost) + `npm run ia`, un puente en 127.0.0.1.
 * En la web publicada (y en cualquier build de producción servido en un navegador) `mode` es `null`: no se enseña
 * ningún menú ni botón y no se hace ninguna llamada.
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  private terminal = inject(TerminalState);

  /** Dónde puede funcionar: escritorio, local (con puente) o en ningún sitio (la web publicada). */
  readonly mode: 'desktop' | 'local' | null = desktopHasSystem() ? 'desktop' : isDevMode() && isLocalHost() ? 'local' : null;
  readonly settings = signal<AiSettings>(this.loadSettings());
  /** Última comprobación de las CLI (null: aún no se ha comprobado; en local, también si el puente no responde). */
  readonly detection = signal<AiDetection | null>(null);
  readonly detecting = signal(false);
  /** En local: ¿responde el puente de `npm run ia`? */
  readonly bridgeUp = signal<boolean | null>(null);
  /** Lo gastado en esta sesión, para la barra de estado. */
  readonly session = signal({ requests: 0, input: 0, output: 0 });

  private desktopListeners = new Map<string, (e: AiRunEvent) => void>();
  private offDesktop: (() => void) | null = null;

  get available(): boolean {
    return this.mode !== null;
  }

  saveSettings(next: AiSettings): void {
    const value = normalizeAiSettings(next);
    this.settings.set(value);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(value)); } catch { /* sin almacenamiento: solo esta sesión */ }
  }

  private loadSettings(): AiSettings {
    try { return normalizeAiSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')); } catch { return normalizeAiSettings(null); }
  }

  /** Busca las CLI (y, en local, el puente). */
  async detect(): Promise<AiDetection | null> {
    if (!this.mode) return null;
    this.detecting.set(true);
    try {
      let found: AiDetection | null = null;
      if (this.mode === 'desktop') {
        found = await desktopInvoke<AiDetection>('ai:detect').catch(() => null);
      } else {
        found = await fetch(`${BRIDGE}/ai/detect`, { headers: BRIDGE_HEADERS }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        this.bridgeUp.set(found !== null);
      }
      this.detection.set(found);
      return found;
    } finally {
      this.detecting.set(false);
    }
  }

  /** Lanza una petición. Devuelve cómo detenerla. Siempre llega un `done` o un `error`. */
  run(req: AiRunRequest, onEvent: (e: AiRunEvent) => void): { cancel: () => void } {
    const started = performance.now();
    const finish = (e: AiRunEvent): void => {
      if (e.type === 'done' || (e.type === 'error' && e.usage)) {
        const usage = e.type === 'done' ? e.usage : e.usage!;
        this.session.update((s) => ({ requests: s.requests + 1, input: s.input + usage.input, output: s.output + usage.output }));
        if (this.settings().log) {
          const note = e.type === 'error' ? (e.cancelled ? 'detenida por ti' : 'cortada') : undefined;
          this.terminal.addEntry(e.type === 'done' ? 'success' : 'warning', 'IA', usageLine({ provider: req.provider, model: req.model, input: usage.input, output: usage.output, ms: performance.now() - started, note }));
        }
      } else if (e.type === 'error' && this.settings().log) {
        this.terminal.addEntry('error', 'IA', `${req.provider === 'claude' ? 'Claude Code' : 'GitHub Copilot'}: ${e.message}`);
      }
      onEvent(e);
    };
    return this.mode === 'desktop' ? this.runDesktop(req, finish) : this.runLocal(req, finish);
  }

  private runDesktop(req: AiRunRequest, onEvent: (e: AiRunEvent) => void): { cancel: () => void } {
    this.offDesktop ??= onDesktopEvent((p) => {
      if (p.type !== 'ai' || typeof p['runId'] !== 'string') return;
      const listener = this.desktopListeners.get(p['runId']);
      const event = p['event'] as AiRunEvent;
      if (!listener || !event) return;
      if (event.type === 'done' || event.type === 'error') this.desktopListeners.delete(p['runId']);
      listener(event);
    });
    let runId: string | null = null;
    let cancelled = false;
    desktopInvoke<{ runId: string }>('ai:run', req)
      .then((r) => {
        runId = r.runId;
        this.desktopListeners.set(r.runId, onEvent);
        if (cancelled) void desktopInvoke('ai:cancel', { runId });
      })
      .catch((err) => onEvent({ type: 'error', message: (err as Error).message }));
    return { cancel: () => { cancelled = true; if (runId) void desktopInvoke('ai:cancel', { runId }); } };
  }

  private runLocal(req: AiRunRequest, onEvent: (e: AiRunEvent) => void): { cancel: () => void } {
    const abort = new AbortController();
    let runId: string | null = null;
    let ended = false;
    const end = (e: AiRunEvent): void => { if (!ended) { ended = true; onEvent(e); } };
    void (async () => {
      try {
        const res = await fetch(`${BRIDGE}/ai/run`, {
          method: 'POST', signal: abort.signal, headers: { ...BRIDGE_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify(req),
        });
        if (!res.ok || !res.body) { end({ type: 'error', message: `El puente local respondió ${res.status}.` }); return; }
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let nl: number;
          while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (!line.trim()) continue;
            const e = JSON.parse(line) as AiRunEvent | { type: 'run'; runId: string };
            if (e.type === 'run') { runId = e.runId; continue; }
            if (e.type === 'done' || e.type === 'error') end(e);
            else onEvent(e);
          }
        }
        end({ type: 'error', message: 'El puente local cerró la conexión sin respuesta.' });
      } catch {
        if (abort.signal.aborted) end({ type: 'error', message: 'Detenida por ti.', cancelled: true });
        else end({ type: 'error', message: 'No responde el puente local. Ábrelo en otra terminal con «npm run ia».' });
      }
    })();
    return {
      cancel: () => {
        if (runId) void fetch(`${BRIDGE}/ai/cancel/${runId}`, { method: 'POST', headers: BRIDGE_HEADERS }).catch(() => undefined);
        else abort.abort();
      },
    };
  }
}

/** PugIDE abierto en tu equipo (`npm start`): localhost o 127.0.0.1. La web publicada nunca lo es. */
export function isLocalHost(): boolean {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(globalThis.location?.hostname ?? '');
  } catch {
    return false;
  }
}
