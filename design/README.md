# Diseño de la interfaz

PugIDE se diseña **primero en un lienzo** y después se programa. El lienzo es un artifact de claude.ai del tipo *Design (canvas)* (no es Figma): cada pantalla es una mesa (*artboard*), las mesas son interactivas y se enlazan entre sí para recorrerlas como prototipo con Play.

**Lienzo:** [PugIDE · Diseño de la interfaz](https://claude.ai/artifact/3vebTCZF85wwV6fGneyrqM) (privado: solo lo abre quien lo tenga compartido). Es el único lienzo del proyecto: no se crea otro.

## Regla «diseño primero»

Todo cambio en lo que ve el usuario (pantallas, flujos, textos de pantalla) se dibuja antes en el lienzo, se revisa y se aprueba allí. El código implementa lo aprobado; si hay que apartarse del diseño, primero se corrige el lienzo. Lo que no se ve (motor, pruebas, rendimiento, documentación) se programa sin esperar. La regla completa para quien colabora está en [CLAUDE.md](../CLAUDE.md).

## Cómo se trabaja

1. Una mesa por pantalla, con identificador y nombre: `V-01 IDE…`, `V-02 Errores…`. PugIDE es una herramienta de escritorio: las pantallas son páginas fluidas de 1280–1440 px (no hay diseño móvil).
2. La mesa «Tokens de diseño» (`Main.dc.html`) enseña colores, tipografía y radios, sacados de [docs/brand/DESIGN_TOKENS.md](../docs/brand/DESIGN_TOKENS.md) y de `src/styles.scss`. Toda pantalla nueva usa esos tokens.
3. Cada versión va en una fila nueva del lienzo con un título («Versión 0.5») y solo las mesas que cambian.
4. Datos ficticios pero realistas (nada de lorem ipsum). Accesible como se dibuja: contraste AA, botones y enlaces reales (`<button>`, `<a href>`), `aria-label` en los botones solo con icono.
5. Al terminar se pasa el enlace y una lista corta de decisiones por tomar, con recomendación. No se programa la interfaz hasta que esté aprobada.
6. Tras la aprobación, los archivos del lienzo se copian a [`design/canvas/`](canvas) **en la misma PR** que registra el cambio, y se actualiza la tabla de abajo y el CHANGELOG. La PR de código enlaza la mesa que implementa.

## Mesas

| Mesa | Pantalla | Archivo | Estado |
|---|---|---|---|
| Tokens de diseño | Colores, tipografía y radios | [`Main.dc.html`](canvas/Main.dc.html) | Refleja `src/styles.scss` |
| V-01 IDE | Editor, datos y preview PDF con el Workspace | [`V-01-IDE.dc.html`](canvas/V-01-IDE.dc.html) | Refleja la versión 0.5; pendiente de revisión |
| V-02 Errores | Aviso con explicación y arreglo, lista de problemas, terminal enlazada | [`V-02-Errores.dc.html`](canvas/V-02-Errores.dc.html) | Refleja la versión 0.5; pendiente de revisión |

`canvas/canvas.json` es el índice del lienzo (posición, tamaño y título de cada mesa). Los `*.dc.html` son HTML real con un bloque de script de datos de ejemplo; se abren dentro del lienzo, no sueltos en el navegador.

## Pendientes de diseño

Las mesas actuales documentan lo que ya existe (se dibujaron después de implementarlo). Las que faltan por dibujar, antes de programarlas: instantáneas de proyecto con nombre (9.2), pantalla de importación al soltar una carpeta (9.1) y el flujo de CSP/seguridad si cambia algo visible. Ver [docs/PLAN.md](../docs/PLAN.md).
