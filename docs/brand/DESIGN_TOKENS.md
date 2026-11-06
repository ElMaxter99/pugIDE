# Tokens de diseño

Fuente de verdad: [`src/styles.scss`](../../src/styles.scss) (variables CSS en `:root`, tema oscuro por defecto, y `.light-mode`). La mesa «Tokens de diseño» del lienzo ([design/README.md](../../design/README.md)) los muestra **todos**, con sus usos reales y el contraste, y se genera del propio `styles.scss` (`node design/tools/tokens.mjs`). Esta página resume los principales y dice qué pantalla enseña cada cosa.

## Colores principales

| Uso | Variable | Oscuro | Claro |
|---|---|---|---|
| Fondo | `--bg-primary` | `#16111b` | `#f9f9f9` |
| Superficie | `--bg-secondary` | `#231e27` | `#eeeeee` |
| Superficie alta | `--bg-surface-container-high` | `#2e2832` | `#e8e8e8` |
| Campo de entrada | `--bg-input` | `#110c15` | `#ffffff` |
| Texto | `--text-primary` | `#eadfed` | `#1a1c1c` |
| Texto secundario | `--text-secondary` | `#cfc2d6` | `#4d4354` |
| Texto terciario | `--text-tertiary` | `#988d9f` | `#625869` |
| Borde | `--border-color` | `#4d4354` | `#cfc2d6` |
| Acento | `--accent-color` | `#ddb7ff` | `#8127cf` |
| Texto sobre acento | `--text-on-primary` | `#490080` | `#ffffff` |
| Secundario | `--secondary-color` | `#4cd7f6` | `#5e5e5e` |
| Error | `--error-color` | `#ffb4ab` | `#ba1a1a` |
| Aviso | `--warning-color` | `#fabc4e` | `#8a5a00` |
| Éxito | `--success-color` | `#a6e3a1` | `#1b6a20` |

Hay más variables (superficies intermedias, translúcidos de hover/activo/insignia, contenedores, sintaxis del editor de datos, colores por lenguaje): están todas en la mesa «Tokens de diseño».

Reglas: contraste AA (4,5:1 para texto, 3:1 desde 24 px) en los dos temas; los colores que deben distinguirse difieren también en luminosidad, no solo en tono; nunca un color fijo en un componente si existe la variable.

## Tipografía

- Interfaz: **Geist** (`--font-family`), autoalojada y variable. Tamaños de 13–14 px en paneles.
- Código: **JetBrains Mono** (`--font-mono`), autoalojada. 11 px en etiquetas de panel (mayúsculas, 0,05 em), 12 px en terminal y datos, 14 px en el editor.
- La escala de tamaños realmente usada en los componentes está en la mesa de tokens.
- Nota: la página de inicio declara `font-family: 'Geist', sans-serif`, y «Geist» suelto no está cargado (solo `Geist Variable`), de modo que el navegador usa su `sans-serif`; el lienzo reproduce lo que se ve. Conviene usar `var(--font-family)`.

## Radios y espaciado

- `--radius` 0,25 rem (4 px) para botones y campos; `--radius-lg` 0,5 rem (8 px) para tarjetas y avisos; `--radius-xl` 0,75 rem (12 px) para diálogos.
- Espaciado en múltiplos de 4 px (valores frecuentes: 4, 6, 8, 12, 16).
- Medidas del layout: barra superior 64 px, barra lateral 240 px, pestañas 36 px, estado 32 px, panel inferior 240 px.

## Iconos

Material Symbols autoalojados (`npm run fonts:icons` al añadir uno); decorativos con `aria-hidden="true"`. La mesa de tokens enseña los iconos del subconjunto.

## Qué pantalla enseña cada cosa

| Mesa (V-NN) | Tokens y componentes que muestra |
|---|---|
| Tokens de diseño | Todas las variables, contraste, tipografía, radios, espaciado, sombras, iconos |
| Componentes (oscuro/claro) | Botones, campos, pestañas, árbol, avisos, terminal, insignias, diálogos, menú, paleta |
| V-01 / V-05 | Superficies, texto, acento, bordes, tipografía de paneles en los dos temas |
| V-02 / V-25 | `--error-color`, `--error-container`, botones del aviso, lista de problemas |
| V-06 / V-26 | Barra PDF, hoja del preview, sombras |
| V-10 | `--warning-color`, aviso de archivos que faltan |
| V-11 a V-23, V-27 | Diálogos (`--radius-xl`, sombra de 48 px), menú, paleta, aviso de privacidad |
| V-04 / V-24 | Página de inicio: acento, degradado, tipografía grande |

Tabla completa mesa → archivo → componente: [design/README.md](../../design/README.md#mesas).

## Cómo mantener el lienzo fiel

Las mesas fieles son capturas de la app: **no se retocan a mano**, se regeneran. Cuando cambie la UI (en la misma PR):

1. `npm ci && npm run build:prod`.
2. `sh design/tools/all.sh --verify /tmp/mesas` (regenera `design/canvas/`; con `--verify` deja `V-NN.real.png` y `V-NN.mesa.png` por pantalla).
3. Compara cada par: `python3 design/tools/compare.py V-NN.real.png V-NN.mesa.png diff.png`. Debe quedar por debajo de ~1 % de píxeles distintos (el modo PDF ronda 0,6 %). Mira el `diff.png` si sube.
4. Si la pantalla es nueva o tiene un estado nuevo, añade su escena en `design/tools/scenes.mjs` (id `V-NN` siguiente, archivo, tema y acciones) y su fila en `design/tools/layout.mjs`; si hay un componente nuevo, añádelo a `SPECIMENS` en `components.mjs`.
5. Si cambió `src/styles.scss`, `tokens.mjs` ya lo recoge; actualiza la tabla de arriba si cambia un valor principal.
6. Publica los archivos de `design/canvas/` en el lienzo (el mismo artifact) y actualiza la tabla de [design/README.md](../../design/README.md) y el CHANGELOG.
7. Una pantalla nueva se diseña antes en el lienzo (diseño primero) y solo después se programa; al implementarla se sustituye su mesa por la captura real.

Checklist rápida para quien cambia la UI:

- [ ] ¿Cambia el aspecto de alguna pantalla existente? Regenerar y comparar (pasos 1–3).
- [ ] ¿Hay pantalla o estado nuevo? Escena nueva con el siguiente `V-NN`.
- [ ] ¿Hay componente nuevo o con estados nuevos? Añadir a `components.mjs`.
- [ ] ¿Cambió un token? `tokens.mjs` y la tabla de esta página.
- [ ] ¿Texto de pantalla nuevo? En español, con datos realistas.
- [ ] `design/canvas/` copiado al lienzo y README/CHANGELOG actualizados.

## Tokens reservados (sin uso directo hoy)

Definidos en `src/styles.scss` pero sin ningún `var(--…)` en la app: `--accent-hover`, `--bg-close`, `--bg-tertiary`, `--error-container`, `--tertiary-container`, `--info-color`, `--text-on-secondary` y los colores por lenguaje (`--pug-color`, `--scss-color`, `--json-color`, `--js-color`, `--html-color`, `--css-color`). Se conservan como parte de la paleta de roles; si una pantalla nueva necesita uno de ellos, se usa en lugar de inventar un color. Antes de borrar uno, comprobar con `grep -rn -e "--nombre" src` que sigue sin usarse.
