# Tokens de diseño

Fuente de verdad: [`src/styles.scss`](../../src/styles.scss) (variables CSS en `:root`, tema oscuro por defecto, y `.light-mode`). Esta página resume los principales; la mesa «Tokens de diseño» del lienzo ([design/README.md](../../design/README.md)) los muestra dibujados. Si cambian, se actualizan los tres sitios en el mismo PR.

## Colores

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

Reglas: contraste AA (4,5:1 para texto, 3:1 desde 24 px) en los dos temas; los colores que deben distinguirse difieren también en luminosidad, no solo en tono; nunca un color fijo en un componente si existe la variable.

## Tipografía

- Interfaz: **Geist** (`--font-family`), autoalojada. 13 px en paneles; 18–22 px en títulos de diálogo.
- Código: **JetBrains Mono** (`--font-mono`), autoalojada. 13 px en el editor, 12 px en terminal y datos.

## Radios y espaciado

- `--radius` 0,25 rem (4 px) para botones y campos; `--radius-lg` 0,5 rem (8 px) para tarjetas y avisos; `--radius-xl` 0,75 rem (12 px) para diálogos.
- Espaciado en múltiplos de 4 px (8 / 12 / 16 / 24).
- Objetivos táctiles/clic: botones de al menos 32 px de alto en barras densas; 44 px en diálogos.

## Iconos

Material Symbols autoalojados (`npm run fonts:icons` al añadir uno); decorativos con `aria-hidden="true"`.
