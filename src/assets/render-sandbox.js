// pugide-runtime source-hash: a1ecbf8289be43ee
"use strict";
(() => {
  // src/app/core/utils/diagnostics.util.ts
  var AVAILABLE_FILTERS = [":cdata"];
  function explainUnknownFilter(message) {
    const m = /unknown filter "(:?[\w-]+)"/.exec(message);
    if (!m) return message;
    return `${message}

El filtro ${m[1]} no est\xE1 disponible en PugIDE (corre en el navegador, sin paquetes de Node). Disponibles: ${AVAILABLE_FILTERS.join(", ")}.`;
  }

  // src/app/core/utils/helpers.util.ts
  var HELPERS_RE = /^\/helpers(?:\.js|\/.+\.js)$/i;
  function isHelperPath(path) {
    return HELPERS_RE.test(path);
  }
  function helperPaths(files) {
    return [...files].filter(isHelperPath).sort();
  }
  var memo = null;
  function loadHelpers(files) {
    const paths = helperPaths(files.keys());
    if (!paths.length) return { helpers: {}, errors: [] };
    const key = paths.map((p) => `${p}\0${files.get(p) ?? ""}`).join("");
    if (memo?.key === key) return memo.value;
    const helpers = {};
    const errors = [];
    for (const path of paths) {
      const module = { exports: {} };
      try {
        new Function("module", "exports", files.get(path) ?? "")(module, module.exports);
      } catch (err) {
        errors.push({ path, message: describeHelperError(err), line: errorLine(err) });
        continue;
      }
      const out = module.exports;
      if (out !== null && typeof out === "object") Object.assign(helpers, out);
      else errors.push({ path, message: "Exporta un objeto: module.exports = { nombre: funci\xF3n }", line: 1 });
    }
    const value = { helpers, errors };
    memo = { key, value };
    return value;
  }
  function describeHelperError(err) {
    const e = err;
    return `${e.name ?? "Error"}: ${e.message ?? String(err)}`;
  }
  function errorLine(err) {
    const m = /<anonymous>:(\d+):\d+/.exec(err.stack ?? "");
    return m ? Math.max(1, Number(m[1]) - 2) : 1;
  }

  // src/app/core/utils/i18n.util.ts
  var TRANSLATIONS_KEY = "translations";
  var TRANSLATE_FNS = /* @__PURE__ */ new Set(["t", "$t", "__", "_t", "translate", "trans", "gettext", "instant"]);
  var isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  function createTranslator(data) {
    const root = data[TRANSLATIONS_KEY];
    const lookup = (key) => {
      if (!isObj(root)) return key;
      const flat = root[key];
      if (typeof flat === "string" && flat) return flat;
      let cur = root;
      for (const p of key.split(".")) {
        if (isObj(cur) && p in cur) cur = cur[p];
        else return key;
      }
      return typeof cur === "string" && cur ? cur : key;
    };
    return (key, params) => {
      const out = lookup(String(key ?? ""));
      if (!isObj(params)) return out;
      return out.replace(/\{\{?\s*([\w$]+)\s*\}?\}/g, (m, name) => name in params ? String(params[name]) : m);
    };
  }

  // src/app/core/utils/pug-vfs.util.ts
  function dirname(path) {
    const i = path.lastIndexOf("/");
    return i <= 0 ? "/" : path.slice(0, i);
  }
  function normalize(path) {
    const out = [];
    for (const part of path.split("/")) {
      if (part === "" || part === ".") continue;
      if (part === "..") out.pop();
      else out.push(part);
    }
    return "/" + out.join("/");
  }
  function resolveVirtualPath(target, from, files) {
    const base = target.startsWith("/") ? target : normalize(dirname(from ?? "/") + "/" + target);
    const candidates = [base, base + ".pug", base + "/index.pug"];
    for (const c of candidates) {
      if (files.has(c)) return c;
    }
    return null;
  }
  var DIRECTIVE_RE = /^(\s*)(include|extends)(\s+)(['"]?)([^'"\s]+)\4(\s*)$/;
  function normalizeIncludes(code, from, files) {
    if (!code.includes("include") && !code.includes("extends")) return code;
    return code.split("\n").map((line) => {
      const m = line.match(DIRECTIVE_RE);
      if (!m || /\.[A-Za-z0-9]+$/.test(m[5])) return line;
      const found = resolveVirtualPath(m[5], from, files);
      if (!found || !found.endsWith(".pug")) return line;
      return `${m[1]}${m[2]}${m[3]}${m[5]}.pug${m[6]}`;
    }).join("\n");
  }
  function createPugFilePlugin(files) {
    return {
      resolve(filename, source) {
        const found = resolveVirtualPath(filename, source, files);
        if (!found) {
          throw new Error(`Cannot find "${filename}"${source ? ` (included from ${source})` : ""}`);
        }
        return found;
      },
      read(filename) {
        const content = files.get(filename);
        if (content === void 0) throw new Error(`Cannot read "${filename}"`);
        return normalizeIncludes(content, filename, files);
      }
    };
  }

  // src/app/core/render/render-core.ts
  function renderPug(bundle, req) {
    const errors = [];
    const files = req.files ? new Map(req.files) : void 0;
    let html = "";
    try {
      const opts = {
        pretty: true,
        doctype: "html",
        self: false,
        // Los filtros que Pug resuelve con paquetes de Node no existen en el navegador.
        filters: { cdata: (text) => `<![CDATA[${text}]]>` }
      };
      if (req.entryPath) {
        opts["filename"] = req.entryPath;
        opts["basedir"] = "/";
      }
      if (files) opts["plugins"] = [createPugFilePlugin(files)];
      const source = files && req.entryPath ? normalizeIncludes(req.code, req.entryPath, files) : req.code;
      const compiledFn = bundle.compile(source, opts);
      const loaded = files ? loadHelpers(files) : { helpers: {}, errors: [] };
      for (const e of loaded.errors) {
        errors.push({ message: e.message, source: "javascript", path: e.path, line: e.line, severity: "error" });
      }
      const locals = { ...req.data, ...loaded.helpers };
      const translate = createTranslator(req.data);
      const identity = (...args) => args[0] ?? "";
      for (const name of req.functionStubs) {
        const parts = name.split(".");
        const last = parts.pop();
        const fn = TRANSLATE_FNS.has(last) ? translate : identity;
        let holder = locals;
        for (const part of parts) {
          const cur = holder[part];
          holder[part] = { ...cur !== null && typeof cur === "object" ? cur : {} };
          holder = holder[part];
        }
        if (typeof holder[last] !== "function") holder[last] = fn;
      }
      html = compiledFn(locals);
    } catch (err) {
      const error = err;
      errors.push({
        message: explainUnknownFilter(error.message ?? "Compilation error"),
        source: "pug",
        path: error.filename && files?.has(error.filename) ? error.filename : void 0,
        line: error.line,
        column: error.column,
        severity: "error"
      });
    }
    return { html, errors };
  }

  // src/app/core/render/sandbox-entry.ts
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;
    const d = e.data;
    if (!d || d.source !== "pugide-render-req" || typeof d.id !== "number" || !d.req) return;
    const bundle = self.pugBundle;
    const res = bundle ? renderPug(bundle, d.req) : { html: "", errors: [{ message: "Pug compiler not loaded", source: "pug", severity: "error" }] };
    window.parent.postMessage({ source: "pugide-render-res", id: d.id, res }, "*");
  });
  window.parent.postMessage({ source: "pugide-render-ready" }, "*");
})();
