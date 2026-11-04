(function () {
  const g = globalThis as any;

  // `process` NO se define aquí a propósito: Monaco lo toma por un entorno Node/Electron si ve
  // `process.versions.node` y enlaza Ctrl+V por su cuenta (execCommand('paste')), con lo que el navegador deja de
  // pegar en Chromium y WebKit. Los bundles de Pug reciben su propio `process` local (scripts/process-shim.mjs).

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
    g.assert.throws = function (fn: Function, msg?: string) {
      try {
        fn();
        throw new Error(msg || 'Expected error');
      } catch (e: any) {
        if (e.message === (msg || 'Expected error')) throw e;
      }
    };
    g.assert.ifError = function (value: any) {
      if (value) throw value;
    };
  }

  // buffer polyfill (minimal)
  if (!g.Buffer) {
    g.Buffer = {
      from: function (data: any) {
        return typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
      },
      isBuffer: function () { return false; },
      alloc: function (size: number) { return new Uint8Array(size); },
    };
  }

  // require polyfill for dynamic requires inside pug
  if (!g.require) {
    g.require = function (id: string) {
      if (id === 'assert') return g.assert;
      if (id === 'util') return { format: function () { return ''; } };
      if (id === 'path') return { join: function (...parts: string[]) { return parts.join('/'); } };
      if (id === 'fs') return {};
      if (id === 'buffer') return { Buffer: g.Buffer };
      throw new Error('Module not found: ' + id);
    };
  }
})();
