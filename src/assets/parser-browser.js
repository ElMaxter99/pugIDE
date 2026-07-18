
if(typeof process==="undefined"){var process={env:{},version:"",versions:{node:"0.0.0"},platform:"browser",nextTick:function(fn){setTimeout(fn,0)},cwd:function(){return"/"},argv:[],stdout:{write:function(){}},stderr:{write:function(){}}};globalThis.process=process;}
if(typeof assert==="undefined"){var assert=function(v,m){if(!v)throw new Error(m||"Assertion failed")};assert.ok=assert;assert.strictEqual=function(a,b,m){if(a!==b)throw new Error(m||"Expected "+a+" === "+b)};assert.notStrictEqual=function(a,b,m){if(a===b)throw new Error(m||"Expected "+a+" !== "+b)};assert.deepStrictEqual=function(a,b,m){if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(m||"Deep strict equal failed")};assert.throws=function(fn,m){try{fn();throw new Error(m||"Expected error")}catch(e){if(e.message===(m||"Expected error"))throw e}};assert.ifError=function(v){if(v)throw v};globalThis.assert=assert;}
if(typeof Buffer==="undefined"){var Buffer={from:function(d,e){return typeof d==="string"?new TextEncoder().encode(d):new Uint8Array(d)},isBuffer:function(){return false},alloc:function(n){return new Uint8Array(n)}};globalThis.Buffer=Buffer;}

"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // node_modules/has-symbols/shams.js
  var require_shams = __commonJS({
    "node_modules/has-symbols/shams.js"(exports, module) {
      "use strict";
      module.exports = function hasSymbols() {
        if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
          return false;
        }
        if (typeof Symbol.iterator === "symbol") {
          return true;
        }
        var obj = {};
        var sym = /* @__PURE__ */ Symbol("test");
        var symObj = Object(sym);
        if (typeof sym === "string") {
          return false;
        }
        if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
          return false;
        }
        if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
          return false;
        }
        var symVal = 42;
        obj[sym] = symVal;
        for (var _ in obj) {
          return false;
        }
        if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
          return false;
        }
        if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
          return false;
        }
        var syms = Object.getOwnPropertySymbols(obj);
        if (syms.length !== 1 || syms[0] !== sym) {
          return false;
        }
        if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
          return false;
        }
        if (typeof Object.getOwnPropertyDescriptor === "function") {
          var descriptor = (
            /** @type {PropertyDescriptor} */
            Object.getOwnPropertyDescriptor(obj, sym)
          );
          if (descriptor.value !== symVal || descriptor.enumerable !== true) {
            return false;
          }
        }
        return true;
      };
    }
  });

  // node_modules/has-tostringtag/shams.js
  var require_shams2 = __commonJS({
    "node_modules/has-tostringtag/shams.js"(exports, module) {
      "use strict";
      var hasSymbols = require_shams();
      module.exports = function hasToStringTagShams() {
        return hasSymbols() && !!Symbol.toStringTag;
      };
    }
  });

  // node_modules/es-object-atoms/index.js
  var require_es_object_atoms = __commonJS({
    "node_modules/es-object-atoms/index.js"(exports, module) {
      "use strict";
      module.exports = Object;
    }
  });

  // node_modules/es-errors/index.js
  var require_es_errors = __commonJS({
    "node_modules/es-errors/index.js"(exports, module) {
      "use strict";
      module.exports = Error;
    }
  });

  // node_modules/es-errors/eval.js
  var require_eval = __commonJS({
    "node_modules/es-errors/eval.js"(exports, module) {
      "use strict";
      module.exports = EvalError;
    }
  });

  // node_modules/es-errors/range.js
  var require_range = __commonJS({
    "node_modules/es-errors/range.js"(exports, module) {
      "use strict";
      module.exports = RangeError;
    }
  });

  // node_modules/es-errors/ref.js
  var require_ref = __commonJS({
    "node_modules/es-errors/ref.js"(exports, module) {
      "use strict";
      module.exports = ReferenceError;
    }
  });

  // node_modules/es-errors/syntax.js
  var require_syntax = __commonJS({
    "node_modules/es-errors/syntax.js"(exports, module) {
      "use strict";
      module.exports = SyntaxError;
    }
  });

  // node_modules/es-errors/type.js
  var require_type = __commonJS({
    "node_modules/es-errors/type.js"(exports, module) {
      "use strict";
      module.exports = TypeError;
    }
  });

  // node_modules/es-errors/uri.js
  var require_uri = __commonJS({
    "node_modules/es-errors/uri.js"(exports, module) {
      "use strict";
      module.exports = URIError;
    }
  });

  // node_modules/math-intrinsics/abs.js
  var require_abs = __commonJS({
    "node_modules/math-intrinsics/abs.js"(exports, module) {
      "use strict";
      module.exports = Math.abs;
    }
  });

  // node_modules/math-intrinsics/floor.js
  var require_floor = __commonJS({
    "node_modules/math-intrinsics/floor.js"(exports, module) {
      "use strict";
      module.exports = Math.floor;
    }
  });

  // node_modules/math-intrinsics/max.js
  var require_max = __commonJS({
    "node_modules/math-intrinsics/max.js"(exports, module) {
      "use strict";
      module.exports = Math.max;
    }
  });

  // node_modules/math-intrinsics/min.js
  var require_min = __commonJS({
    "node_modules/math-intrinsics/min.js"(exports, module) {
      "use strict";
      module.exports = Math.min;
    }
  });

  // node_modules/math-intrinsics/pow.js
  var require_pow = __commonJS({
    "node_modules/math-intrinsics/pow.js"(exports, module) {
      "use strict";
      module.exports = Math.pow;
    }
  });

  // node_modules/math-intrinsics/round.js
  var require_round = __commonJS({
    "node_modules/math-intrinsics/round.js"(exports, module) {
      "use strict";
      module.exports = Math.round;
    }
  });

  // node_modules/math-intrinsics/isNaN.js
  var require_isNaN = __commonJS({
    "node_modules/math-intrinsics/isNaN.js"(exports, module) {
      "use strict";
      module.exports = Number.isNaN || function isNaN2(a) {
        return a !== a;
      };
    }
  });

  // node_modules/math-intrinsics/sign.js
  var require_sign = __commonJS({
    "node_modules/math-intrinsics/sign.js"(exports, module) {
      "use strict";
      var $isNaN = require_isNaN();
      module.exports = function sign(number) {
        if ($isNaN(number) || number === 0) {
          return number;
        }
        return number < 0 ? -1 : 1;
      };
    }
  });

  // node_modules/gopd/gOPD.js
  var require_gOPD = __commonJS({
    "node_modules/gopd/gOPD.js"(exports, module) {
      "use strict";
      module.exports = Object.getOwnPropertyDescriptor;
    }
  });

  // node_modules/gopd/index.js
  var require_gopd = __commonJS({
    "node_modules/gopd/index.js"(exports, module) {
      "use strict";
      var $gOPD = require_gOPD();
      if ($gOPD) {
        try {
          $gOPD([], "length");
        } catch (e) {
          $gOPD = null;
        }
      }
      module.exports = $gOPD;
    }
  });

  // node_modules/es-define-property/index.js
  var require_es_define_property = __commonJS({
    "node_modules/es-define-property/index.js"(exports, module) {
      "use strict";
      var $defineProperty = Object.defineProperty || false;
      if ($defineProperty) {
        try {
          $defineProperty({}, "a", { value: 1 });
        } catch (e) {
          $defineProperty = false;
        }
      }
      module.exports = $defineProperty;
    }
  });

  // node_modules/has-symbols/index.js
  var require_has_symbols = __commonJS({
    "node_modules/has-symbols/index.js"(exports, module) {
      "use strict";
      var origSymbol = typeof Symbol !== "undefined" && Symbol;
      var hasSymbolSham = require_shams();
      module.exports = function hasNativeSymbols() {
        if (typeof origSymbol !== "function") {
          return false;
        }
        if (typeof Symbol !== "function") {
          return false;
        }
        if (typeof origSymbol("foo") !== "symbol") {
          return false;
        }
        if (typeof /* @__PURE__ */ Symbol("bar") !== "symbol") {
          return false;
        }
        return hasSymbolSham();
      };
    }
  });

  // node_modules/get-proto/Reflect.getPrototypeOf.js
  var require_Reflect_getPrototypeOf = __commonJS({
    "node_modules/get-proto/Reflect.getPrototypeOf.js"(exports, module) {
      "use strict";
      module.exports = typeof Reflect !== "undefined" && Reflect.getPrototypeOf || null;
    }
  });

  // node_modules/get-proto/Object.getPrototypeOf.js
  var require_Object_getPrototypeOf = __commonJS({
    "node_modules/get-proto/Object.getPrototypeOf.js"(exports, module) {
      "use strict";
      var $Object = require_es_object_atoms();
      module.exports = $Object.getPrototypeOf || null;
    }
  });

  // node_modules/function-bind/implementation.js
  var require_implementation = __commonJS({
    "node_modules/function-bind/implementation.js"(exports, module) {
      "use strict";
      var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
      var toStr = Object.prototype.toString;
      var max = Math.max;
      var funcType = "[object Function]";
      var concatty = function concatty2(a, b) {
        var arr = [];
        for (var i = 0; i < a.length; i += 1) {
          arr[i] = a[i];
        }
        for (var j = 0; j < b.length; j += 1) {
          arr[j + a.length] = b[j];
        }
        return arr;
      };
      var slicy = function slicy2(arrLike, offset) {
        var arr = [];
        for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
          arr[j] = arrLike[i];
        }
        return arr;
      };
      var joiny = function(arr, joiner) {
        var str = "";
        for (var i = 0; i < arr.length; i += 1) {
          str += arr[i];
          if (i + 1 < arr.length) {
            str += joiner;
          }
        }
        return str;
      };
      module.exports = function bind(that) {
        var target = this;
        if (typeof target !== "function" || toStr.apply(target) !== funcType) {
          throw new TypeError(ERROR_MESSAGE + target);
        }
        var args = slicy(arguments, 1);
        var bound;
        var binder = function() {
          if (this instanceof bound) {
            var result = target.apply(
              this,
              concatty(args, arguments)
            );
            if (Object(result) === result) {
              return result;
            }
            return this;
          }
          return target.apply(
            that,
            concatty(args, arguments)
          );
        };
        var boundLength = max(0, target.length - args.length);
        var boundArgs = [];
        for (var i = 0; i < boundLength; i++) {
          boundArgs[i] = "$" + i;
        }
        bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
        if (target.prototype) {
          var Empty = function Empty2() {
          };
          Empty.prototype = target.prototype;
          bound.prototype = new Empty();
          Empty.prototype = null;
        }
        return bound;
      };
    }
  });

  // node_modules/function-bind/index.js
  var require_function_bind = __commonJS({
    "node_modules/function-bind/index.js"(exports, module) {
      "use strict";
      var implementation = require_implementation();
      module.exports = Function.prototype.bind || implementation;
    }
  });

  // node_modules/call-bind-apply-helpers/functionCall.js
  var require_functionCall = __commonJS({
    "node_modules/call-bind-apply-helpers/functionCall.js"(exports, module) {
      "use strict";
      module.exports = Function.prototype.call;
    }
  });

  // node_modules/call-bind-apply-helpers/functionApply.js
  var require_functionApply = __commonJS({
    "node_modules/call-bind-apply-helpers/functionApply.js"(exports, module) {
      "use strict";
      module.exports = Function.prototype.apply;
    }
  });

  // node_modules/call-bind-apply-helpers/reflectApply.js
  var require_reflectApply = __commonJS({
    "node_modules/call-bind-apply-helpers/reflectApply.js"(exports, module) {
      "use strict";
      module.exports = typeof Reflect !== "undefined" && Reflect && Reflect.apply;
    }
  });

  // node_modules/call-bind-apply-helpers/actualApply.js
  var require_actualApply = __commonJS({
    "node_modules/call-bind-apply-helpers/actualApply.js"(exports, module) {
      "use strict";
      var bind = require_function_bind();
      var $apply = require_functionApply();
      var $call = require_functionCall();
      var $reflectApply = require_reflectApply();
      module.exports = $reflectApply || bind.call($call, $apply);
    }
  });

  // node_modules/call-bind-apply-helpers/index.js
  var require_call_bind_apply_helpers = __commonJS({
    "node_modules/call-bind-apply-helpers/index.js"(exports, module) {
      "use strict";
      var bind = require_function_bind();
      var $TypeError = require_type();
      var $call = require_functionCall();
      var $actualApply = require_actualApply();
      module.exports = function callBindBasic(args) {
        if (args.length < 1 || typeof args[0] !== "function") {
          throw new $TypeError("a function is required");
        }
        return $actualApply(bind, $call, args);
      };
    }
  });

  // node_modules/dunder-proto/get.js
  var require_get = __commonJS({
    "node_modules/dunder-proto/get.js"(exports, module) {
      "use strict";
      var callBind = require_call_bind_apply_helpers();
      var gOPD = require_gopd();
      var hasProtoAccessor;
      try {
        hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */
        [].__proto__ === Array.prototype;
      } catch (e) {
        if (!e || typeof e !== "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS") {
          throw e;
        }
      }
      var desc = !!hasProtoAccessor && gOPD && gOPD(
        Object.prototype,
        /** @type {keyof typeof Object.prototype} */
        "__proto__"
      );
      var $Object = Object;
      var $getPrototypeOf = $Object.getPrototypeOf;
      module.exports = desc && typeof desc.get === "function" ? callBind([desc.get]) : typeof $getPrototypeOf === "function" ? (
        /** @type {import('./get')} */
        function getDunder(value) {
          return $getPrototypeOf(value == null ? value : $Object(value));
        }
      ) : false;
    }
  });

  // node_modules/get-proto/index.js
  var require_get_proto = __commonJS({
    "node_modules/get-proto/index.js"(exports, module) {
      "use strict";
      var reflectGetProto = require_Reflect_getPrototypeOf();
      var originalGetProto = require_Object_getPrototypeOf();
      var getDunderProto = require_get();
      module.exports = reflectGetProto ? function getProto(O) {
        return reflectGetProto(O);
      } : originalGetProto ? function getProto(O) {
        if (!O || typeof O !== "object" && typeof O !== "function") {
          throw new TypeError("getProto: not an object");
        }
        return originalGetProto(O);
      } : getDunderProto ? function getProto(O) {
        return getDunderProto(O);
      } : null;
    }
  });

  // node_modules/hasown/index.js
  var require_hasown = __commonJS({
    "node_modules/hasown/index.js"(exports, module) {
      "use strict";
      var call = Function.prototype.call;
      var $hasOwn = Object.prototype.hasOwnProperty;
      var bind = require_function_bind();
      module.exports = bind.call(call, $hasOwn);
    }
  });

  // node_modules/get-intrinsic/index.js
  var require_get_intrinsic = __commonJS({
    "node_modules/get-intrinsic/index.js"(exports, module) {
      "use strict";
      var undefined2;
      var $Object = require_es_object_atoms();
      var $Error = require_es_errors();
      var $EvalError = require_eval();
      var $RangeError = require_range();
      var $ReferenceError = require_ref();
      var $SyntaxError = require_syntax();
      var $TypeError = require_type();
      var $URIError = require_uri();
      var abs = require_abs();
      var floor = require_floor();
      var max = require_max();
      var min = require_min();
      var pow = require_pow();
      var round = require_round();
      var sign = require_sign();
      var $Function = Function;
      var getEvalledConstructor = function(expressionSyntax) {
        try {
          return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
        } catch (e) {
        }
      };
      var $gOPD = require_gopd();
      var $defineProperty = require_es_define_property();
      var throwTypeError = function() {
        throw new $TypeError();
      };
      var ThrowTypeError = $gOPD ? (function() {
        try {
          arguments.callee;
          return throwTypeError;
        } catch (calleeThrows) {
          try {
            return $gOPD(arguments, "callee").get;
          } catch (gOPDthrows) {
            return throwTypeError;
          }
        }
      })() : throwTypeError;
      var hasSymbols = require_has_symbols()();
      var getProto = require_get_proto();
      var $ObjectGPO = require_Object_getPrototypeOf();
      var $ReflectGPO = require_Reflect_getPrototypeOf();
      var $apply = require_functionApply();
      var $call = require_functionCall();
      var needsEval = {};
      var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined2 : getProto(Uint8Array);
      var INTRINSICS = {
        __proto__: null,
        "%AggregateError%": typeof AggregateError === "undefined" ? undefined2 : AggregateError,
        "%Array%": Array,
        "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined2 : ArrayBuffer,
        "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
        "%AsyncFromSyncIteratorPrototype%": undefined2,
        "%AsyncFunction%": needsEval,
        "%AsyncGenerator%": needsEval,
        "%AsyncGeneratorFunction%": needsEval,
        "%AsyncIteratorPrototype%": needsEval,
        "%Atomics%": typeof Atomics === "undefined" ? undefined2 : Atomics,
        "%BigInt%": typeof BigInt === "undefined" ? undefined2 : BigInt,
        "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined2 : BigInt64Array,
        "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined2 : BigUint64Array,
        "%Boolean%": Boolean,
        "%DataView%": typeof DataView === "undefined" ? undefined2 : DataView,
        "%Date%": Date,
        "%decodeURI%": decodeURI,
        "%decodeURIComponent%": decodeURIComponent,
        "%encodeURI%": encodeURI,
        "%encodeURIComponent%": encodeURIComponent,
        "%Error%": $Error,
        "%eval%": eval,
        // eslint-disable-line no-eval
        "%EvalError%": $EvalError,
        "%Float16Array%": typeof Float16Array === "undefined" ? undefined2 : Float16Array,
        "%Float32Array%": typeof Float32Array === "undefined" ? undefined2 : Float32Array,
        "%Float64Array%": typeof Float64Array === "undefined" ? undefined2 : Float64Array,
        "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined2 : FinalizationRegistry,
        "%Function%": $Function,
        "%GeneratorFunction%": needsEval,
        "%Int8Array%": typeof Int8Array === "undefined" ? undefined2 : Int8Array,
        "%Int16Array%": typeof Int16Array === "undefined" ? undefined2 : Int16Array,
        "%Int32Array%": typeof Int32Array === "undefined" ? undefined2 : Int32Array,
        "%isFinite%": isFinite,
        "%isNaN%": isNaN,
        "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
        "%JSON%": typeof JSON === "object" ? JSON : undefined2,
        "%Map%": typeof Map === "undefined" ? undefined2 : Map,
        "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
        "%Math%": Math,
        "%Number%": Number,
        "%Object%": $Object,
        "%Object.getOwnPropertyDescriptor%": $gOPD,
        "%parseFloat%": parseFloat,
        "%parseInt%": parseInt,
        "%Promise%": typeof Promise === "undefined" ? undefined2 : Promise,
        "%Proxy%": typeof Proxy === "undefined" ? undefined2 : Proxy,
        "%RangeError%": $RangeError,
        "%ReferenceError%": $ReferenceError,
        "%Reflect%": typeof Reflect === "undefined" ? undefined2 : Reflect,
        "%RegExp%": RegExp,
        "%Set%": typeof Set === "undefined" ? undefined2 : Set,
        "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
        "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined2 : SharedArrayBuffer,
        "%String%": String,
        "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
        "%Symbol%": hasSymbols ? Symbol : undefined2,
        "%SyntaxError%": $SyntaxError,
        "%ThrowTypeError%": ThrowTypeError,
        "%TypedArray%": TypedArray,
        "%TypeError%": $TypeError,
        "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined2 : Uint8Array,
        "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined2 : Uint8ClampedArray,
        "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined2 : Uint16Array,
        "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined2 : Uint32Array,
        "%URIError%": $URIError,
        "%WeakMap%": typeof WeakMap === "undefined" ? undefined2 : WeakMap,
        "%WeakRef%": typeof WeakRef === "undefined" ? undefined2 : WeakRef,
        "%WeakSet%": typeof WeakSet === "undefined" ? undefined2 : WeakSet,
        "%Function.prototype.call%": $call,
        "%Function.prototype.apply%": $apply,
        "%Object.defineProperty%": $defineProperty,
        "%Object.getPrototypeOf%": $ObjectGPO,
        "%Math.abs%": abs,
        "%Math.floor%": floor,
        "%Math.max%": max,
        "%Math.min%": min,
        "%Math.pow%": pow,
        "%Math.round%": round,
        "%Math.sign%": sign,
        "%Reflect.getPrototypeOf%": $ReflectGPO
      };
      if (getProto) {
        try {
          null.error;
        } catch (e) {
          errorProto = getProto(getProto(e));
          INTRINSICS["%Error.prototype%"] = errorProto;
        }
      }
      var errorProto;
      var doEval = function doEval2(name) {
        var value;
        if (name === "%AsyncFunction%") {
          value = getEvalledConstructor("async function () {}");
        } else if (name === "%GeneratorFunction%") {
          value = getEvalledConstructor("function* () {}");
        } else if (name === "%AsyncGeneratorFunction%") {
          value = getEvalledConstructor("async function* () {}");
        } else if (name === "%AsyncGenerator%") {
          var fn = doEval2("%AsyncGeneratorFunction%");
          if (fn) {
            value = fn.prototype;
          }
        } else if (name === "%AsyncIteratorPrototype%") {
          var gen = doEval2("%AsyncGenerator%");
          if (gen && getProto) {
            value = getProto(gen.prototype);
          }
        }
        INTRINSICS[name] = value;
        return value;
      };
      var LEGACY_ALIASES = {
        __proto__: null,
        "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
        "%ArrayPrototype%": ["Array", "prototype"],
        "%ArrayProto_entries%": ["Array", "prototype", "entries"],
        "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
        "%ArrayProto_keys%": ["Array", "prototype", "keys"],
        "%ArrayProto_values%": ["Array", "prototype", "values"],
        "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
        "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
        "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
        "%BooleanPrototype%": ["Boolean", "prototype"],
        "%DataViewPrototype%": ["DataView", "prototype"],
        "%DatePrototype%": ["Date", "prototype"],
        "%ErrorPrototype%": ["Error", "prototype"],
        "%EvalErrorPrototype%": ["EvalError", "prototype"],
        "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
        "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
        "%FunctionPrototype%": ["Function", "prototype"],
        "%Generator%": ["GeneratorFunction", "prototype"],
        "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
        "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
        "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
        "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
        "%JSONParse%": ["JSON", "parse"],
        "%JSONStringify%": ["JSON", "stringify"],
        "%MapPrototype%": ["Map", "prototype"],
        "%NumberPrototype%": ["Number", "prototype"],
        "%ObjectPrototype%": ["Object", "prototype"],
        "%ObjProto_toString%": ["Object", "prototype", "toString"],
        "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
        "%PromisePrototype%": ["Promise", "prototype"],
        "%PromiseProto_then%": ["Promise", "prototype", "then"],
        "%Promise_all%": ["Promise", "all"],
        "%Promise_reject%": ["Promise", "reject"],
        "%Promise_resolve%": ["Promise", "resolve"],
        "%RangeErrorPrototype%": ["RangeError", "prototype"],
        "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
        "%RegExpPrototype%": ["RegExp", "prototype"],
        "%SetPrototype%": ["Set", "prototype"],
        "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
        "%StringPrototype%": ["String", "prototype"],
        "%SymbolPrototype%": ["Symbol", "prototype"],
        "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
        "%TypedArrayPrototype%": ["TypedArray", "prototype"],
        "%TypeErrorPrototype%": ["TypeError", "prototype"],
        "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
        "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
        "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
        "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
        "%URIErrorPrototype%": ["URIError", "prototype"],
        "%WeakMapPrototype%": ["WeakMap", "prototype"],
        "%WeakSetPrototype%": ["WeakSet", "prototype"]
      };
      var bind = require_function_bind();
      var hasOwn = require_hasown();
      var $concat = bind.call($call, Array.prototype.concat);
      var $spliceApply = bind.call($apply, Array.prototype.splice);
      var $replace = bind.call($call, String.prototype.replace);
      var $strSlice = bind.call($call, String.prototype.slice);
      var $exec = bind.call($call, RegExp.prototype.exec);
      var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
      var reEscapeChar = /\\(\\)?/g;
      var stringToPath = function stringToPath2(string) {
        var first = $strSlice(string, 0, 1);
        var last = $strSlice(string, -1);
        if (first === "%" && last !== "%") {
          throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
        } else if (last === "%" && first !== "%") {
          throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
        }
        var result = [];
        $replace(string, rePropName, function(match, number, quote, subString) {
          result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
        });
        return result;
      };
      var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
        var intrinsicName = name;
        var alias;
        if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
          alias = LEGACY_ALIASES[intrinsicName];
          intrinsicName = "%" + alias[0] + "%";
        }
        if (hasOwn(INTRINSICS, intrinsicName)) {
          var value = INTRINSICS[intrinsicName];
          if (value === needsEval) {
            value = doEval(intrinsicName);
          }
          if (typeof value === "undefined" && !allowMissing) {
            throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
          }
          return {
            alias,
            name: intrinsicName,
            value
          };
        }
        throw new $SyntaxError("intrinsic " + name + " does not exist!");
      };
      module.exports = function GetIntrinsic(name, allowMissing) {
        if (typeof name !== "string" || name.length === 0) {
          throw new $TypeError("intrinsic name must be a non-empty string");
        }
        if (arguments.length > 1 && typeof allowMissing !== "boolean") {
          throw new $TypeError('"allowMissing" argument must be a boolean');
        }
        if ($exec(/^%?[^%]*%?$/, name) === null) {
          throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
        }
        var parts = stringToPath(name);
        var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
        var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
        var intrinsicRealName = intrinsic.name;
        var value = intrinsic.value;
        var skipFurtherCaching = false;
        var alias = intrinsic.alias;
        if (alias) {
          intrinsicBaseName = alias[0];
          $spliceApply(parts, $concat([0, 1], alias));
        }
        for (var i = 1, isOwn = true; i < parts.length; i += 1) {
          var part = parts[i];
          var first = $strSlice(part, 0, 1);
          var last = $strSlice(part, -1);
          if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
            throw new $SyntaxError("property names with quotes must have matching quotes");
          }
          if (part === "constructor" || !isOwn) {
            skipFurtherCaching = true;
          }
          intrinsicBaseName += "." + part;
          intrinsicRealName = "%" + intrinsicBaseName + "%";
          if (hasOwn(INTRINSICS, intrinsicRealName)) {
            value = INTRINSICS[intrinsicRealName];
          } else if (value != null) {
            if (!(part in value)) {
              if (!allowMissing) {
                throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
              }
              return void undefined2;
            }
            if ($gOPD && i + 1 >= parts.length) {
              var desc = $gOPD(value, part);
              isOwn = !!desc;
              if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
                value = desc.get;
              } else {
                value = value[part];
              }
            } else {
              isOwn = hasOwn(value, part);
              value = value[part];
            }
            if (isOwn && !skipFurtherCaching) {
              INTRINSICS[intrinsicRealName] = value;
            }
          }
        }
        return value;
      };
    }
  });

  // node_modules/call-bound/index.js
  var require_call_bound = __commonJS({
    "node_modules/call-bound/index.js"(exports, module) {
      "use strict";
      var GetIntrinsic = require_get_intrinsic();
      var callBindBasic = require_call_bind_apply_helpers();
      var $indexOf = callBindBasic([GetIntrinsic("%String.prototype.indexOf%")]);
      module.exports = function callBoundIntrinsic(name, allowMissing) {
        var intrinsic = (
          /** @type {(this: unknown, ...args: unknown[]) => unknown} */
          GetIntrinsic(name, !!allowMissing)
        );
        if (typeof intrinsic === "function" && $indexOf(name, ".prototype.") > -1) {
          return callBindBasic(
            /** @type {const} */
            [intrinsic]
          );
        }
        return intrinsic;
      };
    }
  });

  // node_modules/is-arguments/index.js
  var require_is_arguments = __commonJS({
    "node_modules/is-arguments/index.js"(exports, module) {
      "use strict";
      var hasToStringTag = require_shams2()();
      var callBound = require_call_bound();
      var $toString = callBound("Object.prototype.toString");
      var isStandardArguments = function isArguments(value) {
        if (hasToStringTag && value && typeof value === "object" && Symbol.toStringTag in value) {
          return false;
        }
        return $toString(value) === "[object Arguments]";
      };
      var isLegacyArguments = function isArguments(value) {
        if (isStandardArguments(value)) {
          return true;
        }
        return value !== null && typeof value === "object" && "length" in value && typeof value.length === "number" && value.length >= 0 && $toString(value) !== "[object Array]" && "callee" in value && $toString(value.callee) === "[object Function]";
      };
      var supportsStandardArguments = (function() {
        return isStandardArguments(arguments);
      })();
      isStandardArguments.isLegacyArguments = isLegacyArguments;
      module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;
    }
  });

  // node_modules/is-regex/index.js
  var require_is_regex = __commonJS({
    "node_modules/is-regex/index.js"(exports, module) {
      "use strict";
      var callBound = require_call_bound();
      var hasToStringTag = require_shams2()();
      var hasOwn = require_hasown();
      var gOPD = require_gopd();
      var fn;
      if (hasToStringTag) {
        $exec = callBound("RegExp.prototype.exec");
        isRegexMarker = {};
        throwRegexMarker = function() {
          throw isRegexMarker;
        };
        badStringifier = {
          toString: throwRegexMarker,
          valueOf: throwRegexMarker
        };
        if (typeof Symbol.toPrimitive === "symbol") {
          badStringifier[Symbol.toPrimitive] = throwRegexMarker;
        }
        fn = function isRegex(value) {
          if (!value || typeof value !== "object") {
            return false;
          }
          var descriptor = (
            /** @type {NonNullable<typeof gOPD>} */
            gOPD(
              /** @type {{ lastIndex?: unknown }} */
              value,
              "lastIndex"
            )
          );
          var hasLastIndexDataProperty = descriptor && hasOwn(descriptor, "value");
          if (!hasLastIndexDataProperty) {
            return false;
          }
          try {
            $exec(
              value,
              /** @type {string} */
              /** @type {unknown} */
              badStringifier
            );
          } catch (e) {
            return e === isRegexMarker;
          }
        };
      } else {
        $toString = callBound("Object.prototype.toString");
        regexClass = "[object RegExp]";
        fn = function isRegex(value) {
          if (!value || typeof value !== "object" && typeof value !== "function") {
            return false;
          }
          return $toString(value) === regexClass;
        };
      }
      var $exec;
      var isRegexMarker;
      var throwRegexMarker;
      var badStringifier;
      var $toString;
      var regexClass;
      module.exports = fn;
    }
  });

  // node_modules/safe-regex-test/index.js
  var require_safe_regex_test = __commonJS({
    "node_modules/safe-regex-test/index.js"(exports, module) {
      "use strict";
      var callBound = require_call_bound();
      var isRegex = require_is_regex();
      var $exec = callBound("RegExp.prototype.exec");
      var $TypeError = require_type();
      module.exports = function regexTester(regex) {
        if (!isRegex(regex)) {
          throw new $TypeError("`regex` must be a RegExp");
        }
        return function test(s) {
          return $exec(regex, s) !== null;
        };
      };
    }
  });

  // node_modules/generator-function/index.js
  var require_generator_function = __commonJS({
    "node_modules/generator-function/index.js"(exports, module) {
      "use strict";
      var cached = (
        /** @type {GeneratorFunctionConstructor} */
        function* () {
        }.constructor
      );
      module.exports = () => cached;
    }
  });

  // node_modules/is-generator-function/index.js
  var require_is_generator_function = __commonJS({
    "node_modules/is-generator-function/index.js"(exports, module) {
      "use strict";
      var callBound = require_call_bound();
      var safeRegexTest = require_safe_regex_test();
      var isFnRegex = safeRegexTest(/^\s*(?:function)?\*/);
      var hasToStringTag = require_shams2()();
      var getProto = require_get_proto();
      var toStr = callBound("Object.prototype.toString");
      var fnToStr = callBound("Function.prototype.toString");
      var getGeneratorFunction = require_generator_function();
      module.exports = function isGeneratorFunction(fn) {
        if (typeof fn !== "function") {
          return false;
        }
        if (isFnRegex(fnToStr(fn))) {
          return true;
        }
        if (!hasToStringTag) {
          var str = toStr(fn);
          return str === "[object GeneratorFunction]";
        }
        if (!getProto) {
          return false;
        }
        var GeneratorFunction = getGeneratorFunction();
        return GeneratorFunction && getProto(fn) === GeneratorFunction.prototype;
      };
    }
  });

  // node_modules/is-callable/index.js
  var require_is_callable = __commonJS({
    "node_modules/is-callable/index.js"(exports, module) {
      "use strict";
      var fnToStr = Function.prototype.toString;
      var reflectApply = typeof Reflect === "object" && Reflect !== null && Reflect.apply;
      var badArrayLike;
      var isCallableMarker;
      if (typeof reflectApply === "function" && typeof Object.defineProperty === "function") {
        try {
          badArrayLike = Object.defineProperty({}, "length", {
            get: function() {
              throw isCallableMarker;
            }
          });
          isCallableMarker = {};
          reflectApply(function() {
            throw 42;
          }, null, badArrayLike);
        } catch (_) {
          if (_ !== isCallableMarker) {
            reflectApply = null;
          }
        }
      } else {
        reflectApply = null;
      }
      var constructorRegex = /^\s*class\b/;
      var isES6ClassFn = function isES6ClassFunction(value) {
        try {
          var fnStr = fnToStr.call(value);
          return constructorRegex.test(fnStr);
        } catch (e) {
          return false;
        }
      };
      var tryFunctionObject = function tryFunctionToStr(value) {
        try {
          if (isES6ClassFn(value)) {
            return false;
          }
          fnToStr.call(value);
          return true;
        } catch (e) {
          return false;
        }
      };
      var toStr = Object.prototype.toString;
      var objectClass = "[object Object]";
      var fnClass = "[object Function]";
      var genClass = "[object GeneratorFunction]";
      var ddaClass = "[object HTMLAllCollection]";
      var ddaClass2 = "[object HTML document.all class]";
      var ddaClass3 = "[object HTMLCollection]";
      var hasToStringTag = typeof Symbol === "function" && !!Symbol.toStringTag;
      var isIE68 = !(0 in [,]);
      var isDDA = function isDocumentDotAll() {
        return false;
      };
      if (typeof document === "object") {
        all = document.all;
        if (toStr.call(all) === toStr.call(document.all)) {
          isDDA = function isDocumentDotAll(value) {
            if ((isIE68 || !value) && (typeof value === "undefined" || typeof value === "object")) {
              try {
                var str = toStr.call(value);
                return (str === ddaClass || str === ddaClass2 || str === ddaClass3 || str === objectClass) && value("") == null;
              } catch (e) {
              }
            }
            return false;
          };
        }
      }
      var all;
      module.exports = reflectApply ? function isCallable(value) {
        if (isDDA(value)) {
          return true;
        }
        if (!value) {
          return false;
        }
        if (typeof value !== "function" && typeof value !== "object") {
          return false;
        }
        try {
          reflectApply(value, null, badArrayLike);
        } catch (e) {
          if (e !== isCallableMarker) {
            return false;
          }
        }
        return !isES6ClassFn(value) && tryFunctionObject(value);
      } : function isCallable(value) {
        if (isDDA(value)) {
          return true;
        }
        if (!value) {
          return false;
        }
        if (typeof value !== "function" && typeof value !== "object") {
          return false;
        }
        if (hasToStringTag) {
          return tryFunctionObject(value);
        }
        if (isES6ClassFn(value)) {
          return false;
        }
        var strClass = toStr.call(value);
        if (strClass !== fnClass && strClass !== genClass && !/^\[object HTML/.test(strClass)) {
          return false;
        }
        return tryFunctionObject(value);
      };
    }
  });

  // node_modules/for-each/index.js
  var require_for_each = __commonJS({
    "node_modules/for-each/index.js"(exports, module) {
      "use strict";
      var isCallable = require_is_callable();
      var toStr = Object.prototype.toString;
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      var forEachArray = function forEachArray2(array, iterator, receiver) {
        for (var i = 0, len = array.length; i < len; i++) {
          if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
              iterator(array[i], i, array);
            } else {
              iterator.call(receiver, array[i], i, array);
            }
          }
        }
      };
      var forEachString = function forEachString2(string, iterator, receiver) {
        for (var i = 0, len = string.length; i < len; i++) {
          if (receiver == null) {
            iterator(string.charAt(i), i, string);
          } else {
            iterator.call(receiver, string.charAt(i), i, string);
          }
        }
      };
      var forEachObject = function forEachObject2(object, iterator, receiver) {
        for (var k in object) {
          if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
              iterator(object[k], k, object);
            } else {
              iterator.call(receiver, object[k], k, object);
            }
          }
        }
      };
      function isArray(x) {
        return toStr.call(x) === "[object Array]";
      }
      module.exports = function forEach(list, iterator, thisArg) {
        if (!isCallable(iterator)) {
          throw new TypeError("iterator must be a function");
        }
        var receiver;
        if (arguments.length >= 3) {
          receiver = thisArg;
        }
        if (isArray(list)) {
          forEachArray(list, iterator, receiver);
        } else if (typeof list === "string") {
          forEachString(list, iterator, receiver);
        } else {
          forEachObject(list, iterator, receiver);
        }
      };
    }
  });

  // node_modules/possible-typed-array-names/index.js
  var require_possible_typed_array_names = __commonJS({
    "node_modules/possible-typed-array-names/index.js"(exports, module) {
      "use strict";
      module.exports = [
        "Float16Array",
        "Float32Array",
        "Float64Array",
        "Int8Array",
        "Int16Array",
        "Int32Array",
        "Uint8Array",
        "Uint8ClampedArray",
        "Uint16Array",
        "Uint32Array",
        "BigInt64Array",
        "BigUint64Array"
      ];
    }
  });

  // node_modules/available-typed-arrays/index.js
  var require_available_typed_arrays = __commonJS({
    "node_modules/available-typed-arrays/index.js"(exports, module) {
      "use strict";
      var possibleNames = require_possible_typed_array_names();
      var g = typeof globalThis === "undefined" ? global : globalThis;
      module.exports = function availableTypedArrays() {
        var out = [];
        for (var i = 0; i < possibleNames.length; i++) {
          if (typeof g[possibleNames[i]] === "function") {
            out[out.length] = possibleNames[i];
          }
        }
        return out;
      };
    }
  });

  // node_modules/define-data-property/index.js
  var require_define_data_property = __commonJS({
    "node_modules/define-data-property/index.js"(exports, module) {
      "use strict";
      var $defineProperty = require_es_define_property();
      var $SyntaxError = require_syntax();
      var $TypeError = require_type();
      var gopd = require_gopd();
      module.exports = function defineDataProperty(obj, property, value) {
        if (!obj || typeof obj !== "object" && typeof obj !== "function") {
          throw new $TypeError("`obj` must be an object or a function`");
        }
        if (typeof property !== "string" && typeof property !== "symbol") {
          throw new $TypeError("`property` must be a string or a symbol`");
        }
        if (arguments.length > 3 && typeof arguments[3] !== "boolean" && arguments[3] !== null) {
          throw new $TypeError("`nonEnumerable`, if provided, must be a boolean or null");
        }
        if (arguments.length > 4 && typeof arguments[4] !== "boolean" && arguments[4] !== null) {
          throw new $TypeError("`nonWritable`, if provided, must be a boolean or null");
        }
        if (arguments.length > 5 && typeof arguments[5] !== "boolean" && arguments[5] !== null) {
          throw new $TypeError("`nonConfigurable`, if provided, must be a boolean or null");
        }
        if (arguments.length > 6 && typeof arguments[6] !== "boolean") {
          throw new $TypeError("`loose`, if provided, must be a boolean");
        }
        var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
        var nonWritable = arguments.length > 4 ? arguments[4] : null;
        var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
        var loose = arguments.length > 6 ? arguments[6] : false;
        var desc = !!gopd && gopd(obj, property);
        if ($defineProperty) {
          $defineProperty(obj, property, {
            configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
            enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
            value,
            writable: nonWritable === null && desc ? desc.writable : !nonWritable
          });
        } else if (loose || !nonEnumerable && !nonWritable && !nonConfigurable) {
          obj[property] = value;
        } else {
          throw new $SyntaxError("This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.");
        }
      };
    }
  });

  // node_modules/has-property-descriptors/index.js
  var require_has_property_descriptors = __commonJS({
    "node_modules/has-property-descriptors/index.js"(exports, module) {
      "use strict";
      var $defineProperty = require_es_define_property();
      var hasPropertyDescriptors = function hasPropertyDescriptors2() {
        return !!$defineProperty;
      };
      hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
        if (!$defineProperty) {
          return null;
        }
        try {
          return $defineProperty([], "length", { value: 1 }).length !== 1;
        } catch (e) {
          return true;
        }
      };
      module.exports = hasPropertyDescriptors;
    }
  });

  // node_modules/set-function-length/index.js
  var require_set_function_length = __commonJS({
    "node_modules/set-function-length/index.js"(exports, module) {
      "use strict";
      var GetIntrinsic = require_get_intrinsic();
      var define2 = require_define_data_property();
      var hasDescriptors = require_has_property_descriptors()();
      var gOPD = require_gopd();
      var $TypeError = require_type();
      var $floor = GetIntrinsic("%Math.floor%");
      module.exports = function setFunctionLength(fn, length) {
        if (typeof fn !== "function") {
          throw new $TypeError("`fn` is not a function");
        }
        if (typeof length !== "number" || length < 0 || length > 4294967295 || $floor(length) !== length) {
          throw new $TypeError("`length` must be a positive 32-bit integer");
        }
        var loose = arguments.length > 2 && !!arguments[2];
        var functionLengthIsConfigurable = true;
        var functionLengthIsWritable = true;
        if ("length" in fn && gOPD) {
          var desc = gOPD(fn, "length");
          if (desc && !desc.configurable) {
            functionLengthIsConfigurable = false;
          }
          if (desc && !desc.writable) {
            functionLengthIsWritable = false;
          }
        }
        if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
          if (hasDescriptors) {
            define2(
              /** @type {Parameters<define>[0]} */
              fn,
              "length",
              length,
              true,
              true
            );
          } else {
            define2(
              /** @type {Parameters<define>[0]} */
              fn,
              "length",
              length
            );
          }
        }
        return fn;
      };
    }
  });

  // node_modules/call-bind-apply-helpers/applyBind.js
  var require_applyBind = __commonJS({
    "node_modules/call-bind-apply-helpers/applyBind.js"(exports, module) {
      "use strict";
      var bind = require_function_bind();
      var $apply = require_functionApply();
      var actualApply = require_actualApply();
      module.exports = function applyBind() {
        return actualApply(bind, $apply, arguments);
      };
    }
  });

  // node_modules/call-bind/index.js
  var require_call_bind = __commonJS({
    "node_modules/call-bind/index.js"(exports, module) {
      "use strict";
      var setFunctionLength = require_set_function_length();
      var $defineProperty = require_es_define_property();
      var callBindBasic = require_call_bind_apply_helpers();
      var applyBind = require_applyBind();
      module.exports = function callBind(originalFunction) {
        var func = callBindBasic(arguments);
        var adjustedLength = 1 + originalFunction.length - (arguments.length - 1);
        return setFunctionLength(
          func,
          adjustedLength > 0 ? adjustedLength : 0,
          true
        );
      };
      if ($defineProperty) {
        $defineProperty(module.exports, "apply", { value: applyBind });
      } else {
        module.exports.apply = applyBind;
      }
    }
  });

  // node_modules/which-typed-array/index.js
  var require_which_typed_array = __commonJS({
    "node_modules/which-typed-array/index.js"(exports, module) {
      "use strict";
      var forEach = require_for_each();
      var availableTypedArrays = require_available_typed_arrays();
      var callBind = require_call_bind();
      var callBound = require_call_bound();
      var gOPD = require_gopd();
      var getProto = require_get_proto();
      var $toString = callBound("Object.prototype.toString");
      var hasToStringTag = require_shams2()();
      var g = typeof globalThis === "undefined" ? global : globalThis;
      var typedArrays = availableTypedArrays();
      var $slice = callBound("String.prototype.slice");
      var $indexOf = callBound("Array.prototype.indexOf", true) || function indexOf(array, value) {
        for (var i = 0; i < array.length; i += 1) {
          if (array[i] === value) {
            return i;
          }
        }
        return -1;
      };
      var cache = { __proto__: null };
      if (hasToStringTag && gOPD && getProto) {
        forEach(typedArrays, function(typedArray) {
          var arr = new g[typedArray]();
          if (Symbol.toStringTag in arr && getProto) {
            var proto = getProto(arr);
            var descriptor = gOPD(proto, Symbol.toStringTag);
            if (!descriptor && proto) {
              var superProto = getProto(proto);
              descriptor = gOPD(superProto, Symbol.toStringTag);
            }
            if (descriptor && descriptor.get) {
              var bound = callBind(descriptor.get);
              cache[
                /** @type {`$${TypedArrayName}`} */
                "$" + typedArray
              ] = bound;
            }
          }
        });
      } else {
        forEach(typedArrays, function(typedArray) {
          var arr = new g[typedArray]();
          var fn = arr.slice || arr.set;
          if (fn) {
            var bound = (
              /** @type {BoundSlice | BoundSet} */
              // @ts-expect-error TODO FIXME
              callBind(fn)
            );
            cache[
              /** @type {`$${TypedArrayName}`} */
              "$" + typedArray
            ] = bound;
          }
        });
      }
      function tryTypedArrays(value) {
        var found = false;
        forEach(
          /** @type {Record<`$${TypedArrayName}`, Getter>} */
          cache,
          /** @param {Getter} getter @param {`$${TypedArrayName}`} typedArray */
          function(getter, typedArray) {
            if (!found) {
              try {
                if ("$" + getter(value) === typedArray) {
                  found = /** @type {TypedArrayName} */
                  $slice(typedArray, 1);
                }
              } catch (e) {
              }
            }
          }
        );
        return found;
      }
      function trySlices(value) {
        var found = false;
        forEach(
          /** @type {Record<`$${TypedArrayName}`, Getter>} */
          cache,
          /** @param {Getter} getter @param {`$${TypedArrayName}`} name */
          function(getter, name) {
            if (!found) {
              try {
                getter(value);
                found = /** @type {TypedArrayName} */
                $slice(name, 1);
              } catch (e) {
              }
            }
          }
        );
        return found;
      }
      function isTATag(tag) {
        return $indexOf(typedArrays, tag) > -1;
      }
      module.exports = function whichTypedArray(value) {
        if (!value || typeof value !== "object") {
          return false;
        }
        if (!hasToStringTag) {
          var tag = $slice($toString(value), 8, -1);
          if (isTATag(tag)) {
            return tag;
          }
          if (tag !== "Object") {
            return false;
          }
          return trySlices(value);
        }
        if (!gOPD) {
          return null;
        }
        return tryTypedArrays(value);
      };
    }
  });

  // node_modules/is-typed-array/index.js
  var require_is_typed_array = __commonJS({
    "node_modules/is-typed-array/index.js"(exports, module) {
      "use strict";
      var whichTypedArray = require_which_typed_array();
      module.exports = function isTypedArray(value) {
        return !!whichTypedArray(value);
      };
    }
  });

  // node_modules/util/support/types.js
  var require_types = __commonJS({
    "node_modules/util/support/types.js"(exports) {
      "use strict";
      var isArgumentsObject = require_is_arguments();
      var isGeneratorFunction = require_is_generator_function();
      var whichTypedArray = require_which_typed_array();
      var isTypedArray = require_is_typed_array();
      function uncurryThis(f) {
        return f.call.bind(f);
      }
      var BigIntSupported = typeof BigInt !== "undefined";
      var SymbolSupported = typeof Symbol !== "undefined";
      var ObjectToString = uncurryThis(Object.prototype.toString);
      var numberValue = uncurryThis(Number.prototype.valueOf);
      var stringValue = uncurryThis(String.prototype.valueOf);
      var booleanValue = uncurryThis(Boolean.prototype.valueOf);
      if (BigIntSupported) {
        bigIntValue = uncurryThis(BigInt.prototype.valueOf);
      }
      var bigIntValue;
      if (SymbolSupported) {
        symbolValue = uncurryThis(Symbol.prototype.valueOf);
      }
      var symbolValue;
      function checkBoxedPrimitive(value, prototypeValueOf) {
        if (typeof value !== "object") {
          return false;
        }
        try {
          prototypeValueOf(value);
          return true;
        } catch (e) {
          return false;
        }
      }
      exports.isArgumentsObject = isArgumentsObject;
      exports.isGeneratorFunction = isGeneratorFunction;
      exports.isTypedArray = isTypedArray;
      function isPromise(input) {
        return typeof Promise !== "undefined" && input instanceof Promise || input !== null && typeof input === "object" && typeof input.then === "function" && typeof input.catch === "function";
      }
      exports.isPromise = isPromise;
      function isArrayBufferView(value) {
        if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
          return ArrayBuffer.isView(value);
        }
        return isTypedArray(value) || isDataView(value);
      }
      exports.isArrayBufferView = isArrayBufferView;
      function isUint8Array(value) {
        return whichTypedArray(value) === "Uint8Array";
      }
      exports.isUint8Array = isUint8Array;
      function isUint8ClampedArray(value) {
        return whichTypedArray(value) === "Uint8ClampedArray";
      }
      exports.isUint8ClampedArray = isUint8ClampedArray;
      function isUint16Array(value) {
        return whichTypedArray(value) === "Uint16Array";
      }
      exports.isUint16Array = isUint16Array;
      function isUint32Array(value) {
        return whichTypedArray(value) === "Uint32Array";
      }
      exports.isUint32Array = isUint32Array;
      function isInt8Array(value) {
        return whichTypedArray(value) === "Int8Array";
      }
      exports.isInt8Array = isInt8Array;
      function isInt16Array(value) {
        return whichTypedArray(value) === "Int16Array";
      }
      exports.isInt16Array = isInt16Array;
      function isInt32Array(value) {
        return whichTypedArray(value) === "Int32Array";
      }
      exports.isInt32Array = isInt32Array;
      function isFloat32Array(value) {
        return whichTypedArray(value) === "Float32Array";
      }
      exports.isFloat32Array = isFloat32Array;
      function isFloat64Array(value) {
        return whichTypedArray(value) === "Float64Array";
      }
      exports.isFloat64Array = isFloat64Array;
      function isBigInt64Array(value) {
        return whichTypedArray(value) === "BigInt64Array";
      }
      exports.isBigInt64Array = isBigInt64Array;
      function isBigUint64Array(value) {
        return whichTypedArray(value) === "BigUint64Array";
      }
      exports.isBigUint64Array = isBigUint64Array;
      function isMapToString(value) {
        return ObjectToString(value) === "[object Map]";
      }
      isMapToString.working = typeof Map !== "undefined" && isMapToString(/* @__PURE__ */ new Map());
      function isMap(value) {
        if (typeof Map === "undefined") {
          return false;
        }
        return isMapToString.working ? isMapToString(value) : value instanceof Map;
      }
      exports.isMap = isMap;
      function isSetToString(value) {
        return ObjectToString(value) === "[object Set]";
      }
      isSetToString.working = typeof Set !== "undefined" && isSetToString(/* @__PURE__ */ new Set());
      function isSet(value) {
        if (typeof Set === "undefined") {
          return false;
        }
        return isSetToString.working ? isSetToString(value) : value instanceof Set;
      }
      exports.isSet = isSet;
      function isWeakMapToString(value) {
        return ObjectToString(value) === "[object WeakMap]";
      }
      isWeakMapToString.working = typeof WeakMap !== "undefined" && isWeakMapToString(/* @__PURE__ */ new WeakMap());
      function isWeakMap(value) {
        if (typeof WeakMap === "undefined") {
          return false;
        }
        return isWeakMapToString.working ? isWeakMapToString(value) : value instanceof WeakMap;
      }
      exports.isWeakMap = isWeakMap;
      function isWeakSetToString(value) {
        return ObjectToString(value) === "[object WeakSet]";
      }
      isWeakSetToString.working = typeof WeakSet !== "undefined" && isWeakSetToString(/* @__PURE__ */ new WeakSet());
      function isWeakSet(value) {
        return isWeakSetToString(value);
      }
      exports.isWeakSet = isWeakSet;
      function isArrayBufferToString(value) {
        return ObjectToString(value) === "[object ArrayBuffer]";
      }
      isArrayBufferToString.working = typeof ArrayBuffer !== "undefined" && isArrayBufferToString(new ArrayBuffer());
      function isArrayBuffer(value) {
        if (typeof ArrayBuffer === "undefined") {
          return false;
        }
        return isArrayBufferToString.working ? isArrayBufferToString(value) : value instanceof ArrayBuffer;
      }
      exports.isArrayBuffer = isArrayBuffer;
      function isDataViewToString(value) {
        return ObjectToString(value) === "[object DataView]";
      }
      isDataViewToString.working = typeof ArrayBuffer !== "undefined" && typeof DataView !== "undefined" && isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1));
      function isDataView(value) {
        if (typeof DataView === "undefined") {
          return false;
        }
        return isDataViewToString.working ? isDataViewToString(value) : value instanceof DataView;
      }
      exports.isDataView = isDataView;
      var SharedArrayBufferCopy = typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : void 0;
      function isSharedArrayBufferToString(value) {
        return ObjectToString(value) === "[object SharedArrayBuffer]";
      }
      function isSharedArrayBuffer(value) {
        if (typeof SharedArrayBufferCopy === "undefined") {
          return false;
        }
        if (typeof isSharedArrayBufferToString.working === "undefined") {
          isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
        }
        return isSharedArrayBufferToString.working ? isSharedArrayBufferToString(value) : value instanceof SharedArrayBufferCopy;
      }
      exports.isSharedArrayBuffer = isSharedArrayBuffer;
      function isAsyncFunction(value) {
        return ObjectToString(value) === "[object AsyncFunction]";
      }
      exports.isAsyncFunction = isAsyncFunction;
      function isMapIterator(value) {
        return ObjectToString(value) === "[object Map Iterator]";
      }
      exports.isMapIterator = isMapIterator;
      function isSetIterator(value) {
        return ObjectToString(value) === "[object Set Iterator]";
      }
      exports.isSetIterator = isSetIterator;
      function isGeneratorObject(value) {
        return ObjectToString(value) === "[object Generator]";
      }
      exports.isGeneratorObject = isGeneratorObject;
      function isWebAssemblyCompiledModule(value) {
        return ObjectToString(value) === "[object WebAssembly.Module]";
      }
      exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;
      function isNumberObject(value) {
        return checkBoxedPrimitive(value, numberValue);
      }
      exports.isNumberObject = isNumberObject;
      function isStringObject(value) {
        return checkBoxedPrimitive(value, stringValue);
      }
      exports.isStringObject = isStringObject;
      function isBooleanObject(value) {
        return checkBoxedPrimitive(value, booleanValue);
      }
      exports.isBooleanObject = isBooleanObject;
      function isBigIntObject(value) {
        return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
      }
      exports.isBigIntObject = isBigIntObject;
      function isSymbolObject(value) {
        return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
      }
      exports.isSymbolObject = isSymbolObject;
      function isBoxedPrimitive(value) {
        return isNumberObject(value) || isStringObject(value) || isBooleanObject(value) || isBigIntObject(value) || isSymbolObject(value);
      }
      exports.isBoxedPrimitive = isBoxedPrimitive;
      function isAnyArrayBuffer(value) {
        return typeof Uint8Array !== "undefined" && (isArrayBuffer(value) || isSharedArrayBuffer(value));
      }
      exports.isAnyArrayBuffer = isAnyArrayBuffer;
      ["isProxy", "isExternal", "isModuleNamespaceObject"].forEach(function(method) {
        Object.defineProperty(exports, method, {
          enumerable: false,
          value: function() {
            throw new Error(method + " is not supported in userland");
          }
        });
      });
    }
  });

  // node_modules/util/support/isBufferBrowser.js
  var require_isBufferBrowser = __commonJS({
    "node_modules/util/support/isBufferBrowser.js"(exports, module) {
      module.exports = function isBuffer(arg) {
        return arg && typeof arg === "object" && typeof arg.copy === "function" && typeof arg.fill === "function" && typeof arg.readUInt8 === "function";
      };
    }
  });

  // node_modules/inherits/inherits_browser.js
  var require_inherits_browser = __commonJS({
    "node_modules/inherits/inherits_browser.js"(exports, module) {
      if (typeof Object.create === "function") {
        module.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
              constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
              }
            });
          }
        };
      } else {
        module.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;
            var TempCtor = function() {
            };
            TempCtor.prototype = superCtor.prototype;
            ctor.prototype = new TempCtor();
            ctor.prototype.constructor = ctor;
          }
        };
      }
    }
  });

  // node_modules/util/util.js
  var require_util = __commonJS({
    "node_modules/util/util.js"(exports) {
      var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors || function getOwnPropertyDescriptors2(obj) {
        var keys = Object.keys(obj);
        var descriptors = {};
        for (var i = 0; i < keys.length; i++) {
          descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
        }
        return descriptors;
      };
      var formatRegExp = /%[sdj%]/g;
      exports.format = function(f) {
        if (!isString(f)) {
          var objects = [];
          for (var i = 0; i < arguments.length; i++) {
            objects.push(inspect(arguments[i]));
          }
          return objects.join(" ");
        }
        var i = 1;
        var args = arguments;
        var len = args.length;
        var str = String(f).replace(formatRegExp, function(x2) {
          if (x2 === "%%") return "%";
          if (i >= len) return x2;
          switch (x2) {
            case "%s":
              return String(args[i++]);
            case "%d":
              return Number(args[i++]);
            case "%j":
              try {
                return JSON.stringify(args[i++]);
              } catch (_) {
                return "[Circular]";
              }
            default:
              return x2;
          }
        });
        for (var x = args[i]; i < len; x = args[++i]) {
          if (isNull(x) || !isObject(x)) {
            str += " " + x;
          } else {
            str += " " + inspect(x);
          }
        }
        return str;
      };
      exports.deprecate = function(fn, msg) {
        if (typeof process !== "undefined" && process.noDeprecation === true) {
          return fn;
        }
        if (typeof process === "undefined") {
          return function() {
            return exports.deprecate(fn, msg).apply(this, arguments);
          };
        }
        var warned = false;
        function deprecated() {
          if (!warned) {
            if (process.throwDeprecation) {
              throw new Error(msg);
            } else if (process.traceDeprecation) {
              console.trace(msg);
            } else {
              console.error(msg);
            }
            warned = true;
          }
          return fn.apply(this, arguments);
        }
        return deprecated;
      };
      var debugs = {};
      var debugEnvRegex = /^$/;
      if (process.env.NODE_DEBUG) {
        debugEnv = process.env.NODE_DEBUG;
        debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*").replace(/,/g, "$|^").toUpperCase();
        debugEnvRegex = new RegExp("^" + debugEnv + "$", "i");
      }
      var debugEnv;
      exports.debuglog = function(set) {
        set = set.toUpperCase();
        if (!debugs[set]) {
          if (debugEnvRegex.test(set)) {
            var pid = process.pid;
            debugs[set] = function() {
              var msg = exports.format.apply(exports, arguments);
              console.error("%s %d: %s", set, pid, msg);
            };
          } else {
            debugs[set] = function() {
            };
          }
        }
        return debugs[set];
      };
      function inspect(obj, opts) {
        var ctx = {
          seen: [],
          stylize: stylizeNoColor
        };
        if (arguments.length >= 3) ctx.depth = arguments[2];
        if (arguments.length >= 4) ctx.colors = arguments[3];
        if (isBoolean(opts)) {
          ctx.showHidden = opts;
        } else if (opts) {
          exports._extend(ctx, opts);
        }
        if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
        if (isUndefined(ctx.depth)) ctx.depth = 2;
        if (isUndefined(ctx.colors)) ctx.colors = false;
        if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
        if (ctx.colors) ctx.stylize = stylizeWithColor;
        return formatValue(ctx, obj, ctx.depth);
      }
      exports.inspect = inspect;
      inspect.colors = {
        "bold": [1, 22],
        "italic": [3, 23],
        "underline": [4, 24],
        "inverse": [7, 27],
        "white": [37, 39],
        "grey": [90, 39],
        "black": [30, 39],
        "blue": [34, 39],
        "cyan": [36, 39],
        "green": [32, 39],
        "magenta": [35, 39],
        "red": [31, 39],
        "yellow": [33, 39]
      };
      inspect.styles = {
        "special": "cyan",
        "number": "yellow",
        "boolean": "yellow",
        "undefined": "grey",
        "null": "bold",
        "string": "green",
        "date": "magenta",
        // "name": intentionally not styling
        "regexp": "red"
      };
      function stylizeWithColor(str, styleType) {
        var style = inspect.styles[styleType];
        if (style) {
          return "\x1B[" + inspect.colors[style][0] + "m" + str + "\x1B[" + inspect.colors[style][1] + "m";
        } else {
          return str;
        }
      }
      function stylizeNoColor(str, styleType) {
        return str;
      }
      function arrayToHash(array) {
        var hash = {};
        array.forEach(function(val, idx) {
          hash[val] = true;
        });
        return hash;
      }
      function formatValue(ctx, value, recurseTimes) {
        if (ctx.customInspect && value && isFunction(value.inspect) && // Filter out the util module, it's inspect function is special
        value.inspect !== exports.inspect && // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
          var ret = value.inspect(recurseTimes, ctx);
          if (!isString(ret)) {
            ret = formatValue(ctx, ret, recurseTimes);
          }
          return ret;
        }
        var primitive = formatPrimitive(ctx, value);
        if (primitive) {
          return primitive;
        }
        var keys = Object.keys(value);
        var visibleKeys = arrayToHash(keys);
        if (ctx.showHidden) {
          keys = Object.getOwnPropertyNames(value);
        }
        if (isError(value) && (keys.indexOf("message") >= 0 || keys.indexOf("description") >= 0)) {
          return formatError(value);
        }
        if (keys.length === 0) {
          if (isFunction(value)) {
            var name = value.name ? ": " + value.name : "";
            return ctx.stylize("[Function" + name + "]", "special");
          }
          if (isRegExp(value)) {
            return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
          }
          if (isDate(value)) {
            return ctx.stylize(Date.prototype.toString.call(value), "date");
          }
          if (isError(value)) {
            return formatError(value);
          }
        }
        var base = "", array = false, braces = ["{", "}"];
        if (isArray(value)) {
          array = true;
          braces = ["[", "]"];
        }
        if (isFunction(value)) {
          var n = value.name ? ": " + value.name : "";
          base = " [Function" + n + "]";
        }
        if (isRegExp(value)) {
          base = " " + RegExp.prototype.toString.call(value);
        }
        if (isDate(value)) {
          base = " " + Date.prototype.toUTCString.call(value);
        }
        if (isError(value)) {
          base = " " + formatError(value);
        }
        if (keys.length === 0 && (!array || value.length == 0)) {
          return braces[0] + base + braces[1];
        }
        if (recurseTimes < 0) {
          if (isRegExp(value)) {
            return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
          } else {
            return ctx.stylize("[Object]", "special");
          }
        }
        ctx.seen.push(value);
        var output;
        if (array) {
          output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
        } else {
          output = keys.map(function(key) {
            return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
          });
        }
        ctx.seen.pop();
        return reduceToSingleString(output, base, braces);
      }
      function formatPrimitive(ctx, value) {
        if (isUndefined(value))
          return ctx.stylize("undefined", "undefined");
        if (isString(value)) {
          var simple = "'" + JSON.stringify(value).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
          return ctx.stylize(simple, "string");
        }
        if (isNumber(value))
          return ctx.stylize("" + value, "number");
        if (isBoolean(value))
          return ctx.stylize("" + value, "boolean");
        if (isNull(value))
          return ctx.stylize("null", "null");
      }
      function formatError(value) {
        return "[" + Error.prototype.toString.call(value) + "]";
      }
      function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
        var output = [];
        for (var i = 0, l = value.length; i < l; ++i) {
          if (hasOwnProperty(value, String(i))) {
            output.push(formatProperty(
              ctx,
              value,
              recurseTimes,
              visibleKeys,
              String(i),
              true
            ));
          } else {
            output.push("");
          }
        }
        keys.forEach(function(key) {
          if (!key.match(/^\d+$/)) {
            output.push(formatProperty(
              ctx,
              value,
              recurseTimes,
              visibleKeys,
              key,
              true
            ));
          }
        });
        return output;
      }
      function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
        var name, str, desc;
        desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
        if (desc.get) {
          if (desc.set) {
            str = ctx.stylize("[Getter/Setter]", "special");
          } else {
            str = ctx.stylize("[Getter]", "special");
          }
        } else {
          if (desc.set) {
            str = ctx.stylize("[Setter]", "special");
          }
        }
        if (!hasOwnProperty(visibleKeys, key)) {
          name = "[" + key + "]";
        }
        if (!str) {
          if (ctx.seen.indexOf(desc.value) < 0) {
            if (isNull(recurseTimes)) {
              str = formatValue(ctx, desc.value, null);
            } else {
              str = formatValue(ctx, desc.value, recurseTimes - 1);
            }
            if (str.indexOf("\n") > -1) {
              if (array) {
                str = str.split("\n").map(function(line) {
                  return "  " + line;
                }).join("\n").slice(2);
              } else {
                str = "\n" + str.split("\n").map(function(line) {
                  return "   " + line;
                }).join("\n");
              }
            }
          } else {
            str = ctx.stylize("[Circular]", "special");
          }
        }
        if (isUndefined(name)) {
          if (array && key.match(/^\d+$/)) {
            return str;
          }
          name = JSON.stringify("" + key);
          if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
            name = name.slice(1, -1);
            name = ctx.stylize(name, "name");
          } else {
            name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
            name = ctx.stylize(name, "string");
          }
        }
        return name + ": " + str;
      }
      function reduceToSingleString(output, base, braces) {
        var numLinesEst = 0;
        var length = output.reduce(function(prev, cur) {
          numLinesEst++;
          if (cur.indexOf("\n") >= 0) numLinesEst++;
          return prev + cur.replace(/\u001b\[\d\d?m/g, "").length + 1;
        }, 0);
        if (length > 60) {
          return braces[0] + (base === "" ? "" : base + "\n ") + " " + output.join(",\n  ") + " " + braces[1];
        }
        return braces[0] + base + " " + output.join(", ") + " " + braces[1];
      }
      exports.types = require_types();
      function isArray(ar) {
        return Array.isArray(ar);
      }
      exports.isArray = isArray;
      function isBoolean(arg) {
        return typeof arg === "boolean";
      }
      exports.isBoolean = isBoolean;
      function isNull(arg) {
        return arg === null;
      }
      exports.isNull = isNull;
      function isNullOrUndefined(arg) {
        return arg == null;
      }
      exports.isNullOrUndefined = isNullOrUndefined;
      function isNumber(arg) {
        return typeof arg === "number";
      }
      exports.isNumber = isNumber;
      function isString(arg) {
        return typeof arg === "string";
      }
      exports.isString = isString;
      function isSymbol(arg) {
        return typeof arg === "symbol";
      }
      exports.isSymbol = isSymbol;
      function isUndefined(arg) {
        return arg === void 0;
      }
      exports.isUndefined = isUndefined;
      function isRegExp(re) {
        return isObject(re) && objectToString(re) === "[object RegExp]";
      }
      exports.isRegExp = isRegExp;
      exports.types.isRegExp = isRegExp;
      function isObject(arg) {
        return typeof arg === "object" && arg !== null;
      }
      exports.isObject = isObject;
      function isDate(d) {
        return isObject(d) && objectToString(d) === "[object Date]";
      }
      exports.isDate = isDate;
      exports.types.isDate = isDate;
      function isError(e) {
        return isObject(e) && (objectToString(e) === "[object Error]" || e instanceof Error);
      }
      exports.isError = isError;
      exports.types.isNativeError = isError;
      function isFunction(arg) {
        return typeof arg === "function";
      }
      exports.isFunction = isFunction;
      function isPrimitive(arg) {
        return arg === null || typeof arg === "boolean" || typeof arg === "number" || typeof arg === "string" || typeof arg === "symbol" || // ES6 symbol
        typeof arg === "undefined";
      }
      exports.isPrimitive = isPrimitive;
      exports.isBuffer = require_isBufferBrowser();
      function objectToString(o) {
        return Object.prototype.toString.call(o);
      }
      function pad(n) {
        return n < 10 ? "0" + n.toString(10) : n.toString(10);
      }
      var months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ];
      function timestamp() {
        var d = /* @__PURE__ */ new Date();
        var time = [
          pad(d.getHours()),
          pad(d.getMinutes()),
          pad(d.getSeconds())
        ].join(":");
        return [d.getDate(), months[d.getMonth()], time].join(" ");
      }
      exports.log = function() {
        console.log("%s - %s", timestamp(), exports.format.apply(exports, arguments));
      };
      exports.inherits = require_inherits_browser();
      exports._extend = function(origin, add) {
        if (!add || !isObject(add)) return origin;
        var keys = Object.keys(add);
        var i = keys.length;
        while (i--) {
          origin[keys[i]] = add[keys[i]];
        }
        return origin;
      };
      function hasOwnProperty(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
      }
      var kCustomPromisifiedSymbol = typeof Symbol !== "undefined" ? /* @__PURE__ */ Symbol("util.promisify.custom") : void 0;
      exports.promisify = function promisify(original) {
        if (typeof original !== "function")
          throw new TypeError('The "original" argument must be of type Function');
        if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
          var fn = original[kCustomPromisifiedSymbol];
          if (typeof fn !== "function") {
            throw new TypeError('The "util.promisify.custom" argument must be of type Function');
          }
          Object.defineProperty(fn, kCustomPromisifiedSymbol, {
            value: fn,
            enumerable: false,
            writable: false,
            configurable: true
          });
          return fn;
        }
        function fn() {
          var promiseResolve, promiseReject;
          var promise = new Promise(function(resolve, reject) {
            promiseResolve = resolve;
            promiseReject = reject;
          });
          var args = [];
          for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
          }
          args.push(function(err, value) {
            if (err) {
              promiseReject(err);
            } else {
              promiseResolve(value);
            }
          });
          try {
            original.apply(this, args);
          } catch (err) {
            promiseReject(err);
          }
          return promise;
        }
        Object.setPrototypeOf(fn, Object.getPrototypeOf(original));
        if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
          value: fn,
          enumerable: false,
          writable: false,
          configurable: true
        });
        return Object.defineProperties(
          fn,
          getOwnPropertyDescriptors(original)
        );
      };
      exports.promisify.custom = kCustomPromisifiedSymbol;
      function callbackifyOnRejected(reason, cb) {
        if (!reason) {
          var newReason = new Error("Promise was rejected with a falsy value");
          newReason.reason = reason;
          reason = newReason;
        }
        return cb(reason);
      }
      function callbackify(original) {
        if (typeof original !== "function") {
          throw new TypeError('The "original" argument must be of type Function');
        }
        function callbackified() {
          var args = [];
          for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
          }
          var maybeCb = args.pop();
          if (typeof maybeCb !== "function") {
            throw new TypeError("The last argument must be of type Function");
          }
          var self2 = this;
          var cb = function() {
            return maybeCb.apply(self2, arguments);
          };
          original.apply(this, args).then(
            function(ret) {
              process.nextTick(cb.bind(null, null, ret));
            },
            function(rej) {
              process.nextTick(callbackifyOnRejected.bind(null, rej, cb));
            }
          );
        }
        Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
        Object.defineProperties(
          callbackified,
          getOwnPropertyDescriptors(original)
        );
        return callbackified;
      }
      exports.callbackify = callbackify;
    }
  });

  // node_modules/assert/build/internal/errors.js
  var require_errors = __commonJS({
    "node_modules/assert/build/internal/errors.js"(exports, module) {
      "use strict";
      function _typeof(o) {
        "@babel/helpers - typeof";
        return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
          return typeof o2;
        } : function(o2) {
          return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
        }, _typeof(o);
      }
      function _defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
        }
      }
      function _createClass(Constructor, protoProps, staticProps) {
        if (protoProps) _defineProperties(Constructor.prototype, protoProps);
        if (staticProps) _defineProperties(Constructor, staticProps);
        Object.defineProperty(Constructor, "prototype", { writable: false });
        return Constructor;
      }
      function _toPropertyKey(arg) {
        var key = _toPrimitive(arg, "string");
        return _typeof(key) === "symbol" ? key : String(key);
      }
      function _toPrimitive(input, hint) {
        if (_typeof(input) !== "object" || input === null) return input;
        var prim = input[Symbol.toPrimitive];
        if (prim !== void 0) {
          var res = prim.call(input, hint || "default");
          if (_typeof(res) !== "object") return res;
          throw new TypeError("@@toPrimitive must return a primitive value.");
        }
        return (hint === "string" ? String : Number)(input);
      }
      function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
          throw new TypeError("Cannot call a class as a function");
        }
      }
      function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
          throw new TypeError("Super expression must either be null or a function");
        }
        subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });
        Object.defineProperty(subClass, "prototype", { writable: false });
        if (superClass) _setPrototypeOf(subClass, superClass);
      }
      function _setPrototypeOf(o, p) {
        _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
          o2.__proto__ = p2;
          return o2;
        };
        return _setPrototypeOf(o, p);
      }
      function _createSuper(Derived) {
        var hasNativeReflectConstruct = _isNativeReflectConstruct();
        return function _createSuperInternal() {
          var Super = _getPrototypeOf(Derived), result;
          if (hasNativeReflectConstruct) {
            var NewTarget = _getPrototypeOf(this).constructor;
            result = Reflect.construct(Super, arguments, NewTarget);
          } else {
            result = Super.apply(this, arguments);
          }
          return _possibleConstructorReturn(this, result);
        };
      }
      function _possibleConstructorReturn(self2, call) {
        if (call && (_typeof(call) === "object" || typeof call === "function")) {
          return call;
        } else if (call !== void 0) {
          throw new TypeError("Derived constructors may only return object or undefined");
        }
        return _assertThisInitialized(self2);
      }
      function _assertThisInitialized(self2) {
        if (self2 === void 0) {
          throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }
        return self2;
      }
      function _isNativeReflectConstruct() {
        if (typeof Reflect === "undefined" || !Reflect.construct) return false;
        if (Reflect.construct.sham) return false;
        if (typeof Proxy === "function") return true;
        try {
          Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
          }));
          return true;
        } catch (e) {
          return false;
        }
      }
      function _getPrototypeOf(o) {
        _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
          return o2.__proto__ || Object.getPrototypeOf(o2);
        };
        return _getPrototypeOf(o);
      }
      var codes = {};
      var assert;
      var util;
      function createErrorType(code, message, Base) {
        if (!Base) {
          Base = Error;
        }
        function getMessage(arg1, arg2, arg3) {
          if (typeof message === "string") {
            return message;
          } else {
            return message(arg1, arg2, arg3);
          }
        }
        var NodeError = /* @__PURE__ */ (function(_Base) {
          _inherits(NodeError2, _Base);
          var _super = _createSuper(NodeError2);
          function NodeError2(arg1, arg2, arg3) {
            var _this;
            _classCallCheck(this, NodeError2);
            _this = _super.call(this, getMessage(arg1, arg2, arg3));
            _this.code = code;
            return _this;
          }
          return _createClass(NodeError2);
        })(Base);
        codes[code] = NodeError;
      }
      function oneOf(expected, thing) {
        if (Array.isArray(expected)) {
          var len = expected.length;
          expected = expected.map(function(i) {
            return String(i);
          });
          if (len > 2) {
            return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(", "), ", or ") + expected[len - 1];
          } else if (len === 2) {
            return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
          } else {
            return "of ".concat(thing, " ").concat(expected[0]);
          }
        } else {
          return "of ".concat(thing, " ").concat(String(expected));
        }
      }
      function startsWith(str, search, pos) {
        return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
      }
      function endsWith(str, search, this_len) {
        if (this_len === void 0 || this_len > str.length) {
          this_len = str.length;
        }
        return str.substring(this_len - search.length, this_len) === search;
      }
      function includes(str, search, start) {
        if (typeof start !== "number") {
          start = 0;
        }
        if (start + search.length > str.length) {
          return false;
        } else {
          return str.indexOf(search, start) !== -1;
        }
      }
      createErrorType("ERR_AMBIGUOUS_ARGUMENT", 'The "%s" argument is ambiguous. %s', TypeError);
      createErrorType("ERR_INVALID_ARG_TYPE", function(name, expected, actual) {
        if (assert === void 0) assert = require_assert();
        assert(typeof name === "string", "'name' must be a string");
        var determiner;
        if (typeof expected === "string" && startsWith(expected, "not ")) {
          determiner = "must not be";
          expected = expected.replace(/^not /, "");
        } else {
          determiner = "must be";
        }
        var msg;
        if (endsWith(name, " argument")) {
          msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, "type"));
        } else {
          var type = includes(name, ".") ? "property" : "argument";
          msg = 'The "'.concat(name, '" ').concat(type, " ").concat(determiner, " ").concat(oneOf(expected, "type"));
        }
        msg += ". Received type ".concat(_typeof(actual));
        return msg;
      }, TypeError);
      createErrorType("ERR_INVALID_ARG_VALUE", function(name, value) {
        var reason = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "is invalid";
        if (util === void 0) util = require_util();
        var inspected = util.inspect(value);
        if (inspected.length > 128) {
          inspected = "".concat(inspected.slice(0, 128), "...");
        }
        return "The argument '".concat(name, "' ").concat(reason, ". Received ").concat(inspected);
      }, TypeError, RangeError);
      createErrorType("ERR_INVALID_RETURN_VALUE", function(input, name, value) {
        var type;
        if (value && value.constructor && value.constructor.name) {
          type = "instance of ".concat(value.constructor.name);
        } else {
          type = "type ".concat(_typeof(value));
        }
        return "Expected ".concat(input, ' to be returned from the "').concat(name, '"') + " function but got ".concat(type, ".");
      }, TypeError);
      createErrorType("ERR_MISSING_ARGS", function() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        if (assert === void 0) assert = require_assert();
        assert(args.length > 0, "At least one arg needs to be specified");
        var msg = "The ";
        var len = args.length;
        args = args.map(function(a) {
          return '"'.concat(a, '"');
        });
        switch (len) {
          case 1:
            msg += "".concat(args[0], " argument");
            break;
          case 2:
            msg += "".concat(args[0], " and ").concat(args[1], " arguments");
            break;
          default:
            msg += args.slice(0, len - 1).join(", ");
            msg += ", and ".concat(args[len - 1], " arguments");
            break;
        }
        return "".concat(msg, " must be specified");
      }, TypeError);
      module.exports.codes = codes;
    }
  });

  // node_modules/assert/build/internal/assert/assertion_error.js
  var require_assertion_error = __commonJS({
    "node_modules/assert/build/internal/assert/assertion_error.js"(exports, module) {
      "use strict";
      function ownKeys(e, r) {
        var t = Object.keys(e);
        if (Object.getOwnPropertySymbols) {
          var o = Object.getOwnPropertySymbols(e);
          r && (o = o.filter(function(r2) {
            return Object.getOwnPropertyDescriptor(e, r2).enumerable;
          })), t.push.apply(t, o);
        }
        return t;
      }
      function _objectSpread(e) {
        for (var r = 1; r < arguments.length; r++) {
          var t = null != arguments[r] ? arguments[r] : {};
          r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
            _defineProperty(e, r2, t[r2]);
          }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
            Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
          });
        }
        return e;
      }
      function _defineProperty(obj, key, value) {
        key = _toPropertyKey(key);
        if (key in obj) {
          Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
        } else {
          obj[key] = value;
        }
        return obj;
      }
      function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
          throw new TypeError("Cannot call a class as a function");
        }
      }
      function _defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
        }
      }
      function _createClass(Constructor, protoProps, staticProps) {
        if (protoProps) _defineProperties(Constructor.prototype, protoProps);
        if (staticProps) _defineProperties(Constructor, staticProps);
        Object.defineProperty(Constructor, "prototype", { writable: false });
        return Constructor;
      }
      function _toPropertyKey(arg) {
        var key = _toPrimitive(arg, "string");
        return _typeof(key) === "symbol" ? key : String(key);
      }
      function _toPrimitive(input, hint) {
        if (_typeof(input) !== "object" || input === null) return input;
        var prim = input[Symbol.toPrimitive];
        if (prim !== void 0) {
          var res = prim.call(input, hint || "default");
          if (_typeof(res) !== "object") return res;
          throw new TypeError("@@toPrimitive must return a primitive value.");
        }
        return (hint === "string" ? String : Number)(input);
      }
      function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
          throw new TypeError("Super expression must either be null or a function");
        }
        subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });
        Object.defineProperty(subClass, "prototype", { writable: false });
        if (superClass) _setPrototypeOf(subClass, superClass);
      }
      function _createSuper(Derived) {
        var hasNativeReflectConstruct = _isNativeReflectConstruct();
        return function _createSuperInternal() {
          var Super = _getPrototypeOf(Derived), result;
          if (hasNativeReflectConstruct) {
            var NewTarget = _getPrototypeOf(this).constructor;
            result = Reflect.construct(Super, arguments, NewTarget);
          } else {
            result = Super.apply(this, arguments);
          }
          return _possibleConstructorReturn(this, result);
        };
      }
      function _possibleConstructorReturn(self2, call) {
        if (call && (_typeof(call) === "object" || typeof call === "function")) {
          return call;
        } else if (call !== void 0) {
          throw new TypeError("Derived constructors may only return object or undefined");
        }
        return _assertThisInitialized(self2);
      }
      function _assertThisInitialized(self2) {
        if (self2 === void 0) {
          throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }
        return self2;
      }
      function _wrapNativeSuper(Class) {
        var _cache = typeof Map === "function" ? /* @__PURE__ */ new Map() : void 0;
        _wrapNativeSuper = function _wrapNativeSuper2(Class2) {
          if (Class2 === null || !_isNativeFunction(Class2)) return Class2;
          if (typeof Class2 !== "function") {
            throw new TypeError("Super expression must either be null or a function");
          }
          if (typeof _cache !== "undefined") {
            if (_cache.has(Class2)) return _cache.get(Class2);
            _cache.set(Class2, Wrapper);
          }
          function Wrapper() {
            return _construct(Class2, arguments, _getPrototypeOf(this).constructor);
          }
          Wrapper.prototype = Object.create(Class2.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } });
          return _setPrototypeOf(Wrapper, Class2);
        };
        return _wrapNativeSuper(Class);
      }
      function _construct(Parent, args, Class) {
        if (_isNativeReflectConstruct()) {
          _construct = Reflect.construct.bind();
        } else {
          _construct = function _construct2(Parent2, args2, Class2) {
            var a = [null];
            a.push.apply(a, args2);
            var Constructor = Function.bind.apply(Parent2, a);
            var instance = new Constructor();
            if (Class2) _setPrototypeOf(instance, Class2.prototype);
            return instance;
          };
        }
        return _construct.apply(null, arguments);
      }
      function _isNativeReflectConstruct() {
        if (typeof Reflect === "undefined" || !Reflect.construct) return false;
        if (Reflect.construct.sham) return false;
        if (typeof Proxy === "function") return true;
        try {
          Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
          }));
          return true;
        } catch (e) {
          return false;
        }
      }
      function _isNativeFunction(fn) {
        return Function.toString.call(fn).indexOf("[native code]") !== -1;
      }
      function _setPrototypeOf(o, p) {
        _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
          o2.__proto__ = p2;
          return o2;
        };
        return _setPrototypeOf(o, p);
      }
      function _getPrototypeOf(o) {
        _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
          return o2.__proto__ || Object.getPrototypeOf(o2);
        };
        return _getPrototypeOf(o);
      }
      function _typeof(o) {
        "@babel/helpers - typeof";
        return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
          return typeof o2;
        } : function(o2) {
          return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
        }, _typeof(o);
      }
      var _require = require_util();
      var inspect = _require.inspect;
      var _require2 = require_errors();
      var ERR_INVALID_ARG_TYPE = _require2.codes.ERR_INVALID_ARG_TYPE;
      function endsWith(str, search, this_len) {
        if (this_len === void 0 || this_len > str.length) {
          this_len = str.length;
        }
        return str.substring(this_len - search.length, this_len) === search;
      }
      function repeat(str, count) {
        count = Math.floor(count);
        if (str.length == 0 || count == 0) return "";
        var maxCount = str.length * count;
        count = Math.floor(Math.log(count) / Math.log(2));
        while (count) {
          str += str;
          count--;
        }
        str += str.substring(0, maxCount - str.length);
        return str;
      }
      var blue = "";
      var green = "";
      var red = "";
      var white = "";
      var kReadableOperator = {
        deepStrictEqual: "Expected values to be strictly deep-equal:",
        strictEqual: "Expected values to be strictly equal:",
        strictEqualObject: 'Expected "actual" to be reference-equal to "expected":',
        deepEqual: "Expected values to be loosely deep-equal:",
        equal: "Expected values to be loosely equal:",
        notDeepStrictEqual: 'Expected "actual" not to be strictly deep-equal to:',
        notStrictEqual: 'Expected "actual" to be strictly unequal to:',
        notStrictEqualObject: 'Expected "actual" not to be reference-equal to "expected":',
        notDeepEqual: 'Expected "actual" not to be loosely deep-equal to:',
        notEqual: 'Expected "actual" to be loosely unequal to:',
        notIdentical: "Values identical but not reference-equal:"
      };
      var kMaxShortLength = 10;
      function copyError(source) {
        var keys = Object.keys(source);
        var target = Object.create(Object.getPrototypeOf(source));
        keys.forEach(function(key) {
          target[key] = source[key];
        });
        Object.defineProperty(target, "message", {
          value: source.message
        });
        return target;
      }
      function inspectValue(val) {
        return inspect(val, {
          compact: false,
          customInspect: false,
          depth: 1e3,
          maxArrayLength: Infinity,
          // Assert compares only enumerable properties (with a few exceptions).
          showHidden: false,
          // Having a long line as error is better than wrapping the line for
          // comparison for now.
          // TODO(BridgeAR): `breakLength` should be limited as soon as soon as we
          // have meta information about the inspected properties (i.e., know where
          // in what line the property starts and ends).
          breakLength: Infinity,
          // Assert does not detect proxies currently.
          showProxy: false,
          sorted: true,
          // Inspect getters as we also check them when comparing entries.
          getters: true
        });
      }
      function createErrDiff(actual, expected, operator) {
        var other = "";
        var res = "";
        var lastPos = 0;
        var end = "";
        var skipped = false;
        var actualInspected = inspectValue(actual);
        var actualLines = actualInspected.split("\n");
        var expectedLines = inspectValue(expected).split("\n");
        var i = 0;
        var indicator = "";
        if (operator === "strictEqual" && _typeof(actual) === "object" && _typeof(expected) === "object" && actual !== null && expected !== null) {
          operator = "strictEqualObject";
        }
        if (actualLines.length === 1 && expectedLines.length === 1 && actualLines[0] !== expectedLines[0]) {
          var inputLength = actualLines[0].length + expectedLines[0].length;
          if (inputLength <= kMaxShortLength) {
            if ((_typeof(actual) !== "object" || actual === null) && (_typeof(expected) !== "object" || expected === null) && (actual !== 0 || expected !== 0)) {
              return "".concat(kReadableOperator[operator], "\n\n") + "".concat(actualLines[0], " !== ").concat(expectedLines[0], "\n");
            }
          } else if (operator !== "strictEqualObject") {
            var maxLength = process.stderr && process.stderr.isTTY ? process.stderr.columns : 80;
            if (inputLength < maxLength) {
              while (actualLines[0][i] === expectedLines[0][i]) {
                i++;
              }
              if (i > 2) {
                indicator = "\n  ".concat(repeat(" ", i), "^");
                i = 0;
              }
            }
          }
        }
        var a = actualLines[actualLines.length - 1];
        var b = expectedLines[expectedLines.length - 1];
        while (a === b) {
          if (i++ < 2) {
            end = "\n  ".concat(a).concat(end);
          } else {
            other = a;
          }
          actualLines.pop();
          expectedLines.pop();
          if (actualLines.length === 0 || expectedLines.length === 0) break;
          a = actualLines[actualLines.length - 1];
          b = expectedLines[expectedLines.length - 1];
        }
        var maxLines = Math.max(actualLines.length, expectedLines.length);
        if (maxLines === 0) {
          var _actualLines = actualInspected.split("\n");
          if (_actualLines.length > 30) {
            _actualLines[26] = "".concat(blue, "...").concat(white);
            while (_actualLines.length > 27) {
              _actualLines.pop();
            }
          }
          return "".concat(kReadableOperator.notIdentical, "\n\n").concat(_actualLines.join("\n"), "\n");
        }
        if (i > 3) {
          end = "\n".concat(blue, "...").concat(white).concat(end);
          skipped = true;
        }
        if (other !== "") {
          end = "\n  ".concat(other).concat(end);
          other = "";
        }
        var printedLines = 0;
        var msg = kReadableOperator[operator] + "\n".concat(green, "+ actual").concat(white, " ").concat(red, "- expected").concat(white);
        var skippedMsg = " ".concat(blue, "...").concat(white, " Lines skipped");
        for (i = 0; i < maxLines; i++) {
          var cur = i - lastPos;
          if (actualLines.length < i + 1) {
            if (cur > 1 && i > 2) {
              if (cur > 4) {
                res += "\n".concat(blue, "...").concat(white);
                skipped = true;
              } else if (cur > 3) {
                res += "\n  ".concat(expectedLines[i - 2]);
                printedLines++;
              }
              res += "\n  ".concat(expectedLines[i - 1]);
              printedLines++;
            }
            lastPos = i;
            other += "\n".concat(red, "-").concat(white, " ").concat(expectedLines[i]);
            printedLines++;
          } else if (expectedLines.length < i + 1) {
            if (cur > 1 && i > 2) {
              if (cur > 4) {
                res += "\n".concat(blue, "...").concat(white);
                skipped = true;
              } else if (cur > 3) {
                res += "\n  ".concat(actualLines[i - 2]);
                printedLines++;
              }
              res += "\n  ".concat(actualLines[i - 1]);
              printedLines++;
            }
            lastPos = i;
            res += "\n".concat(green, "+").concat(white, " ").concat(actualLines[i]);
            printedLines++;
          } else {
            var expectedLine = expectedLines[i];
            var actualLine = actualLines[i];
            var divergingLines = actualLine !== expectedLine && (!endsWith(actualLine, ",") || actualLine.slice(0, -1) !== expectedLine);
            if (divergingLines && endsWith(expectedLine, ",") && expectedLine.slice(0, -1) === actualLine) {
              divergingLines = false;
              actualLine += ",";
            }
            if (divergingLines) {
              if (cur > 1 && i > 2) {
                if (cur > 4) {
                  res += "\n".concat(blue, "...").concat(white);
                  skipped = true;
                } else if (cur > 3) {
                  res += "\n  ".concat(actualLines[i - 2]);
                  printedLines++;
                }
                res += "\n  ".concat(actualLines[i - 1]);
                printedLines++;
              }
              lastPos = i;
              res += "\n".concat(green, "+").concat(white, " ").concat(actualLine);
              other += "\n".concat(red, "-").concat(white, " ").concat(expectedLine);
              printedLines += 2;
            } else {
              res += other;
              other = "";
              if (cur === 1 || i === 0) {
                res += "\n  ".concat(actualLine);
                printedLines++;
              }
            }
          }
          if (printedLines > 20 && i < maxLines - 2) {
            return "".concat(msg).concat(skippedMsg, "\n").concat(res, "\n").concat(blue, "...").concat(white).concat(other, "\n") + "".concat(blue, "...").concat(white);
          }
        }
        return "".concat(msg).concat(skipped ? skippedMsg : "", "\n").concat(res).concat(other).concat(end).concat(indicator);
      }
      var AssertionError = /* @__PURE__ */ (function(_Error, _inspect$custom) {
        _inherits(AssertionError2, _Error);
        var _super = _createSuper(AssertionError2);
        function AssertionError2(options) {
          var _this;
          _classCallCheck(this, AssertionError2);
          if (_typeof(options) !== "object" || options === null) {
            throw new ERR_INVALID_ARG_TYPE("options", "Object", options);
          }
          var message = options.message, operator = options.operator, stackStartFn = options.stackStartFn;
          var actual = options.actual, expected = options.expected;
          var limit = Error.stackTraceLimit;
          Error.stackTraceLimit = 0;
          if (message != null) {
            _this = _super.call(this, String(message));
          } else {
            if (process.stderr && process.stderr.isTTY) {
              if (process.stderr && process.stderr.getColorDepth && process.stderr.getColorDepth() !== 1) {
                blue = "\x1B[34m";
                green = "\x1B[32m";
                white = "\x1B[39m";
                red = "\x1B[31m";
              } else {
                blue = "";
                green = "";
                white = "";
                red = "";
              }
            }
            if (_typeof(actual) === "object" && actual !== null && _typeof(expected) === "object" && expected !== null && "stack" in actual && actual instanceof Error && "stack" in expected && expected instanceof Error) {
              actual = copyError(actual);
              expected = copyError(expected);
            }
            if (operator === "deepStrictEqual" || operator === "strictEqual") {
              _this = _super.call(this, createErrDiff(actual, expected, operator));
            } else if (operator === "notDeepStrictEqual" || operator === "notStrictEqual") {
              var base = kReadableOperator[operator];
              var res = inspectValue(actual).split("\n");
              if (operator === "notStrictEqual" && _typeof(actual) === "object" && actual !== null) {
                base = kReadableOperator.notStrictEqualObject;
              }
              if (res.length > 30) {
                res[26] = "".concat(blue, "...").concat(white);
                while (res.length > 27) {
                  res.pop();
                }
              }
              if (res.length === 1) {
                _this = _super.call(this, "".concat(base, " ").concat(res[0]));
              } else {
                _this = _super.call(this, "".concat(base, "\n\n").concat(res.join("\n"), "\n"));
              }
            } else {
              var _res = inspectValue(actual);
              var other = "";
              var knownOperators = kReadableOperator[operator];
              if (operator === "notDeepEqual" || operator === "notEqual") {
                _res = "".concat(kReadableOperator[operator], "\n\n").concat(_res);
                if (_res.length > 1024) {
                  _res = "".concat(_res.slice(0, 1021), "...");
                }
              } else {
                other = "".concat(inspectValue(expected));
                if (_res.length > 512) {
                  _res = "".concat(_res.slice(0, 509), "...");
                }
                if (other.length > 512) {
                  other = "".concat(other.slice(0, 509), "...");
                }
                if (operator === "deepEqual" || operator === "equal") {
                  _res = "".concat(knownOperators, "\n\n").concat(_res, "\n\nshould equal\n\n");
                } else {
                  other = " ".concat(operator, " ").concat(other);
                }
              }
              _this = _super.call(this, "".concat(_res).concat(other));
            }
          }
          Error.stackTraceLimit = limit;
          _this.generatedMessage = !message;
          Object.defineProperty(_assertThisInitialized(_this), "name", {
            value: "AssertionError [ERR_ASSERTION]",
            enumerable: false,
            writable: true,
            configurable: true
          });
          _this.code = "ERR_ASSERTION";
          _this.actual = actual;
          _this.expected = expected;
          _this.operator = operator;
          if (Error.captureStackTrace) {
            Error.captureStackTrace(_assertThisInitialized(_this), stackStartFn);
          }
          _this.stack;
          _this.name = "AssertionError";
          return _possibleConstructorReturn(_this);
        }
        _createClass(AssertionError2, [{
          key: "toString",
          value: function toString() {
            return "".concat(this.name, " [").concat(this.code, "]: ").concat(this.message);
          }
        }, {
          key: _inspect$custom,
          value: function value(recurseTimes, ctx) {
            return inspect(this, _objectSpread(_objectSpread({}, ctx), {}, {
              customInspect: false,
              depth: 0
            }));
          }
        }]);
        return AssertionError2;
      })(/* @__PURE__ */ _wrapNativeSuper(Error), inspect.custom);
      module.exports = AssertionError;
    }
  });

  // node_modules/object-keys/isArguments.js
  var require_isArguments = __commonJS({
    "node_modules/object-keys/isArguments.js"(exports, module) {
      "use strict";
      var toStr = Object.prototype.toString;
      module.exports = function isArguments(value) {
        var str = toStr.call(value);
        var isArgs = str === "[object Arguments]";
        if (!isArgs) {
          isArgs = str !== "[object Array]" && value !== null && typeof value === "object" && typeof value.length === "number" && value.length >= 0 && toStr.call(value.callee) === "[object Function]";
        }
        return isArgs;
      };
    }
  });

  // node_modules/object-keys/implementation.js
  var require_implementation2 = __commonJS({
    "node_modules/object-keys/implementation.js"(exports, module) {
      "use strict";
      var keysShim;
      if (!Object.keys) {
        has = Object.prototype.hasOwnProperty;
        toStr = Object.prototype.toString;
        isArgs = require_isArguments();
        isEnumerable = Object.prototype.propertyIsEnumerable;
        hasDontEnumBug = !isEnumerable.call({ toString: null }, "toString");
        hasProtoEnumBug = isEnumerable.call(function() {
        }, "prototype");
        dontEnums = [
          "toString",
          "toLocaleString",
          "valueOf",
          "hasOwnProperty",
          "isPrototypeOf",
          "propertyIsEnumerable",
          "constructor"
        ];
        equalsConstructorPrototype = function(o) {
          var ctor = o.constructor;
          return ctor && ctor.prototype === o;
        };
        excludedKeys = {
          $applicationCache: true,
          $console: true,
          $external: true,
          $frame: true,
          $frameElement: true,
          $frames: true,
          $innerHeight: true,
          $innerWidth: true,
          $onmozfullscreenchange: true,
          $onmozfullscreenerror: true,
          $outerHeight: true,
          $outerWidth: true,
          $pageXOffset: true,
          $pageYOffset: true,
          $parent: true,
          $scrollLeft: true,
          $scrollTop: true,
          $scrollX: true,
          $scrollY: true,
          $self: true,
          $webkitIndexedDB: true,
          $webkitStorageInfo: true,
          $window: true
        };
        hasAutomationEqualityBug = (function() {
          if (typeof window === "undefined") {
            return false;
          }
          for (var k in window) {
            try {
              if (!excludedKeys["$" + k] && has.call(window, k) && window[k] !== null && typeof window[k] === "object") {
                try {
                  equalsConstructorPrototype(window[k]);
                } catch (e) {
                  return true;
                }
              }
            } catch (e) {
              return true;
            }
          }
          return false;
        })();
        equalsConstructorPrototypeIfNotBuggy = function(o) {
          if (typeof window === "undefined" || !hasAutomationEqualityBug) {
            return equalsConstructorPrototype(o);
          }
          try {
            return equalsConstructorPrototype(o);
          } catch (e) {
            return false;
          }
        };
        keysShim = function keys(object) {
          var isObject = object !== null && typeof object === "object";
          var isFunction = toStr.call(object) === "[object Function]";
          var isArguments = isArgs(object);
          var isString = isObject && toStr.call(object) === "[object String]";
          var theKeys = [];
          if (!isObject && !isFunction && !isArguments) {
            throw new TypeError("Object.keys called on a non-object");
          }
          var skipProto = hasProtoEnumBug && isFunction;
          if (isString && object.length > 0 && !has.call(object, 0)) {
            for (var i = 0; i < object.length; ++i) {
              theKeys.push(String(i));
            }
          }
          if (isArguments && object.length > 0) {
            for (var j = 0; j < object.length; ++j) {
              theKeys.push(String(j));
            }
          } else {
            for (var name in object) {
              if (!(skipProto && name === "prototype") && has.call(object, name)) {
                theKeys.push(String(name));
              }
            }
          }
          if (hasDontEnumBug) {
            var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);
            for (var k = 0; k < dontEnums.length; ++k) {
              if (!(skipConstructor && dontEnums[k] === "constructor") && has.call(object, dontEnums[k])) {
                theKeys.push(dontEnums[k]);
              }
            }
          }
          return theKeys;
        };
      }
      var has;
      var toStr;
      var isArgs;
      var isEnumerable;
      var hasDontEnumBug;
      var hasProtoEnumBug;
      var dontEnums;
      var equalsConstructorPrototype;
      var excludedKeys;
      var hasAutomationEqualityBug;
      var equalsConstructorPrototypeIfNotBuggy;
      module.exports = keysShim;
    }
  });

  // node_modules/object-keys/index.js
  var require_object_keys = __commonJS({
    "node_modules/object-keys/index.js"(exports, module) {
      "use strict";
      var slice = Array.prototype.slice;
      var isArgs = require_isArguments();
      var origKeys = Object.keys;
      var keysShim = origKeys ? function keys(o) {
        return origKeys(o);
      } : require_implementation2();
      var originalKeys = Object.keys;
      keysShim.shim = function shimObjectKeys() {
        if (Object.keys) {
          var keysWorksWithArguments = (function() {
            var args = Object.keys(arguments);
            return args && args.length === arguments.length;
          })(1, 2);
          if (!keysWorksWithArguments) {
            Object.keys = function keys(object) {
              if (isArgs(object)) {
                return originalKeys(slice.call(object));
              }
              return originalKeys(object);
            };
          }
        } else {
          Object.keys = keysShim;
        }
        return Object.keys || keysShim;
      };
      module.exports = keysShim;
    }
  });

  // node_modules/object.assign/implementation.js
  var require_implementation3 = __commonJS({
    "node_modules/object.assign/implementation.js"(exports, module) {
      "use strict";
      var objectKeys = require_object_keys();
      var hasSymbols = require_shams()();
      var callBound = require_call_bound();
      var $Object = require_es_object_atoms();
      var $push = callBound("Array.prototype.push");
      var $propIsEnumerable = callBound("Object.prototype.propertyIsEnumerable");
      var originalGetSymbols = hasSymbols ? $Object.getOwnPropertySymbols : null;
      module.exports = function assign(target, source1) {
        if (target == null) {
          throw new TypeError("target must be an object");
        }
        var to = $Object(target);
        if (arguments.length === 1) {
          return to;
        }
        for (var s = 1; s < arguments.length; ++s) {
          var from = $Object(arguments[s]);
          var keys = objectKeys(from);
          var getSymbols = hasSymbols && ($Object.getOwnPropertySymbols || originalGetSymbols);
          if (getSymbols) {
            var syms = getSymbols(from);
            for (var j = 0; j < syms.length; ++j) {
              var key = syms[j];
              if ($propIsEnumerable(from, key)) {
                $push(keys, key);
              }
            }
          }
          for (var i = 0; i < keys.length; ++i) {
            var nextKey = keys[i];
            if ($propIsEnumerable(from, nextKey)) {
              var propValue = from[nextKey];
              to[nextKey] = propValue;
            }
          }
        }
        return to;
      };
    }
  });

  // node_modules/object.assign/polyfill.js
  var require_polyfill = __commonJS({
    "node_modules/object.assign/polyfill.js"(exports, module) {
      "use strict";
      var implementation = require_implementation3();
      var lacksProperEnumerationOrder = function() {
        if (!Object.assign) {
          return false;
        }
        var str = "abcdefghijklmnopqrst";
        var letters = str.split("");
        var map = {};
        for (var i = 0; i < letters.length; ++i) {
          map[letters[i]] = letters[i];
        }
        var obj = Object.assign({}, map);
        var actual = "";
        for (var k in obj) {
          actual += k;
        }
        return str !== actual;
      };
      var assignHasPendingExceptions = function() {
        if (!Object.assign || !Object.preventExtensions) {
          return false;
        }
        var thrower = Object.preventExtensions({ 1: 2 });
        try {
          Object.assign(thrower, "xy");
        } catch (e) {
          return thrower[1] === "y";
        }
        return false;
      };
      module.exports = function getPolyfill() {
        if (!Object.assign) {
          return implementation;
        }
        if (lacksProperEnumerationOrder()) {
          return implementation;
        }
        if (assignHasPendingExceptions()) {
          return implementation;
        }
        return Object.assign;
      };
    }
  });

  // node_modules/object-is/implementation.js
  var require_implementation4 = __commonJS({
    "node_modules/object-is/implementation.js"(exports, module) {
      "use strict";
      var numberIsNaN = function(value) {
        return value !== value;
      };
      module.exports = function is(a, b) {
        if (a === 0 && b === 0) {
          return 1 / a === 1 / b;
        }
        if (a === b) {
          return true;
        }
        if (numberIsNaN(a) && numberIsNaN(b)) {
          return true;
        }
        return false;
      };
    }
  });

  // node_modules/object-is/polyfill.js
  var require_polyfill2 = __commonJS({
    "node_modules/object-is/polyfill.js"(exports, module) {
      "use strict";
      var implementation = require_implementation4();
      module.exports = function getPolyfill() {
        return typeof Object.is === "function" ? Object.is : implementation;
      };
    }
  });

  // node_modules/call-bind/callBound.js
  var require_callBound = __commonJS({
    "node_modules/call-bind/callBound.js"(exports, module) {
      "use strict";
      var GetIntrinsic = require_get_intrinsic();
      var callBind = require_call_bind();
      var $indexOf = callBind(GetIntrinsic("String.prototype.indexOf"));
      module.exports = function callBoundIntrinsic(name, allowMissing) {
        var intrinsic = GetIntrinsic(name, !!allowMissing);
        if (typeof intrinsic === "function" && $indexOf(name, ".prototype.") > -1) {
          return callBind(intrinsic);
        }
        return intrinsic;
      };
    }
  });

  // node_modules/define-properties/index.js
  var require_define_properties = __commonJS({
    "node_modules/define-properties/index.js"(exports, module) {
      "use strict";
      var keys = require_object_keys();
      var hasSymbols = typeof Symbol === "function" && typeof /* @__PURE__ */ Symbol("foo") === "symbol";
      var toStr = Object.prototype.toString;
      var concat = Array.prototype.concat;
      var defineDataProperty = require_define_data_property();
      var isFunction = function(fn) {
        return typeof fn === "function" && toStr.call(fn) === "[object Function]";
      };
      var supportsDescriptors = require_has_property_descriptors()();
      var defineProperty = function(object, name, value, predicate) {
        if (name in object) {
          if (predicate === true) {
            if (object[name] === value) {
              return;
            }
          } else if (!isFunction(predicate) || !predicate()) {
            return;
          }
        }
        if (supportsDescriptors) {
          defineDataProperty(object, name, value, true);
        } else {
          defineDataProperty(object, name, value);
        }
      };
      var defineProperties = function(object, map) {
        var predicates = arguments.length > 2 ? arguments[2] : {};
        var props = keys(map);
        if (hasSymbols) {
          props = concat.call(props, Object.getOwnPropertySymbols(map));
        }
        for (var i = 0; i < props.length; i += 1) {
          defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
        }
      };
      defineProperties.supportsDescriptors = !!supportsDescriptors;
      module.exports = defineProperties;
    }
  });

  // node_modules/object-is/shim.js
  var require_shim = __commonJS({
    "node_modules/object-is/shim.js"(exports, module) {
      "use strict";
      var getPolyfill = require_polyfill2();
      var define2 = require_define_properties();
      module.exports = function shimObjectIs() {
        var polyfill = getPolyfill();
        define2(Object, { is: polyfill }, {
          is: function testObjectIs() {
            return Object.is !== polyfill;
          }
        });
        return polyfill;
      };
    }
  });

  // node_modules/object-is/index.js
  var require_object_is = __commonJS({
    "node_modules/object-is/index.js"(exports, module) {
      "use strict";
      var define2 = require_define_properties();
      var callBind = require_call_bind();
      var implementation = require_implementation4();
      var getPolyfill = require_polyfill2();
      var shim = require_shim();
      var polyfill = callBind(getPolyfill(), Object);
      define2(polyfill, {
        getPolyfill,
        implementation,
        shim
      });
      module.exports = polyfill;
    }
  });

  // node_modules/is-nan/implementation.js
  var require_implementation5 = __commonJS({
    "node_modules/is-nan/implementation.js"(exports, module) {
      "use strict";
      module.exports = function isNaN2(value) {
        return value !== value;
      };
    }
  });

  // node_modules/is-nan/polyfill.js
  var require_polyfill3 = __commonJS({
    "node_modules/is-nan/polyfill.js"(exports, module) {
      "use strict";
      var implementation = require_implementation5();
      module.exports = function getPolyfill() {
        if (Number.isNaN && Number.isNaN(NaN) && !Number.isNaN("a")) {
          return Number.isNaN;
        }
        return implementation;
      };
    }
  });

  // node_modules/is-nan/shim.js
  var require_shim2 = __commonJS({
    "node_modules/is-nan/shim.js"(exports, module) {
      "use strict";
      var define2 = require_define_properties();
      var getPolyfill = require_polyfill3();
      module.exports = function shimNumberIsNaN() {
        var polyfill = getPolyfill();
        define2(Number, { isNaN: polyfill }, {
          isNaN: function testIsNaN() {
            return Number.isNaN !== polyfill;
          }
        });
        return polyfill;
      };
    }
  });

  // node_modules/is-nan/index.js
  var require_is_nan = __commonJS({
    "node_modules/is-nan/index.js"(exports, module) {
      "use strict";
      var callBind = require_call_bind();
      var define2 = require_define_properties();
      var implementation = require_implementation5();
      var getPolyfill = require_polyfill3();
      var shim = require_shim2();
      var polyfill = callBind(getPolyfill(), Number);
      define2(polyfill, {
        getPolyfill,
        implementation,
        shim
      });
      module.exports = polyfill;
    }
  });

  // node_modules/assert/build/internal/util/comparisons.js
  var require_comparisons = __commonJS({
    "node_modules/assert/build/internal/util/comparisons.js"(exports, module) {
      "use strict";
      function _slicedToArray(arr, i) {
        return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
      }
      function _nonIterableRest() {
        throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }
      function _unsupportedIterableToArray(o, minLen) {
        if (!o) return;
        if (typeof o === "string") return _arrayLikeToArray(o, minLen);
        var n = Object.prototype.toString.call(o).slice(8, -1);
        if (n === "Object" && o.constructor) n = o.constructor.name;
        if (n === "Map" || n === "Set") return Array.from(o);
        if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
      }
      function _arrayLikeToArray(arr, len) {
        if (len == null || len > arr.length) len = arr.length;
        for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
        return arr2;
      }
      function _iterableToArrayLimit(r, l) {
        var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
        if (null != t) {
          var e, n, i, u, a = [], f = true, o = false;
          try {
            if (i = (t = t.call(r)).next, 0 === l) {
              if (Object(t) !== t) return;
              f = false;
            } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
          } catch (r2) {
            o = true, n = r2;
          } finally {
            try {
              if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
            } finally {
              if (o) throw n;
            }
          }
          return a;
        }
      }
      function _arrayWithHoles(arr) {
        if (Array.isArray(arr)) return arr;
      }
      function _typeof(o) {
        "@babel/helpers - typeof";
        return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
          return typeof o2;
        } : function(o2) {
          return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
        }, _typeof(o);
      }
      var regexFlagsSupported = /a/g.flags !== void 0;
      var arrayFromSet = function arrayFromSet2(set) {
        var array = [];
        set.forEach(function(value) {
          return array.push(value);
        });
        return array;
      };
      var arrayFromMap = function arrayFromMap2(map) {
        var array = [];
        map.forEach(function(value, key) {
          return array.push([key, value]);
        });
        return array;
      };
      var objectIs = Object.is ? Object.is : require_object_is();
      var objectGetOwnPropertySymbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols : function() {
        return [];
      };
      var numberIsNaN = Number.isNaN ? Number.isNaN : require_is_nan();
      function uncurryThis(f) {
        return f.call.bind(f);
      }
      var hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
      var propertyIsEnumerable = uncurryThis(Object.prototype.propertyIsEnumerable);
      var objectToString = uncurryThis(Object.prototype.toString);
      var _require$types = require_util().types;
      var isAnyArrayBuffer = _require$types.isAnyArrayBuffer;
      var isArrayBufferView = _require$types.isArrayBufferView;
      var isDate = _require$types.isDate;
      var isMap = _require$types.isMap;
      var isRegExp = _require$types.isRegExp;
      var isSet = _require$types.isSet;
      var isNativeError = _require$types.isNativeError;
      var isBoxedPrimitive = _require$types.isBoxedPrimitive;
      var isNumberObject = _require$types.isNumberObject;
      var isStringObject = _require$types.isStringObject;
      var isBooleanObject = _require$types.isBooleanObject;
      var isBigIntObject = _require$types.isBigIntObject;
      var isSymbolObject = _require$types.isSymbolObject;
      var isFloat32Array = _require$types.isFloat32Array;
      var isFloat64Array = _require$types.isFloat64Array;
      function isNonIndex(key) {
        if (key.length === 0 || key.length > 10) return true;
        for (var i = 0; i < key.length; i++) {
          var code = key.charCodeAt(i);
          if (code < 48 || code > 57) return true;
        }
        return key.length === 10 && key >= Math.pow(2, 32);
      }
      function getOwnNonIndexProperties(value) {
        return Object.keys(value).filter(isNonIndex).concat(objectGetOwnPropertySymbols(value).filter(Object.prototype.propertyIsEnumerable.bind(value)));
      }
      function compare(a, b) {
        if (a === b) {
          return 0;
        }
        var x = a.length;
        var y = b.length;
        for (var i = 0, len = Math.min(x, y); i < len; ++i) {
          if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
          }
        }
        if (x < y) {
          return -1;
        }
        if (y < x) {
          return 1;
        }
        return 0;
      }
      var ONLY_ENUMERABLE = void 0;
      var kStrict = true;
      var kLoose = false;
      var kNoIterator = 0;
      var kIsArray = 1;
      var kIsSet = 2;
      var kIsMap = 3;
      function areSimilarRegExps(a, b) {
        return regexFlagsSupported ? a.source === b.source && a.flags === b.flags : RegExp.prototype.toString.call(a) === RegExp.prototype.toString.call(b);
      }
      function areSimilarFloatArrays(a, b) {
        if (a.byteLength !== b.byteLength) {
          return false;
        }
        for (var offset = 0; offset < a.byteLength; offset++) {
          if (a[offset] !== b[offset]) {
            return false;
          }
        }
        return true;
      }
      function areSimilarTypedArrays(a, b) {
        if (a.byteLength !== b.byteLength) {
          return false;
        }
        return compare(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), new Uint8Array(b.buffer, b.byteOffset, b.byteLength)) === 0;
      }
      function areEqualArrayBuffers(buf1, buf2) {
        return buf1.byteLength === buf2.byteLength && compare(new Uint8Array(buf1), new Uint8Array(buf2)) === 0;
      }
      function isEqualBoxedPrimitive(val1, val2) {
        if (isNumberObject(val1)) {
          return isNumberObject(val2) && objectIs(Number.prototype.valueOf.call(val1), Number.prototype.valueOf.call(val2));
        }
        if (isStringObject(val1)) {
          return isStringObject(val2) && String.prototype.valueOf.call(val1) === String.prototype.valueOf.call(val2);
        }
        if (isBooleanObject(val1)) {
          return isBooleanObject(val2) && Boolean.prototype.valueOf.call(val1) === Boolean.prototype.valueOf.call(val2);
        }
        if (isBigIntObject(val1)) {
          return isBigIntObject(val2) && BigInt.prototype.valueOf.call(val1) === BigInt.prototype.valueOf.call(val2);
        }
        return isSymbolObject(val2) && Symbol.prototype.valueOf.call(val1) === Symbol.prototype.valueOf.call(val2);
      }
      function innerDeepEqual(val1, val2, strict, memos) {
        if (val1 === val2) {
          if (val1 !== 0) return true;
          return strict ? objectIs(val1, val2) : true;
        }
        if (strict) {
          if (_typeof(val1) !== "object") {
            return typeof val1 === "number" && numberIsNaN(val1) && numberIsNaN(val2);
          }
          if (_typeof(val2) !== "object" || val1 === null || val2 === null) {
            return false;
          }
          if (Object.getPrototypeOf(val1) !== Object.getPrototypeOf(val2)) {
            return false;
          }
        } else {
          if (val1 === null || _typeof(val1) !== "object") {
            if (val2 === null || _typeof(val2) !== "object") {
              return val1 == val2;
            }
            return false;
          }
          if (val2 === null || _typeof(val2) !== "object") {
            return false;
          }
        }
        var val1Tag = objectToString(val1);
        var val2Tag = objectToString(val2);
        if (val1Tag !== val2Tag) {
          return false;
        }
        if (Array.isArray(val1)) {
          if (val1.length !== val2.length) {
            return false;
          }
          var keys1 = getOwnNonIndexProperties(val1, ONLY_ENUMERABLE);
          var keys2 = getOwnNonIndexProperties(val2, ONLY_ENUMERABLE);
          if (keys1.length !== keys2.length) {
            return false;
          }
          return keyCheck(val1, val2, strict, memos, kIsArray, keys1);
        }
        if (val1Tag === "[object Object]") {
          if (!isMap(val1) && isMap(val2) || !isSet(val1) && isSet(val2)) {
            return false;
          }
        }
        if (isDate(val1)) {
          if (!isDate(val2) || Date.prototype.getTime.call(val1) !== Date.prototype.getTime.call(val2)) {
            return false;
          }
        } else if (isRegExp(val1)) {
          if (!isRegExp(val2) || !areSimilarRegExps(val1, val2)) {
            return false;
          }
        } else if (isNativeError(val1) || val1 instanceof Error) {
          if (val1.message !== val2.message || val1.name !== val2.name) {
            return false;
          }
        } else if (isArrayBufferView(val1)) {
          if (!strict && (isFloat32Array(val1) || isFloat64Array(val1))) {
            if (!areSimilarFloatArrays(val1, val2)) {
              return false;
            }
          } else if (!areSimilarTypedArrays(val1, val2)) {
            return false;
          }
          var _keys = getOwnNonIndexProperties(val1, ONLY_ENUMERABLE);
          var _keys2 = getOwnNonIndexProperties(val2, ONLY_ENUMERABLE);
          if (_keys.length !== _keys2.length) {
            return false;
          }
          return keyCheck(val1, val2, strict, memos, kNoIterator, _keys);
        } else if (isSet(val1)) {
          if (!isSet(val2) || val1.size !== val2.size) {
            return false;
          }
          return keyCheck(val1, val2, strict, memos, kIsSet);
        } else if (isMap(val1)) {
          if (!isMap(val2) || val1.size !== val2.size) {
            return false;
          }
          return keyCheck(val1, val2, strict, memos, kIsMap);
        } else if (isAnyArrayBuffer(val1)) {
          if (!areEqualArrayBuffers(val1, val2)) {
            return false;
          }
        } else if (isBoxedPrimitive(val1) && !isEqualBoxedPrimitive(val1, val2)) {
          return false;
        }
        return keyCheck(val1, val2, strict, memos, kNoIterator);
      }
      function getEnumerables(val, keys) {
        return keys.filter(function(k) {
          return propertyIsEnumerable(val, k);
        });
      }
      function keyCheck(val1, val2, strict, memos, iterationType, aKeys) {
        if (arguments.length === 5) {
          aKeys = Object.keys(val1);
          var bKeys = Object.keys(val2);
          if (aKeys.length !== bKeys.length) {
            return false;
          }
        }
        var i = 0;
        for (; i < aKeys.length; i++) {
          if (!hasOwnProperty(val2, aKeys[i])) {
            return false;
          }
        }
        if (strict && arguments.length === 5) {
          var symbolKeysA = objectGetOwnPropertySymbols(val1);
          if (symbolKeysA.length !== 0) {
            var count = 0;
            for (i = 0; i < symbolKeysA.length; i++) {
              var key = symbolKeysA[i];
              if (propertyIsEnumerable(val1, key)) {
                if (!propertyIsEnumerable(val2, key)) {
                  return false;
                }
                aKeys.push(key);
                count++;
              } else if (propertyIsEnumerable(val2, key)) {
                return false;
              }
            }
            var symbolKeysB = objectGetOwnPropertySymbols(val2);
            if (symbolKeysA.length !== symbolKeysB.length && getEnumerables(val2, symbolKeysB).length !== count) {
              return false;
            }
          } else {
            var _symbolKeysB = objectGetOwnPropertySymbols(val2);
            if (_symbolKeysB.length !== 0 && getEnumerables(val2, _symbolKeysB).length !== 0) {
              return false;
            }
          }
        }
        if (aKeys.length === 0 && (iterationType === kNoIterator || iterationType === kIsArray && val1.length === 0 || val1.size === 0)) {
          return true;
        }
        if (memos === void 0) {
          memos = {
            val1: /* @__PURE__ */ new Map(),
            val2: /* @__PURE__ */ new Map(),
            position: 0
          };
        } else {
          var val2MemoA = memos.val1.get(val1);
          if (val2MemoA !== void 0) {
            var val2MemoB = memos.val2.get(val2);
            if (val2MemoB !== void 0) {
              return val2MemoA === val2MemoB;
            }
          }
          memos.position++;
        }
        memos.val1.set(val1, memos.position);
        memos.val2.set(val2, memos.position);
        var areEq = objEquiv(val1, val2, strict, aKeys, memos, iterationType);
        memos.val1.delete(val1);
        memos.val2.delete(val2);
        return areEq;
      }
      function setHasEqualElement(set, val1, strict, memo) {
        var setValues = arrayFromSet(set);
        for (var i = 0; i < setValues.length; i++) {
          var val2 = setValues[i];
          if (innerDeepEqual(val1, val2, strict, memo)) {
            set.delete(val2);
            return true;
          }
        }
        return false;
      }
      function findLooseMatchingPrimitives(prim) {
        switch (_typeof(prim)) {
          case "undefined":
            return null;
          case "object":
            return void 0;
          case "symbol":
            return false;
          case "string":
            prim = +prim;
          // Loose equal entries exist only if the string is possible to convert to
          // a regular number and not NaN.
          // Fall through
          case "number":
            if (numberIsNaN(prim)) {
              return false;
            }
        }
        return true;
      }
      function setMightHaveLoosePrim(a, b, prim) {
        var altValue = findLooseMatchingPrimitives(prim);
        if (altValue != null) return altValue;
        return b.has(altValue) && !a.has(altValue);
      }
      function mapMightHaveLoosePrim(a, b, prim, item, memo) {
        var altValue = findLooseMatchingPrimitives(prim);
        if (altValue != null) {
          return altValue;
        }
        var curB = b.get(altValue);
        if (curB === void 0 && !b.has(altValue) || !innerDeepEqual(item, curB, false, memo)) {
          return false;
        }
        return !a.has(altValue) && innerDeepEqual(item, curB, false, memo);
      }
      function setEquiv(a, b, strict, memo) {
        var set = null;
        var aValues = arrayFromSet(a);
        for (var i = 0; i < aValues.length; i++) {
          var val = aValues[i];
          if (_typeof(val) === "object" && val !== null) {
            if (set === null) {
              set = /* @__PURE__ */ new Set();
            }
            set.add(val);
          } else if (!b.has(val)) {
            if (strict) return false;
            if (!setMightHaveLoosePrim(a, b, val)) {
              return false;
            }
            if (set === null) {
              set = /* @__PURE__ */ new Set();
            }
            set.add(val);
          }
        }
        if (set !== null) {
          var bValues = arrayFromSet(b);
          for (var _i = 0; _i < bValues.length; _i++) {
            var _val = bValues[_i];
            if (_typeof(_val) === "object" && _val !== null) {
              if (!setHasEqualElement(set, _val, strict, memo)) return false;
            } else if (!strict && !a.has(_val) && !setHasEqualElement(set, _val, strict, memo)) {
              return false;
            }
          }
          return set.size === 0;
        }
        return true;
      }
      function mapHasEqualEntry(set, map, key1, item1, strict, memo) {
        var setValues = arrayFromSet(set);
        for (var i = 0; i < setValues.length; i++) {
          var key2 = setValues[i];
          if (innerDeepEqual(key1, key2, strict, memo) && innerDeepEqual(item1, map.get(key2), strict, memo)) {
            set.delete(key2);
            return true;
          }
        }
        return false;
      }
      function mapEquiv(a, b, strict, memo) {
        var set = null;
        var aEntries = arrayFromMap(a);
        for (var i = 0; i < aEntries.length; i++) {
          var _aEntries$i = _slicedToArray(aEntries[i], 2), key = _aEntries$i[0], item1 = _aEntries$i[1];
          if (_typeof(key) === "object" && key !== null) {
            if (set === null) {
              set = /* @__PURE__ */ new Set();
            }
            set.add(key);
          } else {
            var item2 = b.get(key);
            if (item2 === void 0 && !b.has(key) || !innerDeepEqual(item1, item2, strict, memo)) {
              if (strict) return false;
              if (!mapMightHaveLoosePrim(a, b, key, item1, memo)) return false;
              if (set === null) {
                set = /* @__PURE__ */ new Set();
              }
              set.add(key);
            }
          }
        }
        if (set !== null) {
          var bEntries = arrayFromMap(b);
          for (var _i2 = 0; _i2 < bEntries.length; _i2++) {
            var _bEntries$_i = _slicedToArray(bEntries[_i2], 2), _key = _bEntries$_i[0], item = _bEntries$_i[1];
            if (_typeof(_key) === "object" && _key !== null) {
              if (!mapHasEqualEntry(set, a, _key, item, strict, memo)) return false;
            } else if (!strict && (!a.has(_key) || !innerDeepEqual(a.get(_key), item, false, memo)) && !mapHasEqualEntry(set, a, _key, item, false, memo)) {
              return false;
            }
          }
          return set.size === 0;
        }
        return true;
      }
      function objEquiv(a, b, strict, keys, memos, iterationType) {
        var i = 0;
        if (iterationType === kIsSet) {
          if (!setEquiv(a, b, strict, memos)) {
            return false;
          }
        } else if (iterationType === kIsMap) {
          if (!mapEquiv(a, b, strict, memos)) {
            return false;
          }
        } else if (iterationType === kIsArray) {
          for (; i < a.length; i++) {
            if (hasOwnProperty(a, i)) {
              if (!hasOwnProperty(b, i) || !innerDeepEqual(a[i], b[i], strict, memos)) {
                return false;
              }
            } else if (hasOwnProperty(b, i)) {
              return false;
            } else {
              var keysA = Object.keys(a);
              for (; i < keysA.length; i++) {
                var key = keysA[i];
                if (!hasOwnProperty(b, key) || !innerDeepEqual(a[key], b[key], strict, memos)) {
                  return false;
                }
              }
              if (keysA.length !== Object.keys(b).length) {
                return false;
              }
              return true;
            }
          }
        }
        for (i = 0; i < keys.length; i++) {
          var _key2 = keys[i];
          if (!innerDeepEqual(a[_key2], b[_key2], strict, memos)) {
            return false;
          }
        }
        return true;
      }
      function isDeepEqual(val1, val2) {
        return innerDeepEqual(val1, val2, kLoose);
      }
      function isDeepStrictEqual(val1, val2) {
        return innerDeepEqual(val1, val2, kStrict);
      }
      module.exports = {
        isDeepEqual,
        isDeepStrictEqual
      };
    }
  });

  // node_modules/assert/build/assert.js
  var require_assert = __commonJS({
    "node_modules/assert/build/assert.js"(exports, module) {
      "use strict";
      function _typeof(o) {
        "@babel/helpers - typeof";
        return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
          return typeof o2;
        } : function(o2) {
          return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
        }, _typeof(o);
      }
      function _defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
        }
      }
      function _createClass(Constructor, protoProps, staticProps) {
        if (protoProps) _defineProperties(Constructor.prototype, protoProps);
        if (staticProps) _defineProperties(Constructor, staticProps);
        Object.defineProperty(Constructor, "prototype", { writable: false });
        return Constructor;
      }
      function _toPropertyKey(arg) {
        var key = _toPrimitive(arg, "string");
        return _typeof(key) === "symbol" ? key : String(key);
      }
      function _toPrimitive(input, hint) {
        if (_typeof(input) !== "object" || input === null) return input;
        var prim = input[Symbol.toPrimitive];
        if (prim !== void 0) {
          var res = prim.call(input, hint || "default");
          if (_typeof(res) !== "object") return res;
          throw new TypeError("@@toPrimitive must return a primitive value.");
        }
        return (hint === "string" ? String : Number)(input);
      }
      function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
          throw new TypeError("Cannot call a class as a function");
        }
      }
      var _require = require_errors();
      var _require$codes = _require.codes;
      var ERR_AMBIGUOUS_ARGUMENT = _require$codes.ERR_AMBIGUOUS_ARGUMENT;
      var ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE;
      var ERR_INVALID_ARG_VALUE = _require$codes.ERR_INVALID_ARG_VALUE;
      var ERR_INVALID_RETURN_VALUE = _require$codes.ERR_INVALID_RETURN_VALUE;
      var ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS;
      var AssertionError = require_assertion_error();
      var _require2 = require_util();
      var inspect = _require2.inspect;
      var _require$types = require_util().types;
      var isPromise = _require$types.isPromise;
      var isRegExp = _require$types.isRegExp;
      var objectAssign = require_polyfill()();
      var objectIs = require_polyfill2()();
      var RegExpPrototypeTest = require_callBound()("RegExp.prototype.test");
      var isDeepEqual;
      var isDeepStrictEqual;
      function lazyLoadComparison() {
        var comparison = require_comparisons();
        isDeepEqual = comparison.isDeepEqual;
        isDeepStrictEqual = comparison.isDeepStrictEqual;
      }
      var warned = false;
      var assert = module.exports = ok;
      var NO_EXCEPTION_SENTINEL = {};
      function innerFail(obj) {
        if (obj.message instanceof Error) throw obj.message;
        throw new AssertionError(obj);
      }
      function fail(actual, expected, message, operator, stackStartFn) {
        var argsLen = arguments.length;
        var internalMessage;
        if (argsLen === 0) {
          internalMessage = "Failed";
        } else if (argsLen === 1) {
          message = actual;
          actual = void 0;
        } else {
          if (warned === false) {
            warned = true;
            var warn = process.emitWarning ? process.emitWarning : console.warn.bind(console);
            warn("assert.fail() with more than one argument is deprecated. Please use assert.strictEqual() instead or only pass a message.", "DeprecationWarning", "DEP0094");
          }
          if (argsLen === 2) operator = "!=";
        }
        if (message instanceof Error) throw message;
        var errArgs = {
          actual,
          expected,
          operator: operator === void 0 ? "fail" : operator,
          stackStartFn: stackStartFn || fail
        };
        if (message !== void 0) {
          errArgs.message = message;
        }
        var err = new AssertionError(errArgs);
        if (internalMessage) {
          err.message = internalMessage;
          err.generatedMessage = true;
        }
        throw err;
      }
      assert.fail = fail;
      assert.AssertionError = AssertionError;
      function innerOk(fn, argLen, value, message) {
        if (!value) {
          var generatedMessage = false;
          if (argLen === 0) {
            generatedMessage = true;
            message = "No value argument passed to `assert.ok()`";
          } else if (message instanceof Error) {
            throw message;
          }
          var err = new AssertionError({
            actual: value,
            expected: true,
            message,
            operator: "==",
            stackStartFn: fn
          });
          err.generatedMessage = generatedMessage;
          throw err;
        }
      }
      function ok() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        innerOk.apply(void 0, [ok, args.length].concat(args));
      }
      assert.ok = ok;
      assert.equal = function equal(actual, expected, message) {
        if (arguments.length < 2) {
          throw new ERR_MISSING_ARGS("actual", "expected");
        }
        if (actual != expected) {
          innerFail({
            actual,
            expected,
            message,
            operator: "==",
            stackStartFn: equal
          });
        }
      };
      assert.notEqual = function notEqual(actual, expected, message) {
        if (arguments.length < 2) {
          throw new ERR_MISSING_ARGS("actual", "expected");
        }
        if (actual == expected) {
          innerFail({
            actual,
            expected,
            message,
            operator: "!=",
            stackStartFn: notEqual
          });
        }
      };
      assert.deepEqual = function deepEqual(actual, expected, message) {
        if (arguments.length < 2) {
          throw new ERR_MISSING_ARGS("actual", "expected");
        }
        if (isDeepEqual === void 0) lazyLoadComparison();
        if (!isDeepEqual(actual, expected)) {
          innerFail({
            actual,
            expected,
            message,
            operator: "deepEqual",
            stackStartFn: deepEqual
          });
        }
      };
      assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
        if (arguments.length < 2) {
          throw new ERR_MISSING_ARGS("actual", "expected");
        }
        if (isDeepEqual === void 0) lazyLoadComparison();
        if (isDeepEqual(actual, expected)) {
          innerFail({
            actual,
            expected,
            message,
            operator: "notDeepEqual",
            stackStartFn: notDeepEqual
          });
        }
      };
      assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
        if (arguments.length < 2) {
          throw new ERR_MISSING_ARGS("actual", "expected");
        }
        if (isDeepEqual === void 0) lazyLoadComparison();
        if (!isDeepStrictEqual(actual, expected)) {
          innerFail({
            actual,
            expected,
            message,
            operator: "deepStrictEqual",
            stackStartFn: deepStrictEqual
          });
        }
      };
      assert.notDeepStrictEqual = notDeepStrictEqual;
      function notDeepStrictEqual(actual, expected, message) {
        if (arguments.length < 2) {
          throw new ERR_MISSING_ARGS("actual", "expected");
        }
        if (isDeepEqual === void 0) lazyLoadComparison();
        if (isDeepStrictEqual(actual, expected)) {
          innerFail({
            actual,
            expected,
            message,
            operator: "notDeepStrictEqual",
            stackStartFn: notDeepStrictEqual
          });
        }
      }
      assert.strictEqual = function strictEqual(actual, expected, message) {
        if (arguments.length < 2) {
          throw new ERR_MISSING_ARGS("actual", "expected");
        }
        if (!objectIs(actual, expected)) {
          innerFail({
            actual,
            expected,
            message,
            operator: "strictEqual",
            stackStartFn: strictEqual
          });
        }
      };
      assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
        if (arguments.length < 2) {
          throw new ERR_MISSING_ARGS("actual", "expected");
        }
        if (objectIs(actual, expected)) {
          innerFail({
            actual,
            expected,
            message,
            operator: "notStrictEqual",
            stackStartFn: notStrictEqual
          });
        }
      };
      var Comparison = /* @__PURE__ */ _createClass(function Comparison2(obj, keys, actual) {
        var _this = this;
        _classCallCheck(this, Comparison2);
        keys.forEach(function(key) {
          if (key in obj) {
            if (actual !== void 0 && typeof actual[key] === "string" && isRegExp(obj[key]) && RegExpPrototypeTest(obj[key], actual[key])) {
              _this[key] = actual[key];
            } else {
              _this[key] = obj[key];
            }
          }
        });
      });
      function compareExceptionKey(actual, expected, key, message, keys, fn) {
        if (!(key in actual) || !isDeepStrictEqual(actual[key], expected[key])) {
          if (!message) {
            var a = new Comparison(actual, keys);
            var b = new Comparison(expected, keys, actual);
            var err = new AssertionError({
              actual: a,
              expected: b,
              operator: "deepStrictEqual",
              stackStartFn: fn
            });
            err.actual = actual;
            err.expected = expected;
            err.operator = fn.name;
            throw err;
          }
          innerFail({
            actual,
            expected,
            message,
            operator: fn.name,
            stackStartFn: fn
          });
        }
      }
      function expectedException(actual, expected, msg, fn) {
        if (typeof expected !== "function") {
          if (isRegExp(expected)) return RegExpPrototypeTest(expected, actual);
          if (arguments.length === 2) {
            throw new ERR_INVALID_ARG_TYPE("expected", ["Function", "RegExp"], expected);
          }
          if (_typeof(actual) !== "object" || actual === null) {
            var err = new AssertionError({
              actual,
              expected,
              message: msg,
              operator: "deepStrictEqual",
              stackStartFn: fn
            });
            err.operator = fn.name;
            throw err;
          }
          var keys = Object.keys(expected);
          if (expected instanceof Error) {
            keys.push("name", "message");
          } else if (keys.length === 0) {
            throw new ERR_INVALID_ARG_VALUE("error", expected, "may not be an empty object");
          }
          if (isDeepEqual === void 0) lazyLoadComparison();
          keys.forEach(function(key) {
            if (typeof actual[key] === "string" && isRegExp(expected[key]) && RegExpPrototypeTest(expected[key], actual[key])) {
              return;
            }
            compareExceptionKey(actual, expected, key, msg, keys, fn);
          });
          return true;
        }
        if (expected.prototype !== void 0 && actual instanceof expected) {
          return true;
        }
        if (Error.isPrototypeOf(expected)) {
          return false;
        }
        return expected.call({}, actual) === true;
      }
      function getActual(fn) {
        if (typeof fn !== "function") {
          throw new ERR_INVALID_ARG_TYPE("fn", "Function", fn);
        }
        try {
          fn();
        } catch (e) {
          return e;
        }
        return NO_EXCEPTION_SENTINEL;
      }
      function checkIsPromise(obj) {
        return isPromise(obj) || obj !== null && _typeof(obj) === "object" && typeof obj.then === "function" && typeof obj.catch === "function";
      }
      function waitForActual(promiseFn) {
        return Promise.resolve().then(function() {
          var resultPromise;
          if (typeof promiseFn === "function") {
            resultPromise = promiseFn();
            if (!checkIsPromise(resultPromise)) {
              throw new ERR_INVALID_RETURN_VALUE("instance of Promise", "promiseFn", resultPromise);
            }
          } else if (checkIsPromise(promiseFn)) {
            resultPromise = promiseFn;
          } else {
            throw new ERR_INVALID_ARG_TYPE("promiseFn", ["Function", "Promise"], promiseFn);
          }
          return Promise.resolve().then(function() {
            return resultPromise;
          }).then(function() {
            return NO_EXCEPTION_SENTINEL;
          }).catch(function(e) {
            return e;
          });
        });
      }
      function expectsError(stackStartFn, actual, error, message) {
        if (typeof error === "string") {
          if (arguments.length === 4) {
            throw new ERR_INVALID_ARG_TYPE("error", ["Object", "Error", "Function", "RegExp"], error);
          }
          if (_typeof(actual) === "object" && actual !== null) {
            if (actual.message === error) {
              throw new ERR_AMBIGUOUS_ARGUMENT("error/message", 'The error message "'.concat(actual.message, '" is identical to the message.'));
            }
          } else if (actual === error) {
            throw new ERR_AMBIGUOUS_ARGUMENT("error/message", 'The error "'.concat(actual, '" is identical to the message.'));
          }
          message = error;
          error = void 0;
        } else if (error != null && _typeof(error) !== "object" && typeof error !== "function") {
          throw new ERR_INVALID_ARG_TYPE("error", ["Object", "Error", "Function", "RegExp"], error);
        }
        if (actual === NO_EXCEPTION_SENTINEL) {
          var details = "";
          if (error && error.name) {
            details += " (".concat(error.name, ")");
          }
          details += message ? ": ".concat(message) : ".";
          var fnType = stackStartFn.name === "rejects" ? "rejection" : "exception";
          innerFail({
            actual: void 0,
            expected: error,
            operator: stackStartFn.name,
            message: "Missing expected ".concat(fnType).concat(details),
            stackStartFn
          });
        }
        if (error && !expectedException(actual, error, message, stackStartFn)) {
          throw actual;
        }
      }
      function expectsNoError(stackStartFn, actual, error, message) {
        if (actual === NO_EXCEPTION_SENTINEL) return;
        if (typeof error === "string") {
          message = error;
          error = void 0;
        }
        if (!error || expectedException(actual, error)) {
          var details = message ? ": ".concat(message) : ".";
          var fnType = stackStartFn.name === "doesNotReject" ? "rejection" : "exception";
          innerFail({
            actual,
            expected: error,
            operator: stackStartFn.name,
            message: "Got unwanted ".concat(fnType).concat(details, "\n") + 'Actual message: "'.concat(actual && actual.message, '"'),
            stackStartFn
          });
        }
        throw actual;
      }
      assert.throws = function throws(promiseFn) {
        for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          args[_key2 - 1] = arguments[_key2];
        }
        expectsError.apply(void 0, [throws, getActual(promiseFn)].concat(args));
      };
      assert.rejects = function rejects(promiseFn) {
        for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
          args[_key3 - 1] = arguments[_key3];
        }
        return waitForActual(promiseFn).then(function(result) {
          return expectsError.apply(void 0, [rejects, result].concat(args));
        });
      };
      assert.doesNotThrow = function doesNotThrow(fn) {
        for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
          args[_key4 - 1] = arguments[_key4];
        }
        expectsNoError.apply(void 0, [doesNotThrow, getActual(fn)].concat(args));
      };
      assert.doesNotReject = function doesNotReject(fn) {
        for (var _len5 = arguments.length, args = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
          args[_key5 - 1] = arguments[_key5];
        }
        return waitForActual(fn).then(function(result) {
          return expectsNoError.apply(void 0, [doesNotReject, result].concat(args));
        });
      };
      assert.ifError = function ifError(err) {
        if (err !== null && err !== void 0) {
          var message = "ifError got unwanted exception: ";
          if (_typeof(err) === "object" && typeof err.message === "string") {
            if (err.message.length === 0 && err.constructor) {
              message += err.constructor.name;
            } else {
              message += err.message;
            }
          } else {
            message += inspect(err);
          }
          var newErr = new AssertionError({
            actual: err,
            expected: null,
            operator: "ifError",
            message,
            stackStartFn: ifError
          });
          var origStack = err.stack;
          if (typeof origStack === "string") {
            var tmp2 = origStack.split("\n");
            tmp2.shift();
            var tmp1 = newErr.stack.split("\n");
            for (var i = 0; i < tmp2.length; i++) {
              var pos = tmp1.indexOf(tmp2[i]);
              if (pos !== -1) {
                tmp1 = tmp1.slice(0, pos);
                break;
              }
            }
            newErr.stack = "".concat(tmp1.join("\n"), "\n").concat(tmp2.join("\n"));
          }
          throw newErr;
        }
      };
      function internalMatch(string, regexp, message, fn, fnName) {
        if (!isRegExp(regexp)) {
          throw new ERR_INVALID_ARG_TYPE("regexp", "RegExp", regexp);
        }
        var match = fnName === "match";
        if (typeof string !== "string" || RegExpPrototypeTest(regexp, string) !== match) {
          if (message instanceof Error) {
            throw message;
          }
          var generatedMessage = !message;
          message = message || (typeof string !== "string" ? 'The "string" argument must be of type string. Received type ' + "".concat(_typeof(string), " (").concat(inspect(string), ")") : (match ? "The input did not match the regular expression " : "The input was expected to not match the regular expression ") + "".concat(inspect(regexp), ". Input:\n\n").concat(inspect(string), "\n"));
          var err = new AssertionError({
            actual: string,
            expected: regexp,
            message,
            operator: fnName,
            stackStartFn: fn
          });
          err.generatedMessage = generatedMessage;
          throw err;
        }
      }
      assert.match = function match(string, regexp, message) {
        internalMatch(string, regexp, message, match, "match");
      };
      assert.doesNotMatch = function doesNotMatch(string, regexp, message) {
        internalMatch(string, regexp, message, doesNotMatch, "doesNotMatch");
      };
      function strict() {
        for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
          args[_key6] = arguments[_key6];
        }
        innerOk.apply(void 0, [strict, args.length].concat(args));
      }
      assert.strict = objectAssign(strict, assert, {
        equal: assert.strictEqual,
        deepEqual: assert.deepStrictEqual,
        notEqual: assert.notStrictEqual,
        notDeepEqual: assert.notDeepStrictEqual
      });
      assert.strict.strict = assert.strict;
    }
  });

  // node_modules/acorn/dist/acorn.js
  var require_acorn = __commonJS({
    "node_modules/acorn/dist/acorn.js"(exports, module) {
      (function(global2, factory) {
        typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global2 = global2 || self, factory(global2.acorn = {}));
      })(exports, (function(exports2) {
        "use strict";
        var reservedWords = {
          3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
          5: "class enum extends super const export import",
          6: "enum",
          strict: "implements interface let package private protected public static yield",
          strictBind: "eval arguments"
        };
        var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";
        var keywords = {
          5: ecma5AndLessKeywords,
          "5module": ecma5AndLessKeywords + " export import",
          6: ecma5AndLessKeywords + " const class extends export import super"
        };
        var keywordRelationalOperator = /^in(stanceof)?$/;
        var nonASCIIidentifierStartChars = "\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08C7\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1878\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7CA\uA7F5-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC";
        var nonASCIIidentifierChars = "\u200C\u200D\xB7\u0300-\u036F\u0387\u0483-\u0487\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u0669\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06F0-\u06F9\u0711\u0730-\u074A\u07A6-\u07B0\u07C0-\u07C9\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0966-\u096F\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09E6-\u09EF\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A66-\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AE6-\u0AEF\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B55-\u0B57\u0B62\u0B63\u0B66-\u0B6F\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0BE6-\u0BEF\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0CE6-\u0CEF\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D66-\u0D6F\u0D81-\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0E50-\u0E59\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECD\u0ED0-\u0ED9\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1040-\u1049\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F-\u109D\u135D-\u135F\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u18A9\u1920-\u192B\u1930-\u193B\u1946-\u194F\u19D0-\u19DA\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AB0-\u1ABD\u1ABF\u1AC0\u1B00-\u1B04\u1B34-\u1B44\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BB0-\u1BB9\u1BE6-\u1BF3\u1C24-\u1C37\u1C40-\u1C49\u1C50-\u1C59\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u203F\u2040\u2054\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA620-\uA629\uA66F\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA82C\uA880\uA881\uA8B4-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F1\uA8FF-\uA909\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9D0-\uA9D9\uA9E5\uA9F0-\uA9F9\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA50-\uAA59\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uABF0-\uABF9\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFF10-\uFF19\uFF3F";
        var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
        var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");
        nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;
        var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 14, 29, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 157, 310, 10, 21, 11, 7, 153, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 71, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 28, 43, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 14, 35, 349, 41, 7, 1, 79, 28, 11, 0, 9, 21, 107, 20, 28, 22, 13, 52, 76, 44, 33, 24, 27, 35, 30, 0, 3, 0, 9, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 85, 6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 159, 52, 19, 3, 21, 2, 31, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37, 47, 21, 0, 60, 42, 14, 0, 72, 26, 230, 43, 117, 63, 32, 7, 3, 0, 3, 7, 2, 1, 2, 23, 16, 0, 2, 0, 95, 7, 3, 38, 17, 0, 2, 0, 29, 0, 11, 39, 8, 0, 22, 0, 12, 45, 20, 0, 35, 56, 264, 8, 2, 36, 18, 0, 50, 29, 113, 6, 2, 1, 2, 37, 22, 0, 26, 5, 2, 1, 2, 31, 15, 0, 328, 18, 190, 0, 80, 921, 103, 110, 18, 195, 2749, 1070, 4050, 582, 8634, 568, 8, 30, 114, 29, 19, 47, 17, 3, 32, 20, 6, 18, 689, 63, 129, 74, 6, 0, 67, 12, 65, 1, 2, 0, 29, 6135, 9, 1237, 43, 8, 8952, 286, 50, 2, 18, 3, 9, 395, 2309, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 2357, 44, 11, 6, 17, 0, 370, 43, 1301, 196, 60, 67, 8, 0, 1205, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42717, 35, 4148, 12, 221, 3, 5761, 15, 7472, 3104, 541, 1507, 4938];
        var astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 574, 3, 9, 9, 370, 1, 154, 10, 176, 2, 54, 14, 32, 9, 16, 3, 46, 10, 54, 9, 7, 2, 37, 13, 2, 9, 6, 1, 45, 0, 13, 2, 49, 13, 9, 3, 2, 11, 83, 11, 7, 0, 161, 11, 6, 9, 7, 3, 56, 1, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 193, 17, 10, 9, 5, 0, 82, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 84, 14, 5, 9, 243, 14, 166, 9, 71, 5, 2, 1, 3, 3, 2, 0, 2, 1, 13, 9, 120, 6, 3, 6, 4, 0, 29, 9, 41, 6, 2, 3, 9, 0, 10, 10, 47, 15, 406, 7, 2, 7, 17, 9, 57, 21, 2, 13, 123, 5, 4, 0, 2, 1, 2, 6, 2, 0, 9, 9, 49, 4, 2, 1, 2, 4, 9, 9, 330, 3, 19306, 9, 135, 4, 60, 6, 26, 9, 1014, 0, 2, 54, 8, 3, 82, 0, 12, 1, 19628, 1, 5319, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14, 1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 262, 6, 10, 9, 419, 13, 1495, 6, 110, 6, 6, 9, 4759, 9, 787719, 239];
        function isInAstralSet(code, set) {
          var pos = 65536;
          for (var i = 0; i < set.length; i += 2) {
            pos += set[i];
            if (pos > code) {
              return false;
            }
            pos += set[i + 1];
            if (pos >= code) {
              return true;
            }
          }
        }
        function isIdentifierStart(code, astral) {
          if (code < 65) {
            return code === 36;
          }
          if (code < 91) {
            return true;
          }
          if (code < 97) {
            return code === 95;
          }
          if (code < 123) {
            return true;
          }
          if (code <= 65535) {
            return code >= 170 && nonASCIIidentifierStart.test(String.fromCharCode(code));
          }
          if (astral === false) {
            return false;
          }
          return isInAstralSet(code, astralIdentifierStartCodes);
        }
        function isIdentifierChar(code, astral) {
          if (code < 48) {
            return code === 36;
          }
          if (code < 58) {
            return true;
          }
          if (code < 65) {
            return false;
          }
          if (code < 91) {
            return true;
          }
          if (code < 97) {
            return code === 95;
          }
          if (code < 123) {
            return true;
          }
          if (code <= 65535) {
            return code >= 170 && nonASCIIidentifier.test(String.fromCharCode(code));
          }
          if (astral === false) {
            return false;
          }
          return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes);
        }
        var TokenType = function TokenType2(label, conf) {
          if (conf === void 0) conf = {};
          this.label = label;
          this.keyword = conf.keyword;
          this.beforeExpr = !!conf.beforeExpr;
          this.startsExpr = !!conf.startsExpr;
          this.isLoop = !!conf.isLoop;
          this.isAssign = !!conf.isAssign;
          this.prefix = !!conf.prefix;
          this.postfix = !!conf.postfix;
          this.binop = conf.binop || null;
          this.updateContext = null;
        };
        function binop(name, prec) {
          return new TokenType(name, { beforeExpr: true, binop: prec });
        }
        var beforeExpr = { beforeExpr: true }, startsExpr = { startsExpr: true };
        var keywords$1 = {};
        function kw(name, options) {
          if (options === void 0) options = {};
          options.keyword = name;
          return keywords$1[name] = new TokenType(name, options);
        }
        var types = {
          num: new TokenType("num", startsExpr),
          regexp: new TokenType("regexp", startsExpr),
          string: new TokenType("string", startsExpr),
          name: new TokenType("name", startsExpr),
          eof: new TokenType("eof"),
          // Punctuation token types.
          bracketL: new TokenType("[", { beforeExpr: true, startsExpr: true }),
          bracketR: new TokenType("]"),
          braceL: new TokenType("{", { beforeExpr: true, startsExpr: true }),
          braceR: new TokenType("}"),
          parenL: new TokenType("(", { beforeExpr: true, startsExpr: true }),
          parenR: new TokenType(")"),
          comma: new TokenType(",", beforeExpr),
          semi: new TokenType(";", beforeExpr),
          colon: new TokenType(":", beforeExpr),
          dot: new TokenType("."),
          question: new TokenType("?", beforeExpr),
          questionDot: new TokenType("?."),
          arrow: new TokenType("=>", beforeExpr),
          template: new TokenType("template"),
          invalidTemplate: new TokenType("invalidTemplate"),
          ellipsis: new TokenType("...", beforeExpr),
          backQuote: new TokenType("`", startsExpr),
          dollarBraceL: new TokenType("${", { beforeExpr: true, startsExpr: true }),
          // Operators. These carry several kinds of properties to help the
          // parser use them properly (the presence of these properties is
          // what categorizes them as operators).
          //
          // `binop`, when present, specifies that this operator is a binary
          // operator, and will refer to its precedence.
          //
          // `prefix` and `postfix` mark the operator as a prefix or postfix
          // unary operator.
          //
          // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
          // binary operators with a very low precedence, that should result
          // in AssignmentExpression nodes.
          eq: new TokenType("=", { beforeExpr: true, isAssign: true }),
          assign: new TokenType("_=", { beforeExpr: true, isAssign: true }),
          incDec: new TokenType("++/--", { prefix: true, postfix: true, startsExpr: true }),
          prefix: new TokenType("!/~", { beforeExpr: true, prefix: true, startsExpr: true }),
          logicalOR: binop("||", 1),
          logicalAND: binop("&&", 2),
          bitwiseOR: binop("|", 3),
          bitwiseXOR: binop("^", 4),
          bitwiseAND: binop("&", 5),
          equality: binop("==/!=/===/!==", 6),
          relational: binop("</>/<=/>=", 7),
          bitShift: binop("<</>>/>>>", 8),
          plusMin: new TokenType("+/-", { beforeExpr: true, binop: 9, prefix: true, startsExpr: true }),
          modulo: binop("%", 10),
          star: binop("*", 10),
          slash: binop("/", 10),
          starstar: new TokenType("**", { beforeExpr: true }),
          coalesce: binop("??", 1),
          // Keyword token types.
          _break: kw("break"),
          _case: kw("case", beforeExpr),
          _catch: kw("catch"),
          _continue: kw("continue"),
          _debugger: kw("debugger"),
          _default: kw("default", beforeExpr),
          _do: kw("do", { isLoop: true, beforeExpr: true }),
          _else: kw("else", beforeExpr),
          _finally: kw("finally"),
          _for: kw("for", { isLoop: true }),
          _function: kw("function", startsExpr),
          _if: kw("if"),
          _return: kw("return", beforeExpr),
          _switch: kw("switch"),
          _throw: kw("throw", beforeExpr),
          _try: kw("try"),
          _var: kw("var"),
          _const: kw("const"),
          _while: kw("while", { isLoop: true }),
          _with: kw("with"),
          _new: kw("new", { beforeExpr: true, startsExpr: true }),
          _this: kw("this", startsExpr),
          _super: kw("super", startsExpr),
          _class: kw("class", startsExpr),
          _extends: kw("extends", beforeExpr),
          _export: kw("export"),
          _import: kw("import", startsExpr),
          _null: kw("null", startsExpr),
          _true: kw("true", startsExpr),
          _false: kw("false", startsExpr),
          _in: kw("in", { beforeExpr: true, binop: 7 }),
          _instanceof: kw("instanceof", { beforeExpr: true, binop: 7 }),
          _typeof: kw("typeof", { beforeExpr: true, prefix: true, startsExpr: true }),
          _void: kw("void", { beforeExpr: true, prefix: true, startsExpr: true }),
          _delete: kw("delete", { beforeExpr: true, prefix: true, startsExpr: true })
        };
        var lineBreak = /\r\n?|\n|\u2028|\u2029/;
        var lineBreakG = new RegExp(lineBreak.source, "g");
        function isNewLine(code, ecma2019String) {
          return code === 10 || code === 13 || !ecma2019String && (code === 8232 || code === 8233);
        }
        var nonASCIIwhitespace = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
        var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;
        var ref = Object.prototype;
        var hasOwnProperty = ref.hasOwnProperty;
        var toString = ref.toString;
        function has(obj, propName) {
          return hasOwnProperty.call(obj, propName);
        }
        var isArray = Array.isArray || (function(obj) {
          return toString.call(obj) === "[object Array]";
        });
        function wordsRegexp(words) {
          return new RegExp("^(?:" + words.replace(/ /g, "|") + ")$");
        }
        var Position = function Position2(line, col) {
          this.line = line;
          this.column = col;
        };
        Position.prototype.offset = function offset(n) {
          return new Position(this.line, this.column + n);
        };
        var SourceLocation = function SourceLocation2(p, start, end) {
          this.start = start;
          this.end = end;
          if (p.sourceFile !== null) {
            this.source = p.sourceFile;
          }
        };
        function getLineInfo(input, offset) {
          for (var line = 1, cur = 0; ; ) {
            lineBreakG.lastIndex = cur;
            var match = lineBreakG.exec(input);
            if (match && match.index < offset) {
              ++line;
              cur = match.index + match[0].length;
            } else {
              return new Position(line, offset - cur);
            }
          }
        }
        var defaultOptions = {
          // `ecmaVersion` indicates the ECMAScript version to parse. Must be
          // either 3, 5, 6 (2015), 7 (2016), 8 (2017), 9 (2018), or 10
          // (2019). This influences support for strict mode, the set of
          // reserved words, and support for new syntax features. The default
          // is 10.
          ecmaVersion: 10,
          // `sourceType` indicates the mode the code should be parsed in.
          // Can be either `"script"` or `"module"`. This influences global
          // strict mode and parsing of `import` and `export` declarations.
          sourceType: "script",
          // `onInsertedSemicolon` can be a callback that will be called
          // when a semicolon is automatically inserted. It will be passed
          // the position of the comma as an offset, and if `locations` is
          // enabled, it is given the location as a `{line, column}` object
          // as second argument.
          onInsertedSemicolon: null,
          // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
          // trailing commas.
          onTrailingComma: null,
          // By default, reserved words are only enforced if ecmaVersion >= 5.
          // Set `allowReserved` to a boolean value to explicitly turn this on
          // an off. When this option has the value "never", reserved words
          // and keywords can also not be used as property names.
          allowReserved: null,
          // When enabled, a return at the top level is not considered an
          // error.
          allowReturnOutsideFunction: false,
          // When enabled, import/export statements are not constrained to
          // appearing at the top of the program.
          allowImportExportEverywhere: false,
          // When enabled, await identifiers are allowed to appear at the top-level scope,
          // but they are still not allowed in non-async functions.
          allowAwaitOutsideFunction: false,
          // When enabled, hashbang directive in the beginning of file
          // is allowed and treated as a line comment.
          allowHashBang: false,
          // When `locations` is on, `loc` properties holding objects with
          // `start` and `end` properties in `{line, column}` form (with
          // line being 1-based and column 0-based) will be attached to the
          // nodes.
          locations: false,
          // A function can be passed as `onToken` option, which will
          // cause Acorn to call that function with object in the same
          // format as tokens returned from `tokenizer().getToken()`. Note
          // that you are not allowed to call the parser from the
          // callback—that will corrupt its internal state.
          onToken: null,
          // A function can be passed as `onComment` option, which will
          // cause Acorn to call that function with `(block, text, start,
          // end)` parameters whenever a comment is skipped. `block` is a
          // boolean indicating whether this is a block (`/* */`) comment,
          // `text` is the content of the comment, and `start` and `end` are
          // character offsets that denote the start and end of the comment.
          // When the `locations` option is on, two more parameters are
          // passed, the full `{line, column}` locations of the start and
          // end of the comments. Note that you are not allowed to call the
          // parser from the callback—that will corrupt its internal state.
          onComment: null,
          // Nodes have their start and end characters offsets recorded in
          // `start` and `end` properties (directly on the node, rather than
          // the `loc` object, which holds line/column data. To also add a
          // [semi-standardized][range] `range` property holding a `[start,
          // end]` array with the same numbers, set the `ranges` option to
          // `true`.
          //
          // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
          ranges: false,
          // It is possible to parse multiple files into a single AST by
          // passing the tree produced by parsing the first file as
          // `program` option in subsequent parses. This will add the
          // toplevel forms of the parsed file to the `Program` (top) node
          // of an existing parse tree.
          program: null,
          // When `locations` is on, you can pass this to record the source
          // file in every node's `loc` object.
          sourceFile: null,
          // This value, if given, is stored in every node, whether
          // `locations` is on or off.
          directSourceFile: null,
          // When enabled, parenthesized expressions are represented by
          // (non-standard) ParenthesizedExpression nodes
          preserveParens: false
        };
        function getOptions(opts) {
          var options = {};
          for (var opt in defaultOptions) {
            options[opt] = opts && has(opts, opt) ? opts[opt] : defaultOptions[opt];
          }
          if (options.ecmaVersion >= 2015) {
            options.ecmaVersion -= 2009;
          }
          if (options.allowReserved == null) {
            options.allowReserved = options.ecmaVersion < 5;
          }
          if (isArray(options.onToken)) {
            var tokens = options.onToken;
            options.onToken = function(token) {
              return tokens.push(token);
            };
          }
          if (isArray(options.onComment)) {
            options.onComment = pushComment(options, options.onComment);
          }
          return options;
        }
        function pushComment(options, array) {
          return function(block, text, start, end, startLoc, endLoc) {
            var comment = {
              type: block ? "Block" : "Line",
              value: text,
              start,
              end
            };
            if (options.locations) {
              comment.loc = new SourceLocation(this, startLoc, endLoc);
            }
            if (options.ranges) {
              comment.range = [start, end];
            }
            array.push(comment);
          };
        }
        var SCOPE_TOP = 1, SCOPE_FUNCTION = 2, SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION, SCOPE_ASYNC = 4, SCOPE_GENERATOR = 8, SCOPE_ARROW = 16, SCOPE_SIMPLE_CATCH = 32, SCOPE_SUPER = 64, SCOPE_DIRECT_SUPER = 128;
        function functionFlags(async, generator) {
          return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0);
        }
        var BIND_NONE = 0, BIND_VAR = 1, BIND_LEXICAL = 2, BIND_FUNCTION = 3, BIND_SIMPLE_CATCH = 4, BIND_OUTSIDE = 5;
        var Parser = function Parser2(options, input, startPos) {
          this.options = options = getOptions(options);
          this.sourceFile = options.sourceFile;
          this.keywords = wordsRegexp(keywords[options.ecmaVersion >= 6 ? 6 : options.sourceType === "module" ? "5module" : 5]);
          var reserved = "";
          if (options.allowReserved !== true) {
            for (var v = options.ecmaVersion; ; v--) {
              if (reserved = reservedWords[v]) {
                break;
              }
            }
            if (options.sourceType === "module") {
              reserved += " await";
            }
          }
          this.reservedWords = wordsRegexp(reserved);
          var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
          this.reservedWordsStrict = wordsRegexp(reservedStrict);
          this.reservedWordsStrictBind = wordsRegexp(reservedStrict + " " + reservedWords.strictBind);
          this.input = String(input);
          this.containsEsc = false;
          if (startPos) {
            this.pos = startPos;
            this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
            this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
          } else {
            this.pos = this.lineStart = 0;
            this.curLine = 1;
          }
          this.type = types.eof;
          this.value = null;
          this.start = this.end = this.pos;
          this.startLoc = this.endLoc = this.curPosition();
          this.lastTokEndLoc = this.lastTokStartLoc = null;
          this.lastTokStart = this.lastTokEnd = this.pos;
          this.context = this.initialContext();
          this.exprAllowed = true;
          this.inModule = options.sourceType === "module";
          this.strict = this.inModule || this.strictDirective(this.pos);
          this.potentialArrowAt = -1;
          this.yieldPos = this.awaitPos = this.awaitIdentPos = 0;
          this.labels = [];
          this.undefinedExports = {};
          if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!") {
            this.skipLineComment(2);
          }
          this.scopeStack = [];
          this.enterScope(SCOPE_TOP);
          this.regexpState = null;
        };
        var prototypeAccessors = { inFunction: { configurable: true }, inGenerator: { configurable: true }, inAsync: { configurable: true }, allowSuper: { configurable: true }, allowDirectSuper: { configurable: true }, treatFunctionsAsVar: { configurable: true } };
        Parser.prototype.parse = function parse2() {
          var node = this.options.program || this.startNode();
          this.nextToken();
          return this.parseTopLevel(node);
        };
        prototypeAccessors.inFunction.get = function() {
          return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0;
        };
        prototypeAccessors.inGenerator.get = function() {
          return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0;
        };
        prototypeAccessors.inAsync.get = function() {
          return (this.currentVarScope().flags & SCOPE_ASYNC) > 0;
        };
        prototypeAccessors.allowSuper.get = function() {
          return (this.currentThisScope().flags & SCOPE_SUPER) > 0;
        };
        prototypeAccessors.allowDirectSuper.get = function() {
          return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0;
        };
        prototypeAccessors.treatFunctionsAsVar.get = function() {
          return this.treatFunctionsAsVarInScope(this.currentScope());
        };
        Parser.prototype.inNonArrowFunction = function inNonArrowFunction() {
          return (this.currentThisScope().flags & SCOPE_FUNCTION) > 0;
        };
        Parser.extend = function extend() {
          var plugins = [], len = arguments.length;
          while (len--) plugins[len] = arguments[len];
          var cls = this;
          for (var i = 0; i < plugins.length; i++) {
            cls = plugins[i](cls);
          }
          return cls;
        };
        Parser.parse = function parse2(input, options) {
          return new this(options, input).parse();
        };
        Parser.parseExpressionAt = function parseExpressionAt2(input, pos, options) {
          var parser = new this(options, input, pos);
          parser.nextToken();
          return parser.parseExpression();
        };
        Parser.tokenizer = function tokenizer2(input, options) {
          return new this(options, input);
        };
        Object.defineProperties(Parser.prototype, prototypeAccessors);
        var pp = Parser.prototype;
        var literal = /^(?:'((?:\\.|[^'\\])*?)'|"((?:\\.|[^"\\])*?)")/;
        pp.strictDirective = function(start) {
          for (; ; ) {
            skipWhiteSpace.lastIndex = start;
            start += skipWhiteSpace.exec(this.input)[0].length;
            var match = literal.exec(this.input.slice(start));
            if (!match) {
              return false;
            }
            if ((match[1] || match[2]) === "use strict") {
              skipWhiteSpace.lastIndex = start + match[0].length;
              var spaceAfter = skipWhiteSpace.exec(this.input), end = spaceAfter.index + spaceAfter[0].length;
              var next = this.input.charAt(end);
              return next === ";" || next === "}" || lineBreak.test(spaceAfter[0]) && !(/[(`.[+\-/*%<>=,?^&]/.test(next) || next === "!" && this.input.charAt(end + 1) === "=");
            }
            start += match[0].length;
            skipWhiteSpace.lastIndex = start;
            start += skipWhiteSpace.exec(this.input)[0].length;
            if (this.input[start] === ";") {
              start++;
            }
          }
        };
        pp.eat = function(type) {
          if (this.type === type) {
            this.next();
            return true;
          } else {
            return false;
          }
        };
        pp.isContextual = function(name) {
          return this.type === types.name && this.value === name && !this.containsEsc;
        };
        pp.eatContextual = function(name) {
          if (!this.isContextual(name)) {
            return false;
          }
          this.next();
          return true;
        };
        pp.expectContextual = function(name) {
          if (!this.eatContextual(name)) {
            this.unexpected();
          }
        };
        pp.canInsertSemicolon = function() {
          return this.type === types.eof || this.type === types.braceR || lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
        };
        pp.insertSemicolon = function() {
          if (this.canInsertSemicolon()) {
            if (this.options.onInsertedSemicolon) {
              this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc);
            }
            return true;
          }
        };
        pp.semicolon = function() {
          if (!this.eat(types.semi) && !this.insertSemicolon()) {
            this.unexpected();
          }
        };
        pp.afterTrailingComma = function(tokType, notNext) {
          if (this.type === tokType) {
            if (this.options.onTrailingComma) {
              this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc);
            }
            if (!notNext) {
              this.next();
            }
            return true;
          }
        };
        pp.expect = function(type) {
          this.eat(type) || this.unexpected();
        };
        pp.unexpected = function(pos) {
          this.raise(pos != null ? pos : this.start, "Unexpected token");
        };
        function DestructuringErrors() {
          this.shorthandAssign = this.trailingComma = this.parenthesizedAssign = this.parenthesizedBind = this.doubleProto = -1;
        }
        pp.checkPatternErrors = function(refDestructuringErrors, isAssign) {
          if (!refDestructuringErrors) {
            return;
          }
          if (refDestructuringErrors.trailingComma > -1) {
            this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element");
          }
          var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
          if (parens > -1) {
            this.raiseRecoverable(parens, "Parenthesized pattern");
          }
        };
        pp.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
          if (!refDestructuringErrors) {
            return false;
          }
          var shorthandAssign = refDestructuringErrors.shorthandAssign;
          var doubleProto = refDestructuringErrors.doubleProto;
          if (!andThrow) {
            return shorthandAssign >= 0 || doubleProto >= 0;
          }
          if (shorthandAssign >= 0) {
            this.raise(shorthandAssign, "Shorthand property assignments are valid only in destructuring patterns");
          }
          if (doubleProto >= 0) {
            this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property");
          }
        };
        pp.checkYieldAwaitInDefaultParams = function() {
          if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos)) {
            this.raise(this.yieldPos, "Yield expression cannot be a default value");
          }
          if (this.awaitPos) {
            this.raise(this.awaitPos, "Await expression cannot be a default value");
          }
        };
        pp.isSimpleAssignTarget = function(expr) {
          if (expr.type === "ParenthesizedExpression") {
            return this.isSimpleAssignTarget(expr.expression);
          }
          return expr.type === "Identifier" || expr.type === "MemberExpression";
        };
        var pp$1 = Parser.prototype;
        pp$1.parseTopLevel = function(node) {
          var exports3 = {};
          if (!node.body) {
            node.body = [];
          }
          while (this.type !== types.eof) {
            var stmt = this.parseStatement(null, true, exports3);
            node.body.push(stmt);
          }
          if (this.inModule) {
            for (var i = 0, list = Object.keys(this.undefinedExports); i < list.length; i += 1) {
              var name = list[i];
              this.raiseRecoverable(this.undefinedExports[name].start, "Export '" + name + "' is not defined");
            }
          }
          this.adaptDirectivePrologue(node.body);
          this.next();
          node.sourceType = this.options.sourceType;
          return this.finishNode(node, "Program");
        };
        var loopLabel = { kind: "loop" }, switchLabel = { kind: "switch" };
        pp$1.isLet = function(context) {
          if (this.options.ecmaVersion < 6 || !this.isContextual("let")) {
            return false;
          }
          skipWhiteSpace.lastIndex = this.pos;
          var skip = skipWhiteSpace.exec(this.input);
          var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
          if (nextCh === 91) {
            return true;
          }
          if (context) {
            return false;
          }
          if (nextCh === 123) {
            return true;
          }
          if (isIdentifierStart(nextCh, true)) {
            var pos = next + 1;
            while (isIdentifierChar(this.input.charCodeAt(pos), true)) {
              ++pos;
            }
            var ident = this.input.slice(next, pos);
            if (!keywordRelationalOperator.test(ident)) {
              return true;
            }
          }
          return false;
        };
        pp$1.isAsyncFunction = function() {
          if (this.options.ecmaVersion < 8 || !this.isContextual("async")) {
            return false;
          }
          skipWhiteSpace.lastIndex = this.pos;
          var skip = skipWhiteSpace.exec(this.input);
          var next = this.pos + skip[0].length;
          return !lineBreak.test(this.input.slice(this.pos, next)) && this.input.slice(next, next + 8) === "function" && (next + 8 === this.input.length || !isIdentifierChar(this.input.charAt(next + 8)));
        };
        pp$1.parseStatement = function(context, topLevel, exports3) {
          var starttype = this.type, node = this.startNode(), kind;
          if (this.isLet(context)) {
            starttype = types._var;
            kind = "let";
          }
          switch (starttype) {
            case types._break:
            case types._continue:
              return this.parseBreakContinueStatement(node, starttype.keyword);
            case types._debugger:
              return this.parseDebuggerStatement(node);
            case types._do:
              return this.parseDoStatement(node);
            case types._for:
              return this.parseForStatement(node);
            case types._function:
              if (context && (this.strict || context !== "if" && context !== "label") && this.options.ecmaVersion >= 6) {
                this.unexpected();
              }
              return this.parseFunctionStatement(node, false, !context);
            case types._class:
              if (context) {
                this.unexpected();
              }
              return this.parseClass(node, true);
            case types._if:
              return this.parseIfStatement(node);
            case types._return:
              return this.parseReturnStatement(node);
            case types._switch:
              return this.parseSwitchStatement(node);
            case types._throw:
              return this.parseThrowStatement(node);
            case types._try:
              return this.parseTryStatement(node);
            case types._const:
            case types._var:
              kind = kind || this.value;
              if (context && kind !== "var") {
                this.unexpected();
              }
              return this.parseVarStatement(node, kind);
            case types._while:
              return this.parseWhileStatement(node);
            case types._with:
              return this.parseWithStatement(node);
            case types.braceL:
              return this.parseBlock(true, node);
            case types.semi:
              return this.parseEmptyStatement(node);
            case types._export:
            case types._import:
              if (this.options.ecmaVersion > 10 && starttype === types._import) {
                skipWhiteSpace.lastIndex = this.pos;
                var skip = skipWhiteSpace.exec(this.input);
                var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
                if (nextCh === 40 || nextCh === 46) {
                  return this.parseExpressionStatement(node, this.parseExpression());
                }
              }
              if (!this.options.allowImportExportEverywhere) {
                if (!topLevel) {
                  this.raise(this.start, "'import' and 'export' may only appear at the top level");
                }
                if (!this.inModule) {
                  this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'");
                }
              }
              return starttype === types._import ? this.parseImport(node) : this.parseExport(node, exports3);
            // If the statement does not start with a statement keyword or a
            // brace, it's an ExpressionStatement or LabeledStatement. We
            // simply start parsing an expression, and afterwards, if the
            // next token is a colon and the expression was a simple
            // Identifier node, we switch to interpreting it as a label.
            default:
              if (this.isAsyncFunction()) {
                if (context) {
                  this.unexpected();
                }
                this.next();
                return this.parseFunctionStatement(node, true, !context);
              }
              var maybeName = this.value, expr = this.parseExpression();
              if (starttype === types.name && expr.type === "Identifier" && this.eat(types.colon)) {
                return this.parseLabeledStatement(node, maybeName, expr, context);
              } else {
                return this.parseExpressionStatement(node, expr);
              }
          }
        };
        pp$1.parseBreakContinueStatement = function(node, keyword) {
          var isBreak = keyword === "break";
          this.next();
          if (this.eat(types.semi) || this.insertSemicolon()) {
            node.label = null;
          } else if (this.type !== types.name) {
            this.unexpected();
          } else {
            node.label = this.parseIdent();
            this.semicolon();
          }
          var i = 0;
          for (; i < this.labels.length; ++i) {
            var lab = this.labels[i];
            if (node.label == null || lab.name === node.label.name) {
              if (lab.kind != null && (isBreak || lab.kind === "loop")) {
                break;
              }
              if (node.label && isBreak) {
                break;
              }
            }
          }
          if (i === this.labels.length) {
            this.raise(node.start, "Unsyntactic " + keyword);
          }
          return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
        };
        pp$1.parseDebuggerStatement = function(node) {
          this.next();
          this.semicolon();
          return this.finishNode(node, "DebuggerStatement");
        };
        pp$1.parseDoStatement = function(node) {
          this.next();
          this.labels.push(loopLabel);
          node.body = this.parseStatement("do");
          this.labels.pop();
          this.expect(types._while);
          node.test = this.parseParenExpression();
          if (this.options.ecmaVersion >= 6) {
            this.eat(types.semi);
          } else {
            this.semicolon();
          }
          return this.finishNode(node, "DoWhileStatement");
        };
        pp$1.parseForStatement = function(node) {
          this.next();
          var awaitAt = this.options.ecmaVersion >= 9 && (this.inAsync || !this.inFunction && this.options.allowAwaitOutsideFunction) && this.eatContextual("await") ? this.lastTokStart : -1;
          this.labels.push(loopLabel);
          this.enterScope(0);
          this.expect(types.parenL);
          if (this.type === types.semi) {
            if (awaitAt > -1) {
              this.unexpected(awaitAt);
            }
            return this.parseFor(node, null);
          }
          var isLet = this.isLet();
          if (this.type === types._var || this.type === types._const || isLet) {
            var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
            this.next();
            this.parseVar(init$1, true, kind);
            this.finishNode(init$1, "VariableDeclaration");
            if ((this.type === types._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) && init$1.declarations.length === 1) {
              if (this.options.ecmaVersion >= 9) {
                if (this.type === types._in) {
                  if (awaitAt > -1) {
                    this.unexpected(awaitAt);
                  }
                } else {
                  node.await = awaitAt > -1;
                }
              }
              return this.parseForIn(node, init$1);
            }
            if (awaitAt > -1) {
              this.unexpected(awaitAt);
            }
            return this.parseFor(node, init$1);
          }
          var refDestructuringErrors = new DestructuringErrors();
          var init = this.parseExpression(true, refDestructuringErrors);
          if (this.type === types._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) {
            if (this.options.ecmaVersion >= 9) {
              if (this.type === types._in) {
                if (awaitAt > -1) {
                  this.unexpected(awaitAt);
                }
              } else {
                node.await = awaitAt > -1;
              }
            }
            this.toAssignable(init, false, refDestructuringErrors);
            this.checkLVal(init);
            return this.parseForIn(node, init);
          } else {
            this.checkExpressionErrors(refDestructuringErrors, true);
          }
          if (awaitAt > -1) {
            this.unexpected(awaitAt);
          }
          return this.parseFor(node, init);
        };
        pp$1.parseFunctionStatement = function(node, isAsync, declarationPosition) {
          this.next();
          return this.parseFunction(node, FUNC_STATEMENT | (declarationPosition ? 0 : FUNC_HANGING_STATEMENT), false, isAsync);
        };
        pp$1.parseIfStatement = function(node) {
          this.next();
          node.test = this.parseParenExpression();
          node.consequent = this.parseStatement("if");
          node.alternate = this.eat(types._else) ? this.parseStatement("if") : null;
          return this.finishNode(node, "IfStatement");
        };
        pp$1.parseReturnStatement = function(node) {
          if (!this.inFunction && !this.options.allowReturnOutsideFunction) {
            this.raise(this.start, "'return' outside of function");
          }
          this.next();
          if (this.eat(types.semi) || this.insertSemicolon()) {
            node.argument = null;
          } else {
            node.argument = this.parseExpression();
            this.semicolon();
          }
          return this.finishNode(node, "ReturnStatement");
        };
        pp$1.parseSwitchStatement = function(node) {
          this.next();
          node.discriminant = this.parseParenExpression();
          node.cases = [];
          this.expect(types.braceL);
          this.labels.push(switchLabel);
          this.enterScope(0);
          var cur;
          for (var sawDefault = false; this.type !== types.braceR; ) {
            if (this.type === types._case || this.type === types._default) {
              var isCase = this.type === types._case;
              if (cur) {
                this.finishNode(cur, "SwitchCase");
              }
              node.cases.push(cur = this.startNode());
              cur.consequent = [];
              this.next();
              if (isCase) {
                cur.test = this.parseExpression();
              } else {
                if (sawDefault) {
                  this.raiseRecoverable(this.lastTokStart, "Multiple default clauses");
                }
                sawDefault = true;
                cur.test = null;
              }
              this.expect(types.colon);
            } else {
              if (!cur) {
                this.unexpected();
              }
              cur.consequent.push(this.parseStatement(null));
            }
          }
          this.exitScope();
          if (cur) {
            this.finishNode(cur, "SwitchCase");
          }
          this.next();
          this.labels.pop();
          return this.finishNode(node, "SwitchStatement");
        };
        pp$1.parseThrowStatement = function(node) {
          this.next();
          if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) {
            this.raise(this.lastTokEnd, "Illegal newline after throw");
          }
          node.argument = this.parseExpression();
          this.semicolon();
          return this.finishNode(node, "ThrowStatement");
        };
        var empty = [];
        pp$1.parseTryStatement = function(node) {
          this.next();
          node.block = this.parseBlock();
          node.handler = null;
          if (this.type === types._catch) {
            var clause = this.startNode();
            this.next();
            if (this.eat(types.parenL)) {
              clause.param = this.parseBindingAtom();
              var simple = clause.param.type === "Identifier";
              this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
              this.checkLVal(clause.param, simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL);
              this.expect(types.parenR);
            } else {
              if (this.options.ecmaVersion < 10) {
                this.unexpected();
              }
              clause.param = null;
              this.enterScope(0);
            }
            clause.body = this.parseBlock(false);
            this.exitScope();
            node.handler = this.finishNode(clause, "CatchClause");
          }
          node.finalizer = this.eat(types._finally) ? this.parseBlock() : null;
          if (!node.handler && !node.finalizer) {
            this.raise(node.start, "Missing catch or finally clause");
          }
          return this.finishNode(node, "TryStatement");
        };
        pp$1.parseVarStatement = function(node, kind) {
          this.next();
          this.parseVar(node, false, kind);
          this.semicolon();
          return this.finishNode(node, "VariableDeclaration");
        };
        pp$1.parseWhileStatement = function(node) {
          this.next();
          node.test = this.parseParenExpression();
          this.labels.push(loopLabel);
          node.body = this.parseStatement("while");
          this.labels.pop();
          return this.finishNode(node, "WhileStatement");
        };
        pp$1.parseWithStatement = function(node) {
          if (this.strict) {
            this.raise(this.start, "'with' in strict mode");
          }
          this.next();
          node.object = this.parseParenExpression();
          node.body = this.parseStatement("with");
          return this.finishNode(node, "WithStatement");
        };
        pp$1.parseEmptyStatement = function(node) {
          this.next();
          return this.finishNode(node, "EmptyStatement");
        };
        pp$1.parseLabeledStatement = function(node, maybeName, expr, context) {
          for (var i$1 = 0, list = this.labels; i$1 < list.length; i$1 += 1) {
            var label = list[i$1];
            if (label.name === maybeName) {
              this.raise(expr.start, "Label '" + maybeName + "' is already declared");
            }
          }
          var kind = this.type.isLoop ? "loop" : this.type === types._switch ? "switch" : null;
          for (var i = this.labels.length - 1; i >= 0; i--) {
            var label$1 = this.labels[i];
            if (label$1.statementStart === node.start) {
              label$1.statementStart = this.start;
              label$1.kind = kind;
            } else {
              break;
            }
          }
          this.labels.push({ name: maybeName, kind, statementStart: this.start });
          node.body = this.parseStatement(context ? context.indexOf("label") === -1 ? context + "label" : context : "label");
          this.labels.pop();
          node.label = expr;
          return this.finishNode(node, "LabeledStatement");
        };
        pp$1.parseExpressionStatement = function(node, expr) {
          node.expression = expr;
          this.semicolon();
          return this.finishNode(node, "ExpressionStatement");
        };
        pp$1.parseBlock = function(createNewLexicalScope, node, exitStrict) {
          if (createNewLexicalScope === void 0) createNewLexicalScope = true;
          if (node === void 0) node = this.startNode();
          node.body = [];
          this.expect(types.braceL);
          if (createNewLexicalScope) {
            this.enterScope(0);
          }
          while (this.type !== types.braceR) {
            var stmt = this.parseStatement(null);
            node.body.push(stmt);
          }
          if (exitStrict) {
            this.strict = false;
          }
          this.next();
          if (createNewLexicalScope) {
            this.exitScope();
          }
          return this.finishNode(node, "BlockStatement");
        };
        pp$1.parseFor = function(node, init) {
          node.init = init;
          this.expect(types.semi);
          node.test = this.type === types.semi ? null : this.parseExpression();
          this.expect(types.semi);
          node.update = this.type === types.parenR ? null : this.parseExpression();
          this.expect(types.parenR);
          node.body = this.parseStatement("for");
          this.exitScope();
          this.labels.pop();
          return this.finishNode(node, "ForStatement");
        };
        pp$1.parseForIn = function(node, init) {
          var isForIn = this.type === types._in;
          this.next();
          if (init.type === "VariableDeclaration" && init.declarations[0].init != null && (!isForIn || this.options.ecmaVersion < 8 || this.strict || init.kind !== "var" || init.declarations[0].id.type !== "Identifier")) {
            this.raise(
              init.start,
              (isForIn ? "for-in" : "for-of") + " loop variable declaration may not have an initializer"
            );
          } else if (init.type === "AssignmentPattern") {
            this.raise(init.start, "Invalid left-hand side in for-loop");
          }
          node.left = init;
          node.right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
          this.expect(types.parenR);
          node.body = this.parseStatement("for");
          this.exitScope();
          this.labels.pop();
          return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
        };
        pp$1.parseVar = function(node, isFor, kind) {
          node.declarations = [];
          node.kind = kind;
          for (; ; ) {
            var decl = this.startNode();
            this.parseVarId(decl, kind);
            if (this.eat(types.eq)) {
              decl.init = this.parseMaybeAssign(isFor);
            } else if (kind === "const" && !(this.type === types._in || this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
              this.unexpected();
            } else if (decl.id.type !== "Identifier" && !(isFor && (this.type === types._in || this.isContextual("of")))) {
              this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
            } else {
              decl.init = null;
            }
            node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
            if (!this.eat(types.comma)) {
              break;
            }
          }
          return node;
        };
        pp$1.parseVarId = function(decl, kind) {
          decl.id = this.parseBindingAtom();
          this.checkLVal(decl.id, kind === "var" ? BIND_VAR : BIND_LEXICAL, false);
        };
        var FUNC_STATEMENT = 1, FUNC_HANGING_STATEMENT = 2, FUNC_NULLABLE_ID = 4;
        pp$1.parseFunction = function(node, statement, allowExpressionBody, isAsync) {
          this.initFunction(node);
          if (this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !isAsync) {
            if (this.type === types.star && statement & FUNC_HANGING_STATEMENT) {
              this.unexpected();
            }
            node.generator = this.eat(types.star);
          }
          if (this.options.ecmaVersion >= 8) {
            node.async = !!isAsync;
          }
          if (statement & FUNC_STATEMENT) {
            node.id = statement & FUNC_NULLABLE_ID && this.type !== types.name ? null : this.parseIdent();
            if (node.id && !(statement & FUNC_HANGING_STATEMENT)) {
              this.checkLVal(node.id, this.strict || node.generator || node.async ? this.treatFunctionsAsVar ? BIND_VAR : BIND_LEXICAL : BIND_FUNCTION);
            }
          }
          var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
          this.yieldPos = 0;
          this.awaitPos = 0;
          this.awaitIdentPos = 0;
          this.enterScope(functionFlags(node.async, node.generator));
          if (!(statement & FUNC_STATEMENT)) {
            node.id = this.type === types.name ? this.parseIdent() : null;
          }
          this.parseFunctionParams(node);
          this.parseFunctionBody(node, allowExpressionBody, false);
          this.yieldPos = oldYieldPos;
          this.awaitPos = oldAwaitPos;
          this.awaitIdentPos = oldAwaitIdentPos;
          return this.finishNode(node, statement & FUNC_STATEMENT ? "FunctionDeclaration" : "FunctionExpression");
        };
        pp$1.parseFunctionParams = function(node) {
          this.expect(types.parenL);
          node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
          this.checkYieldAwaitInDefaultParams();
        };
        pp$1.parseClass = function(node, isStatement) {
          this.next();
          var oldStrict = this.strict;
          this.strict = true;
          this.parseClassId(node, isStatement);
          this.parseClassSuper(node);
          var classBody = this.startNode();
          var hadConstructor = false;
          classBody.body = [];
          this.expect(types.braceL);
          while (this.type !== types.braceR) {
            var element = this.parseClassElement(node.superClass !== null);
            if (element) {
              classBody.body.push(element);
              if (element.type === "MethodDefinition" && element.kind === "constructor") {
                if (hadConstructor) {
                  this.raise(element.start, "Duplicate constructor in the same class");
                }
                hadConstructor = true;
              }
            }
          }
          this.strict = oldStrict;
          this.next();
          node.body = this.finishNode(classBody, "ClassBody");
          return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
        };
        pp$1.parseClassElement = function(constructorAllowsSuper) {
          var this$1 = this;
          if (this.eat(types.semi)) {
            return null;
          }
          var method = this.startNode();
          var tryContextual = function(k, noLineBreak) {
            if (noLineBreak === void 0) noLineBreak = false;
            var start = this$1.start, startLoc = this$1.startLoc;
            if (!this$1.eatContextual(k)) {
              return false;
            }
            if (this$1.type !== types.parenL && (!noLineBreak || !this$1.canInsertSemicolon())) {
              return true;
            }
            if (method.key) {
              this$1.unexpected();
            }
            method.computed = false;
            method.key = this$1.startNodeAt(start, startLoc);
            method.key.name = k;
            this$1.finishNode(method.key, "Identifier");
            return false;
          };
          method.kind = "method";
          method.static = tryContextual("static");
          var isGenerator = this.eat(types.star);
          var isAsync = false;
          if (!isGenerator) {
            if (this.options.ecmaVersion >= 8 && tryContextual("async", true)) {
              isAsync = true;
              isGenerator = this.options.ecmaVersion >= 9 && this.eat(types.star);
            } else if (tryContextual("get")) {
              method.kind = "get";
            } else if (tryContextual("set")) {
              method.kind = "set";
            }
          }
          if (!method.key) {
            this.parsePropertyName(method);
          }
          var key = method.key;
          var allowsDirectSuper = false;
          if (!method.computed && !method.static && (key.type === "Identifier" && key.name === "constructor" || key.type === "Literal" && key.value === "constructor")) {
            if (method.kind !== "method") {
              this.raise(key.start, "Constructor can't have get/set modifier");
            }
            if (isGenerator) {
              this.raise(key.start, "Constructor can't be a generator");
            }
            if (isAsync) {
              this.raise(key.start, "Constructor can't be an async method");
            }
            method.kind = "constructor";
            allowsDirectSuper = constructorAllowsSuper;
          } else if (method.static && key.type === "Identifier" && key.name === "prototype") {
            this.raise(key.start, "Classes may not have a static property named prototype");
          }
          this.parseClassMethod(method, isGenerator, isAsync, allowsDirectSuper);
          if (method.kind === "get" && method.value.params.length !== 0) {
            this.raiseRecoverable(method.value.start, "getter should have no params");
          }
          if (method.kind === "set" && method.value.params.length !== 1) {
            this.raiseRecoverable(method.value.start, "setter should have exactly one param");
          }
          if (method.kind === "set" && method.value.params[0].type === "RestElement") {
            this.raiseRecoverable(method.value.params[0].start, "Setter cannot use rest params");
          }
          return method;
        };
        pp$1.parseClassMethod = function(method, isGenerator, isAsync, allowsDirectSuper) {
          method.value = this.parseMethod(isGenerator, isAsync, allowsDirectSuper);
          return this.finishNode(method, "MethodDefinition");
        };
        pp$1.parseClassId = function(node, isStatement) {
          if (this.type === types.name) {
            node.id = this.parseIdent();
            if (isStatement) {
              this.checkLVal(node.id, BIND_LEXICAL, false);
            }
          } else {
            if (isStatement === true) {
              this.unexpected();
            }
            node.id = null;
          }
        };
        pp$1.parseClassSuper = function(node) {
          node.superClass = this.eat(types._extends) ? this.parseExprSubscripts() : null;
        };
        pp$1.parseExport = function(node, exports3) {
          this.next();
          if (this.eat(types.star)) {
            if (this.options.ecmaVersion >= 11) {
              if (this.eatContextual("as")) {
                node.exported = this.parseIdent(true);
                this.checkExport(exports3, node.exported.name, this.lastTokStart);
              } else {
                node.exported = null;
              }
            }
            this.expectContextual("from");
            if (this.type !== types.string) {
              this.unexpected();
            }
            node.source = this.parseExprAtom();
            this.semicolon();
            return this.finishNode(node, "ExportAllDeclaration");
          }
          if (this.eat(types._default)) {
            this.checkExport(exports3, "default", this.lastTokStart);
            var isAsync;
            if (this.type === types._function || (isAsync = this.isAsyncFunction())) {
              var fNode = this.startNode();
              this.next();
              if (isAsync) {
                this.next();
              }
              node.declaration = this.parseFunction(fNode, FUNC_STATEMENT | FUNC_NULLABLE_ID, false, isAsync);
            } else if (this.type === types._class) {
              var cNode = this.startNode();
              node.declaration = this.parseClass(cNode, "nullableID");
            } else {
              node.declaration = this.parseMaybeAssign();
              this.semicolon();
            }
            return this.finishNode(node, "ExportDefaultDeclaration");
          }
          if (this.shouldParseExportStatement()) {
            node.declaration = this.parseStatement(null);
            if (node.declaration.type === "VariableDeclaration") {
              this.checkVariableExport(exports3, node.declaration.declarations);
            } else {
              this.checkExport(exports3, node.declaration.id.name, node.declaration.id.start);
            }
            node.specifiers = [];
            node.source = null;
          } else {
            node.declaration = null;
            node.specifiers = this.parseExportSpecifiers(exports3);
            if (this.eatContextual("from")) {
              if (this.type !== types.string) {
                this.unexpected();
              }
              node.source = this.parseExprAtom();
            } else {
              for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
                var spec = list[i];
                this.checkUnreserved(spec.local);
                this.checkLocalExport(spec.local);
              }
              node.source = null;
            }
            this.semicolon();
          }
          return this.finishNode(node, "ExportNamedDeclaration");
        };
        pp$1.checkExport = function(exports3, name, pos) {
          if (!exports3) {
            return;
          }
          if (has(exports3, name)) {
            this.raiseRecoverable(pos, "Duplicate export '" + name + "'");
          }
          exports3[name] = true;
        };
        pp$1.checkPatternExport = function(exports3, pat) {
          var type = pat.type;
          if (type === "Identifier") {
            this.checkExport(exports3, pat.name, pat.start);
          } else if (type === "ObjectPattern") {
            for (var i = 0, list = pat.properties; i < list.length; i += 1) {
              var prop = list[i];
              this.checkPatternExport(exports3, prop);
            }
          } else if (type === "ArrayPattern") {
            for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
              var elt = list$1[i$1];
              if (elt) {
                this.checkPatternExport(exports3, elt);
              }
            }
          } else if (type === "Property") {
            this.checkPatternExport(exports3, pat.value);
          } else if (type === "AssignmentPattern") {
            this.checkPatternExport(exports3, pat.left);
          } else if (type === "RestElement") {
            this.checkPatternExport(exports3, pat.argument);
          } else if (type === "ParenthesizedExpression") {
            this.checkPatternExport(exports3, pat.expression);
          }
        };
        pp$1.checkVariableExport = function(exports3, decls) {
          if (!exports3) {
            return;
          }
          for (var i = 0, list = decls; i < list.length; i += 1) {
            var decl = list[i];
            this.checkPatternExport(exports3, decl.id);
          }
        };
        pp$1.shouldParseExportStatement = function() {
          return this.type.keyword === "var" || this.type.keyword === "const" || this.type.keyword === "class" || this.type.keyword === "function" || this.isLet() || this.isAsyncFunction();
        };
        pp$1.parseExportSpecifiers = function(exports3) {
          var nodes = [], first = true;
          this.expect(types.braceL);
          while (!this.eat(types.braceR)) {
            if (!first) {
              this.expect(types.comma);
              if (this.afterTrailingComma(types.braceR)) {
                break;
              }
            } else {
              first = false;
            }
            var node = this.startNode();
            node.local = this.parseIdent(true);
            node.exported = this.eatContextual("as") ? this.parseIdent(true) : node.local;
            this.checkExport(exports3, node.exported.name, node.exported.start);
            nodes.push(this.finishNode(node, "ExportSpecifier"));
          }
          return nodes;
        };
        pp$1.parseImport = function(node) {
          this.next();
          if (this.type === types.string) {
            node.specifiers = empty;
            node.source = this.parseExprAtom();
          } else {
            node.specifiers = this.parseImportSpecifiers();
            this.expectContextual("from");
            node.source = this.type === types.string ? this.parseExprAtom() : this.unexpected();
          }
          this.semicolon();
          return this.finishNode(node, "ImportDeclaration");
        };
        pp$1.parseImportSpecifiers = function() {
          var nodes = [], first = true;
          if (this.type === types.name) {
            var node = this.startNode();
            node.local = this.parseIdent();
            this.checkLVal(node.local, BIND_LEXICAL);
            nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
            if (!this.eat(types.comma)) {
              return nodes;
            }
          }
          if (this.type === types.star) {
            var node$1 = this.startNode();
            this.next();
            this.expectContextual("as");
            node$1.local = this.parseIdent();
            this.checkLVal(node$1.local, BIND_LEXICAL);
            nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"));
            return nodes;
          }
          this.expect(types.braceL);
          while (!this.eat(types.braceR)) {
            if (!first) {
              this.expect(types.comma);
              if (this.afterTrailingComma(types.braceR)) {
                break;
              }
            } else {
              first = false;
            }
            var node$2 = this.startNode();
            node$2.imported = this.parseIdent(true);
            if (this.eatContextual("as")) {
              node$2.local = this.parseIdent();
            } else {
              this.checkUnreserved(node$2.imported);
              node$2.local = node$2.imported;
            }
            this.checkLVal(node$2.local, BIND_LEXICAL);
            nodes.push(this.finishNode(node$2, "ImportSpecifier"));
          }
          return nodes;
        };
        pp$1.adaptDirectivePrologue = function(statements) {
          for (var i = 0; i < statements.length && this.isDirectiveCandidate(statements[i]); ++i) {
            statements[i].directive = statements[i].expression.raw.slice(1, -1);
          }
        };
        pp$1.isDirectiveCandidate = function(statement) {
          return statement.type === "ExpressionStatement" && statement.expression.type === "Literal" && typeof statement.expression.value === "string" && // Reject parenthesized strings.
          (this.input[statement.start] === '"' || this.input[statement.start] === "'");
        };
        var pp$2 = Parser.prototype;
        pp$2.toAssignable = function(node, isBinding, refDestructuringErrors) {
          if (this.options.ecmaVersion >= 6 && node) {
            switch (node.type) {
              case "Identifier":
                if (this.inAsync && node.name === "await") {
                  this.raise(node.start, "Cannot use 'await' as identifier inside an async function");
                }
                break;
              case "ObjectPattern":
              case "ArrayPattern":
              case "RestElement":
                break;
              case "ObjectExpression":
                node.type = "ObjectPattern";
                if (refDestructuringErrors) {
                  this.checkPatternErrors(refDestructuringErrors, true);
                }
                for (var i = 0, list = node.properties; i < list.length; i += 1) {
                  var prop = list[i];
                  this.toAssignable(prop, isBinding);
                  if (prop.type === "RestElement" && (prop.argument.type === "ArrayPattern" || prop.argument.type === "ObjectPattern")) {
                    this.raise(prop.argument.start, "Unexpected token");
                  }
                }
                break;
              case "Property":
                if (node.kind !== "init") {
                  this.raise(node.key.start, "Object pattern can't contain getter or setter");
                }
                this.toAssignable(node.value, isBinding);
                break;
              case "ArrayExpression":
                node.type = "ArrayPattern";
                if (refDestructuringErrors) {
                  this.checkPatternErrors(refDestructuringErrors, true);
                }
                this.toAssignableList(node.elements, isBinding);
                break;
              case "SpreadElement":
                node.type = "RestElement";
                this.toAssignable(node.argument, isBinding);
                if (node.argument.type === "AssignmentPattern") {
                  this.raise(node.argument.start, "Rest elements cannot have a default value");
                }
                break;
              case "AssignmentExpression":
                if (node.operator !== "=") {
                  this.raise(node.left.end, "Only '=' operator can be used for specifying default value.");
                }
                node.type = "AssignmentPattern";
                delete node.operator;
                this.toAssignable(node.left, isBinding);
              // falls through to AssignmentPattern
              case "AssignmentPattern":
                break;
              case "ParenthesizedExpression":
                this.toAssignable(node.expression, isBinding, refDestructuringErrors);
                break;
              case "ChainExpression":
                this.raiseRecoverable(node.start, "Optional chaining cannot appear in left-hand side");
                break;
              case "MemberExpression":
                if (!isBinding) {
                  break;
                }
              default:
                this.raise(node.start, "Assigning to rvalue");
            }
          } else if (refDestructuringErrors) {
            this.checkPatternErrors(refDestructuringErrors, true);
          }
          return node;
        };
        pp$2.toAssignableList = function(exprList, isBinding) {
          var end = exprList.length;
          for (var i = 0; i < end; i++) {
            var elt = exprList[i];
            if (elt) {
              this.toAssignable(elt, isBinding);
            }
          }
          if (end) {
            var last = exprList[end - 1];
            if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier") {
              this.unexpected(last.argument.start);
            }
          }
          return exprList;
        };
        pp$2.parseSpread = function(refDestructuringErrors) {
          var node = this.startNode();
          this.next();
          node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
          return this.finishNode(node, "SpreadElement");
        };
        pp$2.parseRestBinding = function() {
          var node = this.startNode();
          this.next();
          if (this.options.ecmaVersion === 6 && this.type !== types.name) {
            this.unexpected();
          }
          node.argument = this.parseBindingAtom();
          return this.finishNode(node, "RestElement");
        };
        pp$2.parseBindingAtom = function() {
          if (this.options.ecmaVersion >= 6) {
            switch (this.type) {
              case types.bracketL:
                var node = this.startNode();
                this.next();
                node.elements = this.parseBindingList(types.bracketR, true, true);
                return this.finishNode(node, "ArrayPattern");
              case types.braceL:
                return this.parseObj(true);
            }
          }
          return this.parseIdent();
        };
        pp$2.parseBindingList = function(close, allowEmpty, allowTrailingComma) {
          var elts = [], first = true;
          while (!this.eat(close)) {
            if (first) {
              first = false;
            } else {
              this.expect(types.comma);
            }
            if (allowEmpty && this.type === types.comma) {
              elts.push(null);
            } else if (allowTrailingComma && this.afterTrailingComma(close)) {
              break;
            } else if (this.type === types.ellipsis) {
              var rest = this.parseRestBinding();
              this.parseBindingListItem(rest);
              elts.push(rest);
              if (this.type === types.comma) {
                this.raise(this.start, "Comma is not permitted after the rest element");
              }
              this.expect(close);
              break;
            } else {
              var elem = this.parseMaybeDefault(this.start, this.startLoc);
              this.parseBindingListItem(elem);
              elts.push(elem);
            }
          }
          return elts;
        };
        pp$2.parseBindingListItem = function(param) {
          return param;
        };
        pp$2.parseMaybeDefault = function(startPos, startLoc, left) {
          left = left || this.parseBindingAtom();
          if (this.options.ecmaVersion < 6 || !this.eat(types.eq)) {
            return left;
          }
          var node = this.startNodeAt(startPos, startLoc);
          node.left = left;
          node.right = this.parseMaybeAssign();
          return this.finishNode(node, "AssignmentPattern");
        };
        pp$2.checkLVal = function(expr, bindingType, checkClashes) {
          if (bindingType === void 0) bindingType = BIND_NONE;
          switch (expr.type) {
            case "Identifier":
              if (bindingType === BIND_LEXICAL && expr.name === "let") {
                this.raiseRecoverable(expr.start, "let is disallowed as a lexically bound name");
              }
              if (this.strict && this.reservedWordsStrictBind.test(expr.name)) {
                this.raiseRecoverable(expr.start, (bindingType ? "Binding " : "Assigning to ") + expr.name + " in strict mode");
              }
              if (checkClashes) {
                if (has(checkClashes, expr.name)) {
                  this.raiseRecoverable(expr.start, "Argument name clash");
                }
                checkClashes[expr.name] = true;
              }
              if (bindingType !== BIND_NONE && bindingType !== BIND_OUTSIDE) {
                this.declareName(expr.name, bindingType, expr.start);
              }
              break;
            case "ChainExpression":
              this.raiseRecoverable(expr.start, "Optional chaining cannot appear in left-hand side");
              break;
            case "MemberExpression":
              if (bindingType) {
                this.raiseRecoverable(expr.start, "Binding member expression");
              }
              break;
            case "ObjectPattern":
              for (var i = 0, list = expr.properties; i < list.length; i += 1) {
                var prop = list[i];
                this.checkLVal(prop, bindingType, checkClashes);
              }
              break;
            case "Property":
              this.checkLVal(expr.value, bindingType, checkClashes);
              break;
            case "ArrayPattern":
              for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
                var elem = list$1[i$1];
                if (elem) {
                  this.checkLVal(elem, bindingType, checkClashes);
                }
              }
              break;
            case "AssignmentPattern":
              this.checkLVal(expr.left, bindingType, checkClashes);
              break;
            case "RestElement":
              this.checkLVal(expr.argument, bindingType, checkClashes);
              break;
            case "ParenthesizedExpression":
              this.checkLVal(expr.expression, bindingType, checkClashes);
              break;
            default:
              this.raise(expr.start, (bindingType ? "Binding" : "Assigning to") + " rvalue");
          }
        };
        var pp$3 = Parser.prototype;
        pp$3.checkPropClash = function(prop, propHash, refDestructuringErrors) {
          if (this.options.ecmaVersion >= 9 && prop.type === "SpreadElement") {
            return;
          }
          if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand)) {
            return;
          }
          var key = prop.key;
          var name;
          switch (key.type) {
            case "Identifier":
              name = key.name;
              break;
            case "Literal":
              name = String(key.value);
              break;
            default:
              return;
          }
          var kind = prop.kind;
          if (this.options.ecmaVersion >= 6) {
            if (name === "__proto__" && kind === "init") {
              if (propHash.proto) {
                if (refDestructuringErrors) {
                  if (refDestructuringErrors.doubleProto < 0) {
                    refDestructuringErrors.doubleProto = key.start;
                  }
                } else {
                  this.raiseRecoverable(key.start, "Redefinition of __proto__ property");
                }
              }
              propHash.proto = true;
            }
            return;
          }
          name = "$" + name;
          var other = propHash[name];
          if (other) {
            var redefinition;
            if (kind === "init") {
              redefinition = this.strict && other.init || other.get || other.set;
            } else {
              redefinition = other.init || other[kind];
            }
            if (redefinition) {
              this.raiseRecoverable(key.start, "Redefinition of property");
            }
          } else {
            other = propHash[name] = {
              init: false,
              get: false,
              set: false
            };
          }
          other[kind] = true;
        };
        pp$3.parseExpression = function(noIn, refDestructuringErrors) {
          var startPos = this.start, startLoc = this.startLoc;
          var expr = this.parseMaybeAssign(noIn, refDestructuringErrors);
          if (this.type === types.comma) {
            var node = this.startNodeAt(startPos, startLoc);
            node.expressions = [expr];
            while (this.eat(types.comma)) {
              node.expressions.push(this.parseMaybeAssign(noIn, refDestructuringErrors));
            }
            return this.finishNode(node, "SequenceExpression");
          }
          return expr;
        };
        pp$3.parseMaybeAssign = function(noIn, refDestructuringErrors, afterLeftParse) {
          if (this.isContextual("yield")) {
            if (this.inGenerator) {
              return this.parseYield(noIn);
            } else {
              this.exprAllowed = false;
            }
          }
          var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1;
          if (refDestructuringErrors) {
            oldParenAssign = refDestructuringErrors.parenthesizedAssign;
            oldTrailingComma = refDestructuringErrors.trailingComma;
            refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
          } else {
            refDestructuringErrors = new DestructuringErrors();
            ownDestructuringErrors = true;
          }
          var startPos = this.start, startLoc = this.startLoc;
          if (this.type === types.parenL || this.type === types.name) {
            this.potentialArrowAt = this.start;
          }
          var left = this.parseMaybeConditional(noIn, refDestructuringErrors);
          if (afterLeftParse) {
            left = afterLeftParse.call(this, left, startPos, startLoc);
          }
          if (this.type.isAssign) {
            var node = this.startNodeAt(startPos, startLoc);
            node.operator = this.value;
            node.left = this.type === types.eq ? this.toAssignable(left, false, refDestructuringErrors) : left;
            if (!ownDestructuringErrors) {
              refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = refDestructuringErrors.doubleProto = -1;
            }
            if (refDestructuringErrors.shorthandAssign >= node.left.start) {
              refDestructuringErrors.shorthandAssign = -1;
            }
            this.checkLVal(left);
            this.next();
            node.right = this.parseMaybeAssign(noIn);
            return this.finishNode(node, "AssignmentExpression");
          } else {
            if (ownDestructuringErrors) {
              this.checkExpressionErrors(refDestructuringErrors, true);
            }
          }
          if (oldParenAssign > -1) {
            refDestructuringErrors.parenthesizedAssign = oldParenAssign;
          }
          if (oldTrailingComma > -1) {
            refDestructuringErrors.trailingComma = oldTrailingComma;
          }
          return left;
        };
        pp$3.parseMaybeConditional = function(noIn, refDestructuringErrors) {
          var startPos = this.start, startLoc = this.startLoc;
          var expr = this.parseExprOps(noIn, refDestructuringErrors);
          if (this.checkExpressionErrors(refDestructuringErrors)) {
            return expr;
          }
          if (this.eat(types.question)) {
            var node = this.startNodeAt(startPos, startLoc);
            node.test = expr;
            node.consequent = this.parseMaybeAssign();
            this.expect(types.colon);
            node.alternate = this.parseMaybeAssign(noIn);
            return this.finishNode(node, "ConditionalExpression");
          }
          return expr;
        };
        pp$3.parseExprOps = function(noIn, refDestructuringErrors) {
          var startPos = this.start, startLoc = this.startLoc;
          var expr = this.parseMaybeUnary(refDestructuringErrors, false);
          if (this.checkExpressionErrors(refDestructuringErrors)) {
            return expr;
          }
          return expr.start === startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, noIn);
        };
        pp$3.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, noIn) {
          var prec = this.type.binop;
          if (prec != null && (!noIn || this.type !== types._in)) {
            if (prec > minPrec) {
              var logical = this.type === types.logicalOR || this.type === types.logicalAND;
              var coalesce = this.type === types.coalesce;
              if (coalesce) {
                prec = types.logicalAND.binop;
              }
              var op = this.value;
              this.next();
              var startPos = this.start, startLoc = this.startLoc;
              var right = this.parseExprOp(this.parseMaybeUnary(null, false), startPos, startLoc, prec, noIn);
              var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical || coalesce);
              if (logical && this.type === types.coalesce || coalesce && (this.type === types.logicalOR || this.type === types.logicalAND)) {
                this.raiseRecoverable(this.start, "Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses");
              }
              return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, noIn);
            }
          }
          return left;
        };
        pp$3.buildBinary = function(startPos, startLoc, left, right, op, logical) {
          var node = this.startNodeAt(startPos, startLoc);
          node.left = left;
          node.operator = op;
          node.right = right;
          return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression");
        };
        pp$3.parseMaybeUnary = function(refDestructuringErrors, sawUnary) {
          var startPos = this.start, startLoc = this.startLoc, expr;
          if (this.isContextual("await") && (this.inAsync || !this.inFunction && this.options.allowAwaitOutsideFunction)) {
            expr = this.parseAwait();
            sawUnary = true;
          } else if (this.type.prefix) {
            var node = this.startNode(), update = this.type === types.incDec;
            node.operator = this.value;
            node.prefix = true;
            this.next();
            node.argument = this.parseMaybeUnary(null, true);
            this.checkExpressionErrors(refDestructuringErrors, true);
            if (update) {
              this.checkLVal(node.argument);
            } else if (this.strict && node.operator === "delete" && node.argument.type === "Identifier") {
              this.raiseRecoverable(node.start, "Deleting local variable in strict mode");
            } else {
              sawUnary = true;
            }
            expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
          } else {
            expr = this.parseExprSubscripts(refDestructuringErrors);
            if (this.checkExpressionErrors(refDestructuringErrors)) {
              return expr;
            }
            while (this.type.postfix && !this.canInsertSemicolon()) {
              var node$1 = this.startNodeAt(startPos, startLoc);
              node$1.operator = this.value;
              node$1.prefix = false;
              node$1.argument = expr;
              this.checkLVal(expr);
              this.next();
              expr = this.finishNode(node$1, "UpdateExpression");
            }
          }
          if (!sawUnary && this.eat(types.starstar)) {
            return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false), "**", false);
          } else {
            return expr;
          }
        };
        pp$3.parseExprSubscripts = function(refDestructuringErrors) {
          var startPos = this.start, startLoc = this.startLoc;
          var expr = this.parseExprAtom(refDestructuringErrors);
          if (expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")") {
            return expr;
          }
          var result = this.parseSubscripts(expr, startPos, startLoc);
          if (refDestructuringErrors && result.type === "MemberExpression") {
            if (refDestructuringErrors.parenthesizedAssign >= result.start) {
              refDestructuringErrors.parenthesizedAssign = -1;
            }
            if (refDestructuringErrors.parenthesizedBind >= result.start) {
              refDestructuringErrors.parenthesizedBind = -1;
            }
          }
          return result;
        };
        pp$3.parseSubscripts = function(base, startPos, startLoc, noCalls) {
          var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" && this.lastTokEnd === base.end && !this.canInsertSemicolon() && base.end - base.start === 5 && this.potentialArrowAt === base.start;
          var optionalChained = false;
          while (true) {
            var element = this.parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained);
            if (element.optional) {
              optionalChained = true;
            }
            if (element === base || element.type === "ArrowFunctionExpression") {
              if (optionalChained) {
                var chainNode = this.startNodeAt(startPos, startLoc);
                chainNode.expression = element;
                element = this.finishNode(chainNode, "ChainExpression");
              }
              return element;
            }
            base = element;
          }
        };
        pp$3.parseSubscript = function(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained) {
          var optionalSupported = this.options.ecmaVersion >= 11;
          var optional = optionalSupported && this.eat(types.questionDot);
          if (noCalls && optional) {
            this.raise(this.lastTokStart, "Optional chaining cannot appear in the callee of new expressions");
          }
          var computed = this.eat(types.bracketL);
          if (computed || optional && this.type !== types.parenL && this.type !== types.backQuote || this.eat(types.dot)) {
            var node = this.startNodeAt(startPos, startLoc);
            node.object = base;
            node.property = computed ? this.parseExpression() : this.parseIdent(this.options.allowReserved !== "never");
            node.computed = !!computed;
            if (computed) {
              this.expect(types.bracketR);
            }
            if (optionalSupported) {
              node.optional = optional;
            }
            base = this.finishNode(node, "MemberExpression");
          } else if (!noCalls && this.eat(types.parenL)) {
            var refDestructuringErrors = new DestructuringErrors(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
            this.yieldPos = 0;
            this.awaitPos = 0;
            this.awaitIdentPos = 0;
            var exprList = this.parseExprList(types.parenR, this.options.ecmaVersion >= 8, false, refDestructuringErrors);
            if (maybeAsyncArrow && !optional && !this.canInsertSemicolon() && this.eat(types.arrow)) {
              this.checkPatternErrors(refDestructuringErrors, false);
              this.checkYieldAwaitInDefaultParams();
              if (this.awaitIdentPos > 0) {
                this.raise(this.awaitIdentPos, "Cannot use 'await' as identifier inside an async function");
              }
              this.yieldPos = oldYieldPos;
              this.awaitPos = oldAwaitPos;
              this.awaitIdentPos = oldAwaitIdentPos;
              return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, true);
            }
            this.checkExpressionErrors(refDestructuringErrors, true);
            this.yieldPos = oldYieldPos || this.yieldPos;
            this.awaitPos = oldAwaitPos || this.awaitPos;
            this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
            var node$1 = this.startNodeAt(startPos, startLoc);
            node$1.callee = base;
            node$1.arguments = exprList;
            if (optionalSupported) {
              node$1.optional = optional;
            }
            base = this.finishNode(node$1, "CallExpression");
          } else if (this.type === types.backQuote) {
            if (optional || optionalChained) {
              this.raise(this.start, "Optional chaining cannot appear in the tag of tagged template expressions");
            }
            var node$2 = this.startNodeAt(startPos, startLoc);
            node$2.tag = base;
            node$2.quasi = this.parseTemplate({ isTagged: true });
            base = this.finishNode(node$2, "TaggedTemplateExpression");
          }
          return base;
        };
        pp$3.parseExprAtom = function(refDestructuringErrors) {
          if (this.type === types.slash) {
            this.readRegexp();
          }
          var node, canBeArrow = this.potentialArrowAt === this.start;
          switch (this.type) {
            case types._super:
              if (!this.allowSuper) {
                this.raise(this.start, "'super' keyword outside a method");
              }
              node = this.startNode();
              this.next();
              if (this.type === types.parenL && !this.allowDirectSuper) {
                this.raise(node.start, "super() call outside constructor of a subclass");
              }
              if (this.type !== types.dot && this.type !== types.bracketL && this.type !== types.parenL) {
                this.unexpected();
              }
              return this.finishNode(node, "Super");
            case types._this:
              node = this.startNode();
              this.next();
              return this.finishNode(node, "ThisExpression");
            case types.name:
              var startPos = this.start, startLoc = this.startLoc, containsEsc = this.containsEsc;
              var id = this.parseIdent(false);
              if (this.options.ecmaVersion >= 8 && !containsEsc && id.name === "async" && !this.canInsertSemicolon() && this.eat(types._function)) {
                return this.parseFunction(this.startNodeAt(startPos, startLoc), 0, false, true);
              }
              if (canBeArrow && !this.canInsertSemicolon()) {
                if (this.eat(types.arrow)) {
                  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false);
                }
                if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types.name && !containsEsc) {
                  id = this.parseIdent(false);
                  if (this.canInsertSemicolon() || !this.eat(types.arrow)) {
                    this.unexpected();
                  }
                  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true);
                }
              }
              return id;
            case types.regexp:
              var value = this.value;
              node = this.parseLiteral(value.value);
              node.regex = { pattern: value.pattern, flags: value.flags };
              return node;
            case types.num:
            case types.string:
              return this.parseLiteral(this.value);
            case types._null:
            case types._true:
            case types._false:
              node = this.startNode();
              node.value = this.type === types._null ? null : this.type === types._true;
              node.raw = this.type.keyword;
              this.next();
              return this.finishNode(node, "Literal");
            case types.parenL:
              var start = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow);
              if (refDestructuringErrors) {
                if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr)) {
                  refDestructuringErrors.parenthesizedAssign = start;
                }
                if (refDestructuringErrors.parenthesizedBind < 0) {
                  refDestructuringErrors.parenthesizedBind = start;
                }
              }
              return expr;
            case types.bracketL:
              node = this.startNode();
              this.next();
              node.elements = this.parseExprList(types.bracketR, true, true, refDestructuringErrors);
              return this.finishNode(node, "ArrayExpression");
            case types.braceL:
              return this.parseObj(false, refDestructuringErrors);
            case types._function:
              node = this.startNode();
              this.next();
              return this.parseFunction(node, 0);
            case types._class:
              return this.parseClass(this.startNode(), false);
            case types._new:
              return this.parseNew();
            case types.backQuote:
              return this.parseTemplate();
            case types._import:
              if (this.options.ecmaVersion >= 11) {
                return this.parseExprImport();
              } else {
                return this.unexpected();
              }
            default:
              this.unexpected();
          }
        };
        pp$3.parseExprImport = function() {
          var node = this.startNode();
          if (this.containsEsc) {
            this.raiseRecoverable(this.start, "Escape sequence in keyword import");
          }
          var meta = this.parseIdent(true);
          switch (this.type) {
            case types.parenL:
              return this.parseDynamicImport(node);
            case types.dot:
              node.meta = meta;
              return this.parseImportMeta(node);
            default:
              this.unexpected();
          }
        };
        pp$3.parseDynamicImport = function(node) {
          this.next();
          node.source = this.parseMaybeAssign();
          if (!this.eat(types.parenR)) {
            var errorPos = this.start;
            if (this.eat(types.comma) && this.eat(types.parenR)) {
              this.raiseRecoverable(errorPos, "Trailing comma is not allowed in import()");
            } else {
              this.unexpected(errorPos);
            }
          }
          return this.finishNode(node, "ImportExpression");
        };
        pp$3.parseImportMeta = function(node) {
          this.next();
          var containsEsc = this.containsEsc;
          node.property = this.parseIdent(true);
          if (node.property.name !== "meta") {
            this.raiseRecoverable(node.property.start, "The only valid meta property for import is 'import.meta'");
          }
          if (containsEsc) {
            this.raiseRecoverable(node.start, "'import.meta' must not contain escaped characters");
          }
          if (this.options.sourceType !== "module") {
            this.raiseRecoverable(node.start, "Cannot use 'import.meta' outside a module");
          }
          return this.finishNode(node, "MetaProperty");
        };
        pp$3.parseLiteral = function(value) {
          var node = this.startNode();
          node.value = value;
          node.raw = this.input.slice(this.start, this.end);
          if (node.raw.charCodeAt(node.raw.length - 1) === 110) {
            node.bigint = node.raw.slice(0, -1).replace(/_/g, "");
          }
          this.next();
          return this.finishNode(node, "Literal");
        };
        pp$3.parseParenExpression = function() {
          this.expect(types.parenL);
          var val = this.parseExpression();
          this.expect(types.parenR);
          return val;
        };
        pp$3.parseParenAndDistinguishExpression = function(canBeArrow) {
          var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
          if (this.options.ecmaVersion >= 6) {
            this.next();
            var innerStartPos = this.start, innerStartLoc = this.startLoc;
            var exprList = [], first = true, lastIsComma = false;
            var refDestructuringErrors = new DestructuringErrors(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart;
            this.yieldPos = 0;
            this.awaitPos = 0;
            while (this.type !== types.parenR) {
              first ? first = false : this.expect(types.comma);
              if (allowTrailingComma && this.afterTrailingComma(types.parenR, true)) {
                lastIsComma = true;
                break;
              } else if (this.type === types.ellipsis) {
                spreadStart = this.start;
                exprList.push(this.parseParenItem(this.parseRestBinding()));
                if (this.type === types.comma) {
                  this.raise(this.start, "Comma is not permitted after the rest element");
                }
                break;
              } else {
                exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
              }
            }
            var innerEndPos = this.start, innerEndLoc = this.startLoc;
            this.expect(types.parenR);
            if (canBeArrow && !this.canInsertSemicolon() && this.eat(types.arrow)) {
              this.checkPatternErrors(refDestructuringErrors, false);
              this.checkYieldAwaitInDefaultParams();
              this.yieldPos = oldYieldPos;
              this.awaitPos = oldAwaitPos;
              return this.parseParenArrowList(startPos, startLoc, exprList);
            }
            if (!exprList.length || lastIsComma) {
              this.unexpected(this.lastTokStart);
            }
            if (spreadStart) {
              this.unexpected(spreadStart);
            }
            this.checkExpressionErrors(refDestructuringErrors, true);
            this.yieldPos = oldYieldPos || this.yieldPos;
            this.awaitPos = oldAwaitPos || this.awaitPos;
            if (exprList.length > 1) {
              val = this.startNodeAt(innerStartPos, innerStartLoc);
              val.expressions = exprList;
              this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
            } else {
              val = exprList[0];
            }
          } else {
            val = this.parseParenExpression();
          }
          if (this.options.preserveParens) {
            var par = this.startNodeAt(startPos, startLoc);
            par.expression = val;
            return this.finishNode(par, "ParenthesizedExpression");
          } else {
            return val;
          }
        };
        pp$3.parseParenItem = function(item) {
          return item;
        };
        pp$3.parseParenArrowList = function(startPos, startLoc, exprList) {
          return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList);
        };
        var empty$1 = [];
        pp$3.parseNew = function() {
          if (this.containsEsc) {
            this.raiseRecoverable(this.start, "Escape sequence in keyword new");
          }
          var node = this.startNode();
          var meta = this.parseIdent(true);
          if (this.options.ecmaVersion >= 6 && this.eat(types.dot)) {
            node.meta = meta;
            var containsEsc = this.containsEsc;
            node.property = this.parseIdent(true);
            if (node.property.name !== "target") {
              this.raiseRecoverable(node.property.start, "The only valid meta property for new is 'new.target'");
            }
            if (containsEsc) {
              this.raiseRecoverable(node.start, "'new.target' must not contain escaped characters");
            }
            if (!this.inNonArrowFunction()) {
              this.raiseRecoverable(node.start, "'new.target' can only be used in functions");
            }
            return this.finishNode(node, "MetaProperty");
          }
          var startPos = this.start, startLoc = this.startLoc, isImport = this.type === types._import;
          node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true);
          if (isImport && node.callee.type === "ImportExpression") {
            this.raise(startPos, "Cannot use new with import()");
          }
          if (this.eat(types.parenL)) {
            node.arguments = this.parseExprList(types.parenR, this.options.ecmaVersion >= 8, false);
          } else {
            node.arguments = empty$1;
          }
          return this.finishNode(node, "NewExpression");
        };
        pp$3.parseTemplateElement = function(ref2) {
          var isTagged = ref2.isTagged;
          var elem = this.startNode();
          if (this.type === types.invalidTemplate) {
            if (!isTagged) {
              this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
            }
            elem.value = {
              raw: this.value,
              cooked: null
            };
          } else {
            elem.value = {
              raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
              cooked: this.value
            };
          }
          this.next();
          elem.tail = this.type === types.backQuote;
          return this.finishNode(elem, "TemplateElement");
        };
        pp$3.parseTemplate = function(ref2) {
          if (ref2 === void 0) ref2 = {};
          var isTagged = ref2.isTagged;
          if (isTagged === void 0) isTagged = false;
          var node = this.startNode();
          this.next();
          node.expressions = [];
          var curElt = this.parseTemplateElement({ isTagged });
          node.quasis = [curElt];
          while (!curElt.tail) {
            if (this.type === types.eof) {
              this.raise(this.pos, "Unterminated template literal");
            }
            this.expect(types.dollarBraceL);
            node.expressions.push(this.parseExpression());
            this.expect(types.braceR);
            node.quasis.push(curElt = this.parseTemplateElement({ isTagged }));
          }
          this.next();
          return this.finishNode(node, "TemplateLiteral");
        };
        pp$3.isAsyncProp = function(prop) {
          return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" && (this.type === types.name || this.type === types.num || this.type === types.string || this.type === types.bracketL || this.type.keyword || this.options.ecmaVersion >= 9 && this.type === types.star) && !lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
        };
        pp$3.parseObj = function(isPattern, refDestructuringErrors) {
          var node = this.startNode(), first = true, propHash = {};
          node.properties = [];
          this.next();
          while (!this.eat(types.braceR)) {
            if (!first) {
              this.expect(types.comma);
              if (this.options.ecmaVersion >= 5 && this.afterTrailingComma(types.braceR)) {
                break;
              }
            } else {
              first = false;
            }
            var prop = this.parseProperty(isPattern, refDestructuringErrors);
            if (!isPattern) {
              this.checkPropClash(prop, propHash, refDestructuringErrors);
            }
            node.properties.push(prop);
          }
          return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression");
        };
        pp$3.parseProperty = function(isPattern, refDestructuringErrors) {
          var prop = this.startNode(), isGenerator, isAsync, startPos, startLoc;
          if (this.options.ecmaVersion >= 9 && this.eat(types.ellipsis)) {
            if (isPattern) {
              prop.argument = this.parseIdent(false);
              if (this.type === types.comma) {
                this.raise(this.start, "Comma is not permitted after the rest element");
              }
              return this.finishNode(prop, "RestElement");
            }
            if (this.type === types.parenL && refDestructuringErrors) {
              if (refDestructuringErrors.parenthesizedAssign < 0) {
                refDestructuringErrors.parenthesizedAssign = this.start;
              }
              if (refDestructuringErrors.parenthesizedBind < 0) {
                refDestructuringErrors.parenthesizedBind = this.start;
              }
            }
            prop.argument = this.parseMaybeAssign(false, refDestructuringErrors);
            if (this.type === types.comma && refDestructuringErrors && refDestructuringErrors.trailingComma < 0) {
              refDestructuringErrors.trailingComma = this.start;
            }
            return this.finishNode(prop, "SpreadElement");
          }
          if (this.options.ecmaVersion >= 6) {
            prop.method = false;
            prop.shorthand = false;
            if (isPattern || refDestructuringErrors) {
              startPos = this.start;
              startLoc = this.startLoc;
            }
            if (!isPattern) {
              isGenerator = this.eat(types.star);
            }
          }
          var containsEsc = this.containsEsc;
          this.parsePropertyName(prop);
          if (!isPattern && !containsEsc && this.options.ecmaVersion >= 8 && !isGenerator && this.isAsyncProp(prop)) {
            isAsync = true;
            isGenerator = this.options.ecmaVersion >= 9 && this.eat(types.star);
            this.parsePropertyName(prop, refDestructuringErrors);
          } else {
            isAsync = false;
          }
          this.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc);
          return this.finishNode(prop, "Property");
        };
        pp$3.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc) {
          if ((isGenerator || isAsync) && this.type === types.colon) {
            this.unexpected();
          }
          if (this.eat(types.colon)) {
            prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
            prop.kind = "init";
          } else if (this.options.ecmaVersion >= 6 && this.type === types.parenL) {
            if (isPattern) {
              this.unexpected();
            }
            prop.kind = "init";
            prop.method = true;
            prop.value = this.parseMethod(isGenerator, isAsync);
          } else if (!isPattern && !containsEsc && this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" && (prop.key.name === "get" || prop.key.name === "set") && (this.type !== types.comma && this.type !== types.braceR && this.type !== types.eq)) {
            if (isGenerator || isAsync) {
              this.unexpected();
            }
            prop.kind = prop.key.name;
            this.parsePropertyName(prop);
            prop.value = this.parseMethod(false);
            var paramCount = prop.kind === "get" ? 0 : 1;
            if (prop.value.params.length !== paramCount) {
              var start = prop.value.start;
              if (prop.kind === "get") {
                this.raiseRecoverable(start, "getter should have no params");
              } else {
                this.raiseRecoverable(start, "setter should have exactly one param");
              }
            } else {
              if (prop.kind === "set" && prop.value.params[0].type === "RestElement") {
                this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params");
              }
            }
          } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
            if (isGenerator || isAsync) {
              this.unexpected();
            }
            this.checkUnreserved(prop.key);
            if (prop.key.name === "await" && !this.awaitIdentPos) {
              this.awaitIdentPos = startPos;
            }
            prop.kind = "init";
            if (isPattern) {
              prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
            } else if (this.type === types.eq && refDestructuringErrors) {
              if (refDestructuringErrors.shorthandAssign < 0) {
                refDestructuringErrors.shorthandAssign = this.start;
              }
              prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
            } else {
              prop.value = prop.key;
            }
            prop.shorthand = true;
          } else {
            this.unexpected();
          }
        };
        pp$3.parsePropertyName = function(prop) {
          if (this.options.ecmaVersion >= 6) {
            if (this.eat(types.bracketL)) {
              prop.computed = true;
              prop.key = this.parseMaybeAssign();
              this.expect(types.bracketR);
              return prop.key;
            } else {
              prop.computed = false;
            }
          }
          return prop.key = this.type === types.num || this.type === types.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never");
        };
        pp$3.initFunction = function(node) {
          node.id = null;
          if (this.options.ecmaVersion >= 6) {
            node.generator = node.expression = false;
          }
          if (this.options.ecmaVersion >= 8) {
            node.async = false;
          }
        };
        pp$3.parseMethod = function(isGenerator, isAsync, allowDirectSuper) {
          var node = this.startNode(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
          this.initFunction(node);
          if (this.options.ecmaVersion >= 6) {
            node.generator = isGenerator;
          }
          if (this.options.ecmaVersion >= 8) {
            node.async = !!isAsync;
          }
          this.yieldPos = 0;
          this.awaitPos = 0;
          this.awaitIdentPos = 0;
          this.enterScope(functionFlags(isAsync, node.generator) | SCOPE_SUPER | (allowDirectSuper ? SCOPE_DIRECT_SUPER : 0));
          this.expect(types.parenL);
          node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
          this.checkYieldAwaitInDefaultParams();
          this.parseFunctionBody(node, false, true);
          this.yieldPos = oldYieldPos;
          this.awaitPos = oldAwaitPos;
          this.awaitIdentPos = oldAwaitIdentPos;
          return this.finishNode(node, "FunctionExpression");
        };
        pp$3.parseArrowExpression = function(node, params, isAsync) {
          var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
          this.enterScope(functionFlags(isAsync, false) | SCOPE_ARROW);
          this.initFunction(node);
          if (this.options.ecmaVersion >= 8) {
            node.async = !!isAsync;
          }
          this.yieldPos = 0;
          this.awaitPos = 0;
          this.awaitIdentPos = 0;
          node.params = this.toAssignableList(params, true);
          this.parseFunctionBody(node, true, false);
          this.yieldPos = oldYieldPos;
          this.awaitPos = oldAwaitPos;
          this.awaitIdentPos = oldAwaitIdentPos;
          return this.finishNode(node, "ArrowFunctionExpression");
        };
        pp$3.parseFunctionBody = function(node, isArrowFunction, isMethod) {
          var isExpression = isArrowFunction && this.type !== types.braceL;
          var oldStrict = this.strict, useStrict = false;
          if (isExpression) {
            node.body = this.parseMaybeAssign();
            node.expression = true;
            this.checkParams(node, false);
          } else {
            var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
            if (!oldStrict || nonSimple) {
              useStrict = this.strictDirective(this.end);
              if (useStrict && nonSimple) {
                this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list");
              }
            }
            var oldLabels = this.labels;
            this.labels = [];
            if (useStrict) {
              this.strict = true;
            }
            this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && !isMethod && this.isSimpleParamList(node.params));
            if (this.strict && node.id) {
              this.checkLVal(node.id, BIND_OUTSIDE);
            }
            node.body = this.parseBlock(false, void 0, useStrict && !oldStrict);
            node.expression = false;
            this.adaptDirectivePrologue(node.body.body);
            this.labels = oldLabels;
          }
          this.exitScope();
        };
        pp$3.isSimpleParamList = function(params) {
          for (var i = 0, list = params; i < list.length; i += 1) {
            var param = list[i];
            if (param.type !== "Identifier") {
              return false;
            }
          }
          return true;
        };
        pp$3.checkParams = function(node, allowDuplicates) {
          var nameHash = {};
          for (var i = 0, list = node.params; i < list.length; i += 1) {
            var param = list[i];
            this.checkLVal(param, BIND_VAR, allowDuplicates ? null : nameHash);
          }
        };
        pp$3.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
          var elts = [], first = true;
          while (!this.eat(close)) {
            if (!first) {
              this.expect(types.comma);
              if (allowTrailingComma && this.afterTrailingComma(close)) {
                break;
              }
            } else {
              first = false;
            }
            var elt = void 0;
            if (allowEmpty && this.type === types.comma) {
              elt = null;
            } else if (this.type === types.ellipsis) {
              elt = this.parseSpread(refDestructuringErrors);
              if (refDestructuringErrors && this.type === types.comma && refDestructuringErrors.trailingComma < 0) {
                refDestructuringErrors.trailingComma = this.start;
              }
            } else {
              elt = this.parseMaybeAssign(false, refDestructuringErrors);
            }
            elts.push(elt);
          }
          return elts;
        };
        pp$3.checkUnreserved = function(ref2) {
          var start = ref2.start;
          var end = ref2.end;
          var name = ref2.name;
          if (this.inGenerator && name === "yield") {
            this.raiseRecoverable(start, "Cannot use 'yield' as identifier inside a generator");
          }
          if (this.inAsync && name === "await") {
            this.raiseRecoverable(start, "Cannot use 'await' as identifier inside an async function");
          }
          if (this.keywords.test(name)) {
            this.raise(start, "Unexpected keyword '" + name + "'");
          }
          if (this.options.ecmaVersion < 6 && this.input.slice(start, end).indexOf("\\") !== -1) {
            return;
          }
          var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
          if (re.test(name)) {
            if (!this.inAsync && name === "await") {
              this.raiseRecoverable(start, "Cannot use keyword 'await' outside an async function");
            }
            this.raiseRecoverable(start, "The keyword '" + name + "' is reserved");
          }
        };
        pp$3.parseIdent = function(liberal, isBinding) {
          var node = this.startNode();
          if (this.type === types.name) {
            node.name = this.value;
          } else if (this.type.keyword) {
            node.name = this.type.keyword;
            if ((node.name === "class" || node.name === "function") && (this.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46)) {
              this.context.pop();
            }
          } else {
            this.unexpected();
          }
          this.next(!!liberal);
          this.finishNode(node, "Identifier");
          if (!liberal) {
            this.checkUnreserved(node);
            if (node.name === "await" && !this.awaitIdentPos) {
              this.awaitIdentPos = node.start;
            }
          }
          return node;
        };
        pp$3.parseYield = function(noIn) {
          if (!this.yieldPos) {
            this.yieldPos = this.start;
          }
          var node = this.startNode();
          this.next();
          if (this.type === types.semi || this.canInsertSemicolon() || this.type !== types.star && !this.type.startsExpr) {
            node.delegate = false;
            node.argument = null;
          } else {
            node.delegate = this.eat(types.star);
            node.argument = this.parseMaybeAssign(noIn);
          }
          return this.finishNode(node, "YieldExpression");
        };
        pp$3.parseAwait = function() {
          if (!this.awaitPos) {
            this.awaitPos = this.start;
          }
          var node = this.startNode();
          this.next();
          node.argument = this.parseMaybeUnary(null, false);
          return this.finishNode(node, "AwaitExpression");
        };
        var pp$4 = Parser.prototype;
        pp$4.raise = function(pos, message) {
          var loc = getLineInfo(this.input, pos);
          message += " (" + loc.line + ":" + loc.column + ")";
          var err = new SyntaxError(message);
          err.pos = pos;
          err.loc = loc;
          err.raisedAt = this.pos;
          throw err;
        };
        pp$4.raiseRecoverable = pp$4.raise;
        pp$4.curPosition = function() {
          if (this.options.locations) {
            return new Position(this.curLine, this.pos - this.lineStart);
          }
        };
        var pp$5 = Parser.prototype;
        var Scope = function Scope2(flags) {
          this.flags = flags;
          this.var = [];
          this.lexical = [];
          this.functions = [];
        };
        pp$5.enterScope = function(flags) {
          this.scopeStack.push(new Scope(flags));
        };
        pp$5.exitScope = function() {
          this.scopeStack.pop();
        };
        pp$5.treatFunctionsAsVarInScope = function(scope) {
          return scope.flags & SCOPE_FUNCTION || !this.inModule && scope.flags & SCOPE_TOP;
        };
        pp$5.declareName = function(name, bindingType, pos) {
          var redeclared = false;
          if (bindingType === BIND_LEXICAL) {
            var scope = this.currentScope();
            redeclared = scope.lexical.indexOf(name) > -1 || scope.functions.indexOf(name) > -1 || scope.var.indexOf(name) > -1;
            scope.lexical.push(name);
            if (this.inModule && scope.flags & SCOPE_TOP) {
              delete this.undefinedExports[name];
            }
          } else if (bindingType === BIND_SIMPLE_CATCH) {
            var scope$1 = this.currentScope();
            scope$1.lexical.push(name);
          } else if (bindingType === BIND_FUNCTION) {
            var scope$2 = this.currentScope();
            if (this.treatFunctionsAsVar) {
              redeclared = scope$2.lexical.indexOf(name) > -1;
            } else {
              redeclared = scope$2.lexical.indexOf(name) > -1 || scope$2.var.indexOf(name) > -1;
            }
            scope$2.functions.push(name);
          } else {
            for (var i = this.scopeStack.length - 1; i >= 0; --i) {
              var scope$3 = this.scopeStack[i];
              if (scope$3.lexical.indexOf(name) > -1 && !(scope$3.flags & SCOPE_SIMPLE_CATCH && scope$3.lexical[0] === name) || !this.treatFunctionsAsVarInScope(scope$3) && scope$3.functions.indexOf(name) > -1) {
                redeclared = true;
                break;
              }
              scope$3.var.push(name);
              if (this.inModule && scope$3.flags & SCOPE_TOP) {
                delete this.undefinedExports[name];
              }
              if (scope$3.flags & SCOPE_VAR) {
                break;
              }
            }
          }
          if (redeclared) {
            this.raiseRecoverable(pos, "Identifier '" + name + "' has already been declared");
          }
        };
        pp$5.checkLocalExport = function(id) {
          if (this.scopeStack[0].lexical.indexOf(id.name) === -1 && this.scopeStack[0].var.indexOf(id.name) === -1) {
            this.undefinedExports[id.name] = id;
          }
        };
        pp$5.currentScope = function() {
          return this.scopeStack[this.scopeStack.length - 1];
        };
        pp$5.currentVarScope = function() {
          for (var i = this.scopeStack.length - 1; ; i--) {
            var scope = this.scopeStack[i];
            if (scope.flags & SCOPE_VAR) {
              return scope;
            }
          }
        };
        pp$5.currentThisScope = function() {
          for (var i = this.scopeStack.length - 1; ; i--) {
            var scope = this.scopeStack[i];
            if (scope.flags & SCOPE_VAR && !(scope.flags & SCOPE_ARROW)) {
              return scope;
            }
          }
        };
        var Node = function Node2(parser, pos, loc) {
          this.type = "";
          this.start = pos;
          this.end = 0;
          if (parser.options.locations) {
            this.loc = new SourceLocation(parser, loc);
          }
          if (parser.options.directSourceFile) {
            this.sourceFile = parser.options.directSourceFile;
          }
          if (parser.options.ranges) {
            this.range = [pos, 0];
          }
        };
        var pp$6 = Parser.prototype;
        pp$6.startNode = function() {
          return new Node(this, this.start, this.startLoc);
        };
        pp$6.startNodeAt = function(pos, loc) {
          return new Node(this, pos, loc);
        };
        function finishNodeAt(node, type, pos, loc) {
          node.type = type;
          node.end = pos;
          if (this.options.locations) {
            node.loc.end = loc;
          }
          if (this.options.ranges) {
            node.range[1] = pos;
          }
          return node;
        }
        pp$6.finishNode = function(node, type) {
          return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc);
        };
        pp$6.finishNodeAt = function(node, type, pos, loc) {
          return finishNodeAt.call(this, node, type, pos, loc);
        };
        var TokContext = function TokContext2(token, isExpr, preserveSpace, override, generator) {
          this.token = token;
          this.isExpr = !!isExpr;
          this.preserveSpace = !!preserveSpace;
          this.override = override;
          this.generator = !!generator;
        };
        var types$1 = {
          b_stat: new TokContext("{", false),
          b_expr: new TokContext("{", true),
          b_tmpl: new TokContext("${", false),
          p_stat: new TokContext("(", false),
          p_expr: new TokContext("(", true),
          q_tmpl: new TokContext("`", true, true, function(p) {
            return p.tryReadTemplateToken();
          }),
          f_stat: new TokContext("function", false),
          f_expr: new TokContext("function", true),
          f_expr_gen: new TokContext("function", true, false, null, true),
          f_gen: new TokContext("function", false, false, null, true)
        };
        var pp$7 = Parser.prototype;
        pp$7.initialContext = function() {
          return [types$1.b_stat];
        };
        pp$7.braceIsBlock = function(prevType) {
          var parent = this.curContext();
          if (parent === types$1.f_expr || parent === types$1.f_stat) {
            return true;
          }
          if (prevType === types.colon && (parent === types$1.b_stat || parent === types$1.b_expr)) {
            return !parent.isExpr;
          }
          if (prevType === types._return || prevType === types.name && this.exprAllowed) {
            return lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
          }
          if (prevType === types._else || prevType === types.semi || prevType === types.eof || prevType === types.parenR || prevType === types.arrow) {
            return true;
          }
          if (prevType === types.braceL) {
            return parent === types$1.b_stat;
          }
          if (prevType === types._var || prevType === types._const || prevType === types.name) {
            return false;
          }
          return !this.exprAllowed;
        };
        pp$7.inGeneratorContext = function() {
          for (var i = this.context.length - 1; i >= 1; i--) {
            var context = this.context[i];
            if (context.token === "function") {
              return context.generator;
            }
          }
          return false;
        };
        pp$7.updateContext = function(prevType) {
          var update, type = this.type;
          if (type.keyword && prevType === types.dot) {
            this.exprAllowed = false;
          } else if (update = type.updateContext) {
            update.call(this, prevType);
          } else {
            this.exprAllowed = type.beforeExpr;
          }
        };
        types.parenR.updateContext = types.braceR.updateContext = function() {
          if (this.context.length === 1) {
            this.exprAllowed = true;
            return;
          }
          var out = this.context.pop();
          if (out === types$1.b_stat && this.curContext().token === "function") {
            out = this.context.pop();
          }
          this.exprAllowed = !out.isExpr;
        };
        types.braceL.updateContext = function(prevType) {
          this.context.push(this.braceIsBlock(prevType) ? types$1.b_stat : types$1.b_expr);
          this.exprAllowed = true;
        };
        types.dollarBraceL.updateContext = function() {
          this.context.push(types$1.b_tmpl);
          this.exprAllowed = true;
        };
        types.parenL.updateContext = function(prevType) {
          var statementParens = prevType === types._if || prevType === types._for || prevType === types._with || prevType === types._while;
          this.context.push(statementParens ? types$1.p_stat : types$1.p_expr);
          this.exprAllowed = true;
        };
        types.incDec.updateContext = function() {
        };
        types._function.updateContext = types._class.updateContext = function(prevType) {
          if (prevType.beforeExpr && prevType !== types.semi && prevType !== types._else && !(prevType === types._return && lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) && !((prevType === types.colon || prevType === types.braceL) && this.curContext() === types$1.b_stat)) {
            this.context.push(types$1.f_expr);
          } else {
            this.context.push(types$1.f_stat);
          }
          this.exprAllowed = false;
        };
        types.backQuote.updateContext = function() {
          if (this.curContext() === types$1.q_tmpl) {
            this.context.pop();
          } else {
            this.context.push(types$1.q_tmpl);
          }
          this.exprAllowed = false;
        };
        types.star.updateContext = function(prevType) {
          if (prevType === types._function) {
            var index = this.context.length - 1;
            if (this.context[index] === types$1.f_expr) {
              this.context[index] = types$1.f_expr_gen;
            } else {
              this.context[index] = types$1.f_gen;
            }
          }
          this.exprAllowed = true;
        };
        types.name.updateContext = function(prevType) {
          var allowed = false;
          if (this.options.ecmaVersion >= 6 && prevType !== types.dot) {
            if (this.value === "of" && !this.exprAllowed || this.value === "yield" && this.inGeneratorContext()) {
              allowed = true;
            }
          }
          this.exprAllowed = allowed;
        };
        var ecma9BinaryProperties = "ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS";
        var ecma10BinaryProperties = ecma9BinaryProperties + " Extended_Pictographic";
        var ecma11BinaryProperties = ecma10BinaryProperties;
        var unicodeBinaryProperties = {
          9: ecma9BinaryProperties,
          10: ecma10BinaryProperties,
          11: ecma11BinaryProperties
        };
        var unicodeGeneralCategoryValues = "Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu";
        var ecma9ScriptValues = "Adlam Adlm Ahom Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb";
        var ecma10ScriptValues = ecma9ScriptValues + " Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd";
        var ecma11ScriptValues = ecma10ScriptValues + " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho";
        var unicodeScriptValues = {
          9: ecma9ScriptValues,
          10: ecma10ScriptValues,
          11: ecma11ScriptValues
        };
        var data = {};
        function buildUnicodeData(ecmaVersion) {
          var d = data[ecmaVersion] = {
            binary: wordsRegexp(unicodeBinaryProperties[ecmaVersion] + " " + unicodeGeneralCategoryValues),
            nonBinary: {
              General_Category: wordsRegexp(unicodeGeneralCategoryValues),
              Script: wordsRegexp(unicodeScriptValues[ecmaVersion])
            }
          };
          d.nonBinary.Script_Extensions = d.nonBinary.Script;
          d.nonBinary.gc = d.nonBinary.General_Category;
          d.nonBinary.sc = d.nonBinary.Script;
          d.nonBinary.scx = d.nonBinary.Script_Extensions;
        }
        buildUnicodeData(9);
        buildUnicodeData(10);
        buildUnicodeData(11);
        var pp$8 = Parser.prototype;
        var RegExpValidationState = function RegExpValidationState2(parser) {
          this.parser = parser;
          this.validFlags = "gim" + (parser.options.ecmaVersion >= 6 ? "uy" : "") + (parser.options.ecmaVersion >= 9 ? "s" : "");
          this.unicodeProperties = data[parser.options.ecmaVersion >= 11 ? 11 : parser.options.ecmaVersion];
          this.source = "";
          this.flags = "";
          this.start = 0;
          this.switchU = false;
          this.switchN = false;
          this.pos = 0;
          this.lastIntValue = 0;
          this.lastStringValue = "";
          this.lastAssertionIsQuantifiable = false;
          this.numCapturingParens = 0;
          this.maxBackReference = 0;
          this.groupNames = [];
          this.backReferenceNames = [];
        };
        RegExpValidationState.prototype.reset = function reset(start, pattern, flags) {
          var unicode = flags.indexOf("u") !== -1;
          this.start = start | 0;
          this.source = pattern + "";
          this.flags = flags;
          this.switchU = unicode && this.parser.options.ecmaVersion >= 6;
          this.switchN = unicode && this.parser.options.ecmaVersion >= 9;
        };
        RegExpValidationState.prototype.raise = function raise(message) {
          this.parser.raiseRecoverable(this.start, "Invalid regular expression: /" + this.source + "/: " + message);
        };
        RegExpValidationState.prototype.at = function at(i, forceU) {
          if (forceU === void 0) forceU = false;
          var s = this.source;
          var l = s.length;
          if (i >= l) {
            return -1;
          }
          var c = s.charCodeAt(i);
          if (!(forceU || this.switchU) || c <= 55295 || c >= 57344 || i + 1 >= l) {
            return c;
          }
          var next = s.charCodeAt(i + 1);
          return next >= 56320 && next <= 57343 ? (c << 10) + next - 56613888 : c;
        };
        RegExpValidationState.prototype.nextIndex = function nextIndex(i, forceU) {
          if (forceU === void 0) forceU = false;
          var s = this.source;
          var l = s.length;
          if (i >= l) {
            return l;
          }
          var c = s.charCodeAt(i), next;
          if (!(forceU || this.switchU) || c <= 55295 || c >= 57344 || i + 1 >= l || (next = s.charCodeAt(i + 1)) < 56320 || next > 57343) {
            return i + 1;
          }
          return i + 2;
        };
        RegExpValidationState.prototype.current = function current(forceU) {
          if (forceU === void 0) forceU = false;
          return this.at(this.pos, forceU);
        };
        RegExpValidationState.prototype.lookahead = function lookahead(forceU) {
          if (forceU === void 0) forceU = false;
          return this.at(this.nextIndex(this.pos, forceU), forceU);
        };
        RegExpValidationState.prototype.advance = function advance(forceU) {
          if (forceU === void 0) forceU = false;
          this.pos = this.nextIndex(this.pos, forceU);
        };
        RegExpValidationState.prototype.eat = function eat(ch, forceU) {
          if (forceU === void 0) forceU = false;
          if (this.current(forceU) === ch) {
            this.advance(forceU);
            return true;
          }
          return false;
        };
        function codePointToString(ch) {
          if (ch <= 65535) {
            return String.fromCharCode(ch);
          }
          ch -= 65536;
          return String.fromCharCode((ch >> 10) + 55296, (ch & 1023) + 56320);
        }
        pp$8.validateRegExpFlags = function(state) {
          var validFlags = state.validFlags;
          var flags = state.flags;
          for (var i = 0; i < flags.length; i++) {
            var flag = flags.charAt(i);
            if (validFlags.indexOf(flag) === -1) {
              this.raise(state.start, "Invalid regular expression flag");
            }
            if (flags.indexOf(flag, i + 1) > -1) {
              this.raise(state.start, "Duplicate regular expression flag");
            }
          }
        };
        pp$8.validateRegExpPattern = function(state) {
          this.regexp_pattern(state);
          if (!state.switchN && this.options.ecmaVersion >= 9 && state.groupNames.length > 0) {
            state.switchN = true;
            this.regexp_pattern(state);
          }
        };
        pp$8.regexp_pattern = function(state) {
          state.pos = 0;
          state.lastIntValue = 0;
          state.lastStringValue = "";
          state.lastAssertionIsQuantifiable = false;
          state.numCapturingParens = 0;
          state.maxBackReference = 0;
          state.groupNames.length = 0;
          state.backReferenceNames.length = 0;
          this.regexp_disjunction(state);
          if (state.pos !== state.source.length) {
            if (state.eat(
              41
              /* ) */
            )) {
              state.raise("Unmatched ')'");
            }
            if (state.eat(
              93
              /* ] */
            ) || state.eat(
              125
              /* } */
            )) {
              state.raise("Lone quantifier brackets");
            }
          }
          if (state.maxBackReference > state.numCapturingParens) {
            state.raise("Invalid escape");
          }
          for (var i = 0, list = state.backReferenceNames; i < list.length; i += 1) {
            var name = list[i];
            if (state.groupNames.indexOf(name) === -1) {
              state.raise("Invalid named capture referenced");
            }
          }
        };
        pp$8.regexp_disjunction = function(state) {
          this.regexp_alternative(state);
          while (state.eat(
            124
            /* | */
          )) {
            this.regexp_alternative(state);
          }
          if (this.regexp_eatQuantifier(state, true)) {
            state.raise("Nothing to repeat");
          }
          if (state.eat(
            123
            /* { */
          )) {
            state.raise("Lone quantifier brackets");
          }
        };
        pp$8.regexp_alternative = function(state) {
          while (state.pos < state.source.length && this.regexp_eatTerm(state)) {
          }
        };
        pp$8.regexp_eatTerm = function(state) {
          if (this.regexp_eatAssertion(state)) {
            if (state.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(state)) {
              if (state.switchU) {
                state.raise("Invalid quantifier");
              }
            }
            return true;
          }
          if (state.switchU ? this.regexp_eatAtom(state) : this.regexp_eatExtendedAtom(state)) {
            this.regexp_eatQuantifier(state);
            return true;
          }
          return false;
        };
        pp$8.regexp_eatAssertion = function(state) {
          var start = state.pos;
          state.lastAssertionIsQuantifiable = false;
          if (state.eat(
            94
            /* ^ */
          ) || state.eat(
            36
            /* $ */
          )) {
            return true;
          }
          if (state.eat(
            92
            /* \ */
          )) {
            if (state.eat(
              66
              /* B */
            ) || state.eat(
              98
              /* b */
            )) {
              return true;
            }
            state.pos = start;
          }
          if (state.eat(
            40
            /* ( */
          ) && state.eat(
            63
            /* ? */
          )) {
            var lookbehind = false;
            if (this.options.ecmaVersion >= 9) {
              lookbehind = state.eat(
                60
                /* < */
              );
            }
            if (state.eat(
              61
              /* = */
            ) || state.eat(
              33
              /* ! */
            )) {
              this.regexp_disjunction(state);
              if (!state.eat(
                41
                /* ) */
              )) {
                state.raise("Unterminated group");
              }
              state.lastAssertionIsQuantifiable = !lookbehind;
              return true;
            }
          }
          state.pos = start;
          return false;
        };
        pp$8.regexp_eatQuantifier = function(state, noError) {
          if (noError === void 0) noError = false;
          if (this.regexp_eatQuantifierPrefix(state, noError)) {
            state.eat(
              63
              /* ? */
            );
            return true;
          }
          return false;
        };
        pp$8.regexp_eatQuantifierPrefix = function(state, noError) {
          return state.eat(
            42
            /* * */
          ) || state.eat(
            43
            /* + */
          ) || state.eat(
            63
            /* ? */
          ) || this.regexp_eatBracedQuantifier(state, noError);
        };
        pp$8.regexp_eatBracedQuantifier = function(state, noError) {
          var start = state.pos;
          if (state.eat(
            123
            /* { */
          )) {
            var min = 0, max = -1;
            if (this.regexp_eatDecimalDigits(state)) {
              min = state.lastIntValue;
              if (state.eat(
                44
                /* , */
              ) && this.regexp_eatDecimalDigits(state)) {
                max = state.lastIntValue;
              }
              if (state.eat(
                125
                /* } */
              )) {
                if (max !== -1 && max < min && !noError) {
                  state.raise("numbers out of order in {} quantifier");
                }
                return true;
              }
            }
            if (state.switchU && !noError) {
              state.raise("Incomplete quantifier");
            }
            state.pos = start;
          }
          return false;
        };
        pp$8.regexp_eatAtom = function(state) {
          return this.regexp_eatPatternCharacters(state) || state.eat(
            46
            /* . */
          ) || this.regexp_eatReverseSolidusAtomEscape(state) || this.regexp_eatCharacterClass(state) || this.regexp_eatUncapturingGroup(state) || this.regexp_eatCapturingGroup(state);
        };
        pp$8.regexp_eatReverseSolidusAtomEscape = function(state) {
          var start = state.pos;
          if (state.eat(
            92
            /* \ */
          )) {
            if (this.regexp_eatAtomEscape(state)) {
              return true;
            }
            state.pos = start;
          }
          return false;
        };
        pp$8.regexp_eatUncapturingGroup = function(state) {
          var start = state.pos;
          if (state.eat(
            40
            /* ( */
          )) {
            if (state.eat(
              63
              /* ? */
            ) && state.eat(
              58
              /* : */
            )) {
              this.regexp_disjunction(state);
              if (state.eat(
                41
                /* ) */
              )) {
                return true;
              }
              state.raise("Unterminated group");
            }
            state.pos = start;
          }
          return false;
        };
        pp$8.regexp_eatCapturingGroup = function(state) {
          if (state.eat(
            40
            /* ( */
          )) {
            if (this.options.ecmaVersion >= 9) {
              this.regexp_groupSpecifier(state);
            } else if (state.current() === 63) {
              state.raise("Invalid group");
            }
            this.regexp_disjunction(state);
            if (state.eat(
              41
              /* ) */
            )) {
              state.numCapturingParens += 1;
              return true;
            }
            state.raise("Unterminated group");
          }
          return false;
        };
        pp$8.regexp_eatExtendedAtom = function(state) {
          return state.eat(
            46
            /* . */
          ) || this.regexp_eatReverseSolidusAtomEscape(state) || this.regexp_eatCharacterClass(state) || this.regexp_eatUncapturingGroup(state) || this.regexp_eatCapturingGroup(state) || this.regexp_eatInvalidBracedQuantifier(state) || this.regexp_eatExtendedPatternCharacter(state);
        };
        pp$8.regexp_eatInvalidBracedQuantifier = function(state) {
          if (this.regexp_eatBracedQuantifier(state, true)) {
            state.raise("Nothing to repeat");
          }
          return false;
        };
        pp$8.regexp_eatSyntaxCharacter = function(state) {
          var ch = state.current();
          if (isSyntaxCharacter(ch)) {
            state.lastIntValue = ch;
            state.advance();
            return true;
          }
          return false;
        };
        function isSyntaxCharacter(ch) {
          return ch === 36 || ch >= 40 && ch <= 43 || ch === 46 || ch === 63 || ch >= 91 && ch <= 94 || ch >= 123 && ch <= 125;
        }
        pp$8.regexp_eatPatternCharacters = function(state) {
          var start = state.pos;
          var ch = 0;
          while ((ch = state.current()) !== -1 && !isSyntaxCharacter(ch)) {
            state.advance();
          }
          return state.pos !== start;
        };
        pp$8.regexp_eatExtendedPatternCharacter = function(state) {
          var ch = state.current();
          if (ch !== -1 && ch !== 36 && !(ch >= 40 && ch <= 43) && ch !== 46 && ch !== 63 && ch !== 91 && ch !== 94 && ch !== 124) {
            state.advance();
            return true;
          }
          return false;
        };
        pp$8.regexp_groupSpecifier = function(state) {
          if (state.eat(
            63
            /* ? */
          )) {
            if (this.regexp_eatGroupName(state)) {
              if (state.groupNames.indexOf(state.lastStringValue) !== -1) {
                state.raise("Duplicate capture group name");
              }
              state.groupNames.push(state.lastStringValue);
              return;
            }
            state.raise("Invalid group");
          }
        };
        pp$8.regexp_eatGroupName = function(state) {
          state.lastStringValue = "";
          if (state.eat(
            60
            /* < */
          )) {
            if (this.regexp_eatRegExpIdentifierName(state) && state.eat(
              62
              /* > */
            )) {
              return true;
            }
            state.raise("Invalid capture group name");
          }
          return false;
        };
        pp$8.regexp_eatRegExpIdentifierName = function(state) {
          state.lastStringValue = "";
          if (this.regexp_eatRegExpIdentifierStart(state)) {
            state.lastStringValue += codePointToString(state.lastIntValue);
            while (this.regexp_eatRegExpIdentifierPart(state)) {
              state.lastStringValue += codePointToString(state.lastIntValue);
            }
            return true;
          }
          return false;
        };
        pp$8.regexp_eatRegExpIdentifierStart = function(state) {
          var start = state.pos;
          var forceU = this.options.ecmaVersion >= 11;
          var ch = state.current(forceU);
          state.advance(forceU);
          if (ch === 92 && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
            ch = state.lastIntValue;
          }
          if (isRegExpIdentifierStart(ch)) {
            state.lastIntValue = ch;
            return true;
          }
          state.pos = start;
          return false;
        };
        function isRegExpIdentifierStart(ch) {
          return isIdentifierStart(ch, true) || ch === 36 || ch === 95;
        }
        pp$8.regexp_eatRegExpIdentifierPart = function(state) {
          var start = state.pos;
          var forceU = this.options.ecmaVersion >= 11;
          var ch = state.current(forceU);
          state.advance(forceU);
          if (ch === 92 && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
            ch = state.lastIntValue;
          }
          if (isRegExpIdentifierPart(ch)) {
            state.lastIntValue = ch;
            return true;
          }
          state.pos = start;
          return false;
        };
        function isRegExpIdentifierPart(ch) {
          return isIdentifierChar(ch, true) || ch === 36 || ch === 95 || ch === 8204 || ch === 8205;
        }
        pp$8.regexp_eatAtomEscape = function(state) {
          if (this.regexp_eatBackReference(state) || this.regexp_eatCharacterClassEscape(state) || this.regexp_eatCharacterEscape(state) || state.switchN && this.regexp_eatKGroupName(state)) {
            return true;
          }
          if (state.switchU) {
            if (state.current() === 99) {
              state.raise("Invalid unicode escape");
            }
            state.raise("Invalid escape");
          }
          return false;
        };
        pp$8.regexp_eatBackReference = function(state) {
          var start = state.pos;
          if (this.regexp_eatDecimalEscape(state)) {
            var n = state.lastIntValue;
            if (state.switchU) {
              if (n > state.maxBackReference) {
                state.maxBackReference = n;
              }
              return true;
            }
            if (n <= state.numCapturingParens) {
              return true;
            }
            state.pos = start;
          }
          return false;
        };
        pp$8.regexp_eatKGroupName = function(state) {
          if (state.eat(
            107
            /* k */
          )) {
            if (this.regexp_eatGroupName(state)) {
              state.backReferenceNames.push(state.lastStringValue);
              return true;
            }
            state.raise("Invalid named reference");
          }
          return false;
        };
        pp$8.regexp_eatCharacterEscape = function(state) {
          return this.regexp_eatControlEscape(state) || this.regexp_eatCControlLetter(state) || this.regexp_eatZero(state) || this.regexp_eatHexEscapeSequence(state) || this.regexp_eatRegExpUnicodeEscapeSequence(state, false) || !state.switchU && this.regexp_eatLegacyOctalEscapeSequence(state) || this.regexp_eatIdentityEscape(state);
        };
        pp$8.regexp_eatCControlLetter = function(state) {
          var start = state.pos;
          if (state.eat(
            99
            /* c */
          )) {
            if (this.regexp_eatControlLetter(state)) {
              return true;
            }
            state.pos = start;
          }
          return false;
        };
        pp$8.regexp_eatZero = function(state) {
          if (state.current() === 48 && !isDecimalDigit(state.lookahead())) {
            state.lastIntValue = 0;
            state.advance();
            return true;
          }
          return false;
        };
        pp$8.regexp_eatControlEscape = function(state) {
          var ch = state.current();
          if (ch === 116) {
            state.lastIntValue = 9;
            state.advance();
            return true;
          }
          if (ch === 110) {
            state.lastIntValue = 10;
            state.advance();
            return true;
          }
          if (ch === 118) {
            state.lastIntValue = 11;
            state.advance();
            return true;
          }
          if (ch === 102) {
            state.lastIntValue = 12;
            state.advance();
            return true;
          }
          if (ch === 114) {
            state.lastIntValue = 13;
            state.advance();
            return true;
          }
          return false;
        };
        pp$8.regexp_eatControlLetter = function(state) {
          var ch = state.current();
          if (isControlLetter(ch)) {
            state.lastIntValue = ch % 32;
            state.advance();
            return true;
          }
          return false;
        };
        function isControlLetter(ch) {
          return ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122;
        }
        pp$8.regexp_eatRegExpUnicodeEscapeSequence = function(state, forceU) {
          if (forceU === void 0) forceU = false;
          var start = state.pos;
          var switchU = forceU || state.switchU;
          if (state.eat(
            117
            /* u */
          )) {
            if (this.regexp_eatFixedHexDigits(state, 4)) {
              var lead = state.lastIntValue;
              if (switchU && lead >= 55296 && lead <= 56319) {
                var leadSurrogateEnd = state.pos;
                if (state.eat(
                  92
                  /* \ */
                ) && state.eat(
                  117
                  /* u */
                ) && this.regexp_eatFixedHexDigits(state, 4)) {
                  var trail = state.lastIntValue;
                  if (trail >= 56320 && trail <= 57343) {
                    state.lastIntValue = (lead - 55296) * 1024 + (trail - 56320) + 65536;
                    return true;
                  }
                }
                state.pos = leadSurrogateEnd;
                state.lastIntValue = lead;
              }
              return true;
            }
            if (switchU && state.eat(
              123
              /* { */
            ) && this.regexp_eatHexDigits(state) && state.eat(
              125
              /* } */
            ) && isValidUnicode(state.lastIntValue)) {
              return true;
            }
            if (switchU) {
              state.raise("Invalid unicode escape");
            }
            state.pos = start;
          }
          return false;
        };
        function isValidUnicode(ch) {
          return ch >= 0 && ch <= 1114111;
        }
        pp$8.regexp_eatIdentityEscape = function(state) {
          if (state.switchU) {
            if (this.regexp_eatSyntaxCharacter(state)) {
              return true;
            }
            if (state.eat(
              47
              /* / */
            )) {
              state.lastIntValue = 47;
              return true;
            }
            return false;
          }
          var ch = state.current();
          if (ch !== 99 && (!state.switchN || ch !== 107)) {
            state.lastIntValue = ch;
            state.advance();
            return true;
          }
          return false;
        };
        pp$8.regexp_eatDecimalEscape = function(state) {
          state.lastIntValue = 0;
          var ch = state.current();
          if (ch >= 49 && ch <= 57) {
            do {
              state.lastIntValue = 10 * state.lastIntValue + (ch - 48);
              state.advance();
            } while ((ch = state.current()) >= 48 && ch <= 57);
            return true;
          }
          return false;
        };
        pp$8.regexp_eatCharacterClassEscape = function(state) {
          var ch = state.current();
          if (isCharacterClassEscape(ch)) {
            state.lastIntValue = -1;
            state.advance();
            return true;
          }
          if (state.switchU && this.options.ecmaVersion >= 9 && (ch === 80 || ch === 112)) {
            state.lastIntValue = -1;
            state.advance();
            if (state.eat(
              123
              /* { */
            ) && this.regexp_eatUnicodePropertyValueExpression(state) && state.eat(
              125
              /* } */
            )) {
              return true;
            }
            state.raise("Invalid property name");
          }
          return false;
        };
        function isCharacterClassEscape(ch) {
          return ch === 100 || ch === 68 || ch === 115 || ch === 83 || ch === 119 || ch === 87;
        }
        pp$8.regexp_eatUnicodePropertyValueExpression = function(state) {
          var start = state.pos;
          if (this.regexp_eatUnicodePropertyName(state) && state.eat(
            61
            /* = */
          )) {
            var name = state.lastStringValue;
            if (this.regexp_eatUnicodePropertyValue(state)) {
              var value = state.lastStringValue;
              this.regexp_validateUnicodePropertyNameAndValue(state, name, value);
              return true;
            }
          }
          state.pos = start;
          if (this.regexp_eatLoneUnicodePropertyNameOrValue(state)) {
            var nameOrValue = state.lastStringValue;
            this.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue);
            return true;
          }
          return false;
        };
        pp$8.regexp_validateUnicodePropertyNameAndValue = function(state, name, value) {
          if (!has(state.unicodeProperties.nonBinary, name)) {
            state.raise("Invalid property name");
          }
          if (!state.unicodeProperties.nonBinary[name].test(value)) {
            state.raise("Invalid property value");
          }
        };
        pp$8.regexp_validateUnicodePropertyNameOrValue = function(state, nameOrValue) {
          if (!state.unicodeProperties.binary.test(nameOrValue)) {
            state.raise("Invalid property name");
          }
        };
        pp$8.regexp_eatUnicodePropertyName = function(state) {
          var ch = 0;
          state.lastStringValue = "";
          while (isUnicodePropertyNameCharacter(ch = state.current())) {
            state.lastStringValue += codePointToString(ch);
            state.advance();
          }
          return state.lastStringValue !== "";
        };
        function isUnicodePropertyNameCharacter(ch) {
          return isControlLetter(ch) || ch === 95;
        }
        pp$8.regexp_eatUnicodePropertyValue = function(state) {
          var ch = 0;
          state.lastStringValue = "";
          while (isUnicodePropertyValueCharacter(ch = state.current())) {
            state.lastStringValue += codePointToString(ch);
            state.advance();
          }
          return state.lastStringValue !== "";
        };
        function isUnicodePropertyValueCharacter(ch) {
          return isUnicodePropertyNameCharacter(ch) || isDecimalDigit(ch);
        }
        pp$8.regexp_eatLoneUnicodePropertyNameOrValue = function(state) {
          return this.regexp_eatUnicodePropertyValue(state);
        };
        pp$8.regexp_eatCharacterClass = function(state) {
          if (state.eat(
            91
            /* [ */
          )) {
            state.eat(
              94
              /* ^ */
            );
            this.regexp_classRanges(state);
            if (state.eat(
              93
              /* ] */
            )) {
              return true;
            }
            state.raise("Unterminated character class");
          }
          return false;
        };
        pp$8.regexp_classRanges = function(state) {
          while (this.regexp_eatClassAtom(state)) {
            var left = state.lastIntValue;
            if (state.eat(
              45
              /* - */
            ) && this.regexp_eatClassAtom(state)) {
              var right = state.lastIntValue;
              if (state.switchU && (left === -1 || right === -1)) {
                state.raise("Invalid character class");
              }
              if (left !== -1 && right !== -1 && left > right) {
                state.raise("Range out of order in character class");
              }
            }
          }
        };
        pp$8.regexp_eatClassAtom = function(state) {
          var start = state.pos;
          if (state.eat(
            92
            /* \ */
          )) {
            if (this.regexp_eatClassEscape(state)) {
              return true;
            }
            if (state.switchU) {
              var ch$1 = state.current();
              if (ch$1 === 99 || isOctalDigit(ch$1)) {
                state.raise("Invalid class escape");
              }
              state.raise("Invalid escape");
            }
            state.pos = start;
          }
          var ch = state.current();
          if (ch !== 93) {
            state.lastIntValue = ch;
            state.advance();
            return true;
          }
          return false;
        };
        pp$8.regexp_eatClassEscape = function(state) {
          var start = state.pos;
          if (state.eat(
            98
            /* b */
          )) {
            state.lastIntValue = 8;
            return true;
          }
          if (state.switchU && state.eat(
            45
            /* - */
          )) {
            state.lastIntValue = 45;
            return true;
          }
          if (!state.switchU && state.eat(
            99
            /* c */
          )) {
            if (this.regexp_eatClassControlLetter(state)) {
              return true;
            }
            state.pos = start;
          }
          return this.regexp_eatCharacterClassEscape(state) || this.regexp_eatCharacterEscape(state);
        };
        pp$8.regexp_eatClassControlLetter = function(state) {
          var ch = state.current();
          if (isDecimalDigit(ch) || ch === 95) {
            state.lastIntValue = ch % 32;
            state.advance();
            return true;
          }
          return false;
        };
        pp$8.regexp_eatHexEscapeSequence = function(state) {
          var start = state.pos;
          if (state.eat(
            120
            /* x */
          )) {
            if (this.regexp_eatFixedHexDigits(state, 2)) {
              return true;
            }
            if (state.switchU) {
              state.raise("Invalid escape");
            }
            state.pos = start;
          }
          return false;
        };
        pp$8.regexp_eatDecimalDigits = function(state) {
          var start = state.pos;
          var ch = 0;
          state.lastIntValue = 0;
          while (isDecimalDigit(ch = state.current())) {
            state.lastIntValue = 10 * state.lastIntValue + (ch - 48);
            state.advance();
          }
          return state.pos !== start;
        };
        function isDecimalDigit(ch) {
          return ch >= 48 && ch <= 57;
        }
        pp$8.regexp_eatHexDigits = function(state) {
          var start = state.pos;
          var ch = 0;
          state.lastIntValue = 0;
          while (isHexDigit(ch = state.current())) {
            state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
            state.advance();
          }
          return state.pos !== start;
        };
        function isHexDigit(ch) {
          return ch >= 48 && ch <= 57 || ch >= 65 && ch <= 70 || ch >= 97 && ch <= 102;
        }
        function hexToInt(ch) {
          if (ch >= 65 && ch <= 70) {
            return 10 + (ch - 65);
          }
          if (ch >= 97 && ch <= 102) {
            return 10 + (ch - 97);
          }
          return ch - 48;
        }
        pp$8.regexp_eatLegacyOctalEscapeSequence = function(state) {
          if (this.regexp_eatOctalDigit(state)) {
            var n1 = state.lastIntValue;
            if (this.regexp_eatOctalDigit(state)) {
              var n2 = state.lastIntValue;
              if (n1 <= 3 && this.regexp_eatOctalDigit(state)) {
                state.lastIntValue = n1 * 64 + n2 * 8 + state.lastIntValue;
              } else {
                state.lastIntValue = n1 * 8 + n2;
              }
            } else {
              state.lastIntValue = n1;
            }
            return true;
          }
          return false;
        };
        pp$8.regexp_eatOctalDigit = function(state) {
          var ch = state.current();
          if (isOctalDigit(ch)) {
            state.lastIntValue = ch - 48;
            state.advance();
            return true;
          }
          state.lastIntValue = 0;
          return false;
        };
        function isOctalDigit(ch) {
          return ch >= 48 && ch <= 55;
        }
        pp$8.regexp_eatFixedHexDigits = function(state, length) {
          var start = state.pos;
          state.lastIntValue = 0;
          for (var i = 0; i < length; ++i) {
            var ch = state.current();
            if (!isHexDigit(ch)) {
              state.pos = start;
              return false;
            }
            state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
            state.advance();
          }
          return true;
        };
        var Token = function Token2(p) {
          this.type = p.type;
          this.value = p.value;
          this.start = p.start;
          this.end = p.end;
          if (p.options.locations) {
            this.loc = new SourceLocation(p, p.startLoc, p.endLoc);
          }
          if (p.options.ranges) {
            this.range = [p.start, p.end];
          }
        };
        var pp$9 = Parser.prototype;
        pp$9.next = function(ignoreEscapeSequenceInKeyword) {
          if (!ignoreEscapeSequenceInKeyword && this.type.keyword && this.containsEsc) {
            this.raiseRecoverable(this.start, "Escape sequence in keyword " + this.type.keyword);
          }
          if (this.options.onToken) {
            this.options.onToken(new Token(this));
          }
          this.lastTokEnd = this.end;
          this.lastTokStart = this.start;
          this.lastTokEndLoc = this.endLoc;
          this.lastTokStartLoc = this.startLoc;
          this.nextToken();
        };
        pp$9.getToken = function() {
          this.next();
          return new Token(this);
        };
        if (typeof Symbol !== "undefined") {
          pp$9[Symbol.iterator] = function() {
            var this$1 = this;
            return {
              next: function() {
                var token = this$1.getToken();
                return {
                  done: token.type === types.eof,
                  value: token
                };
              }
            };
          };
        }
        pp$9.curContext = function() {
          return this.context[this.context.length - 1];
        };
        pp$9.nextToken = function() {
          var curContext = this.curContext();
          if (!curContext || !curContext.preserveSpace) {
            this.skipSpace();
          }
          this.start = this.pos;
          if (this.options.locations) {
            this.startLoc = this.curPosition();
          }
          if (this.pos >= this.input.length) {
            return this.finishToken(types.eof);
          }
          if (curContext.override) {
            return curContext.override(this);
          } else {
            this.readToken(this.fullCharCodeAtPos());
          }
        };
        pp$9.readToken = function(code) {
          if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92) {
            return this.readWord();
          }
          return this.getTokenFromCode(code);
        };
        pp$9.fullCharCodeAtPos = function() {
          var code = this.input.charCodeAt(this.pos);
          if (code <= 55295 || code >= 57344) {
            return code;
          }
          var next = this.input.charCodeAt(this.pos + 1);
          return (code << 10) + next - 56613888;
        };
        pp$9.skipBlockComment = function() {
          var startLoc = this.options.onComment && this.curPosition();
          var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
          if (end === -1) {
            this.raise(this.pos - 2, "Unterminated comment");
          }
          this.pos = end + 2;
          if (this.options.locations) {
            lineBreakG.lastIndex = start;
            var match;
            while ((match = lineBreakG.exec(this.input)) && match.index < this.pos) {
              ++this.curLine;
              this.lineStart = match.index + match[0].length;
            }
          }
          if (this.options.onComment) {
            this.options.onComment(
              true,
              this.input.slice(start + 2, end),
              start,
              this.pos,
              startLoc,
              this.curPosition()
            );
          }
        };
        pp$9.skipLineComment = function(startSkip) {
          var start = this.pos;
          var startLoc = this.options.onComment && this.curPosition();
          var ch = this.input.charCodeAt(this.pos += startSkip);
          while (this.pos < this.input.length && !isNewLine(ch)) {
            ch = this.input.charCodeAt(++this.pos);
          }
          if (this.options.onComment) {
            this.options.onComment(
              false,
              this.input.slice(start + startSkip, this.pos),
              start,
              this.pos,
              startLoc,
              this.curPosition()
            );
          }
        };
        pp$9.skipSpace = function() {
          loop: while (this.pos < this.input.length) {
            var ch = this.input.charCodeAt(this.pos);
            switch (ch) {
              case 32:
              case 160:
                ++this.pos;
                break;
              case 13:
                if (this.input.charCodeAt(this.pos + 1) === 10) {
                  ++this.pos;
                }
              case 10:
              case 8232:
              case 8233:
                ++this.pos;
                if (this.options.locations) {
                  ++this.curLine;
                  this.lineStart = this.pos;
                }
                break;
              case 47:
                switch (this.input.charCodeAt(this.pos + 1)) {
                  case 42:
                    this.skipBlockComment();
                    break;
                  case 47:
                    this.skipLineComment(2);
                    break;
                  default:
                    break loop;
                }
                break;
              default:
                if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
                  ++this.pos;
                } else {
                  break loop;
                }
            }
          }
        };
        pp$9.finishToken = function(type, val) {
          this.end = this.pos;
          if (this.options.locations) {
            this.endLoc = this.curPosition();
          }
          var prevType = this.type;
          this.type = type;
          this.value = val;
          this.updateContext(prevType);
        };
        pp$9.readToken_dot = function() {
          var next = this.input.charCodeAt(this.pos + 1);
          if (next >= 48 && next <= 57) {
            return this.readNumber(true);
          }
          var next2 = this.input.charCodeAt(this.pos + 2);
          if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) {
            this.pos += 3;
            return this.finishToken(types.ellipsis);
          } else {
            ++this.pos;
            return this.finishToken(types.dot);
          }
        };
        pp$9.readToken_slash = function() {
          var next = this.input.charCodeAt(this.pos + 1);
          if (this.exprAllowed) {
            ++this.pos;
            return this.readRegexp();
          }
          if (next === 61) {
            return this.finishOp(types.assign, 2);
          }
          return this.finishOp(types.slash, 1);
        };
        pp$9.readToken_mult_modulo_exp = function(code) {
          var next = this.input.charCodeAt(this.pos + 1);
          var size = 1;
          var tokentype = code === 42 ? types.star : types.modulo;
          if (this.options.ecmaVersion >= 7 && code === 42 && next === 42) {
            ++size;
            tokentype = types.starstar;
            next = this.input.charCodeAt(this.pos + 2);
          }
          if (next === 61) {
            return this.finishOp(types.assign, size + 1);
          }
          return this.finishOp(tokentype, size);
        };
        pp$9.readToken_pipe_amp = function(code) {
          var next = this.input.charCodeAt(this.pos + 1);
          if (next === code) {
            if (this.options.ecmaVersion >= 12) {
              var next2 = this.input.charCodeAt(this.pos + 2);
              if (next2 === 61) {
                return this.finishOp(types.assign, 3);
              }
            }
            return this.finishOp(code === 124 ? types.logicalOR : types.logicalAND, 2);
          }
          if (next === 61) {
            return this.finishOp(types.assign, 2);
          }
          return this.finishOp(code === 124 ? types.bitwiseOR : types.bitwiseAND, 1);
        };
        pp$9.readToken_caret = function() {
          var next = this.input.charCodeAt(this.pos + 1);
          if (next === 61) {
            return this.finishOp(types.assign, 2);
          }
          return this.finishOp(types.bitwiseXOR, 1);
        };
        pp$9.readToken_plus_min = function(code) {
          var next = this.input.charCodeAt(this.pos + 1);
          if (next === code) {
            if (next === 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 62 && (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
              this.skipLineComment(3);
              this.skipSpace();
              return this.nextToken();
            }
            return this.finishOp(types.incDec, 2);
          }
          if (next === 61) {
            return this.finishOp(types.assign, 2);
          }
          return this.finishOp(types.plusMin, 1);
        };
        pp$9.readToken_lt_gt = function(code) {
          var next = this.input.charCodeAt(this.pos + 1);
          var size = 1;
          if (next === code) {
            size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
            if (this.input.charCodeAt(this.pos + size) === 61) {
              return this.finishOp(types.assign, size + 1);
            }
            return this.finishOp(types.bitShift, size);
          }
          if (next === 33 && code === 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 45 && this.input.charCodeAt(this.pos + 3) === 45) {
            this.skipLineComment(4);
            this.skipSpace();
            return this.nextToken();
          }
          if (next === 61) {
            size = 2;
          }
          return this.finishOp(types.relational, size);
        };
        pp$9.readToken_eq_excl = function(code) {
          var next = this.input.charCodeAt(this.pos + 1);
          if (next === 61) {
            return this.finishOp(types.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2);
          }
          if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) {
            this.pos += 2;
            return this.finishToken(types.arrow);
          }
          return this.finishOp(code === 61 ? types.eq : types.prefix, 1);
        };
        pp$9.readToken_question = function() {
          var ecmaVersion = this.options.ecmaVersion;
          if (ecmaVersion >= 11) {
            var next = this.input.charCodeAt(this.pos + 1);
            if (next === 46) {
              var next2 = this.input.charCodeAt(this.pos + 2);
              if (next2 < 48 || next2 > 57) {
                return this.finishOp(types.questionDot, 2);
              }
            }
            if (next === 63) {
              if (ecmaVersion >= 12) {
                var next2$1 = this.input.charCodeAt(this.pos + 2);
                if (next2$1 === 61) {
                  return this.finishOp(types.assign, 3);
                }
              }
              return this.finishOp(types.coalesce, 2);
            }
          }
          return this.finishOp(types.question, 1);
        };
        pp$9.getTokenFromCode = function(code) {
          switch (code) {
            // The interpretation of a dot depends on whether it is followed
            // by a digit or another two dots.
            case 46:
              return this.readToken_dot();
            // Punctuation tokens.
            case 40:
              ++this.pos;
              return this.finishToken(types.parenL);
            case 41:
              ++this.pos;
              return this.finishToken(types.parenR);
            case 59:
              ++this.pos;
              return this.finishToken(types.semi);
            case 44:
              ++this.pos;
              return this.finishToken(types.comma);
            case 91:
              ++this.pos;
              return this.finishToken(types.bracketL);
            case 93:
              ++this.pos;
              return this.finishToken(types.bracketR);
            case 123:
              ++this.pos;
              return this.finishToken(types.braceL);
            case 125:
              ++this.pos;
              return this.finishToken(types.braceR);
            case 58:
              ++this.pos;
              return this.finishToken(types.colon);
            case 96:
              if (this.options.ecmaVersion < 6) {
                break;
              }
              ++this.pos;
              return this.finishToken(types.backQuote);
            case 48:
              var next = this.input.charCodeAt(this.pos + 1);
              if (next === 120 || next === 88) {
                return this.readRadixNumber(16);
              }
              if (this.options.ecmaVersion >= 6) {
                if (next === 111 || next === 79) {
                  return this.readRadixNumber(8);
                }
                if (next === 98 || next === 66) {
                  return this.readRadixNumber(2);
                }
              }
            // Anything else beginning with a digit is an integer, octal
            // number, or float.
            case 49:
            case 50:
            case 51:
            case 52:
            case 53:
            case 54:
            case 55:
            case 56:
            case 57:
              return this.readNumber(false);
            // Quotes produce strings.
            case 34:
            case 39:
              return this.readString(code);
            // Operators are parsed inline in tiny state machines. '=' (61) is
            // often referred to. `finishOp` simply skips the amount of
            // characters it is given as second argument, and returns a token
            // of the type given by its first argument.
            case 47:
              return this.readToken_slash();
            case 37:
            case 42:
              return this.readToken_mult_modulo_exp(code);
            case 124:
            case 38:
              return this.readToken_pipe_amp(code);
            case 94:
              return this.readToken_caret();
            case 43:
            case 45:
              return this.readToken_plus_min(code);
            case 60:
            case 62:
              return this.readToken_lt_gt(code);
            case 61:
            case 33:
              return this.readToken_eq_excl(code);
            case 63:
              return this.readToken_question();
            case 126:
              return this.finishOp(types.prefix, 1);
          }
          this.raise(this.pos, "Unexpected character '" + codePointToString$1(code) + "'");
        };
        pp$9.finishOp = function(type, size) {
          var str = this.input.slice(this.pos, this.pos + size);
          this.pos += size;
          return this.finishToken(type, str);
        };
        pp$9.readRegexp = function() {
          var escaped, inClass, start = this.pos;
          for (; ; ) {
            if (this.pos >= this.input.length) {
              this.raise(start, "Unterminated regular expression");
            }
            var ch = this.input.charAt(this.pos);
            if (lineBreak.test(ch)) {
              this.raise(start, "Unterminated regular expression");
            }
            if (!escaped) {
              if (ch === "[") {
                inClass = true;
              } else if (ch === "]" && inClass) {
                inClass = false;
              } else if (ch === "/" && !inClass) {
                break;
              }
              escaped = ch === "\\";
            } else {
              escaped = false;
            }
            ++this.pos;
          }
          var pattern = this.input.slice(start, this.pos);
          ++this.pos;
          var flagsStart = this.pos;
          var flags = this.readWord1();
          if (this.containsEsc) {
            this.unexpected(flagsStart);
          }
          var state = this.regexpState || (this.regexpState = new RegExpValidationState(this));
          state.reset(start, pattern, flags);
          this.validateRegExpFlags(state);
          this.validateRegExpPattern(state);
          var value = null;
          try {
            value = new RegExp(pattern, flags);
          } catch (e) {
          }
          return this.finishToken(types.regexp, { pattern, flags, value });
        };
        pp$9.readInt = function(radix, len, maybeLegacyOctalNumericLiteral) {
          var allowSeparators = this.options.ecmaVersion >= 12 && len === void 0;
          var isLegacyOctalNumericLiteral = maybeLegacyOctalNumericLiteral && this.input.charCodeAt(this.pos) === 48;
          var start = this.pos, total = 0, lastCode = 0;
          for (var i = 0, e = len == null ? Infinity : len; i < e; ++i, ++this.pos) {
            var code = this.input.charCodeAt(this.pos), val = void 0;
            if (allowSeparators && code === 95) {
              if (isLegacyOctalNumericLiteral) {
                this.raiseRecoverable(this.pos, "Numeric separator is not allowed in legacy octal numeric literals");
              }
              if (lastCode === 95) {
                this.raiseRecoverable(this.pos, "Numeric separator must be exactly one underscore");
              }
              if (i === 0) {
                this.raiseRecoverable(this.pos, "Numeric separator is not allowed at the first of digits");
              }
              lastCode = code;
              continue;
            }
            if (code >= 97) {
              val = code - 97 + 10;
            } else if (code >= 65) {
              val = code - 65 + 10;
            } else if (code >= 48 && code <= 57) {
              val = code - 48;
            } else {
              val = Infinity;
            }
            if (val >= radix) {
              break;
            }
            lastCode = code;
            total = total * radix + val;
          }
          if (allowSeparators && lastCode === 95) {
            this.raiseRecoverable(this.pos - 1, "Numeric separator is not allowed at the last of digits");
          }
          if (this.pos === start || len != null && this.pos - start !== len) {
            return null;
          }
          return total;
        };
        function stringToNumber(str, isLegacyOctalNumericLiteral) {
          if (isLegacyOctalNumericLiteral) {
            return parseInt(str, 8);
          }
          return parseFloat(str.replace(/_/g, ""));
        }
        function stringToBigInt(str) {
          if (typeof BigInt !== "function") {
            return null;
          }
          return BigInt(str.replace(/_/g, ""));
        }
        pp$9.readRadixNumber = function(radix) {
          var start = this.pos;
          this.pos += 2;
          var val = this.readInt(radix);
          if (val == null) {
            this.raise(this.start + 2, "Expected number in radix " + radix);
          }
          if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) {
            val = stringToBigInt(this.input.slice(start, this.pos));
            ++this.pos;
          } else if (isIdentifierStart(this.fullCharCodeAtPos())) {
            this.raise(this.pos, "Identifier directly after number");
          }
          return this.finishToken(types.num, val);
        };
        pp$9.readNumber = function(startsWithDot) {
          var start = this.pos;
          if (!startsWithDot && this.readInt(10, void 0, true) === null) {
            this.raise(start, "Invalid number");
          }
          var octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
          if (octal && this.strict) {
            this.raise(start, "Invalid number");
          }
          var next = this.input.charCodeAt(this.pos);
          if (!octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110) {
            var val$1 = stringToBigInt(this.input.slice(start, this.pos));
            ++this.pos;
            if (isIdentifierStart(this.fullCharCodeAtPos())) {
              this.raise(this.pos, "Identifier directly after number");
            }
            return this.finishToken(types.num, val$1);
          }
          if (octal && /[89]/.test(this.input.slice(start, this.pos))) {
            octal = false;
          }
          if (next === 46 && !octal) {
            ++this.pos;
            this.readInt(10);
            next = this.input.charCodeAt(this.pos);
          }
          if ((next === 69 || next === 101) && !octal) {
            next = this.input.charCodeAt(++this.pos);
            if (next === 43 || next === 45) {
              ++this.pos;
            }
            if (this.readInt(10) === null) {
              this.raise(start, "Invalid number");
            }
          }
          if (isIdentifierStart(this.fullCharCodeAtPos())) {
            this.raise(this.pos, "Identifier directly after number");
          }
          var val = stringToNumber(this.input.slice(start, this.pos), octal);
          return this.finishToken(types.num, val);
        };
        pp$9.readCodePoint = function() {
          var ch = this.input.charCodeAt(this.pos), code;
          if (ch === 123) {
            if (this.options.ecmaVersion < 6) {
              this.unexpected();
            }
            var codePos = ++this.pos;
            code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
            ++this.pos;
            if (code > 1114111) {
              this.invalidStringToken(codePos, "Code point out of bounds");
            }
          } else {
            code = this.readHexChar(4);
          }
          return code;
        };
        function codePointToString$1(code) {
          if (code <= 65535) {
            return String.fromCharCode(code);
          }
          code -= 65536;
          return String.fromCharCode((code >> 10) + 55296, (code & 1023) + 56320);
        }
        pp$9.readString = function(quote) {
          var out = "", chunkStart = ++this.pos;
          for (; ; ) {
            if (this.pos >= this.input.length) {
              this.raise(this.start, "Unterminated string constant");
            }
            var ch = this.input.charCodeAt(this.pos);
            if (ch === quote) {
              break;
            }
            if (ch === 92) {
              out += this.input.slice(chunkStart, this.pos);
              out += this.readEscapedChar(false);
              chunkStart = this.pos;
            } else {
              if (isNewLine(ch, this.options.ecmaVersion >= 10)) {
                this.raise(this.start, "Unterminated string constant");
              }
              ++this.pos;
            }
          }
          out += this.input.slice(chunkStart, this.pos++);
          return this.finishToken(types.string, out);
        };
        var INVALID_TEMPLATE_ESCAPE_ERROR = {};
        pp$9.tryReadTemplateToken = function() {
          this.inTemplateElement = true;
          try {
            this.readTmplToken();
          } catch (err) {
            if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
              this.readInvalidTemplateToken();
            } else {
              throw err;
            }
          }
          this.inTemplateElement = false;
        };
        pp$9.invalidStringToken = function(position, message) {
          if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
            throw INVALID_TEMPLATE_ESCAPE_ERROR;
          } else {
            this.raise(position, message);
          }
        };
        pp$9.readTmplToken = function() {
          var out = "", chunkStart = this.pos;
          for (; ; ) {
            if (this.pos >= this.input.length) {
              this.raise(this.start, "Unterminated template");
            }
            var ch = this.input.charCodeAt(this.pos);
            if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) {
              if (this.pos === this.start && (this.type === types.template || this.type === types.invalidTemplate)) {
                if (ch === 36) {
                  this.pos += 2;
                  return this.finishToken(types.dollarBraceL);
                } else {
                  ++this.pos;
                  return this.finishToken(types.backQuote);
                }
              }
              out += this.input.slice(chunkStart, this.pos);
              return this.finishToken(types.template, out);
            }
            if (ch === 92) {
              out += this.input.slice(chunkStart, this.pos);
              out += this.readEscapedChar(true);
              chunkStart = this.pos;
            } else if (isNewLine(ch)) {
              out += this.input.slice(chunkStart, this.pos);
              ++this.pos;
              switch (ch) {
                case 13:
                  if (this.input.charCodeAt(this.pos) === 10) {
                    ++this.pos;
                  }
                case 10:
                  out += "\n";
                  break;
                default:
                  out += String.fromCharCode(ch);
                  break;
              }
              if (this.options.locations) {
                ++this.curLine;
                this.lineStart = this.pos;
              }
              chunkStart = this.pos;
            } else {
              ++this.pos;
            }
          }
        };
        pp$9.readInvalidTemplateToken = function() {
          for (; this.pos < this.input.length; this.pos++) {
            switch (this.input[this.pos]) {
              case "\\":
                ++this.pos;
                break;
              case "$":
                if (this.input[this.pos + 1] !== "{") {
                  break;
                }
              // falls through
              case "`":
                return this.finishToken(types.invalidTemplate, this.input.slice(this.start, this.pos));
            }
          }
          this.raise(this.start, "Unterminated template");
        };
        pp$9.readEscapedChar = function(inTemplate) {
          var ch = this.input.charCodeAt(++this.pos);
          ++this.pos;
          switch (ch) {
            case 110:
              return "\n";
            // 'n' -> '\n'
            case 114:
              return "\r";
            // 'r' -> '\r'
            case 120:
              return String.fromCharCode(this.readHexChar(2));
            // 'x'
            case 117:
              return codePointToString$1(this.readCodePoint());
            // 'u'
            case 116:
              return "	";
            // 't' -> '\t'
            case 98:
              return "\b";
            // 'b' -> '\b'
            case 118:
              return "\v";
            // 'v' -> '\u000b'
            case 102:
              return "\f";
            // 'f' -> '\f'
            case 13:
              if (this.input.charCodeAt(this.pos) === 10) {
                ++this.pos;
              }
            // '\r\n'
            case 10:
              if (this.options.locations) {
                this.lineStart = this.pos;
                ++this.curLine;
              }
              return "";
            case 56:
            case 57:
              if (inTemplate) {
                var codePos = this.pos - 1;
                this.invalidStringToken(
                  codePos,
                  "Invalid escape sequence in template string"
                );
                return null;
              }
            default:
              if (ch >= 48 && ch <= 55) {
                var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
                var octal = parseInt(octalStr, 8);
                if (octal > 255) {
                  octalStr = octalStr.slice(0, -1);
                  octal = parseInt(octalStr, 8);
                }
                this.pos += octalStr.length - 1;
                ch = this.input.charCodeAt(this.pos);
                if ((octalStr !== "0" || ch === 56 || ch === 57) && (this.strict || inTemplate)) {
                  this.invalidStringToken(
                    this.pos - 1 - octalStr.length,
                    inTemplate ? "Octal literal in template string" : "Octal literal in strict mode"
                  );
                }
                return String.fromCharCode(octal);
              }
              if (isNewLine(ch)) {
                return "";
              }
              return String.fromCharCode(ch);
          }
        };
        pp$9.readHexChar = function(len) {
          var codePos = this.pos;
          var n = this.readInt(16, len);
          if (n === null) {
            this.invalidStringToken(codePos, "Bad character escape sequence");
          }
          return n;
        };
        pp$9.readWord1 = function() {
          this.containsEsc = false;
          var word = "", first = true, chunkStart = this.pos;
          var astral = this.options.ecmaVersion >= 6;
          while (this.pos < this.input.length) {
            var ch = this.fullCharCodeAtPos();
            if (isIdentifierChar(ch, astral)) {
              this.pos += ch <= 65535 ? 1 : 2;
            } else if (ch === 92) {
              this.containsEsc = true;
              word += this.input.slice(chunkStart, this.pos);
              var escStart = this.pos;
              if (this.input.charCodeAt(++this.pos) !== 117) {
                this.invalidStringToken(this.pos, "Expecting Unicode escape sequence \\uXXXX");
              }
              ++this.pos;
              var esc = this.readCodePoint();
              if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral)) {
                this.invalidStringToken(escStart, "Invalid Unicode escape");
              }
              word += codePointToString$1(esc);
              chunkStart = this.pos;
            } else {
              break;
            }
            first = false;
          }
          return word + this.input.slice(chunkStart, this.pos);
        };
        pp$9.readWord = function() {
          var word = this.readWord1();
          var type = types.name;
          if (this.keywords.test(word)) {
            type = keywords$1[word];
          }
          return this.finishToken(type, word);
        };
        var version = "7.4.1";
        Parser.acorn = {
          Parser,
          version,
          defaultOptions,
          Position,
          SourceLocation,
          getLineInfo,
          Node,
          TokenType,
          tokTypes: types,
          keywordTypes: keywords$1,
          TokContext,
          tokContexts: types$1,
          isIdentifierChar,
          isIdentifierStart,
          Token,
          isNewLine,
          lineBreak,
          lineBreakG,
          nonASCIIwhitespace
        };
        function parse(input, options) {
          return Parser.parse(input, options);
        }
        function parseExpressionAt(input, pos, options) {
          return Parser.parseExpressionAt(input, pos, options);
        }
        function tokenizer(input, options) {
          return Parser.tokenizer(input, options);
        }
        exports2.Node = Node;
        exports2.Parser = Parser;
        exports2.Position = Position;
        exports2.SourceLocation = SourceLocation;
        exports2.TokContext = TokContext;
        exports2.Token = Token;
        exports2.TokenType = TokenType;
        exports2.defaultOptions = defaultOptions;
        exports2.getLineInfo = getLineInfo;
        exports2.isIdentifierChar = isIdentifierChar;
        exports2.isIdentifierStart = isIdentifierStart;
        exports2.isNewLine = isNewLine;
        exports2.keywordTypes = keywords$1;
        exports2.lineBreak = lineBreak;
        exports2.lineBreakG = lineBreakG;
        exports2.nonASCIIwhitespace = nonASCIIwhitespace;
        exports2.parse = parse;
        exports2.parseExpressionAt = parseExpressionAt;
        exports2.tokContexts = types$1;
        exports2.tokTypes = types;
        exports2.tokenizer = tokenizer;
        exports2.version = version;
        Object.defineProperty(exports2, "__esModule", { value: true });
      }));
    }
  });

  // node_modules/object-assign/index.js
  var require_object_assign = __commonJS({
    "node_modules/object-assign/index.js"(exports, module) {
      "use strict";
      var getOwnPropertySymbols = Object.getOwnPropertySymbols;
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      var propIsEnumerable = Object.prototype.propertyIsEnumerable;
      function toObject(val) {
        if (val === null || val === void 0) {
          throw new TypeError("Object.assign cannot be called with null or undefined");
        }
        return Object(val);
      }
      function shouldUseNative() {
        try {
          if (!Object.assign) {
            return false;
          }
          var test1 = new String("abc");
          test1[5] = "de";
          if (Object.getOwnPropertyNames(test1)[0] === "5") {
            return false;
          }
          var test2 = {};
          for (var i = 0; i < 10; i++) {
            test2["_" + String.fromCharCode(i)] = i;
          }
          var order2 = Object.getOwnPropertyNames(test2).map(function(n) {
            return test2[n];
          });
          if (order2.join("") !== "0123456789") {
            return false;
          }
          var test3 = {};
          "abcdefghijklmnopqrst".split("").forEach(function(letter) {
            test3[letter] = letter;
          });
          if (Object.keys(Object.assign({}, test3)).join("") !== "abcdefghijklmnopqrst") {
            return false;
          }
          return true;
        } catch (err) {
          return false;
        }
      }
      module.exports = shouldUseNative() ? Object.assign : function(target, source) {
        var from;
        var to = toObject(target);
        var symbols;
        for (var s = 1; s < arguments.length; s++) {
          from = Object(arguments[s]);
          for (var key in from) {
            if (hasOwnProperty.call(from, key)) {
              to[key] = from[key];
            }
          }
          if (getOwnPropertySymbols) {
            symbols = getOwnPropertySymbols(from);
            for (var i = 0; i < symbols.length; i++) {
              if (propIsEnumerable.call(from, symbols[i])) {
                to[symbols[i]] = from[symbols[i]];
              }
            }
          }
        }
        return to;
      };
    }
  });

  // node_modules/is-expression/index.js
  var require_is_expression = __commonJS({
    "node_modules/is-expression/index.js"(exports, module) {
      "use strict";
      var acorn = require_acorn();
      var objectAssign = require_object_assign();
      module.exports = isExpression;
      var DEFAULT_OPTIONS = {
        throw: false,
        strict: false,
        lineComment: false
      };
      function isExpression(src, options) {
        options = objectAssign({}, DEFAULT_OPTIONS, options);
        try {
          var parser = new acorn.Parser(options, src, 0);
          if (options.strict) {
            parser.strict = true;
          }
          if (!options.lineComment) {
            parser.skipLineComment = function(startSkip) {
              this.raise(this.pos, "Line comments not allowed in an expression");
            };
          }
          parser.nextToken();
          parser.parseExpression();
          if (parser.type !== acorn.tokTypes.eof) {
            parser.unexpected();
          }
        } catch (ex) {
          if (!options.throw) {
            return false;
          }
          throw ex;
        }
        return true;
      }
    }
  });

  // node_modules/character-parser/index.js
  var require_character_parser = __commonJS({
    "node_modules/character-parser/index.js"(exports, module) {
      "use strict";
      var objIsRegex = require_is_regex();
      exports = module.exports = parse;
      var TOKEN_TYPES = exports.TOKEN_TYPES = {
        LINE_COMMENT: "//",
        BLOCK_COMMENT: "/**/",
        SINGLE_QUOTE: "'",
        DOUBLE_QUOTE: '"',
        TEMPLATE_QUOTE: "`",
        REGEXP: "//g"
      };
      var BRACKETS = exports.BRACKETS = {
        "(": ")",
        "{": "}",
        "[": "]"
      };
      var BRACKETS_REVERSED = {
        ")": "(",
        "}": "{",
        "]": "["
      };
      exports.parse = parse;
      function parse(src, state, options) {
        options = options || {};
        state = state || exports.defaultState();
        var start = options.start || 0;
        var end = options.end || src.length;
        var index = start;
        while (index < end) {
          try {
            parseChar(src[index], state);
          } catch (ex) {
            ex.index = index;
            throw ex;
          }
          index++;
        }
        return state;
      }
      exports.parseUntil = parseUntil;
      function parseUntil(src, delimiter, options) {
        options = options || {};
        var start = options.start || 0;
        var index = start;
        var state = exports.defaultState();
        while (index < src.length) {
          if ((options.ignoreNesting || !state.isNesting(options)) && matches(src, delimiter, index)) {
            var end = index;
            return {
              start,
              end,
              src: src.substring(start, end)
            };
          }
          try {
            parseChar(src[index], state);
          } catch (ex) {
            ex.index = index;
            throw ex;
          }
          index++;
        }
        var err = new Error("The end of the string was reached with no closing bracket found.");
        err.code = "CHARACTER_PARSER:END_OF_STRING_REACHED";
        err.index = index;
        throw err;
      }
      exports.parseChar = parseChar;
      function parseChar(character, state) {
        if (character.length !== 1) {
          var err = new Error("Character must be a string of length 1");
          err.name = "InvalidArgumentError";
          err.code = "CHARACTER_PARSER:CHAR_LENGTH_NOT_ONE";
          throw err;
        }
        state = state || exports.defaultState();
        state.src += character;
        var wasComment = state.isComment();
        var lastChar = state.history ? state.history[0] : "";
        if (state.regexpStart) {
          if (character === "/" || character == "*") {
            state.stack.pop();
          }
          state.regexpStart = false;
        }
        switch (state.current()) {
          case TOKEN_TYPES.LINE_COMMENT:
            if (character === "\n") {
              state.stack.pop();
            }
            break;
          case TOKEN_TYPES.BLOCK_COMMENT:
            if (state.lastChar === "*" && character === "/") {
              state.stack.pop();
            }
            break;
          case TOKEN_TYPES.SINGLE_QUOTE:
            if (character === "'" && !state.escaped) {
              state.stack.pop();
            } else if (character === "\\" && !state.escaped) {
              state.escaped = true;
            } else {
              state.escaped = false;
            }
            break;
          case TOKEN_TYPES.DOUBLE_QUOTE:
            if (character === '"' && !state.escaped) {
              state.stack.pop();
            } else if (character === "\\" && !state.escaped) {
              state.escaped = true;
            } else {
              state.escaped = false;
            }
            break;
          case TOKEN_TYPES.TEMPLATE_QUOTE:
            if (character === "`" && !state.escaped) {
              state.stack.pop();
              state.hasDollar = false;
            } else if (character === "\\" && !state.escaped) {
              state.escaped = true;
              state.hasDollar = false;
            } else if (character === "$" && !state.escaped) {
              state.hasDollar = true;
            } else if (character === "{" && state.hasDollar) {
              state.stack.push(BRACKETS[character]);
            } else {
              state.escaped = false;
              state.hasDollar = false;
            }
            break;
          case TOKEN_TYPES.REGEXP:
            if (character === "/" && !state.escaped) {
              state.stack.pop();
            } else if (character === "\\" && !state.escaped) {
              state.escaped = true;
            } else {
              state.escaped = false;
            }
            break;
          default:
            if (character in BRACKETS) {
              state.stack.push(BRACKETS[character]);
            } else if (character in BRACKETS_REVERSED) {
              if (state.current() !== character) {
                var err = new SyntaxError("Mismatched Bracket: " + character);
                err.code = "CHARACTER_PARSER:MISMATCHED_BRACKET";
                throw err;
              }
              ;
              state.stack.pop();
            } else if (lastChar === "/" && character === "/") {
              state.history = state.history.substr(1);
              state.stack.push(TOKEN_TYPES.LINE_COMMENT);
            } else if (lastChar === "/" && character === "*") {
              state.history = state.history.substr(1);
              state.stack.push(TOKEN_TYPES.BLOCK_COMMENT);
            } else if (character === "/" && isRegexp(state.history)) {
              state.stack.push(TOKEN_TYPES.REGEXP);
              state.regexpStart = true;
            } else if (character === "'") {
              state.stack.push(TOKEN_TYPES.SINGLE_QUOTE);
            } else if (character === '"') {
              state.stack.push(TOKEN_TYPES.DOUBLE_QUOTE);
            } else if (character === "`") {
              state.stack.push(TOKEN_TYPES.TEMPLATE_QUOTE);
            }
            break;
        }
        if (!state.isComment() && !wasComment) {
          state.history = character + state.history;
        }
        state.lastChar = character;
        return state;
      }
      exports.defaultState = function() {
        return new State();
      };
      function State() {
        this.stack = [];
        this.regexpStart = false;
        this.escaped = false;
        this.hasDollar = false;
        this.src = "";
        this.history = "";
        this.lastChar = "";
      }
      State.prototype.current = function() {
        return this.stack[this.stack.length - 1];
      };
      State.prototype.isString = function() {
        return this.current() === TOKEN_TYPES.SINGLE_QUOTE || this.current() === TOKEN_TYPES.DOUBLE_QUOTE || this.current() === TOKEN_TYPES.TEMPLATE_QUOTE;
      };
      State.prototype.isComment = function() {
        return this.current() === TOKEN_TYPES.LINE_COMMENT || this.current() === TOKEN_TYPES.BLOCK_COMMENT;
      };
      State.prototype.isNesting = function(opts) {
        if (opts && opts.ignoreLineComment && this.stack.length === 1 && this.stack[0] === TOKEN_TYPES.LINE_COMMENT) {
          return false;
        }
        return !!this.stack.length;
      };
      function matches(str, matcher, i) {
        if (objIsRegex(matcher)) {
          return matcher.test(str.substr(i || 0));
        } else {
          return str.substr(i || 0, matcher.length) === matcher;
        }
      }
      exports.isPunctuator = isPunctuator;
      function isPunctuator(c) {
        if (!c) return true;
        var code = c.charCodeAt(0);
        switch (code) {
          case 46:
          // . dot
          case 40:
          // ( open bracket
          case 41:
          // ) close bracket
          case 59:
          // ; semicolon
          case 44:
          // , comma
          case 123:
          // { open curly brace
          case 125:
          // } close curly brace
          case 91:
          // [
          case 93:
          // ]
          case 58:
          // :
          case 63:
          // ?
          case 126:
          // ~
          case 37:
          // %
          case 38:
          // &
          case 42:
          // *:
          case 43:
          // +
          case 45:
          // -
          case 47:
          // /
          case 60:
          // <
          case 62:
          // >
          case 94:
          // ^
          case 124:
          // |
          case 33:
          // !
          case 61:
            return true;
          default:
            return false;
        }
      }
      exports.isKeyword = isKeyword;
      function isKeyword(id) {
        return id === "if" || id === "in" || id === "do" || id === "var" || id === "for" || id === "new" || id === "try" || id === "let" || id === "this" || id === "else" || id === "case" || id === "void" || id === "with" || id === "enum" || id === "while" || id === "break" || id === "catch" || id === "throw" || id === "const" || id === "yield" || id === "class" || id === "super" || id === "return" || id === "typeof" || id === "delete" || id === "switch" || id === "export" || id === "import" || id === "default" || id === "finally" || id === "extends" || id === "function" || id === "continue" || id === "debugger" || id === "package" || id === "private" || id === "interface" || id === "instanceof" || id === "implements" || id === "protected" || id === "public" || id === "static";
      }
      function isRegexp(history) {
        history = history.replace(/^\s*/, "");
        if (history[0] === ")") return false;
        if (history[0] === "}") return true;
        if (isPunctuator(history[0])) return true;
        if (/^\w+\b/.test(history) && isKeyword(/^\w+\b/.exec(history)[0].split("").reverse().join(""))) return true;
        return false;
      }
    }
  });

  // node_modules/pug-error/lib/index.js
  var require_lib = __commonJS({
    "node_modules/pug-error/lib/index.js"(exports, module) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      function makeError(code, message, options) {
        var line = options.line;
        var column = options.column;
        var filename = options.filename;
        var src = options.src;
        var fullMessage;
        var location = line + (column ? ":" + column : "");
        if (src && line >= 1 && line <= src.split("\n").length) {
          var lines = src.split("\n");
          var start_1 = Math.max(line - 3, 0);
          var end = Math.min(lines.length, line + 3);
          var context = lines.slice(start_1, end).map(function(text, i) {
            var curr = i + start_1 + 1;
            var preamble = (curr == line ? "  > " : "    ") + curr + "| ";
            var out = preamble + text;
            if (curr === line && column > 0) {
              out += "\n";
              out += Array(preamble.length + column).join("-") + "^";
            }
            return out;
          }).join("\n");
          fullMessage = (filename || "Pug") + ":" + location + "\n" + context + "\n\n" + message;
        } else {
          fullMessage = (filename || "Pug") + ":" + location + "\n\n" + message;
        }
        var err = new Error(fullMessage);
        err.code = "PUG:" + code;
        err.msg = message;
        err.line = line;
        err.column = column;
        err.filename = filename;
        err.src = src;
        err.toJSON = function() {
          return {
            code: this.code,
            msg: this.msg,
            line: this.line,
            column: this.column,
            filename: this.filename
          };
        };
        return err;
      }
      exports.default = makeError;
      module.exports = makeError;
      module.exports.default = makeError;
    }
  });

  // node_modules/pug-lexer/index.js
  var require_pug_lexer = __commonJS({
    "node_modules/pug-lexer/index.js"(exports, module) {
      "use strict";
      var assert = require_assert();
      var isExpression = require_is_expression();
      var characterParser = require_character_parser();
      var error = require_lib();
      module.exports = lex;
      module.exports.Lexer = Lexer;
      function lex(str, options) {
        var lexer = new Lexer(str, options);
        return JSON.parse(JSON.stringify(lexer.getTokens()));
      }
      function Lexer(str, options) {
        options = options || {};
        if (typeof str !== "string") {
          throw new Error(
            'Expected source code to be a string but got "' + typeof str + '"'
          );
        }
        if (typeof options !== "object") {
          throw new Error(
            'Expected "options" to be an object but got "' + typeof options + '"'
          );
        }
        str = str.replace(/^\uFEFF/, "");
        this.input = str.replace(/\r\n|\r/g, "\n");
        this.originalInput = this.input;
        this.filename = options.filename;
        this.interpolated = options.interpolated || false;
        this.lineno = options.startingLine || 1;
        this.colno = options.startingColumn || 1;
        this.plugins = options.plugins || [];
        this.indentStack = [0];
        this.indentRe = null;
        this.interpolationAllowed = true;
        this.whitespaceRe = /[ \n\t]/;
        this.tokens = [];
        this.ended = false;
      }
      Lexer.prototype = {
        constructor: Lexer,
        error: function(code, message) {
          var err = error(code, message, {
            line: this.lineno,
            column: this.colno,
            filename: this.filename,
            src: this.originalInput
          });
          throw err;
        },
        assert: function(value, message) {
          if (!value) this.error("ASSERT_FAILED", message);
        },
        isExpression: function(exp) {
          return isExpression(exp, {
            throw: true
          });
        },
        assertExpression: function(exp, noThrow) {
          try {
            this.callLexerFunction("isExpression", exp);
            return true;
          } catch (ex) {
            if (noThrow) return false;
            if (!ex.loc) throw ex;
            this.incrementLine(ex.loc.line - 1);
            this.incrementColumn(ex.loc.column);
            var msg = "Syntax Error: " + ex.message.replace(/ \([0-9]+:[0-9]+\)$/, "");
            this.error("SYNTAX_ERROR", msg);
          }
        },
        assertNestingCorrect: function(exp) {
          var res = characterParser(exp);
          if (res.isNesting()) {
            this.error(
              "INCORRECT_NESTING",
              "Nesting must match on expression `" + exp + "`"
            );
          }
        },
        /**
         * Construct a token with the given `type` and `val`.
         *
         * @param {String} type
         * @param {String} val
         * @return {Object}
         * @api private
         */
        tok: function(type, val) {
          var res = {
            type,
            loc: {
              start: {
                line: this.lineno,
                column: this.colno
              },
              filename: this.filename
            }
          };
          if (val !== void 0) res.val = val;
          return res;
        },
        /**
         * Set the token's `loc.end` value.
         *
         * @param {Object} tok
         * @returns {Object}
         * @api private
         */
        tokEnd: function(tok) {
          tok.loc.end = {
            line: this.lineno,
            column: this.colno
          };
          return tok;
        },
        /**
         * Increment `this.lineno` and reset `this.colno`.
         *
         * @param {Number} increment
         * @api private
         */
        incrementLine: function(increment) {
          this.lineno += increment;
          if (increment) this.colno = 1;
        },
        /**
         * Increment `this.colno`.
         *
         * @param {Number} increment
         * @api private
         */
        incrementColumn: function(increment) {
          this.colno += increment;
        },
        /**
         * Consume the given `len` of input.
         *
         * @param {Number} len
         * @api private
         */
        consume: function(len) {
          this.input = this.input.substr(len);
        },
        /**
         * Scan for `type` with the given `regexp`.
         *
         * @param {String} type
         * @param {RegExp} regexp
         * @return {Object}
         * @api private
         */
        scan: function(regexp, type) {
          var captures;
          if (captures = regexp.exec(this.input)) {
            var len = captures[0].length;
            var val = captures[1];
            var diff = len - (val ? val.length : 0);
            var tok = this.tok(type, val);
            this.consume(len);
            this.incrementColumn(diff);
            return tok;
          }
        },
        scanEndOfLine: function(regexp, type) {
          var captures;
          if (captures = regexp.exec(this.input)) {
            var whitespaceLength = 0;
            var whitespace;
            var tok;
            if (whitespace = /^([ ]+)([^ ]*)/.exec(captures[0])) {
              whitespaceLength = whitespace[1].length;
              this.incrementColumn(whitespaceLength);
            }
            var newInput = this.input.substr(captures[0].length);
            if (newInput[0] === ":") {
              this.input = newInput;
              tok = this.tok(type, captures[1]);
              this.incrementColumn(captures[0].length - whitespaceLength);
              return tok;
            }
            if (/^[ \t]*(\n|$)/.test(newInput)) {
              this.input = newInput.substr(/^[ \t]*/.exec(newInput)[0].length);
              tok = this.tok(type, captures[1]);
              this.incrementColumn(captures[0].length - whitespaceLength);
              return tok;
            }
          }
        },
        /**
         * Return the indexOf `(` or `{` or `[` / `)` or `}` or `]` delimiters.
         *
         * Make sure that when calling this function, colno is at the character
         * immediately before the beginning.
         *
         * @return {Number}
         * @api private
         */
        bracketExpression: function(skip) {
          skip = skip || 0;
          var start = this.input[skip];
          assert(
            start === "(" || start === "{" || start === "[",
            'The start character should be "(", "{" or "["'
          );
          var end = characterParser.BRACKETS[start];
          var range;
          try {
            range = characterParser.parseUntil(this.input, end, { start: skip + 1 });
          } catch (ex) {
            if (ex.index !== void 0) {
              var idx = ex.index;
              var tmp = this.input.substr(skip).indexOf("\n");
              var nextNewline = tmp + skip;
              var ptr = 0;
              while (idx > nextNewline && tmp !== -1) {
                this.incrementLine(1);
                idx -= nextNewline + 1;
                ptr += nextNewline + 1;
                tmp = nextNewline = this.input.substr(ptr).indexOf("\n");
              }
              this.incrementColumn(idx);
            }
            if (ex.code === "CHARACTER_PARSER:END_OF_STRING_REACHED") {
              this.error(
                "NO_END_BRACKET",
                "The end of the string reached with no closing bracket " + end + " found."
              );
            } else if (ex.code === "CHARACTER_PARSER:MISMATCHED_BRACKET") {
              this.error("BRACKET_MISMATCH", ex.message);
            }
            throw ex;
          }
          return range;
        },
        scanIndentation: function() {
          var captures, re;
          if (this.indentRe) {
            captures = this.indentRe.exec(this.input);
          } else {
            re = /^\n(\t*) */;
            captures = re.exec(this.input);
            if (captures && !captures[1].length) {
              re = /^\n( *)/;
              captures = re.exec(this.input);
            }
            if (captures && captures[1].length) this.indentRe = re;
          }
          return captures;
        },
        /**
         * end-of-source.
         */
        eos: function() {
          if (this.input.length) return;
          if (this.interpolated) {
            this.error(
              "NO_END_BRACKET",
              "End of line was reached with no closing bracket for interpolation."
            );
          }
          for (var i = 0; this.indentStack[i]; i++) {
            this.tokens.push(this.tokEnd(this.tok("outdent")));
          }
          this.tokens.push(this.tokEnd(this.tok("eos")));
          this.ended = true;
          return true;
        },
        /**
         * Blank line.
         */
        blank: function() {
          var captures;
          if (captures = /^\n[ \t]*\n/.exec(this.input)) {
            this.consume(captures[0].length - 1);
            this.incrementLine(1);
            return true;
          }
        },
        /**
         * Comment.
         */
        comment: function() {
          var captures;
          if (captures = /^\/\/(-)?([^\n]*)/.exec(this.input)) {
            this.consume(captures[0].length);
            var tok = this.tok("comment", captures[2]);
            tok.buffer = "-" != captures[1];
            this.interpolationAllowed = tok.buffer;
            this.tokens.push(tok);
            this.incrementColumn(captures[0].length);
            this.tokEnd(tok);
            this.callLexerFunction("pipelessText");
            return true;
          }
        },
        /**
         * Interpolated tag.
         */
        interpolation: function() {
          if (/^#\{/.test(this.input)) {
            var match = this.bracketExpression(1);
            this.consume(match.end + 1);
            var tok = this.tok("interpolation", match.src);
            this.tokens.push(tok);
            this.incrementColumn(2);
            this.assertExpression(match.src);
            var splitted = match.src.split("\n");
            var lines = splitted.length - 1;
            this.incrementLine(lines);
            this.incrementColumn(splitted[lines].length + 1);
            this.tokEnd(tok);
            return true;
          }
        },
        /**
         * Tag.
         */
        tag: function() {
          var captures;
          if (captures = /^(\w(?:[-:\w]*\w)?)/.exec(this.input)) {
            var tok, name = captures[1], len = captures[0].length;
            this.consume(len);
            tok = this.tok("tag", name);
            this.tokens.push(tok);
            this.incrementColumn(len);
            this.tokEnd(tok);
            return true;
          }
        },
        /**
         * Filter.
         */
        filter: function(opts) {
          var tok = this.scan(/^:([\w\-]+)/, "filter");
          var inInclude = opts && opts.inInclude;
          if (tok) {
            this.tokens.push(tok);
            this.incrementColumn(tok.val.length);
            this.tokEnd(tok);
            this.callLexerFunction("attrs");
            if (!inInclude) {
              this.interpolationAllowed = false;
              this.callLexerFunction("pipelessText");
            }
            return true;
          }
        },
        /**
         * Doctype.
         */
        doctype: function() {
          var node = this.scanEndOfLine(/^doctype *([^\n]*)/, "doctype");
          if (node) {
            this.tokens.push(this.tokEnd(node));
            return true;
          }
        },
        /**
         * Id.
         */
        id: function() {
          var tok = this.scan(/^#([\w-]+)/, "id");
          if (tok) {
            this.tokens.push(tok);
            this.incrementColumn(tok.val.length);
            this.tokEnd(tok);
            return true;
          }
          if (/^#/.test(this.input)) {
            this.error(
              "INVALID_ID",
              '"' + /.[^ \t\(\#\.\:]*/.exec(this.input.substr(1))[0] + '" is not a valid ID.'
            );
          }
        },
        /**
         * Class.
         */
        className: function() {
          var tok = this.scan(/^\.([_a-z0-9\-]*[_a-z][_a-z0-9\-]*)/i, "class");
          if (tok) {
            this.tokens.push(tok);
            this.incrementColumn(tok.val.length);
            this.tokEnd(tok);
            return true;
          }
          if (/^\.[_a-z0-9\-]+/i.test(this.input)) {
            this.error(
              "INVALID_CLASS_NAME",
              "Class names must contain at least one letter or underscore."
            );
          }
          if (/^\./.test(this.input)) {
            this.error(
              "INVALID_CLASS_NAME",
              '"' + /.[^ \t\(\#\.\:]*/.exec(this.input.substr(1))[0] + '" is not a valid class name.  Class names can only contain "_", "-", a-z and 0-9, and must contain at least one of "_", or a-z'
            );
          }
        },
        /**
         * Text.
         */
        endInterpolation: function() {
          if (this.interpolated && this.input[0] === "]") {
            this.input = this.input.substr(1);
            this.ended = true;
            return true;
          }
        },
        addText: function(type, value, prefix, escaped) {
          var tok;
          if (value + prefix === "") return;
          prefix = prefix || "";
          escaped = escaped || 0;
          var indexOfEnd = this.interpolated ? value.indexOf("]") : -1;
          var indexOfStart = this.interpolationAllowed ? value.indexOf("#[") : -1;
          var indexOfEscaped = this.interpolationAllowed ? value.indexOf("\\#[") : -1;
          var matchOfStringInterp = /(\\)?([#!]){((?:.|\n)*)$/.exec(value);
          var indexOfStringInterp = this.interpolationAllowed && matchOfStringInterp ? matchOfStringInterp.index : Infinity;
          if (indexOfEnd === -1) indexOfEnd = Infinity;
          if (indexOfStart === -1) indexOfStart = Infinity;
          if (indexOfEscaped === -1) indexOfEscaped = Infinity;
          if (indexOfEscaped !== Infinity && indexOfEscaped < indexOfEnd && indexOfEscaped < indexOfStart && indexOfEscaped < indexOfStringInterp) {
            prefix = prefix + value.substring(0, indexOfEscaped) + "#[";
            return this.addText(
              type,
              value.substring(indexOfEscaped + 3),
              prefix,
              escaped + 1
            );
          }
          if (indexOfStart !== Infinity && indexOfStart < indexOfEnd && indexOfStart < indexOfEscaped && indexOfStart < indexOfStringInterp) {
            tok = this.tok(type, prefix + value.substring(0, indexOfStart));
            this.incrementColumn(prefix.length + indexOfStart + escaped);
            this.tokens.push(this.tokEnd(tok));
            tok = this.tok("start-pug-interpolation");
            this.incrementColumn(2);
            this.tokens.push(this.tokEnd(tok));
            var child = new this.constructor(value.substr(indexOfStart + 2), {
              filename: this.filename,
              interpolated: true,
              startingLine: this.lineno,
              startingColumn: this.colno,
              plugins: this.plugins
            });
            var interpolated;
            try {
              interpolated = child.getTokens();
            } catch (ex) {
              if (ex.code && /^PUG:/.test(ex.code)) {
                this.colno = ex.column;
                this.error(ex.code.substr(4), ex.msg);
              }
              throw ex;
            }
            this.colno = child.colno;
            this.tokens = this.tokens.concat(interpolated);
            tok = this.tok("end-pug-interpolation");
            this.incrementColumn(1);
            this.tokens.push(this.tokEnd(tok));
            this.addText(type, child.input);
            return;
          }
          if (indexOfEnd !== Infinity && indexOfEnd < indexOfStart && indexOfEnd < indexOfEscaped && indexOfEnd < indexOfStringInterp) {
            if (prefix + value.substring(0, indexOfEnd)) {
              this.addText(type, value.substring(0, indexOfEnd), prefix);
            }
            this.ended = true;
            this.input = value.substr(value.indexOf("]") + 1) + this.input;
            return;
          }
          if (indexOfStringInterp !== Infinity) {
            if (matchOfStringInterp[1]) {
              prefix = prefix + value.substring(0, indexOfStringInterp) + matchOfStringInterp[2] + "{";
              return this.addText(
                type,
                value.substring(indexOfStringInterp + 3),
                prefix,
                escaped + 1
              );
            }
            var before = value.substr(0, indexOfStringInterp);
            if (prefix || before) {
              before = prefix + before;
              tok = this.tok(type, before);
              this.incrementColumn(before.length + escaped);
              this.tokens.push(this.tokEnd(tok));
            }
            var rest = matchOfStringInterp[3];
            var range;
            tok = this.tok("interpolated-code");
            this.incrementColumn(2);
            try {
              range = characterParser.parseUntil(rest, "}");
            } catch (ex) {
              if (ex.index !== void 0) {
                this.incrementColumn(ex.index);
              }
              if (ex.code === "CHARACTER_PARSER:END_OF_STRING_REACHED") {
                this.error(
                  "NO_END_BRACKET",
                  "End of line was reached with no closing bracket for interpolation."
                );
              } else if (ex.code === "CHARACTER_PARSER:MISMATCHED_BRACKET") {
                this.error("BRACKET_MISMATCH", ex.message);
              } else {
                throw ex;
              }
            }
            tok.mustEscape = matchOfStringInterp[2] === "#";
            tok.buffer = true;
            tok.val = range.src;
            this.assertExpression(range.src);
            if (range.end + 1 < rest.length) {
              rest = rest.substr(range.end + 1);
              this.incrementColumn(range.end + 1);
              this.tokens.push(this.tokEnd(tok));
              this.addText(type, rest);
            } else {
              this.incrementColumn(rest.length);
              this.tokens.push(this.tokEnd(tok));
            }
            return;
          }
          value = prefix + value;
          tok = this.tok(type, value);
          this.incrementColumn(value.length + escaped);
          this.tokens.push(this.tokEnd(tok));
        },
        text: function() {
          var tok = this.scan(/^(?:\| ?| )([^\n]+)/, "text") || this.scan(/^( )/, "text") || this.scan(/^\|( ?)/, "text");
          if (tok) {
            this.addText("text", tok.val);
            return true;
          }
        },
        textHtml: function() {
          var tok = this.scan(/^(<[^\n]*)/, "text-html");
          if (tok) {
            this.addText("text-html", tok.val);
            return true;
          }
        },
        /**
         * Dot.
         */
        dot: function() {
          var tok;
          if (tok = this.scanEndOfLine(/^\./, "dot")) {
            this.tokens.push(this.tokEnd(tok));
            this.callLexerFunction("pipelessText");
            return true;
          }
        },
        /**
         * Extends.
         */
        extends: function() {
          var tok = this.scan(/^extends?(?= |$|\n)/, "extends");
          if (tok) {
            this.tokens.push(this.tokEnd(tok));
            if (!this.callLexerFunction("path")) {
              this.error("NO_EXTENDS_PATH", "missing path for extends");
            }
            return true;
          }
          if (this.scan(/^extends?\b/)) {
            this.error("MALFORMED_EXTENDS", "malformed extends");
          }
        },
        /**
         * Block prepend.
         */
        prepend: function() {
          var captures;
          if (captures = /^(?:block +)?prepend +([^\n]+)/.exec(this.input)) {
            var name = captures[1].trim();
            var comment = "";
            if (name.indexOf("//") !== -1) {
              comment = "//" + name.split("//").slice(1).join("//");
              name = name.split("//")[0].trim();
            }
            if (!name) return;
            var tok = this.tok("block", name);
            var len = captures[0].length - comment.length;
            while (this.whitespaceRe.test(this.input.charAt(len - 1))) len--;
            this.incrementColumn(len);
            tok.mode = "prepend";
            this.tokens.push(this.tokEnd(tok));
            this.consume(captures[0].length - comment.length);
            this.incrementColumn(captures[0].length - comment.length - len);
            return true;
          }
        },
        /**
         * Block append.
         */
        append: function() {
          var captures;
          if (captures = /^(?:block +)?append +([^\n]+)/.exec(this.input)) {
            var name = captures[1].trim();
            var comment = "";
            if (name.indexOf("//") !== -1) {
              comment = "//" + name.split("//").slice(1).join("//");
              name = name.split("//")[0].trim();
            }
            if (!name) return;
            var tok = this.tok("block", name);
            var len = captures[0].length - comment.length;
            while (this.whitespaceRe.test(this.input.charAt(len - 1))) len--;
            this.incrementColumn(len);
            tok.mode = "append";
            this.tokens.push(this.tokEnd(tok));
            this.consume(captures[0].length - comment.length);
            this.incrementColumn(captures[0].length - comment.length - len);
            return true;
          }
        },
        /**
         * Block.
         */
        block: function() {
          var captures;
          if (captures = /^block +([^\n]+)/.exec(this.input)) {
            var name = captures[1].trim();
            var comment = "";
            if (name.indexOf("//") !== -1) {
              comment = "//" + name.split("//").slice(1).join("//");
              name = name.split("//")[0].trim();
            }
            if (!name) return;
            var tok = this.tok("block", name);
            var len = captures[0].length - comment.length;
            while (this.whitespaceRe.test(this.input.charAt(len - 1))) len--;
            this.incrementColumn(len);
            tok.mode = "replace";
            this.tokens.push(this.tokEnd(tok));
            this.consume(captures[0].length - comment.length);
            this.incrementColumn(captures[0].length - comment.length - len);
            return true;
          }
        },
        /**
         * Mixin Block.
         */
        mixinBlock: function() {
          var tok;
          if (tok = this.scanEndOfLine(/^block/, "mixin-block")) {
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
        },
        /**
         * Yield.
         */
        yield: function() {
          var tok = this.scanEndOfLine(/^yield/, "yield");
          if (tok) {
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
        },
        /**
         * Include.
         */
        include: function() {
          var tok = this.scan(/^include(?=:| |$|\n)/, "include");
          if (tok) {
            this.tokens.push(this.tokEnd(tok));
            while (this.callLexerFunction("filter", { inInclude: true })) ;
            if (!this.callLexerFunction("path")) {
              if (/^[^ \n]+/.test(this.input)) {
                this.fail();
              } else {
                this.error("NO_INCLUDE_PATH", "missing path for include");
              }
            }
            return true;
          }
          if (this.scan(/^include\b/)) {
            this.error("MALFORMED_INCLUDE", "malformed include");
          }
        },
        /**
         * Path
         */
        path: function() {
          var tok = this.scanEndOfLine(/^ ([^\n]+)/, "path");
          if (tok && (tok.val = tok.val.trim())) {
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
        },
        /**
         * Case.
         */
        case: function() {
          var tok = this.scanEndOfLine(/^case +([^\n]+)/, "case");
          if (tok) {
            this.incrementColumn(-tok.val.length);
            this.assertExpression(tok.val);
            this.incrementColumn(tok.val.length);
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
          if (this.scan(/^case\b/)) {
            this.error("NO_CASE_EXPRESSION", "missing expression for case");
          }
        },
        /**
         * When.
         */
        when: function() {
          var tok = this.scanEndOfLine(/^when +([^:\n]+)/, "when");
          if (tok) {
            var parser = characterParser(tok.val);
            while (parser.isNesting() || parser.isString()) {
              var rest = /:([^:\n]+)/.exec(this.input);
              if (!rest) break;
              tok.val += rest[0];
              this.consume(rest[0].length);
              this.incrementColumn(rest[0].length);
              parser = characterParser(tok.val);
            }
            this.incrementColumn(-tok.val.length);
            this.assertExpression(tok.val);
            this.incrementColumn(tok.val.length);
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
          if (this.scan(/^when\b/)) {
            this.error("NO_WHEN_EXPRESSION", "missing expression for when");
          }
        },
        /**
         * Default.
         */
        default: function() {
          var tok = this.scanEndOfLine(/^default/, "default");
          if (tok) {
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
          if (this.scan(/^default\b/)) {
            this.error(
              "DEFAULT_WITH_EXPRESSION",
              "default should not have an expression"
            );
          }
        },
        /**
         * Call mixin.
         */
        call: function() {
          var tok, captures, increment;
          if (captures = /^\+(\s*)(([-\w]+)|(#\{))/.exec(this.input)) {
            if (captures[3]) {
              increment = captures[0].length;
              this.consume(increment);
              tok = this.tok("call", captures[3]);
            } else {
              var match = this.bracketExpression(2 + captures[1].length);
              increment = match.end + 1;
              this.consume(increment);
              this.assertExpression(match.src);
              tok = this.tok("call", "#{" + match.src + "}");
            }
            this.incrementColumn(increment);
            tok.args = null;
            if (captures = /^ *\(/.exec(this.input)) {
              var range = this.bracketExpression(captures[0].length - 1);
              if (!/^\s*[-\w]+ *=/.test(range.src)) {
                this.incrementColumn(1);
                this.consume(range.end + 1);
                tok.args = range.src;
                this.assertExpression("[" + tok.args + "]");
                for (var i = 0; i <= tok.args.length; i++) {
                  if (tok.args[i] === "\n") {
                    this.incrementLine(1);
                  } else {
                    this.incrementColumn(1);
                  }
                }
              }
            }
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
        },
        /**
         * Mixin.
         */
        mixin: function() {
          var captures;
          if (captures = /^mixin +([-\w]+)(?: *\((.*)\))? */.exec(this.input)) {
            this.consume(captures[0].length);
            var tok = this.tok("mixin", captures[1]);
            tok.args = captures[2] || null;
            this.incrementColumn(captures[0].length);
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
        },
        /**
         * Conditional.
         */
        conditional: function() {
          var captures;
          if (captures = /^(if|unless|else if|else)\b([^\n]*)/.exec(this.input)) {
            this.consume(captures[0].length);
            var type = captures[1].replace(/ /g, "-");
            var js = captures[2] && captures[2].trim();
            var tok = this.tok(type, js);
            this.incrementColumn(captures[0].length - js.length);
            switch (type) {
              case "if":
              case "else-if":
                this.assertExpression(js);
                break;
              case "unless":
                this.assertExpression(js);
                tok.val = "!(" + js + ")";
                tok.type = "if";
                break;
              case "else":
                if (js) {
                  this.error(
                    "ELSE_CONDITION",
                    "`else` cannot have a condition, perhaps you meant `else if`"
                  );
                }
                break;
            }
            this.incrementColumn(js.length);
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
        },
        /**
         * While.
         */
        while: function() {
          var captures, tok;
          if (captures = /^while +([^\n]+)/.exec(this.input)) {
            this.consume(captures[0].length);
            this.assertExpression(captures[1]);
            tok = this.tok("while", captures[1]);
            this.incrementColumn(captures[0].length);
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
          if (this.scan(/^while\b/)) {
            this.error("NO_WHILE_EXPRESSION", "missing expression for while");
          }
        },
        /**
         * Each.
         */
        each: function() {
          var captures;
          if (captures = /^(?:each|for) +([a-zA-Z_$][\w$]*)(?: *, *([a-zA-Z_$][\w$]*))? * in *([^\n]+)/.exec(
            this.input
          )) {
            this.consume(captures[0].length);
            var tok = this.tok("each", captures[1]);
            tok.key = captures[2] || null;
            this.incrementColumn(captures[0].length - captures[3].length);
            this.assertExpression(captures[3]);
            tok.code = captures[3];
            this.incrementColumn(captures[3].length);
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
          const name = /^each\b/.exec(this.input) ? "each" : "for";
          if (this.scan(/^(?:each|for)\b/)) {
            this.error(
              "MALFORMED_EACH",
              "This `" + name + "` has a syntax error. `" + name + "` statements should be of the form: `" + name + " VARIABLE_NAME of JS_EXPRESSION`"
            );
          }
          if (captures = /^- *(?:each|for) +([a-zA-Z_$][\w$]*)(?: *, *([a-zA-Z_$][\w$]*))? +in +([^\n]+)/.exec(
            this.input
          )) {
            this.error(
              "MALFORMED_EACH",
              'Pug each and for should no longer be prefixed with a dash ("-"). They are pug keywords and not part of JavaScript.'
            );
          }
        },
        /**
         * EachOf.
         */
        eachOf: function() {
          var captures;
          if (captures = /^(?:each|for) (.*?) of *([^\n]+)/.exec(this.input)) {
            this.consume(captures[0].length);
            var tok = this.tok("eachOf", captures[1]);
            tok.value = captures[1];
            this.incrementColumn(captures[0].length - captures[2].length);
            this.assertExpression(captures[2]);
            tok.code = captures[2];
            this.incrementColumn(captures[2].length);
            this.tokens.push(this.tokEnd(tok));
            if (!(/^[a-zA-Z_$][\w$]*$/.test(tok.value.trim()) || /^\[ *[a-zA-Z_$][\w$]* *\, *[a-zA-Z_$][\w$]* *\]$/.test(
              tok.value.trim()
            ))) {
              this.error(
                "MALFORMED_EACH_OF_LVAL",
                "The value variable for each must either be a valid identifier (e.g. `item`) or a pair of identifiers in square brackets (e.g. `[key, value]`)."
              );
            }
            return true;
          }
          if (captures = /^- *(?:each|for) +([a-zA-Z_$][\w$]*)(?: *, *([a-zA-Z_$][\w$]*))? +of +([^\n]+)/.exec(
            this.input
          )) {
            this.error(
              "MALFORMED_EACH",
              'Pug each and for should not be prefixed with a dash ("-"). They are pug keywords and not part of JavaScript.'
            );
          }
        },
        /**
         * Code.
         */
        code: function() {
          var captures;
          if (captures = /^(!?=|-)[ \t]*([^\n]+)/.exec(this.input)) {
            var flags = captures[1];
            var code = captures[2];
            var shortened = 0;
            if (this.interpolated) {
              var parsed;
              try {
                parsed = characterParser.parseUntil(code, "]");
              } catch (err) {
                if (err.index !== void 0) {
                  this.incrementColumn(captures[0].length - code.length + err.index);
                }
                if (err.code === "CHARACTER_PARSER:END_OF_STRING_REACHED") {
                  this.error(
                    "NO_END_BRACKET",
                    "End of line was reached with no closing bracket for interpolation."
                  );
                } else if (err.code === "CHARACTER_PARSER:MISMATCHED_BRACKET") {
                  this.error("BRACKET_MISMATCH", err.message);
                } else {
                  throw err;
                }
              }
              shortened = code.length - parsed.end;
              code = parsed.src;
            }
            var consumed = captures[0].length - shortened;
            this.consume(consumed);
            var tok = this.tok("code", code);
            tok.mustEscape = flags.charAt(0) === "=";
            tok.buffer = flags.charAt(0) === "=" || flags.charAt(1) === "=";
            this.incrementColumn(captures[0].length - captures[2].length);
            if (tok.buffer) this.assertExpression(code);
            this.tokens.push(tok);
            this.incrementColumn(code.length);
            this.tokEnd(tok);
            return true;
          }
        },
        /**
         * Block code.
         */
        blockCode: function() {
          var tok;
          if (tok = this.scanEndOfLine(/^-/, "blockcode")) {
            this.tokens.push(this.tokEnd(tok));
            this.interpolationAllowed = false;
            this.callLexerFunction("pipelessText");
            return true;
          }
        },
        /**
         * Attribute Name.
         */
        attribute: function(str) {
          var quote = "";
          var quoteRe = /['"]/;
          var key = "";
          var i;
          for (i = 0; i < str.length; i++) {
            if (!this.whitespaceRe.test(str[i])) break;
            if (str[i] === "\n") {
              this.incrementLine(1);
            } else {
              this.incrementColumn(1);
            }
          }
          if (i === str.length) {
            return "";
          }
          var tok = this.tok("attribute");
          if (quoteRe.test(str[i])) {
            quote = str[i];
            this.incrementColumn(1);
            i++;
          }
          for (; i < str.length; i++) {
            if (quote) {
              if (str[i] === quote) {
                this.incrementColumn(1);
                i++;
                break;
              }
            } else {
              if (this.whitespaceRe.test(str[i]) || str[i] === "!" || str[i] === "=" || str[i] === ",") {
                break;
              }
            }
            key += str[i];
            if (str[i] === "\n") {
              this.incrementLine(1);
            } else {
              this.incrementColumn(1);
            }
          }
          tok.name = key;
          var valueResponse = this.attributeValue(str.substr(i));
          if (valueResponse.val) {
            tok.val = valueResponse.val;
            tok.mustEscape = valueResponse.mustEscape;
          } else {
            tok.val = true;
            tok.mustEscape = true;
          }
          str = valueResponse.remainingSource;
          this.tokens.push(this.tokEnd(tok));
          for (i = 0; i < str.length; i++) {
            if (!this.whitespaceRe.test(str[i])) {
              break;
            }
            if (str[i] === "\n") {
              this.incrementLine(1);
            } else {
              this.incrementColumn(1);
            }
          }
          if (str[i] === ",") {
            this.incrementColumn(1);
            i++;
          }
          return str.substr(i);
        },
        /**
         * Attribute Value.
         */
        attributeValue: function(str) {
          var quoteRe = /['"]/;
          var val = "";
          var done, i, x;
          var escapeAttr = true;
          var state = characterParser.defaultState();
          var col = this.colno;
          var line = this.lineno;
          for (i = 0; i < str.length; i++) {
            if (!this.whitespaceRe.test(str[i])) break;
            if (str[i] === "\n") {
              line++;
              col = 1;
            } else {
              col++;
            }
          }
          if (i === str.length) {
            return { remainingSource: str };
          }
          if (str[i] === "!") {
            escapeAttr = false;
            col++;
            i++;
            if (str[i] !== "=")
              this.error(
                "INVALID_KEY_CHARACTER",
                "Unexpected character " + str[i] + " expected `=`"
              );
          }
          if (str[i] !== "=") {
            if (i === 0 && str && !this.whitespaceRe.test(str[0]) && str[0] !== ",") {
              this.error(
                "INVALID_KEY_CHARACTER",
                "Unexpected character " + str[0] + " expected `=`"
              );
            } else {
              return { remainingSource: str };
            }
          }
          this.lineno = line;
          this.colno = col + 1;
          i++;
          for (; i < str.length; i++) {
            if (!this.whitespaceRe.test(str[i])) break;
            if (str[i] === "\n") {
              this.incrementLine(1);
            } else {
              this.incrementColumn(1);
            }
          }
          line = this.lineno;
          col = this.colno;
          for (; i < str.length; i++) {
            if (!(state.isNesting() || state.isString())) {
              if (this.whitespaceRe.test(str[i])) {
                done = false;
                for (x = i; x < str.length; x++) {
                  if (!this.whitespaceRe.test(str[x])) {
                    const isNotPunctuator = !characterParser.isPunctuator(str[x]);
                    const isQuote = quoteRe.test(str[x]);
                    const isColon = str[x] === ":";
                    const isSpreadOperator = str[x] + str[x + 1] + str[x + 2] === "...";
                    if ((isNotPunctuator || isQuote || isColon || isSpreadOperator) && this.assertExpression(val, true)) {
                      done = true;
                    }
                    break;
                  }
                }
                if (done || x === str.length) {
                  break;
                }
              }
              if (str[i] === "," && this.assertExpression(val, true)) {
                break;
              }
            }
            state = characterParser.parseChar(str[i], state);
            val += str[i];
            if (str[i] === "\n") {
              line++;
              col = 1;
            } else {
              col++;
            }
          }
          this.assertExpression(val);
          this.lineno = line;
          this.colno = col;
          return { val, mustEscape: escapeAttr, remainingSource: str.substr(i) };
        },
        /**
         * Attributes.
         */
        attrs: function() {
          var tok;
          if ("(" == this.input.charAt(0)) {
            tok = this.tok("start-attributes");
            var index = this.bracketExpression().end;
            var str = this.input.substr(1, index - 1);
            this.incrementColumn(1);
            this.tokens.push(this.tokEnd(tok));
            this.assertNestingCorrect(str);
            this.consume(index + 1);
            while (str) {
              str = this.attribute(str);
            }
            tok = this.tok("end-attributes");
            this.incrementColumn(1);
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
        },
        /**
         * &attributes block
         */
        attributesBlock: function() {
          if (/^&attributes\b/.test(this.input)) {
            var consumed = 11;
            this.consume(consumed);
            var tok = this.tok("&attributes");
            this.incrementColumn(consumed);
            var args = this.bracketExpression();
            consumed = args.end + 1;
            this.consume(consumed);
            tok.val = args.src;
            this.incrementColumn(consumed);
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
        },
        /**
         * Indent | Outdent | Newline.
         */
        indent: function() {
          var captures = this.scanIndentation();
          var tok;
          if (captures) {
            var indents = captures[1].length;
            this.incrementLine(1);
            this.consume(indents + 1);
            if (" " == this.input[0] || "	" == this.input[0]) {
              this.error(
                "INVALID_INDENTATION",
                "Invalid indentation, you can use tabs or spaces but not both"
              );
            }
            if ("\n" == this.input[0]) {
              this.interpolationAllowed = true;
              return this.tokEnd(this.tok("newline"));
            }
            if (indents < this.indentStack[0]) {
              var outdent_count = 0;
              while (this.indentStack[0] > indents) {
                if (this.indentStack[1] < indents) {
                  this.error(
                    "INCONSISTENT_INDENTATION",
                    "Inconsistent indentation. Expecting either " + this.indentStack[1] + " or " + this.indentStack[0] + " spaces/tabs."
                  );
                }
                outdent_count++;
                this.indentStack.shift();
              }
              while (outdent_count--) {
                this.colno = 1;
                tok = this.tok("outdent");
                this.colno = this.indentStack[0] + 1;
                this.tokens.push(this.tokEnd(tok));
              }
            } else if (indents && indents != this.indentStack[0]) {
              tok = this.tok("indent", indents);
              this.colno = 1 + indents;
              this.tokens.push(this.tokEnd(tok));
              this.indentStack.unshift(indents);
            } else {
              tok = this.tok("newline");
              this.colno = 1 + Math.min(this.indentStack[0] || 0, indents);
              this.tokens.push(this.tokEnd(tok));
            }
            this.interpolationAllowed = true;
            return true;
          }
        },
        pipelessText: function pipelessText(indents) {
          while (this.callLexerFunction("blank")) ;
          var captures = this.scanIndentation();
          indents = indents || captures && captures[1].length;
          if (indents > this.indentStack[0]) {
            this.tokens.push(this.tokEnd(this.tok("start-pipeless-text")));
            var tokens = [];
            var token_indent = [];
            var isMatch;
            var stringPtr = 0;
            do {
              var i = this.input.substr(stringPtr + 1).indexOf("\n");
              if (-1 == i) i = this.input.length - stringPtr - 1;
              var str = this.input.substr(stringPtr + 1, i);
              var lineCaptures = this.indentRe.exec("\n" + str);
              var lineIndents = lineCaptures && lineCaptures[1].length;
              isMatch = lineIndents >= indents;
              token_indent.push(isMatch);
              isMatch = isMatch || !str.trim();
              if (isMatch) {
                stringPtr += str.length + 1;
                tokens.push(str.substr(indents));
              } else if (lineIndents > this.indentStack[0]) {
                this.tokens.pop();
                return pipelessText.call(this, lineCaptures[1].length);
              }
            } while (this.input.length - stringPtr && isMatch);
            this.consume(stringPtr);
            while (this.input.length === 0 && tokens[tokens.length - 1] === "")
              tokens.pop();
            tokens.forEach(
              function(token, i2) {
                var tok;
                this.incrementLine(1);
                if (i2 !== 0) tok = this.tok("newline");
                if (token_indent[i2]) this.incrementColumn(indents);
                if (tok) this.tokens.push(this.tokEnd(tok));
                this.addText("text", token);
              }.bind(this)
            );
            this.tokens.push(this.tokEnd(this.tok("end-pipeless-text")));
            return true;
          }
        },
        /**
         * Slash.
         */
        slash: function() {
          var tok = this.scan(/^\//, "slash");
          if (tok) {
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
        },
        /**
         * ':'
         */
        colon: function() {
          var tok = this.scan(/^: +/, ":");
          if (tok) {
            this.tokens.push(this.tokEnd(tok));
            return true;
          }
        },
        fail: function() {
          this.error(
            "UNEXPECTED_TEXT",
            'unexpected text "' + this.input.substr(0, 5) + '"'
          );
        },
        callLexerFunction: function(func) {
          var rest = [];
          for (var i = 1; i < arguments.length; i++) {
            rest.push(arguments[i]);
          }
          var pluginArgs = [this].concat(rest);
          for (var i = 0; i < this.plugins.length; i++) {
            var plugin = this.plugins[i];
            if (plugin[func] && plugin[func].apply(plugin, pluginArgs)) {
              return true;
            }
          }
          return this[func].apply(this, rest);
        },
        /**
         * Move to the next token
         *
         * @api private
         */
        advance: function() {
          return this.callLexerFunction("blank") || this.callLexerFunction("eos") || this.callLexerFunction("endInterpolation") || this.callLexerFunction("yield") || this.callLexerFunction("doctype") || this.callLexerFunction("interpolation") || this.callLexerFunction("case") || this.callLexerFunction("when") || this.callLexerFunction("default") || this.callLexerFunction("extends") || this.callLexerFunction("append") || this.callLexerFunction("prepend") || this.callLexerFunction("block") || this.callLexerFunction("mixinBlock") || this.callLexerFunction("include") || this.callLexerFunction("mixin") || this.callLexerFunction("call") || this.callLexerFunction("conditional") || this.callLexerFunction("eachOf") || this.callLexerFunction("each") || this.callLexerFunction("while") || this.callLexerFunction("tag") || this.callLexerFunction("filter") || this.callLexerFunction("blockCode") || this.callLexerFunction("code") || this.callLexerFunction("id") || this.callLexerFunction("dot") || this.callLexerFunction("className") || this.callLexerFunction("attrs") || this.callLexerFunction("attributesBlock") || this.callLexerFunction("indent") || this.callLexerFunction("text") || this.callLexerFunction("textHtml") || this.callLexerFunction("comment") || this.callLexerFunction("slash") || this.callLexerFunction("colon") || this.fail();
        },
        /**
         * Return an array of tokens for the current file
         *
         * @returns {Array.<Token>}
         * @api public
         */
        getTokens: function() {
          while (!this.ended) {
            this.callLexerFunction("advance");
          }
          return this.tokens;
        }
      };
    }
  });

  // node_modules/token-stream/index.js
  var require_token_stream = __commonJS({
    "node_modules/token-stream/index.js"(exports, module) {
      "use strict";
      module.exports = TokenStream;
      function TokenStream(tokens) {
        if (!Array.isArray(tokens)) {
          throw new TypeError("tokens must be passed to TokenStream as an array.");
        }
        this._tokens = tokens;
      }
      TokenStream.prototype.lookahead = function(index) {
        if (this._tokens.length <= index) {
          throw new Error("Cannot read past the end of a stream");
        }
        return this._tokens[index];
      };
      TokenStream.prototype.peek = function() {
        if (this._tokens.length === 0) {
          throw new Error("Cannot read past the end of a stream");
        }
        return this._tokens[0];
      };
      TokenStream.prototype.advance = function() {
        if (this._tokens.length === 0) {
          throw new Error("Cannot read past the end of a stream");
        }
        return this._tokens.shift();
      };
      TokenStream.prototype.defer = function(token) {
        this._tokens.unshift(token);
      };
    }
  });

  // node_modules/pug-parser/lib/inline-tags.js
  var require_inline_tags = __commonJS({
    "node_modules/pug-parser/lib/inline-tags.js"(exports, module) {
      "use strict";
      module.exports = [
        "a",
        "abbr",
        "acronym",
        "b",
        "br",
        "code",
        "em",
        "font",
        "i",
        "img",
        "ins",
        "kbd",
        "map",
        "samp",
        "small",
        "span",
        "strong",
        "sub",
        "sup"
      ];
    }
  });

  // node_modules/pug-parser/index.js
  var require_pug_parser = __commonJS({
    "node_modules/pug-parser/index.js"(exports, module) {
      "use strict";
      var assert = require_assert();
      var TokenStream = require_token_stream();
      var error = require_lib();
      var inlineTags = require_inline_tags();
      module.exports = parse;
      module.exports.Parser = Parser;
      function parse(tokens, options) {
        var parser = new Parser(tokens, options);
        var ast = parser.parse();
        return JSON.parse(JSON.stringify(ast));
      }
      function Parser(tokens, options) {
        options = options || {};
        if (!Array.isArray(tokens)) {
          throw new Error(
            'Expected tokens to be an Array but got "' + typeof tokens + '"'
          );
        }
        if (typeof options !== "object") {
          throw new Error(
            'Expected "options" to be an object but got "' + typeof options + '"'
          );
        }
        this.tokens = new TokenStream(tokens);
        this.filename = options.filename;
        this.src = options.src;
        this.inMixin = 0;
        this.plugins = options.plugins || [];
      }
      Parser.prototype = {
        /**
         * Save original constructor
         */
        constructor: Parser,
        error: function(code, message, token) {
          var err = error(code, message, {
            line: token.loc.start.line,
            column: token.loc.start.column,
            filename: this.filename,
            src: this.src
          });
          throw err;
        },
        /**
         * Return the next token object.
         *
         * @return {Object}
         * @api private
         */
        advance: function() {
          return this.tokens.advance();
        },
        /**
         * Single token lookahead.
         *
         * @return {Object}
         * @api private
         */
        peek: function() {
          return this.tokens.peek();
        },
        /**
         * `n` token lookahead.
         *
         * @param {Number} n
         * @return {Object}
         * @api private
         */
        lookahead: function(n) {
          return this.tokens.lookahead(n);
        },
        /**
         * Parse input returning a string of js for evaluation.
         *
         * @return {String}
         * @api public
         */
        parse: function() {
          var block = this.emptyBlock(0);
          while ("eos" != this.peek().type) {
            if ("newline" == this.peek().type) {
              this.advance();
            } else if ("text-html" == this.peek().type) {
              block.nodes = block.nodes.concat(this.parseTextHtml());
            } else {
              var expr = this.parseExpr();
              if (expr) {
                if (expr.type === "Block") {
                  block.nodes = block.nodes.concat(expr.nodes);
                } else {
                  block.nodes.push(expr);
                }
              }
            }
          }
          return block;
        },
        /**
         * Expect the given type, or throw an exception.
         *
         * @param {String} type
         * @api private
         */
        expect: function(type) {
          if (this.peek().type === type) {
            return this.advance();
          } else {
            this.error(
              "INVALID_TOKEN",
              'expected "' + type + '", but got "' + this.peek().type + '"',
              this.peek()
            );
          }
        },
        /**
         * Accept the given `type`.
         *
         * @param {String} type
         * @api private
         */
        accept: function(type) {
          if (this.peek().type === type) {
            return this.advance();
          }
        },
        initBlock: function(line, nodes) {
          if ((line | 0) !== line) throw new Error("`line` is not an integer");
          if (!Array.isArray(nodes)) throw new Error("`nodes` is not an array");
          return {
            type: "Block",
            nodes,
            line,
            filename: this.filename
          };
        },
        emptyBlock: function(line) {
          return this.initBlock(line, []);
        },
        runPlugin: function(context, tok) {
          var rest = [this];
          for (var i = 2; i < arguments.length; i++) {
            rest.push(arguments[i]);
          }
          var pluginContext;
          for (var i = 0; i < this.plugins.length; i++) {
            var plugin = this.plugins[i];
            if (plugin[context] && plugin[context][tok.type]) {
              if (pluginContext)
                throw new Error(
                  "Multiple plugin handlers found for context " + JSON.stringify(context) + ", token type " + JSON.stringify(tok.type)
                );
              pluginContext = plugin[context];
            }
          }
          if (pluginContext)
            return pluginContext[tok.type].apply(pluginContext, rest);
        },
        /**
         *   tag
         * | doctype
         * | mixin
         * | include
         * | filter
         * | comment
         * | text
         * | text-html
         * | dot
         * | each
         * | code
         * | yield
         * | id
         * | class
         * | interpolation
         */
        parseExpr: function() {
          switch (this.peek().type) {
            case "tag":
              return this.parseTag();
            case "mixin":
              return this.parseMixin();
            case "block":
              return this.parseBlock();
            case "mixin-block":
              return this.parseMixinBlock();
            case "case":
              return this.parseCase();
            case "extends":
              return this.parseExtends();
            case "include":
              return this.parseInclude();
            case "doctype":
              return this.parseDoctype();
            case "filter":
              return this.parseFilter();
            case "comment":
              return this.parseComment();
            case "text":
            case "interpolated-code":
            case "start-pug-interpolation":
              return this.parseText({ block: true });
            case "text-html":
              return this.initBlock(this.peek().loc.start.line, this.parseTextHtml());
            case "dot":
              return this.parseDot();
            case "each":
              return this.parseEach();
            case "eachOf":
              return this.parseEachOf();
            case "code":
              return this.parseCode();
            case "blockcode":
              return this.parseBlockCode();
            case "if":
              return this.parseConditional();
            case "while":
              return this.parseWhile();
            case "call":
              return this.parseCall();
            case "interpolation":
              return this.parseInterpolation();
            case "yield":
              return this.parseYield();
            case "id":
            case "class":
              if (!this.peek().loc.start) debugger;
              this.tokens.defer({
                type: "tag",
                val: "div",
                loc: this.peek().loc,
                filename: this.filename
              });
              return this.parseExpr();
            default:
              var pluginResult = this.runPlugin("expressionTokens", this.peek());
              if (pluginResult) return pluginResult;
              this.error(
                "INVALID_TOKEN",
                'unexpected token "' + this.peek().type + '"',
                this.peek()
              );
          }
        },
        parseDot: function() {
          this.advance();
          return this.parseTextBlock();
        },
        /**
         * Text
         */
        parseText: function(options) {
          var tags = [];
          var lineno = this.peek().loc.start.line;
          var nextTok = this.peek();
          loop: while (true) {
            switch (nextTok.type) {
              case "text":
                var tok = this.advance();
                tags.push({
                  type: "Text",
                  val: tok.val,
                  line: tok.loc.start.line,
                  column: tok.loc.start.column,
                  filename: this.filename
                });
                break;
              case "interpolated-code":
                var tok = this.advance();
                tags.push({
                  type: "Code",
                  val: tok.val,
                  buffer: tok.buffer,
                  mustEscape: tok.mustEscape !== false,
                  isInline: true,
                  line: tok.loc.start.line,
                  column: tok.loc.start.column,
                  filename: this.filename
                });
                break;
              case "newline":
                if (!options || !options.block) break loop;
                var tok = this.advance();
                var nextType = this.peek().type;
                if (nextType === "text" || nextType === "interpolated-code") {
                  tags.push({
                    type: "Text",
                    val: "\n",
                    line: tok.loc.start.line,
                    column: tok.loc.start.column,
                    filename: this.filename
                  });
                }
                break;
              case "start-pug-interpolation":
                this.advance();
                tags.push(this.parseExpr());
                this.expect("end-pug-interpolation");
                break;
              default:
                var pluginResult = this.runPlugin("textTokens", nextTok, tags);
                if (pluginResult) break;
                break loop;
            }
            nextTok = this.peek();
          }
          if (tags.length === 1) return tags[0];
          else return this.initBlock(lineno, tags);
        },
        parseTextHtml: function() {
          var nodes = [];
          var currentNode = null;
          loop: while (true) {
            switch (this.peek().type) {
              case "text-html":
                var text = this.advance();
                if (!currentNode) {
                  currentNode = {
                    type: "Text",
                    val: text.val,
                    filename: this.filename,
                    line: text.loc.start.line,
                    column: text.loc.start.column,
                    isHtml: true
                  };
                  nodes.push(currentNode);
                } else {
                  currentNode.val += "\n" + text.val;
                }
                break;
              case "indent":
                var block = this.block();
                block.nodes.forEach(function(node) {
                  if (node.isHtml) {
                    if (!currentNode) {
                      currentNode = node;
                      nodes.push(currentNode);
                    } else {
                      currentNode.val += "\n" + node.val;
                    }
                  } else {
                    currentNode = null;
                    nodes.push(node);
                  }
                });
                break;
              case "code":
                currentNode = null;
                nodes.push(this.parseCode(true));
                break;
              case "newline":
                this.advance();
                break;
              default:
                break loop;
            }
          }
          return nodes;
        },
        /**
         *   ':' expr
         * | block
         */
        parseBlockExpansion: function() {
          var tok = this.accept(":");
          if (tok) {
            var expr = this.parseExpr();
            return expr.type === "Block" ? expr : this.initBlock(tok.loc.start.line, [expr]);
          } else {
            return this.block();
          }
        },
        /**
         * case
         */
        parseCase: function() {
          var tok = this.expect("case");
          var node = {
            type: "Case",
            expr: tok.val,
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
          var block = this.emptyBlock(tok.loc.start.line + 1);
          this.expect("indent");
          while ("outdent" != this.peek().type) {
            switch (this.peek().type) {
              case "comment":
              case "newline":
                this.advance();
                break;
              case "when":
                block.nodes.push(this.parseWhen());
                break;
              case "default":
                block.nodes.push(this.parseDefault());
                break;
              default:
                var pluginResult = this.runPlugin("caseTokens", this.peek(), block);
                if (pluginResult) break;
                this.error(
                  "INVALID_TOKEN",
                  'Unexpected token "' + this.peek().type + '", expected "when", "default" or "newline"',
                  this.peek()
                );
            }
          }
          this.expect("outdent");
          node.block = block;
          return node;
        },
        /**
         * when
         */
        parseWhen: function() {
          var tok = this.expect("when");
          if (this.peek().type !== "newline") {
            return {
              type: "When",
              expr: tok.val,
              block: this.parseBlockExpansion(),
              debug: false,
              line: tok.loc.start.line,
              column: tok.loc.start.column,
              filename: this.filename
            };
          } else {
            return {
              type: "When",
              expr: tok.val,
              debug: false,
              line: tok.loc.start.line,
              column: tok.loc.start.column,
              filename: this.filename
            };
          }
        },
        /**
         * default
         */
        parseDefault: function() {
          var tok = this.expect("default");
          return {
            type: "When",
            expr: "default",
            block: this.parseBlockExpansion(),
            debug: false,
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
        },
        /**
         * code
         */
        parseCode: function(noBlock) {
          var tok = this.expect("code");
          assert(
            typeof tok.mustEscape === "boolean",
            "Please update to the newest version of pug-lexer."
          );
          var node = {
            type: "Code",
            val: tok.val,
            buffer: tok.buffer,
            mustEscape: tok.mustEscape !== false,
            isInline: !!noBlock,
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
          if (node.val.match(/^ *else/)) node.debug = false;
          if (noBlock) return node;
          var block;
          block = "indent" == this.peek().type;
          if (block) {
            if (tok.buffer) {
              this.error(
                "BLOCK_IN_BUFFERED_CODE",
                "Buffered code cannot have a block attached to it",
                this.peek()
              );
            }
            node.block = this.block();
          }
          return node;
        },
        parseConditional: function() {
          var tok = this.expect("if");
          var node = {
            type: "Conditional",
            test: tok.val,
            consequent: this.emptyBlock(tok.loc.start.line),
            alternate: null,
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
          if ("indent" == this.peek().type) {
            node.consequent = this.block();
          }
          var currentNode = node;
          while (true) {
            if (this.peek().type === "newline") {
              this.expect("newline");
            } else if (this.peek().type === "else-if") {
              tok = this.expect("else-if");
              currentNode = currentNode.alternate = {
                type: "Conditional",
                test: tok.val,
                consequent: this.emptyBlock(tok.loc.start.line),
                alternate: null,
                line: tok.loc.start.line,
                column: tok.loc.start.column,
                filename: this.filename
              };
              if ("indent" == this.peek().type) {
                currentNode.consequent = this.block();
              }
            } else if (this.peek().type === "else") {
              this.expect("else");
              if (this.peek().type === "indent") {
                currentNode.alternate = this.block();
              }
              break;
            } else {
              break;
            }
          }
          return node;
        },
        parseWhile: function() {
          var tok = this.expect("while");
          var node = {
            type: "While",
            test: tok.val,
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
          if ("indent" == this.peek().type) {
            node.block = this.block();
          } else {
            node.block = this.emptyBlock(tok.loc.start.line);
          }
          return node;
        },
        /**
         * block code
         */
        parseBlockCode: function() {
          var tok = this.expect("blockcode");
          var line = tok.loc.start.line;
          var column = tok.loc.start.column;
          var body = this.peek();
          var text = "";
          if (body.type === "start-pipeless-text") {
            this.advance();
            while (this.peek().type !== "end-pipeless-text") {
              tok = this.advance();
              switch (tok.type) {
                case "text":
                  text += tok.val;
                  break;
                case "newline":
                  text += "\n";
                  break;
                default:
                  var pluginResult = this.runPlugin("blockCodeTokens", tok, tok);
                  if (pluginResult) {
                    text += pluginResult;
                    break;
                  }
                  this.error(
                    "INVALID_TOKEN",
                    "Unexpected token type: " + tok.type,
                    tok
                  );
              }
            }
            this.advance();
          }
          return {
            type: "Code",
            val: text,
            buffer: false,
            mustEscape: false,
            isInline: false,
            line,
            column,
            filename: this.filename
          };
        },
        /**
         * comment
         */
        parseComment: function() {
          var tok = this.expect("comment");
          var block;
          if (block = this.parseTextBlock()) {
            return {
              type: "BlockComment",
              val: tok.val,
              block,
              buffer: tok.buffer,
              line: tok.loc.start.line,
              column: tok.loc.start.column,
              filename: this.filename
            };
          } else {
            return {
              type: "Comment",
              val: tok.val,
              buffer: tok.buffer,
              line: tok.loc.start.line,
              column: tok.loc.start.column,
              filename: this.filename
            };
          }
        },
        /**
         * doctype
         */
        parseDoctype: function() {
          var tok = this.expect("doctype");
          return {
            type: "Doctype",
            val: tok.val,
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
        },
        parseIncludeFilter: function() {
          var tok = this.expect("filter");
          var attrs = [];
          if (this.peek().type === "start-attributes") {
            attrs = this.attrs();
          }
          return {
            type: "IncludeFilter",
            name: tok.val,
            attrs,
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
        },
        /**
         * filter attrs? text-block
         */
        parseFilter: function() {
          var tok = this.expect("filter");
          var block, attrs = [];
          if (this.peek().type === "start-attributes") {
            attrs = this.attrs();
          }
          if (this.peek().type === "text") {
            var textToken = this.advance();
            block = this.initBlock(textToken.loc.start.line, [
              {
                type: "Text",
                val: textToken.val,
                line: textToken.loc.start.line,
                column: textToken.loc.start.column,
                filename: this.filename
              }
            ]);
          } else if (this.peek().type === "filter") {
            block = this.initBlock(tok.loc.start.line, [this.parseFilter()]);
          } else {
            block = this.parseTextBlock() || this.emptyBlock(tok.loc.start.line);
          }
          return {
            type: "Filter",
            name: tok.val,
            block,
            attrs,
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
        },
        /**
         * each block
         */
        parseEach: function() {
          var tok = this.expect("each");
          var node = {
            type: "Each",
            obj: tok.code,
            val: tok.val,
            key: tok.key,
            block: this.block(),
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
          if (this.peek().type == "else") {
            this.advance();
            node.alternate = this.block();
          }
          return node;
        },
        parseEachOf: function() {
          var tok = this.expect("eachOf");
          var node = {
            type: "EachOf",
            obj: tok.code,
            val: tok.val,
            block: this.block(),
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
          return node;
        },
        /**
         * 'extends' name
         */
        parseExtends: function() {
          var tok = this.expect("extends");
          var path = this.expect("path");
          return {
            type: "Extends",
            file: {
              type: "FileReference",
              path: path.val.trim(),
              line: path.loc.start.line,
              column: path.loc.start.column,
              filename: this.filename
            },
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
        },
        /**
         * 'block' name block
         */
        parseBlock: function() {
          var tok = this.expect("block");
          var node = "indent" == this.peek().type ? this.block() : this.emptyBlock(tok.loc.start.line);
          node.type = "NamedBlock";
          node.name = tok.val.trim();
          node.mode = tok.mode;
          node.line = tok.loc.start.line;
          node.column = tok.loc.start.column;
          return node;
        },
        parseMixinBlock: function() {
          var tok = this.expect("mixin-block");
          if (!this.inMixin) {
            this.error(
              "BLOCK_OUTISDE_MIXIN",
              "Anonymous blocks are not allowed unless they are part of a mixin.",
              tok
            );
          }
          return {
            type: "MixinBlock",
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
        },
        parseYield: function() {
          var tok = this.expect("yield");
          return {
            type: "YieldBlock",
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
        },
        /**
         * include block?
         */
        parseInclude: function() {
          var tok = this.expect("include");
          var node = {
            type: "Include",
            file: {
              type: "FileReference",
              filename: this.filename
            },
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
          var filters = [];
          while (this.peek().type === "filter") {
            filters.push(this.parseIncludeFilter());
          }
          var path = this.expect("path");
          node.file.path = path.val.trim();
          node.file.line = path.loc.start.line;
          node.file.column = path.loc.start.column;
          if ((/\.jade$/.test(node.file.path) || /\.pug$/.test(node.file.path)) && !filters.length) {
            node.block = "indent" == this.peek().type ? this.block() : this.emptyBlock(tok.loc.start.line);
            if (/\.jade$/.test(node.file.path)) {
              console.warn(
                this.filename + ", line " + tok.loc.start.line + ':\nThe .jade extension is deprecated, use .pug for "' + node.file.path + '".'
              );
            }
          } else {
            node.type = "RawInclude";
            node.filters = filters;
            if (this.peek().type === "indent") {
              this.error(
                "RAW_INCLUDE_BLOCK",
                "Raw inclusion cannot contain a block",
                this.peek()
              );
            }
          }
          return node;
        },
        /**
         * call ident block
         */
        parseCall: function() {
          var tok = this.expect("call");
          var name = tok.val;
          var args = tok.args;
          var mixin = {
            type: "Mixin",
            name,
            args,
            block: this.emptyBlock(tok.loc.start.line),
            call: true,
            attrs: [],
            attributeBlocks: [],
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
          this.tag(mixin);
          if (mixin.code) {
            mixin.block.nodes.push(mixin.code);
            delete mixin.code;
          }
          if (mixin.block.nodes.length === 0) mixin.block = null;
          return mixin;
        },
        /**
         * mixin block
         */
        parseMixin: function() {
          var tok = this.expect("mixin");
          var name = tok.val;
          var args = tok.args;
          if ("indent" == this.peek().type) {
            this.inMixin++;
            var mixin = {
              type: "Mixin",
              name,
              args,
              block: this.block(),
              call: false,
              line: tok.loc.start.line,
              column: tok.loc.start.column,
              filename: this.filename
            };
            this.inMixin--;
            return mixin;
          } else {
            this.error(
              "MIXIN_WITHOUT_BODY",
              "Mixin " + name + " declared without body",
              tok
            );
          }
        },
        /**
         * indent (text | newline)* outdent
         */
        parseTextBlock: function() {
          var tok = this.accept("start-pipeless-text");
          if (!tok) return;
          var block = this.emptyBlock(tok.loc.start.line);
          while (this.peek().type !== "end-pipeless-text") {
            var tok = this.advance();
            switch (tok.type) {
              case "text":
                block.nodes.push({
                  type: "Text",
                  val: tok.val,
                  line: tok.loc.start.line,
                  column: tok.loc.start.column,
                  filename: this.filename
                });
                break;
              case "newline":
                block.nodes.push({
                  type: "Text",
                  val: "\n",
                  line: tok.loc.start.line,
                  column: tok.loc.start.column,
                  filename: this.filename
                });
                break;
              case "start-pug-interpolation":
                block.nodes.push(this.parseExpr());
                this.expect("end-pug-interpolation");
                break;
              case "interpolated-code":
                block.nodes.push({
                  type: "Code",
                  val: tok.val,
                  buffer: tok.buffer,
                  mustEscape: tok.mustEscape !== false,
                  isInline: true,
                  line: tok.loc.start.line,
                  column: tok.loc.start.column,
                  filename: this.filename
                });
                break;
              default:
                var pluginResult = this.runPlugin("textBlockTokens", tok, block, tok);
                if (pluginResult) break;
                this.error(
                  "INVALID_TOKEN",
                  "Unexpected token type: " + tok.type,
                  tok
                );
            }
          }
          this.advance();
          return block;
        },
        /**
         * indent expr* outdent
         */
        block: function() {
          var tok = this.expect("indent");
          var block = this.emptyBlock(tok.loc.start.line);
          while ("outdent" != this.peek().type) {
            if ("newline" == this.peek().type) {
              this.advance();
            } else if ("text-html" == this.peek().type) {
              block.nodes = block.nodes.concat(this.parseTextHtml());
            } else {
              var expr = this.parseExpr();
              if (expr.type === "Block") {
                block.nodes = block.nodes.concat(expr.nodes);
              } else {
                block.nodes.push(expr);
              }
            }
          }
          this.expect("outdent");
          return block;
        },
        /**
         * interpolation (attrs | class | id)* (text | code | ':')? newline* block?
         */
        parseInterpolation: function() {
          var tok = this.advance();
          var tag = {
            type: "InterpolatedTag",
            expr: tok.val,
            selfClosing: false,
            block: this.emptyBlock(tok.loc.start.line),
            attrs: [],
            attributeBlocks: [],
            isInline: false,
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
          return this.tag(tag, { selfClosingAllowed: true });
        },
        /**
         * tag (attrs | class | id)* (text | code | ':')? newline* block?
         */
        parseTag: function() {
          var tok = this.advance();
          var tag = {
            type: "Tag",
            name: tok.val,
            selfClosing: false,
            block: this.emptyBlock(tok.loc.start.line),
            attrs: [],
            attributeBlocks: [],
            isInline: inlineTags.indexOf(tok.val) !== -1,
            line: tok.loc.start.line,
            column: tok.loc.start.column,
            filename: this.filename
          };
          return this.tag(tag, { selfClosingAllowed: true });
        },
        /**
         * Parse tag.
         */
        tag: function(tag, options) {
          var seenAttrs = false;
          var attributeNames = [];
          var selfClosingAllowed = options && options.selfClosingAllowed;
          out: while (true) {
            switch (this.peek().type) {
              case "id":
              case "class":
                var tok = this.advance();
                if (tok.type === "id") {
                  if (attributeNames.indexOf("id") !== -1) {
                    this.error(
                      "DUPLICATE_ID",
                      'Duplicate attribute "id" is not allowed.',
                      tok
                    );
                  }
                  attributeNames.push("id");
                }
                tag.attrs.push({
                  name: tok.type,
                  val: "'" + tok.val + "'",
                  line: tok.loc.start.line,
                  column: tok.loc.start.column,
                  filename: this.filename,
                  mustEscape: false
                });
                continue;
              case "start-attributes":
                if (seenAttrs) {
                  console.warn(
                    this.filename + ", line " + this.peek().loc.start.line + ":\nYou should not have pug tags with multiple attributes."
                  );
                }
                seenAttrs = true;
                tag.attrs = tag.attrs.concat(this.attrs(attributeNames));
                continue;
              case "&attributes":
                var tok = this.advance();
                tag.attributeBlocks.push({
                  type: "AttributeBlock",
                  val: tok.val,
                  line: tok.loc.start.line,
                  column: tok.loc.start.column,
                  filename: this.filename
                });
                break;
              default:
                var pluginResult = this.runPlugin(
                  "tagAttributeTokens",
                  this.peek(),
                  tag,
                  attributeNames
                );
                if (pluginResult) break;
                break out;
            }
          }
          if ("dot" == this.peek().type) {
            tag.textOnly = true;
            this.advance();
          }
          switch (this.peek().type) {
            case "text":
            case "interpolated-code":
              var text = this.parseText();
              if (text.type === "Block") {
                tag.block.nodes.push.apply(tag.block.nodes, text.nodes);
              } else {
                tag.block.nodes.push(text);
              }
              break;
            case "code":
              tag.block.nodes.push(this.parseCode(true));
              break;
            case ":":
              this.advance();
              var expr = this.parseExpr();
              tag.block = expr.type === "Block" ? expr : this.initBlock(tag.line, [expr]);
              break;
            case "newline":
            case "indent":
            case "outdent":
            case "eos":
            case "start-pipeless-text":
            case "end-pug-interpolation":
              break;
            case "slash":
              if (selfClosingAllowed) {
                this.advance();
                tag.selfClosing = true;
                break;
              }
            default:
              var pluginResult = this.runPlugin(
                "tagTokens",
                this.peek(),
                tag,
                options
              );
              if (pluginResult) break;
              this.error(
                "INVALID_TOKEN",
                "Unexpected token `" + this.peek().type + "` expected `text`, `interpolated-code`, `code`, `:`" + (selfClosingAllowed ? ", `slash`" : "") + ", `newline` or `eos`",
                this.peek()
              );
          }
          while ("newline" == this.peek().type) this.advance();
          if (tag.textOnly) {
            tag.block = this.parseTextBlock() || this.emptyBlock(tag.line);
          } else if ("indent" == this.peek().type) {
            var block = this.block();
            for (var i = 0, len = block.nodes.length; i < len; ++i) {
              tag.block.nodes.push(block.nodes[i]);
            }
          }
          return tag;
        },
        attrs: function(attributeNames) {
          this.expect("start-attributes");
          var attrs = [];
          var tok = this.advance();
          while (tok.type === "attribute") {
            if (tok.name !== "class" && attributeNames) {
              if (attributeNames.indexOf(tok.name) !== -1) {
                this.error(
                  "DUPLICATE_ATTRIBUTE",
                  'Duplicate attribute "' + tok.name + '" is not allowed.',
                  tok
                );
              }
              attributeNames.push(tok.name);
            }
            attrs.push({
              name: tok.name,
              val: tok.val,
              line: tok.loc.start.line,
              column: tok.loc.start.column,
              filename: this.filename,
              mustEscape: tok.mustEscape !== false
            });
            tok = this.advance();
          }
          this.tokens.defer(tok);
          this.expect("end-attributes");
          return attrs;
        }
      };
    }
  });

  // src/assets/parser-entry.cjs
  var require_parser_entry = __commonJS({
    "src/assets/parser-entry.cjs"() {
      try {
        lexer = require_pug_lexer();
        parser = require_pug_parser();
        self.parserBundle = { lexer, parse: parser };
      } catch (e) {
        self.parserBundle = { lexer: function() {
          throw new Error("Parser bundle init error: " + (e.message || e));
        }, parse: function() {
          throw new Error("Parser bundle init error: " + (e.message || e));
        } };
      }
      var lexer;
      var parser;
    }
  });
  require_parser_entry();
})();
/*! Bundled license information:

assert/build/internal/util/comparisons.js:
  (*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
   * @license  MIT
   *)

object-assign/index.js:
  (*
  object-assign
  (c) Sindre Sorhus
  @license MIT
  *)
*/
