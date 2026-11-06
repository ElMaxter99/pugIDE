// P-01 y P-10: diagnóstico de la app 0.5.1 sobre sus mesas reales, con llamadas numeradas y la evidencia medida.
import { join } from 'node:path';
import { C, FONT, MONO, h, div, span, row, col, p, raw, icon, svg, Kbd, Btn, IconBtn, Badge, PanelLabel, Pin, Zone, Tag, board, root, loadBoard } from './lib.mjs';
import { Head, rich, abs, Card, Legend } from './chrome.mjs';

const realRoot = (file) => { const b = loadBoard(file); return b.serialize(b.rootEl); };
const ruler = (x, w, text) => div({ position: 'absolute', left: x, top: 667, width: w, height: 20, textAlign: 'center', zIndex: 260 }, span({ fontFamily: MONO, fontSize: 11, lineHeight: '18px', fontWeight: 700, background: C.warn, color: C.bg, padding: '1px 8px', borderRadius: 3 }, text));

export function p01(baseDir) {
  const W = 1440;
  const shot = div({ position: 'relative', width: W, height: 900 }, raw(realRoot(join(baseDir, 'V-01-IDE.dc.html'))),
    // anotaciones
    raw(Zone(470, 8, 960, 48)), raw(Pin(1, { left: 452, top: 18 })),
    raw(Zone(1222, 136, 32, 32)), raw(Pin('1', { left: 1196, top: 140 })),
    raw(ruler(85, 70, '240 px')), raw(ruler(448, 70, '487 px')), raw(ruler(854, 70, '325 px')), raw(ruler(1210, 70, '389 px')), raw(Pin(2, { left: 1028, top: 664 })),
    raw(Zone(1052, 64, 388, 107)), raw(Pin(3, { left: 1032, top: 70 })),
    raw(Zone(1083, 328, 325, 203)), raw(Pin(4, { left: 1059, top: 332 })),
    raw(Zone(728, 64, 323, 183)), raw(Pin(5, { left: 706, top: 70 })),
    raw(Zone(2, 690, 1436, 178)), raw(Pin(6, { left: 4, top: 694, background: C.warn })),
    raw(Zone(12, 84, 78, 16)), raw(Zone(741, 70, 36, 14)), raw(Zone(1064, 76, 114, 14)), raw(Pin(7, { left: 94, top: 80 })),
    raw(Zone(1109, 102, 154, 28)), raw(Pin(8, { left: 1267, top: 102 })),
    raw(Zone(1360, 692, 76, 26)), raw(Pin(9, { left: 1334, top: 694 })));
  const cards = [
    { n: 1, t: 'Barra superior', k: 'yes', l: ['**9 controles** (logo y 8 botones): 5 con icono y texto, 2 solo icono, **2 rellenos de color** (Autocompilar y Guardar).', 'El glifo de cámara significa **Instantáneas** en la barra y **Captura PNG** en el preview. Autocompilar es un ajuste con aspecto de botón.'] },
    { n: 2, t: 'Distribución de paneles', k: 'part', l: ['Anchos reales **240 / 487 / 325 / 389 px**: el preview ocupa el 27 % del ancho y el editor el 34 %.', 'Matiz: Workspace y Data **sí** se colapsan (y se recuerda). No hay presets, tiradores ni tamaños guardados. Colapsando Data el preview pasa a 515 px (36 %).'] },
    { n: 3, t: 'Barra del preview', k: 'yes', l: ['Son **3 filas, no 2**: 13 controles ocupan **107 px**, el 17 % de la altura del panel (624 px) antes de ver la hoja.', '**10 de 13** solo con icono; 28×28 px (los de dispositivo, 28×24). En modo PDF se suma una cuarta fila.'] },
    { n: 4, t: 'Preview pequeño', k: 'yes', l: ['La hoja de 1440×900 se ve a «Ajustar 23 %»: **325×203 px = 5 % de la pantalla** (65.975 de 1.296.000 px²).', 'El texto de 14 px del informe queda en 3 px: ilegible sin cambiar el zoom a mano.'] },
    { n: 5, t: 'Panel de datos', k: 'yes', l: ['**14 controles en 5 filas = 183 px**, el 29 % de la altura del panel, antes del primer dato.', '3 acciones en 10 px mono mayúsculas (22 px de alto) y dos selectores «es» idénticos: idioma de los datos y del preview.'] },
    { n: 6, t: 'Terminal', k: 'yes', l: ['**180 px fijos** (20 % del alto) para 6 líneas de las que **1 es accionable** (17 %).', 'El tiempo de compilación sale dos veces: en la terminal («Compiled in 509.2ms») y en la barra de estado («Compilado en 15 ms»).'] },
    { n: 7, t: 'Idiomas y mayúsculas mezclados', k: 'yes', l: ['**18 textos mezclados**: WORKSPACE, DATA, LIVE PREVIEW, Colapsar Data/Workspace, All/Errors/Warnings/Info/Debug, Mobile/Tablet/Desktop/Laptop y 4 mensajes de la terminal.', 'Faltan tildes en títulos: «Movil», «Auditoria». Etiquetas en mono mayúsculas de 10 y 11 px junto a texto normal.'] },
    { n: 8, t: 'Selector de dispositivo contradictorio', k: 'new', l: ['Con **Escritorio** activo y el zoom calculado para 1440 px, el selector muestra **«Mobile (390x844)»** (valor «Mobile»).', 'Medido en el primer uso y con el informe: parece un defecto de enlace entre el control segmentado y el selector; lo corrige P-04.'] },
    { n: 9, t: 'Accesibilidad', k: 'part', l: ['Contraste **correcto** (etiquetas 5,2–9,6:1): refutada. Foco de botones visible (anillo del navegador).', 'Pero: **13 controles de menos de 24 px** en un lado, 48 de 61 de menos de 32 px; `select:focus{outline:none}` deja **6 selectores sin anillo**; 6 botones de solo icono sin aria-label (solo title).'] },
  ];
  const grid = div({ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, width: W - 80 },
    ...cards.map((c) => Card({ n: c.n, title: c.t, tag: Tag(null, c.k), lines: c.l })));
  const H = 1650;
  return { w: W, h: H, body: root(W, H,
    abs(0, 0, W, 112, Head('P-01', 'Diagnóstico de la app actual (0.5.1): la pantalla principal, medida', 'Captura real de la app (1440×900, «Informe trimestral») con una llamada numerada por hallazgo. Las cifras salen de medir el DOM con Playwright sobre el build de producción; cada tarjeta dice si la hipótesis del dueño se confirma, se matiza o se refuta.')),
    abs(0, 112, W, 900, shot),
    abs(40, 1012 + 28, W - 80, 28, Legend()),
    abs(40, 1012 + 28 + 40, W - 80, 700, grid)) };
}

export function p10(baseDir) {
  const W = 1440;
  const shot = div({ position: 'relative', width: W, height: 900 }, raw(realRoot(join(baseDir, 'V-02-Errores.dc.html'))),
    raw(Zone(1052, 172, 388, 161)), raw(Pin(1, { left: 1030, top: 178 })),
    raw(Zone(1052, 333, 388, 158)), raw(Pin(2, { left: 1030, top: 339 })),
    raw(Zone(352, 476, 166, 20)), raw(Zone(712, 380, 14, 20)), raw(Pin(3, { left: 270, top: 476 })),
    raw(Zone(2, 726, 1436, 120)), raw(Pin(4, { left: 300, top: 693 })),
    raw(Zone(14, 873, 106, 22)), raw(Pin(5, { left: 122, top: 872 })),
    raw(Zone(1140, 524, 212, 132)), raw(Pin(6, { left: 1116, top: 528 })));
  const cards = [
    { n: 1, t: 'Aviso rojo del preview', k: 'yes', l: ['Texto y **4 botones** (Ir al error, Crear mixin, Ocultar problemas, Ver terminal) más «Todos los problemas (2)»: **161 px = 31 %** del visor (517 px).', 'La hoja se reduce de 325 a **211 px de ancho (−35 %)**, «Ajustar 15 %».'] },
    { n: 2, t: 'Lista de problemas', k: 'yes', l: ['Vive **dentro del panel de 389 px**: el mensaje se parte cada dos o tres palabras (columna de unos 80 px) y repite el botón de arreglo del aviso.'] },
    { n: 3, t: 'Marcador del editor', k: 'part', l: ['Subrayado en la línea 17 y punto en el margen: es el único sitio donde el error está junto al código. Sí funciona; lo que falta es que abra la explicación.'] },
    { n: 4, t: 'Terminal «Errors»', k: 'yes', l: ['El mismo error otra vez, en inglés y español mezclados («Line 17 - pug_mixins.resumenPie is not a function» y un párrafo largo) con enlace a main.pug:17.'] },
    { n: 5, t: 'Barra de estado', k: 'yes', l: ['«2 errores» abre la **terminal**, no la lista de problemas. **5 sitios** para un mismo problema (aviso, lista, marcador, terminal, estado) y 3 formas de navegar.'] },
    { n: 6, t: 'Qué se pierde al fallar', k: 'new', l: ['Con un error la hoja pasa a **blanco** (211×132 px): se pierde la última vista correcta justo cuando más se necesita para comparar.'] },
    { n: 7, t: 'Paleta Ctrl+K', k: 'yes', l: ['**44 comandos** en 7 grupos en una lista plana: **0 muestran su atajo** (hay 10 documentados), **12 (27 %)** son «Preview: <dispositivo>», se ven 13 sin desplazar y no hay recientes.'] },
    { n: 8, t: 'Primer uso', k: 'yes', l: ['Sin sesión abre «MiProyecto» con «Hola, Mundo»: **0 diálogos, 0 guía**. Las 3 plantillas solo salen con Ctrl+K → escribir → Enter, o Mis proyectos → plantilla → Crear (**3–4 pasos**). Los atajos, solo en un diálogo.'] },
    { n: 9, t: 'Lo que ya funciona (no tocar)', k: 'no', l: ['Colapsar Workspace y Data (persistente), foco visible en botones, contraste AA, «Ir al siguiente problema» en la paleta, 29 escenarios de interfaz, «Crear mixin» como arreglo de un clic. La propuesta los conserva.'] },
  ];
  const grid = div({ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, width: W - 80 },
    ...cards.map((c) => Card({ n: c.n, title: c.t, tag: Tag(null, c.k), lines: c.l })));
  const H = 1620;
  return { w: W, h: H, body: root(W, H,
    abs(0, 0, W, 112, Head('P-10', 'Diagnóstico: errores, terminal, paleta y primer uso', 'Captura real con dos problemas (una mixin que no existe y un JSON de traducciones roto) y, debajo, las mediciones de la paleta y del primer uso. Los números 7 y 8 no tienen llamada: son pantallas que muestran P-06 y P-07.')),
    abs(0, 112, W, 900, shot),
    abs(40, 1012 + 28, W - 80, 28, Legend()),
    abs(40, 1012 + 28 + 40, W - 80, 700, grid)) };
}
