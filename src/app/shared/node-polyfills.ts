let polyfilled = false;

export function ensureNodePolyfills(): void {
  if (polyfilled) return;
  polyfilled = true;

  const g = globalThis as any;

  if (!g.process) {
    g.process = {
      browser: true,
      env: {},
      version: '',
      versions: { node: '0.0.0' },
      platform: 'browser',
      nextTick: function (fn: Function) { setTimeout(fn, 0); },
      cwd: function () { return '/'; },
      argv: [],
      stdout: { write: function () {} },
      stderr: { write: function () {} },
    };
  } else {
    g.process.browser = true;
    if (!g.process.cwd) g.process.cwd = function () { return '/'; };
    if (!g.process.stdout) g.process.stdout = { write: function () {} };
    if (!g.process.stderr) g.process.stderr = { write: function () {} };
  }

  if (!g.assert) {
    const assertFn: any = function (value: any, message?: string) {
      if (!value) throw new Error(message || 'Assertion failed');
    };
    assertFn.ok = assertFn;
    assertFn.strictEqual = function (a: any, b: any, msg?: string) {
      if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`);
    };
    assertFn.notStrictEqual = function (a: any, b: any, msg?: string) {
      if (a === b) throw new Error(msg || `Expected ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
    };
    assertFn.deepStrictEqual = function (a: any, b: any, msg?: string) {
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        throw new Error(msg || `Deep strict equal failed`);
      }
    };
    g.assert = assertFn;
  }

  if (!g.Buffer) {
    g.Buffer = {
      from: function (data: any, encoding?: string) {
        if (typeof data === 'string') return new TextEncoder().encode(data);
        return new Uint8Array(data);
      },
      isBuffer: function () { return false; },
      alloc: function (size: number) { return new Uint8Array(size); },
    };
  }

  if (!g.require) {
    g.require = function (id: string) {
      if (id === 'assert') return g.assert;
      if (id === 'util') return { format: function () { return ''; } };
      if (id === 'path') return { join: function () { return Array.prototype.join.call(arguments, '/'); } };
      if (id === 'fs') return {};
      if (id === 'buffer') return { Buffer: g.Buffer };
      throw new Error('Module not found: ' + id);
    };
  }
}
