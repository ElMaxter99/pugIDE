#!/usr/bin/env node
// CLI falsa con la forma de `claude -p --output-format stream-json`: responde con lo que pida FAKE_REPLY (o eco).
if (process.argv.includes('--version')) { console.log('9.9.9 (Claude Code)'); process.exit(0); }
let input = '';
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  const reply = process.env.FAKE_REPLY ?? `eco: ${input.length}`;
  const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
  out({ type: 'system', subtype: 'init', tools: [], model: 'claude-sonnet-5-5', args: process.argv.slice(2) });
  out({ type: 'stream_event', event: { type: 'message_start', message: { usage: { input_tokens: 10, cache_read_input_tokens: 90 } } } });
  const chunks = Number(process.env.FAKE_CHUNKS ?? 1);
  const delay = Number(process.env.FAKE_DELAY ?? 0);
  let i = 0;
  const step = () => {
    if (i < chunks) {
      out({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: i === 0 ? reply : '.' } } });
      out({ type: 'stream_event', event: { type: 'message_delta', usage: { output_tokens: (i + 1) * 100 } } });
      i++;
      setTimeout(step, delay);
      return;
    }
    out({ type: 'result', subtype: 'success', is_error: false, result: reply, usage: { input_tokens: 10, cache_read_input_tokens: 90, output_tokens: chunks * 100 }, total_cost_usd: 0.001 });
  };
  step();
});
