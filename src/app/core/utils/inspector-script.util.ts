/**
 * Injects a `data-pugide-line="N"` attribute into every opening tag, where N
 * is the 1-based line number of that tag in the given HTML string. This is
 * the line of the *served HTML*, not the original .pug source — mapping back
 * to the .pug source would require instrumenting the Pug compiler itself.
 */
export function annotateHtmlLines(html: string): string {
  const tagOpenRe = /<([a-zA-Z][a-zA-Z0-9-]*)([\s>])/g;
  let result = '';
  let lastIndex = 0;
  let line = 1;
  let match: RegExpExecArray | null;

  while ((match = tagOpenRe.exec(html)) !== null) {
    const segment = html.slice(lastIndex, match.index);
    line += countNewlines(segment);
    result += segment;
    result += `<${match[1]} data-pugide-line="${line}"${match[2]}`;
    lastIndex = match.index + match[0].length;
  }
  result += html.slice(lastIndex);
  return result;
}

function countNewlines(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === '\n') n++;
  return n;
}


/**
 * Script injected into every compiled preview document (String.raw: regex
 * backslashes below are literal; never use backticks or dollar-brace in it).
 *
 * Stays passive until the parent posts messages:
 *  - `pugide-inspector-toggle` {active}: hover highlight + click reports the
 *    element (tag, attrs, html line, id/classes/ordinal signature) via postMessage.
 *  - `pugide-color-scheme` {scheme: 'light'|'dark'|null}: simulates
 *    prefers-color-scheme by rewriting @media rules and window.matchMedia.
 *  - `pugide-a11y-run`: runs a lightweight accessibility audit and replies
 *    with `pugide-a11y` {issues}.
 */
export const INSPECTOR_SCRIPT = String.raw`(function () {
  var active = false;
  var overlay = null;
  var scheme = null;
  var origMedia = new WeakMap();
  var fakeMQLs = [];
  var origMatchMedia = window.matchMedia ? window.matchMedia.bind(window) : null;

  function ensureOverlay() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.setAttribute('data-pugide-overlay', '');
      overlay.style.cssText = 'position:absolute;pointer-events:none;background:rgba(99,102,241,0.25);border:1px solid #6366f1;z-index:2147483647;display:none;box-sizing:border-box;';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  /* ---------- prefers-color-scheme simulation ---------- */
  var SCHEME_RE = /\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)/g;

  function rewriteRules(rules) {
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.media && rule.media.mediaText !== undefined) {
        var text = rule.media.mediaText;
        if (origMedia.has(rule) || /prefers-color-scheme/.test(text)) {
          if (!origMedia.has(rule)) origMedia.set(rule, text);
          var orig = origMedia.get(rule);
          rule.media.mediaText = scheme
            ? orig.replace(SCHEME_RE, function (m, v) { return v === scheme ? '(min-width: 0px)' : '(max-width: -1px)'; })
            : orig;
        }
      }
      try { if (rule.cssRules) rewriteRules(rule.cssRules); } catch (e) {}
    }
  }

  function applyScheme() {
    for (var i = 0; i < document.styleSheets.length; i++) {
      try { rewriteRules(document.styleSheets[i].cssRules); } catch (e) { /* cross-origin sheet */ }
    }
    document.documentElement.style.colorScheme = scheme || '';
    for (var j = 0; j < fakeMQLs.length; j++) fakeMQLs[j].refresh();
  }

  if (origMatchMedia) {
    window.matchMedia = function (query) {
      var m = /prefers-color-scheme\s*:\s*(dark|light)/.exec(query);
      if (!m) return origMatchMedia(query);
      var want = m[1];
      var listeners = [];
      var mql = {
        media: query,
        matches: scheme ? scheme === want : origMatchMedia(query).matches,
        onchange: null,
        addEventListener: function (t, fn) { if (t === 'change') listeners.push(fn); },
        removeEventListener: function (t, fn) { listeners = listeners.filter(function (l) { return l !== fn; }); },
        addListener: function (fn) { listeners.push(fn); },
        removeListener: function (fn) { listeners = listeners.filter(function (l) { return l !== fn; }); },
        dispatchEvent: function () { return true; },
        refresh: function () {
          var next = scheme ? scheme === want : origMatchMedia(query).matches;
          if (next === mql.matches) return;
          mql.matches = next;
          var ev = { matches: next, media: query };
          if (typeof mql.onchange === 'function') mql.onchange(ev);
          listeners.slice().forEach(function (l) { l(ev); });
        }
      };
      fakeMQLs.push(mql);
      return mql;
    };
  }

  /* ---------- element signature (for Pug source mapping) ---------- */
  function classesOf(el) {
    return Array.prototype.slice.call(el.classList).sort();
  }

  function signatureOf(el) {
    var tag = el.tagName.toLowerCase();
    var id = el.id || '';
    var key = classesOf(el).join(' ');
    var all = document.getElementsByTagName(tag);
    var ordinal = 0, total = 0;
    for (var i = 0; i < all.length; i++) {
      var o = all[i];
      if (o.hasAttribute('data-pugide-overlay')) continue;
      if ((o.id || '') === id && classesOf(o).join(' ') === key) {
        if (o === el) ordinal = total;
        total++;
      }
    }
    return { tag: tag, id: id || undefined, classes: classesOf(el), ordinal: ordinal, total: total };
  }

  /* ---------- accessibility audit ---------- */
  function parseColor(str) {
    var m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(str || '');
    if (!m) return null;
    var a = m[4] === undefined ? 1 : (m[4].slice(-1) === '%' ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    return { r: +m[1], g: +m[2], b: +m[3], a: a };
  }
  function blend(fg, bg) {
    var a = fg.a;
    return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
  }
  function lum(c) {
    function ch(v) { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }
  function ratio(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  /* Effective background; null when an ancestor has a background image/gradient (cannot be judged). */
  function backgroundOf(el) {
    var layers = [];
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      var c = parseColor(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    var out = { r: 255, g: 255, b: 255, a: 1 };
    for (var i = layers.length - 1; i >= 0; i--) out = blend(layers[i], out);
    return out;
  }
  function hasOwnText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.replace(/\s+/g, '') !== '') return true;
    }
    return false;
  }
  function visible(el) {
    var cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0;
  }
  function textOf(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function describe(el) {
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.classList.length) s += '.' + Array.prototype.slice.call(el.classList).join('.');
    return s;
  }
  function accessibleName(el) {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
    var lb = el.getAttribute('aria-labelledby');
    if (lb) {
      var t = lb.split(/\s+/).map(function (id) { var r = document.getElementById(id); return r ? textOf(r) : ''; }).join(' ').trim();
      if (t) return t;
    }
    if (el.getAttribute('title')) return el.getAttribute('title').trim();
    return textOf(el) || (el.querySelector('img[alt]:not([alt=""])') ? 'img' : '');
  }

  function audit() {
    var issues = [];
    function add(rule, severity, el, message) {
      var line = el.getAttribute('data-pugide-line');
      issues.push({
        rule: rule, severity: severity, message: message, element: describe(el),
        htmlLine: line ? parseInt(line, 10) : undefined, sig: signatureOf(el)
      });
    }
    var all = document.body ? document.body.querySelectorAll('*') : [];
    var root = document.documentElement;

    if (!root.getAttribute('lang')) add('lang', 'warning', root, 'El elemento html no tiene atributo lang');
    if (!document.title || !document.title.trim()) add('title', 'warning', document.head || root, 'El documento no tiene title');

    // images
    Array.prototype.forEach.call(document.querySelectorAll('img'), function (img) {
      if (!img.hasAttribute('alt')) add('img-alt', 'error', img, 'Imagen sin atributo alt (usa alt="" si es decorativa)');
    });
    Array.prototype.forEach.call(document.querySelectorAll('area[href]'), function (a) {
      if (!a.getAttribute('alt')) add('area-alt', 'error', a, 'area sin alt');
    });

    // form controls
    Array.prototype.forEach.call(document.querySelectorAll('input, select, textarea'), function (c) {
      var type = (c.getAttribute('type') || '').toLowerCase();
      if (c.tagName === 'INPUT' && (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset' || type === 'image')) return;
      var named = c.getAttribute('aria-label') || c.getAttribute('aria-labelledby') || c.getAttribute('title');
      if (!named && c.id && document.querySelector('label[for="' + c.id.replace(/"/g, '') + '"]')) named = 'x';
      if (!named && c.closest('label')) named = 'x';
      if (!named) add('label', 'error', c, 'Campo de formulario sin label asociado');
    });

    // names for buttons and links
    Array.prototype.forEach.call(document.querySelectorAll('button, a[href], [role="button"]'), function (b) {
      if (!accessibleName(b)) add('name', 'error', b, b.tagName === 'A' ? 'Enlace sin texto accesible' : 'Boton sin texto accesible');
    });

    // headings
    var headings = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    var h1s = headings.filter(function (h) { return h.tagName === 'H1'; });
    if (headings.length && h1s.length === 0) add('h1-missing', 'warning', headings[0], 'La pagina no tiene ningun h1');
    if (h1s.length > 1) add('h1-multiple', 'warning', h1s[1], 'Hay ' + h1s.length + ' h1; lo habitual es uno solo');
    var prev = 0;
    headings.forEach(function (h) {
      var lvl = parseInt(h.tagName.charAt(1), 10);
      if (!textOf(h)) add('heading-empty', 'warning', h, 'Encabezado vacio');
      if (prev && lvl > prev + 1) add('heading-skip', 'warning', h, 'Salto de nivel de encabezado: h' + prev + ' a h' + lvl);
      prev = lvl;
    });

    // contrast (WCAG AA)
    var seen = 0;
    for (var i = 0; i < all.length && seen < 40; i++) {
      var el = all[i];
      if (el.hasAttribute('data-pugide-overlay') || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      if (!hasOwnText(el) || !visible(el)) continue;
      var cs = getComputedStyle(el);
      var fg = parseColor(cs.color);
      var bg = backgroundOf(el);
      if (!fg || !bg) continue;
      var op = parseFloat(cs.opacity);
      if (fg.a < 1) fg = blend(fg, bg);
      if (op < 1) fg = blend({ r: fg.r, g: fg.g, b: fg.b, a: op }, bg);
      var size = parseFloat(cs.fontSize);
      var bold = parseInt(cs.fontWeight, 10) >= 700;
      var large = size >= 24 || (bold && size >= 18.66);
      var min = large ? 3 : 4.5;
      var r = ratio(fg, bg);
      if (r < min) {
        seen++;
        add('contrast', 'warning', el, 'Contraste ' + r.toFixed(2) + ':1 insuficiente (minimo ' + min + ':1): "' + textOf(el).slice(0, 30) + '"');
      }
    }
    return issues;
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d) return;
    if (d.source === 'pugide-inspector-toggle') {
      active = !!d.active;
      document.documentElement.style.cursor = active ? 'crosshair' : '';
      if (!active && overlay) overlay.style.display = 'none';
    } else if (d.source === 'pugide-color-scheme') {
      scheme = d.scheme === 'dark' || d.scheme === 'light' ? d.scheme : null;
      applyScheme();
    } else if (d.source === 'pugide-a11y-run') {
      var issues = [];
      try { issues = audit(); } catch (err) { issues = [{ rule: 'audit-error', severity: 'warning', message: String(err), element: '' }]; }
      parent.postMessage({ source: 'pugide-a11y', issues: issues }, '*');
    }
  });

  document.addEventListener('mouseover', function (e) {
    if (!active) return;
    var el = e.target;
    if (!(el instanceof Element)) return;
    var r = el.getBoundingClientRect();
    var ov = ensureOverlay();
    ov.style.display = 'block';
    ov.style.left = (r.left + window.scrollX) + 'px';
    ov.style.top = (r.top + window.scrollY) + 'px';
    ov.style.width = r.width + 'px';
    ov.style.height = r.height + 'px';
  }, true);

  document.addEventListener('click', function (e) {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    if (!(el instanceof Element)) return;
    var attrs = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name !== 'data-pugide-line') attrs[a.name] = a.value;
    }
    var line = el.getAttribute('data-pugide-line');
    parent.postMessage({
      source: 'pugide-inspector',
      tagName: el.tagName.toLowerCase(),
      attrs: attrs,
      htmlLine: line ? parseInt(line, 10) : undefined,
      sig: signatureOf(el)
    }, '*');
  }, true);
})();`;
