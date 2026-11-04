// Se ejecuta DENTRO de la página (page.evaluate): convierte el DOM renderizado en el marcado de una mesa .dc.html
// (HTML con estilos en línea, sin clases, sin scripts, sin iframes). Debe ser autocontenida.
//
// opts: { rootSelector, width, height, hrefs: [{ sel, href }], isFrame }
// Devuelve { html, placeholderColor, frames: n }; los iframes se dejan como marcas \u0001FRAME:n\u0001 y las
// sustituye capture.mjs con el contenido de cada marco.
export const extractInPage = (opts) => {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const INH = ['color', 'font-family', 'font-size', 'font-style', 'font-weight', 'font-variation-settings', 'font-feature-settings',
    'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-transform', 'text-indent', 'white-space', 'word-break',
    'overflow-wrap', 'visibility', 'list-style-type', 'text-shadow', '-webkit-text-fill-color', 'tab-size', 'color-scheme'];
  const NON = ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'flex-direction', 'flex-wrap', 'flex-grow',
    'flex-shrink', 'flex-basis', 'justify-content', 'align-items', 'align-self', 'align-content', 'row-gap', 'column-gap', 'order',
    'grid-template-columns', 'grid-template-rows', 'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows', 'grid-column-start',
    'grid-column-end', 'grid-row-start', 'grid-row-end', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border-top-width', 'border-top-style', 'border-top-color', 'border-right-width', 'border-right-style', 'border-right-color',
    'border-bottom-width', 'border-bottom-style', 'border-bottom-color', 'border-left-width', 'border-left-style', 'border-left-color',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
    'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-clip',
    'box-shadow', 'opacity', 'overflow-x', 'overflow-y', 'text-overflow', 'text-decoration-line', 'text-decoration-color',
    'vertical-align', 'transform', 'transform-origin', 'filter', 'backdrop-filter', 'mix-blend-mode', 'clip-path', 'object-fit',
    'aspect-ratio', 'appearance', 'float', 'box-sizing', 'outline-style', 'outline-width', 'outline-color', 'outline-offset'];
  const ALL = INH.concat(NON);
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE', 'NOSCRIPT', 'HEAD', 'TITLE', 'OPTION', 'OPTGROUP', 'SOURCE', 'VIDEO', 'AUDIO', 'OBJECT', 'EMBED']);
  const VOID = new Set(['input', 'br', 'hr', 'img', 'wbr']);
  const W = opts.width, H = opts.height;

  // ---------- Referencia: valores por defecto del navegador para cada etiqueta (sin estilos de la app) ----------
  const refCache = new Map(Object.entries(opts.refSeed ?? {}));
  let refFrame = null, rdoc = null, rwin = null;
  if (!opts.refSeed) {
    refFrame = document.createElement('iframe');
    refFrame.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:600px;border:0;visibility:hidden';
    document.body.appendChild(refFrame);
    rdoc = refFrame.contentDocument;
    rdoc.open();
    rdoc.write('<!doctype html><html><head><style>*,*::before,*::after{box-sizing:border-box}body{color:rgb(1,2,3);font-family:serif;font-size:15px;font-style:italic;font-weight:300;line-height:23px;letter-spacing:2px;word-spacing:3px;text-align:right;text-transform:uppercase;text-indent:5px;white-space:break-spaces;word-break:break-all;overflow-wrap:anywhere;list-style-type:square;text-shadow:1px 1px rgb(7,8,9);-webkit-text-fill-color:rgb(4,5,6);tab-size:3;font-feature-settings:"kern" 0;font-variation-settings:"wght" 333;color-scheme:dark}</style></head><body></body></html>');
    rdoc.close();
    rwin = refFrame.contentWindow;
  }
  const refFor = (tag, type, svg) => {
    const key = (svg ? 'svg:' : '') + tag + (type ? ':' + type : '');
    if (refCache.has(key)) return refCache.get(key);
    if (!rdoc) return refCache.get('div');
    const el = svg ? rdoc.createElementNS(SVGNS, tag) : rdoc.createElement(tag);
    if (type) el.setAttribute('type', type);
    if (tag === 'a') el.setAttribute('href', '#');
    rdoc.body.appendChild(el);
    const cs = rwin.getComputedStyle(el);
    const o = {};
    for (const p of ALL) o[p] = cs.getPropertyValue(p);
    el.remove();
    refCache.set(key, o);
    return o;
  };
  if (!opts.refSeed) {
    for (const t of ['div', 'span', 'a', 'button', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'label', 'input', 'textarea', 'select', 'pre', 'code', 'kbd', 'small', 'strong', 'b', 'em', 'i', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'header', 'footer', 'nav', 'main', 'section', 'aside', 'article', 'form', 'fieldset', 'legend', 'dialog', 'hr', 'br', 'sup', 'sub', 'mark', 'u', 's', 'del', 'ins', 'blockquote', 'figure', 'figcaption', 'dl', 'dt', 'dd', 'abbr', 'time', 'samp', 'var', 'q', 'cite', 'caption', 'colgroup', 'col', 'tfoot', 'details', 'summary', 'output', 'progress', 'meter']) refFor(t);
    for (const ty of ['text', 'checkbox', 'radio', 'search', 'number', 'file', 'range', 'color', 'password']) refFor('input', ty);
    for (const t of ['svg', 'path', 'circle', 'rect', 'g', 'line', 'polyline', 'polygon', 'ellipse', 'text']) refFor(t, null, true);
  }
  const divRef = refFor('div');

  // ---------- Utilidades ----------
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{\{/g, '&#123;&#123;');
  const escAttr = (s) => esc(String(s)).replace(/"/g, '&quot;');
  const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0');
  const tidy = (v) => v
    .replace(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/g, (m, r, g, b, a) => (a === undefined || Number(a) === 1 ? `#${hex2(r)}${hex2(g)}${hex2(b)}` : `rgba(${r}, ${g}, ${b}, ${Number(Number(a).toFixed(3))})`))
    .replace(/(-?\d+\.\d{3,})px/g, (m, n) => `${Number(Number(n).toFixed(2))}px`)
    .replace(/"/g, "'");
  // Solo «Geist Variable» y «JetBrains Mono Variable» están cargadas por la app (autoalojadas); un «Geist» suelto no lo está
  // y el navegador pasa al siguiente tipo de la lista. En el lienzo, Google Fonts sirve «Geist» y «JetBrains Mono».
  const fontFam = (v) => {
    if (/Material Symbols/i.test(v)) return "'Material Symbols Outlined'";
    const names = v.split(',').map((x) => x.trim().replace(/^["']|["']$/g, ''));
    const out = [];
    for (const n of names) {
      if (/^(Geist|JetBrains Mono)$/i.test(n)) continue;
      out.push(/Variable$/.test(n) ? n.replace(/ Variable$/, '') : n);
    }
    return out.map((n) => (/[\s]/.test(n) ? `'${n}'` : n)).join(', ');
  };
  const px = (v) => (v && v.endsWith('px') ? parseFloat(v) : NaN);
  const rectOf = (el) => el.getBoundingClientRect();
  const inside = (r, c) => !(r.right <= c.left || r.left >= c.right || r.bottom <= c.top || r.top >= c.bottom);
  const isInlineLevel = (d) => d === 'inline' || d === 'inline-block' || d === 'inline-flex' || d === 'inline-grid';

  let frameCount = 0;
  let placeholderColor = null;
  const hrefEls = new Map();
  for (const { sel, href } of opts.hrefs ?? []) document.querySelectorAll(sel).forEach((e) => hrefEls.set(e, href));

  // ---------- Declaraciones de estilo ----------
  /** Declaraciones (array de «prop:valor») que difieren de lo que daría el navegador por sí solo. */
  function declarations(el, cs, parentCS, outTag, type, opt = {}) {
    const ref = refFor(outTag, type, opt.svg);
    const out = [];
    const push = (p, v) => out.push(`${p}:${v}`);
    const val = (p) => cs.getPropertyValue(p);
    // Heredables: solo lo que no saldría solo de la herencia ni del estilo por defecto de la etiqueta
    for (const p of INH) {
      const raw = val(p);
      const overridden = ref[p] !== divRef[p];
      const parentV = parentCS ? parentCS.getPropertyValue(p) : divRef[p];
      if (overridden) { if (raw === ref[p] && p !== 'font-size') continue; }
      else if (raw === parentV) continue;
      let v = p === 'font-family' ? fontFam(raw) : tidy(raw);
      if ((p === 'font-variation-settings' || p === 'font-feature-settings') && v === 'normal') continue;
      if (p === 'tab-size') continue;
      push(p, v);
    }
    const nonInh = (p) => val(p);
    const same = (p) => nonInh(p) === ref[p];
    const pos = val('position');
    if (!same('display')) push('display', val('display'));
    // Las capas fijas de la app (diálogos, menús) se colocan respecto a la mesa, no a la ventana
    if (!same('position')) push('position', val('position') === 'fixed' ? 'absolute' : val('position') === 'sticky' ? 'relative' : val('position'));
    if (pos !== 'static') {
      for (const s of ['top', 'right', 'bottom', 'left']) {
        const v = val(s);
        if (v === 'auto') continue;
        if (pos === 'relative' && (v === '0px')) continue;
        push(s, tidy(v));
      }
    }
    if (!same('z-index') && val('z-index') !== 'auto') push('z-index', val('z-index'));
    for (const p of ['flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'justify-content', 'align-items', 'align-self', 'align-content', 'order', 'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows', 'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end']) {
      if (!same(p)) push(p, tidy(val(p)));
    }
    const d = val('display');
    if (/grid/.test(d)) {
      if (val('grid-template-columns') !== 'none') push('grid-template-columns', val('grid-template-columns'));
      if (val('grid-template-rows') !== 'none') push('grid-template-rows', val('grid-template-rows'));
    }
    if (/flex|grid/.test(d)) {
      const rg = val('row-gap'), cg = val('column-gap');
      if (rg !== 'normal' || cg !== 'normal') push('gap', rg === cg ? tidy(rg) : `${tidy(rg)} ${tidy(cg)}`);
    }
    for (const p of ['min-width', 'min-height']) if (val(p) !== 'auto' && val(p) !== '0px') push(p, tidy(val(p)));
    for (const p of ['max-width', 'max-height']) if (val(p) !== 'none') push(p, tidy(val(p)));
    // Márgenes y relleno
    const box = (name) => {
      const v = ['top', 'right', 'bottom', 'left'].map((s) => val(`${name}-${s}`));
      const r = ['top', 'right', 'bottom', 'left'].map((s) => ref[`${name}-${s}`]);
      if (v.every((x, i) => x === r[i]) && r.every((x) => x === '0px')) return;
      const vv = v.map(tidy);
      if (vv.every((x) => x === vv[0])) push(name, vv[0]);
      else push(name, vv.join(' '));
    };
    box('margin'); box('padding');
    // Bordes (si la etiqueta trae borde por defecto, como button o input, se anula de forma explícita)
    const sides = ['top', 'right', 'bottom', 'left'];
    const side = (s, from, ref0) => {
      const st = from(`border-${s}-style`), w = from(`border-${s}-width`);
      if (st === 'none' || st === 'hidden' || parseFloat(w) === 0) {
        const rs = ref0(`border-${s}-style`);
        return rs !== 'none' && rs !== 'hidden' && parseFloat(ref0(`border-${s}-width`)) > 0 ? 'none' : null;
      }
      return `${tidy(w)} ${st} ${tidy(from(`border-${s}-color`))}`;
    };
    const bs = sides.map((s) => side(s, val, (p) => ref[p]));
    if (bs.some(Boolean)) {
      if (bs.every((x) => x === bs[0])) push('border', bs[0]);
      else sides.forEach((s, i) => { if (bs[i]) push(`border-${s}`, bs[i]); });
    }
    const rad = ['top-left', 'top-right', 'bottom-right', 'bottom-left'].map((c) => tidy(val(`border-${c}-radius`)));
    if (rad.some((x) => x !== '0px')) push('border-radius', rad.every((x) => x === rad[0]) ? rad[0] : rad.join(' '));
    // Fondo
    const bg = tidy(val('background-color'));
    if (val('background-color') !== ref['background-color']) push('background-color', val('background-color') === 'rgba(0, 0, 0, 0)' ? 'transparent' : bg);
    let bi = val('background-image');
    if (bi !== 'none') {
      if (/url\(/.test(bi)) bi = 'none';
      else { push('background-image', tidy(bi)); for (const p of ['background-size', 'background-position', 'background-repeat']) if (!same(p)) push(p, tidy(val(p))); }
    }
    if (val('background-clip') === 'text') { push('background-clip', 'text'); push('-webkit-background-clip', 'text'); }
    if (val('box-shadow') !== 'none') push('box-shadow', tidy(val('box-shadow')));
    if (val('opacity') !== '1') push('opacity', val('opacity'));
    // Desbordamiento: auto/scroll se dibuja como hidden (las barras de 4 px de la app no se reproducen)
    const ox = val('overflow-x'), oy = val('overflow-y');
    const fix = (o) => (o === 'auto' || o === 'scroll' ? 'hidden' : o);
    if (ox !== 'visible' || oy !== 'visible') {
      if (fix(ox) === fix(oy)) push('overflow', fix(ox));
      else { push('overflow-x', fix(ox)); push('overflow-y', fix(oy)); }
    }
    if (!same('text-overflow')) push('text-overflow', val('text-overflow'));
    if (!same('text-decoration-line')) { push('text-decoration-line', val('text-decoration-line')); push('text-decoration-color', tidy(val('text-decoration-color'))); }
    if (!same('vertical-align')) push('vertical-align', val('vertical-align'));
    if (val('transform') !== 'none') { push('transform', val('transform')); push('transform-origin', val('transform-origin')); }
    for (const p of ['filter', 'backdrop-filter', 'clip-path']) if (val(p) !== 'none') push(p, tidy(val(p)));
    if (val('mix-blend-mode') !== 'normal') push('mix-blend-mode', val('mix-blend-mode'));
    if (val('object-fit') !== 'fill') push('object-fit', val('object-fit'));
    if (val('aspect-ratio') !== 'auto') push('aspect-ratio', val('aspect-ratio'));
    if (!same('appearance') && val('appearance') !== 'none') push('appearance', val('appearance'));
    if (!same('float')) push('float', val('float'));
    if (!same('box-sizing')) push('box-sizing', val('box-sizing'));
    if (val('outline-style') !== 'none' && val('outline-style') !== 'auto' && parseFloat(val('outline-width')) > 0) push('outline', `${tidy(val('outline-width'))} ${val('outline-style')} ${tidy(val('outline-color'))}`);
    return out;
  }

  /** ¿Ocupa el elemento un tamaño que no sale solo del contenido? Prueba a poner width/height: auto. */
  function probeSize(el, rect, tol) {
    const saved = el.getAttribute('style');
    const restore = () => (saved === null ? el.removeAttribute('style') : el.setAttribute('style', saved));
    const diff = (r) => ({ w: Math.abs(r.width - rect.width) > tol.x, h: Math.abs(r.height - rect.height) > tol.y });
    el.style.setProperty('width', 'auto', 'important');
    el.style.setProperty('height', 'auto', 'important');
    const both = diff(rectOf(el));
    if (!both.w && !both.h) { restore(); return { w: false, h: false }; }
    restore();
    el.style.setProperty('width', 'auto', 'important');
    const w = diff(rectOf(el)).w;
    restore();
    el.style.setProperty('height', 'auto', 'important');
    const h = diff(rectOf(el)).h;
    restore();
    return { w, h };
  }

  function attrsOf(el, tag, extra) {
    const o = [];
    const a = (n, v) => { if (v !== null && v !== undefined && v !== '') o.push(` ${n}="${escAttr(v)}"`); };
    for (const n of el.getAttributeNames()) {
      if (n === 'title' || n === 'role' || n === 'placeholder' || n.startsWith('aria-')) a(n, el.getAttribute(n));
    }
    if (tag === 'a') {
      const h = el.getAttribute('data-cap-href') ?? el.getAttribute('href') ?? '#';
      a('href', /^(https?:|mailto:)/.test(h) ? h : '#');
    }
    if (tag === 'button') a('type', 'button');
    if (tag === 'input') {
      const t = el.getAttribute('type') || 'text';
      a('type', t);
      if (t === 'checkbox' || t === 'radio') { if (el.checked) a('checked', 'checked'); a('aria-label', el.getAttribute('aria-label') || el.title || el.parentElement?.textContent?.trim() || t); }
      else { a('value', el.value); if (!el.getAttribute('aria-label') && !el.getAttribute('placeholder')) a('aria-label', el.title || el.name || t); }
      a('readonly', 'readonly');
    }
    if (tag === 'textarea') { a('readonly', 'readonly'); if (!el.getAttribute('aria-label')) a('aria-label', el.title || el.getAttribute('placeholder') || 'texto'); }
    if (tag === 'select' && !el.getAttribute('aria-label') && !el.title) a('aria-label', 'selector');
    if (el.hasAttribute('disabled')) a('disabled', 'disabled');
    if (extra) o.push(extra);
    return o.join('');
  }

  // ---------- SVG ----------
  function serSvg(el, isRoot, parentCS) {
    const cs = getComputedStyle(el);
    const tag = el.localName;
    if (['style', 'script', 'title', 'desc', 'metadata'].includes(tag)) return '';
    let attrs = '';
    for (const n of el.getAttributeNames()) {
      if (n === 'class' || n === 'style' || n.startsWith('_ng') || n.startsWith('ng-') || n.startsWith('data-') || n === 'tabindex') continue;
      attrs += ` ${n}="${escAttr(el.getAttribute(n))}"`;
    }
    const st = [];
    const fill = cs.getPropertyValue('fill'), stroke = cs.getPropertyValue('stroke');
    if (fill) st.push(`fill:${tidy(fill)}`);
    if (stroke && stroke !== 'none') { st.push(`stroke:${tidy(stroke)}`); st.push(`stroke-width:${cs.getPropertyValue('stroke-width')}`); }
    if (cs.getPropertyValue('opacity') !== '1') st.push(`opacity:${cs.getPropertyValue('opacity')}`);
    let inner = '';
    for (const c of el.childNodes) {
      if (c.nodeType === 3) inner += esc(c.nodeValue);
      else if (c.nodeType === 1) inner += serSvg(c, false, cs);
    }
    return `<${tag}${attrs}${st.length ? ` style="${st.join(';')}"` : ''}>${inner}</${tag}>`;
  }

  // ---------- Recorrido ----------
  /** Escala que aplica un transform (matrix(a, b, c, d, e, f)) en cada eje. */
  const scaleOf = (t) => {
    const m = /^matrix\(([^)]+)\)$/.exec(t);
    if (!m) return { x: 1, y: 1 };
    const [a, b, c, d] = m[1].split(',').map(Number);
    return { x: Math.hypot(a, b) || 1, y: Math.hypot(c, d) || 1 };
  };

  function serialize(el, parentCS, clip, shift, fragRoot, scl = { x: 1, y: 1 }) {
    if (SKIP_TAGS.has(el.tagName)) return '';
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return '';
    const rect = rectOf(el);
    const own = scaleOf(cs.transform);
    const total = { x: scl.x * own.x, y: scl.y * own.y };
    const display = cs.display;
    let myClip = clip;
    if (display !== 'contents' && rect.width > 0 && rect.height > 0) {
      if (!inside(rect, clip)) return '';
    }
    const ns = el.namespaceURI === SVGNS;
    let tag = el.localName.toLowerCase();
    const href = hrefEls.get(el);
    if (href) el.setAttribute('data-cap-href', href);
    if (ns && tag === 'svg') {
      // Raíz SVG: estilos de caja generales + contenido
      const decl = declarations(el, cs, parentCS, 'svg', null, { svg: true });
      const wd = Number((rect.width / total.x).toFixed(2)), ht = Number((rect.height / total.y).toFixed(2));
      const fixed = decl.filter((d) => !/^(display:inline)$/.test(d));
      let attrs = '';
      for (const n of el.getAttributeNames()) {
        if (n === 'class' || n === 'style' || n.startsWith('_ng') || n.startsWith('ng-') || n === 'width' || n === 'height' || n === 'tabindex') continue;
        attrs += ` ${n}="${escAttr(el.getAttribute(n))}"`;
      }
      if (!el.hasAttribute('xmlns')) attrs += ' xmlns="http://www.w3.org/2000/svg"';
      if (!el.hasAttribute('aria-hidden') && !el.hasAttribute('role')) attrs += ' aria-hidden="true"';
      let inner = '';
      for (const c of el.childNodes) { if (c.nodeType === 1) inner += serSvg(c, false, cs); else if (c.nodeType === 3 && c.nodeValue.trim()) inner += esc(c.nodeValue); }
      return `<svg${attrs} style="${[...fixed, `width:${wd}px`, `height:${ht}px`, 'flex-shrink:0'].join(';')}">${inner}</svg>`;
    }
    if (ns) return '';
    const type = tag === 'input' ? (el.getAttribute('type') || 'text') : null;
    let outTag = tag;
    let extra = '';
    let placeholderBox = false;
    if (tag.includes('-') || tag === 'body' || tag === 'html') outTag = 'div';
    if (tag === 'img' || tag === 'canvas') { outTag = 'div'; placeholderBox = true; }
    if (tag === 'iframe') outTag = 'div';
    if (tag === 'details' || tag === 'summary') outTag = 'div';
    if (href) outTag = 'a';
    if (tag === 'img') extra = ` role="img" aria-label="${escAttr(el.getAttribute('alt') || 'imagen')}"`;
    if (tag === 'canvas') extra = ' aria-hidden="true"';

    let decl = declarations(el, cs, parentCS, outTag, type);
    // Contenedor desplazado (scrollTop/scrollLeft): se compensa con un desplazamiento relativo de cada hijo
    if (shift && (shift.x || shift.y)) {
      const pos = cs.position;
      if (pos === 'static') { decl.push('position:relative', `top:${shift.y}px`, `left:${shift.x}px`); }
      else if (pos === 'relative') {
        const t = px(cs.top) || 0, l = px(cs.left) || 0;
        decl = decl.filter((d) => !d.startsWith('top:') && !d.startsWith('left:'));
        decl.push(`top:${t + shift.y}px`, `left:${l + shift.x}px`);
      }
    }
    const inMonaco = !!el.closest('.monaco-editor');
    const replaced = ['img', 'canvas', 'iframe', 'svg', 'select'].includes(tag);
    const inline = (display === 'inline' && !replaced) || display === 'contents' || (display.startsWith('table-') && display !== 'table-cell');
    if (!inline && (rect.width > 0 || rect.height > 0)) {
      let sz = { w: false, h: false };
      if (replaced || inMonaco || tag === 'iframe') sz = { w: true, h: true };
      else sz = probeSize(el, rect, { x: 0.6 * total.x, y: 0.6 * total.y });
      const lw = rect.width / total.x, lh = rect.height / total.y;
      if (sz.w) decl.push(`width:${Number(lw.toFixed(2))}px`);
      if (sz.h) decl.push(`height:${Number(lh.toFixed(2))}px`);
      if (tag === 'iframe' && !decl.some((d) => d.startsWith('overflow'))) decl.push('overflow:hidden');
    }
    if (fragRoot) {
      // Pieza suelta: se coloca en flujo y con el tamaño que tiene en la app
      decl = decl.filter((d) => !/^(top|right|bottom|left|z-index|transform|transform-origin|width|height|position):/.test(d));
      decl.push('position:relative', 'flex-shrink:0');
      if (display === 'inline') decl = decl.filter((d) => !d.startsWith('display:')).concat('display:inline-block');
      decl.push(`width:${Number((rect.width / total.x).toFixed(2))}px`, `height:${Number((rect.height / total.y).toFixed(2))}px`);
    }
    if (placeholderBox) { decl.push('background-color:#80808040'); if (display === 'inline') { decl = decl.filter((d) => !d.startsWith('display:')); decl.push('display:inline-block'); } }
    if (tag === 'input' || tag === 'textarea') {
      const ph = getComputedStyle(el, '::placeholder').color;
      if (ph && el.getAttribute('placeholder') && !placeholderColor) placeholderColor = tidy(ph);
    }

    // Contenido
    let inner = '';
    const sx = el.scrollLeft || 0, sy = el.scrollTop || 0;
    const ox = cs.overflowX, oy = cs.overflowY;
    const clips = ox !== 'visible' || oy !== 'visible';
    let childClip = clip;
    if (clips && cs.position !== 'fixed') {
      childClip = { left: Math.max(clip.left, rect.left), top: Math.max(clip.top, rect.top), right: Math.min(clip.right, rect.right), bottom: Math.min(clip.bottom, rect.bottom) };
    }
    if (cs.position === 'absolute' || cs.position === 'fixed') childClip = clips ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : { left: -1e5, top: -1e5, right: 1e5, bottom: 1e5 };
    const childShift = (!inMonaco && (sx || sy)) ? { x: -sx, y: -sy } : null;

    if (tag === 'iframe') {
      const n = frameCount++;
      el.setAttribute('data-cap-frame', String(n));
      inner = `\u0001FRAME:${n}\u0001`;
    } else if (tag === 'select') {
      const o = el.options[el.selectedIndex];
      inner = o ? `<option selected="selected">${esc(o.textContent.trim())}</option>` : '';
    } else if (tag === 'textarea') {
      inner = esc(el.value);
    } else if (!VOID.has(tag) && !placeholderBox) {
      const before = pseudo(el, '::before', cs);
      const after = pseudo(el, '::after', cs);
      inner += before;
      const kids = Array.from(el.childNodes);
      const flexy = /flex|grid/.test(display);
      kids.forEach((c, i) => {
        if (c.nodeType === 3) {
          let t = c.nodeValue;
          const wsMode = cs.whiteSpace;
          if (wsMode === 'normal' || wsMode === 'nowrap' || wsMode === 'pre-line') t = t.replace(/[ \t\r\n\f]+/g, ' ');
          if (/^[ \t\r\n\f]*$/.test(t) && (wsMode === 'normal' || wsMode === 'nowrap')) {
            if (flexy) return;
            const prev = kids[i - 1], next = kids[i + 1];
            const inl = (n) => n && n.nodeType === 1 && isInlineLevel(getComputedStyle(n).display);
            const txt = (n) => n && n.nodeType === 3 && /[^ \t\r\n\f]/.test(n.nodeValue);
            if (!(inl(prev) || inl(next) || txt(prev) || txt(next))) return;
            if (!prev || !next) return;
          }
          inner += esc(t);
        } else if (c.nodeType === 1) {
          if (c.shadowRoot) { /* sin shadow DOM en la app */ }
          inner += serialize(c, cs, childClip, childShift, false, total);
        }
      });
      inner += after;
    }

    const styleAttr = decl.length ? ` style="${escAttr(decl.join(';'))}"` : '';
    const attrs = attrsOf(el, outTag, extra);
    if (VOID.has(outTag)) return `<${outTag}${attrs}${styleAttr}>`;
    return `<${outTag}${attrs}${styleAttr}>${inner}</${outTag}>`;
  }

  function pseudo(el, which, parentCS) {
    const ps = getComputedStyle(el, which);
    const content = ps.content;
    if (!content || content === 'none' || content === 'normal') return '';
    if (ps.display === 'none') return '';
    let text = '';
    const m = content.match(/^"([\s\S]*)"$/);
    if (m) text = m[1].replace(/\\([0-9a-f]{1,6}) ?/gi, (x, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\"/g, '"');
    else if (/^(attr|counter|url|open|close)/.test(content)) { if (/^attr\(/.test(content)) text = el.getAttribute(content.slice(5, -1)) ?? ''; else return ''; }
    const decl = declarations(el, ps, parentCS, 'span', null);
    const w = px(ps.width), h = px(ps.height);
    if (ps.display !== 'inline') { if (!isNaN(w)) decl.push(`width:${w}px`); if (!isNaN(h)) decl.push(`height:${h}px`); }
    return `<span aria-hidden="true"${decl.length ? ` style="${escAttr(decl.join(';'))}"` : ''}>${esc(text)}</span>`;
  }

  // ---------- Raíz ----------
  if (opts.fragment) {
    const el = document.querySelectorAll(opts.fragment.selector)[opts.fragment.nth ?? 0];
    if (!el) return { html: '', missing: true, refs: opts.refSeed ? null : Object.fromEntries(refCache), frames: 0 };
    let fbg = 'transparent';
    for (let n = el.parentElement; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; const alpha = /^rgba\(.*,\s*([\d.]+)\)$/.exec(c); if (c !== 'rgba(0, 0, 0, 0)' && !(alpha && Number(alpha[1]) < 1)) { fbg = tidy(c); break; } }
    const r = el.getBoundingClientRect();
    const html = serialize(el, null, { left: -1e5, top: -1e5, right: 1e5, bottom: 1e5 }, null, true);
    if (refFrame) refFrame.remove();
    return { html, bg: fbg, w: r.width, h: r.height, placeholderColor, frames: frameCount, refs: opts.refSeed ? null : Object.fromEntries(refCache) };
  }
  const rootEl = document.querySelector(opts.rootSelector);
  const bodyCS = getComputedStyle(document.body);
  const htmlCS = getComputedStyle(document.documentElement);
  const bg = htmlCS.backgroundColor !== 'rgba(0, 0, 0, 0)' ? htmlCS.backgroundColor : bodyCS.backgroundColor;
  const rootDecl = [`width:${W}px`, `height:${H}px`, 'overflow:hidden', 'position:relative'];
  rootDecl.push(`background-color:${tidy(bg)}`);
  const clip0 = { left: 0, top: 0, right: W, bottom: H };
  // html y body se dibujan como divs más (con sus márgenes, relleno y desplazamiento) dentro de la ventana de la mesa
  const inner = serialize(document.documentElement, null, clip0, null);
  if (refFrame) refFrame.remove();
  const html = `<div style="${escAttr(rootDecl.join(';'))}">${inner}</div>`;
  return { html, placeholderColor, frames: frameCount, refs: opts.refSeed ? null : Object.fromEntries(refCache) };
};
