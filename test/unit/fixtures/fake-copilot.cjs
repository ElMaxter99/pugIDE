#!/usr/bin/env node
// CLI falsa con la forma de `copilot --output-format json` (JSONL de eventos de sesión).
if (process.argv.includes('--version')) { console.log('GitHub Copilot CLI 0.0.1.'); process.exit(0); }
let input = '';
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
  if (process.env.FAKE_FAIL) { process.stderr.write('Error: not logged in\n'); process.exit(1); }
  out({ type: 'session.start', data: { selectedModel: 'claude-sonnet-5.5' } });
  out({ type: 'assistant.message_delta', data: { deltaContent: 'Hola ' } });
  out({ type: 'assistant.message_delta', data: { deltaContent: 'mundo' } });
  out({ type: 'assistant.message', data: { content: 'Hola mundo' } });
  out({ type: 'assistant.usage', data: { inputTokens: 1200, outputTokens: 34 } });
});
