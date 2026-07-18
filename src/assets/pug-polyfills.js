var _process = (typeof process !== 'undefined') ? process : { env: {}, version: '', versions: { node: '0.0.0' }, platform: 'browser', nextTick: function(fn) { setTimeout(fn, 0); }, cwd: function() { return '/'; }, argv: [], stdout: { write: function() {} }, stderr: { write: function() {} } };
if (typeof process === 'undefined') { globalThis.process = _process; }
if (typeof globalThis.assert === 'undefined') {
  var _assert = function(value, msg) { if (!value) throw new Error(msg || 'Assertion failed'); };
  _assert.ok = _assert;
  _assert.strictEqual = function(a, b, msg) { if (a !== b) throw new Error(msg || 'Expected ' + JSON.stringify(a) + ' === ' + JSON.stringify(b)); };
  _assert.notStrictEqual = function(a, b, msg) { if (a === b) throw new Error(msg || 'Expected ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
  _assert.deepStrictEqual = function(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || 'Deep strict equal failed'); };
  _assert.throws = function(fn, msg) { try { fn(); throw new Error(msg || 'Expected error'); } catch(e) { if (e.message === (msg || 'Expected error')) throw e; } };
  _assert.ifError = function(val) { if (val) throw val; };
  globalThis.assert = _assert;
}
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = { from: function(d, e) { return typeof d === 'string' ? new TextEncoder().encode(d) : new Uint8Array(d); }, isBuffer: function() { return false; }, alloc: function(n) { return new Uint8Array(n); } };
}
