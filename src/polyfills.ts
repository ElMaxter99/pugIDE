(function () {
  const g = globalThis as any;

  // process polyfill
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
  }

  // assert polyfill
  if (!g.assert) {
    g.assert = function (value: any, message?: string) {
      if (!value) throw new Error(message || 'Assertion failed');
    };
    g.assert.ok = g.assert;
    g.assert.strictEqual = function (a: any, b: any, msg?: string) {
      if (a !== b) throw new Error(msg || `Expected ${a} === ${b}`);
    };
    g.assert.deepStrictEqual = function (a: any, b: any, msg?: string) {
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        throw new Error(msg || `Deep strict equal failed`);
      }
    };
    g.assert.notStrictEqual = function (a: any, b: any, msg?: string) {
      if (a === b) throw new Error(msg || `Expected ${a} !== ${b}`);
    };
  }

  // buffer polyfill (minimal)
  if (!g.Buffer) {
    g.Buffer = {
      from: function (data: any) { return new Uint8Array(data); },
      isBuffer: function () { return false; },
    };
  }

  // require polyfill for dynamic requires inside pug
  if (!g.require) {
    g.require = function (id: string) {
      if (id === 'assert') return g.assert;
      if (id === 'util') return { format: function () { return ''; } };
      if (id === 'path') return { join: function () { return Array.prototype.join.call(arguments, '/'); } };
      if (id === 'fs') return {};
      throw new Error('Module not found: ' + id);
    };
  }
})();
