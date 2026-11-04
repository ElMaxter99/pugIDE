// Página de PugIDE que muestra contenido del usuario en una pestaña propia SIN ejecutarlo con los permisos de la
// app: el HTML va en un iframe de origen opaco (sin `allow-same-origin`) que carga `preview-frame.html`
// (documento propio, con su CSP por cabecera) y recibe el HTML por postMessage; las imágenes van en <img>, que
// no ejecuta scripts (un SVG con <script> abierto como documento sí lo haría).
(function () {
  var opener = window.opener;
  if (!opener) { document.body.innerHTML = '<p>Abre esta vista previa desde PugIDE.</p>'; return; }
  var frame = null;
  var pendingHtml = null;
  var html = null;
  // Sin atributo `sandbox` el aislamiento lo da la cabecera `Content-Security-Policy: sandbox` de preview-frame.html; así la
  // navegación del iframe pasa por el service worker (con el atributo no, y sin conexión no cargaría).
  function show(doc, attributeSandbox) {
    html = doc;
    frame = document.createElement('iframe');
    frame.title = 'Vista previa';
    if (attributeSandbox) {
      frame.setAttribute('sandbox', 'allow-scripts allow-modals');
      frame.srcdoc = doc;
    } else {
      pendingHtml = doc;
      frame.src = 'preview-frame.html';
    }
    document.body.replaceChildren(frame);
  }
  window.addEventListener('message', function (e) {
    if (frame && e.source === frame.contentWindow) {
      // El programa del iframe avisa de que puede recibir el documento.
      if (e.data && e.data.source === 'pugide-runtime-ready' && e.data.hasDoc === false && pendingHtml !== null) {
        frame.contentWindow.postMessage({ source: 'pugide-doc', html: pendingHtml }, '*');
        pendingHtml = null;
      } else if (e.data && e.data.source === 'pugide-doc-error' && html !== null) {
        // El documento no es de origen opaco (servidor sin las cabeceras de vercel.json, como `ng serve`): respaldo con
        // el atributo `sandbox`, que da el mismo aislamiento.
        show(html, true);
      }
      return;
    }
    if (e.source !== opener || e.origin !== location.origin) return;
    var d = e.data;
    if (!d) return;
    if (d.kind === 'html' && typeof d.html === 'string') {
      show(d.html, false);
    } else if (d.kind === 'image' && typeof d.url === 'string' && d.url.indexOf('blob:') === 0) {
      var img = new Image();
      img.src = d.url;
      img.alt = '';
      document.body.replaceChildren(img);
    }
  });
  opener.postMessage({ source: 'pugide-host-ready' }, location.origin);
})();
