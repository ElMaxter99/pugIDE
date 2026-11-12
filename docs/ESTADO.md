# Estado del proyecto

Se actualiza en cada PR (regla en [CLAUDE.md](../CLAUDE.md), «Cómo se informa a la persona responsable»). Última revisión: 2026-11-12.

## Versiones
- **0.8.0**: publicada (tag `v0.8.0` y release de GitHub hechos). La rama `release` ya contiene la 0.8.0 y, por un merge manual, trabajo de la 0.9 hasta la PR 57. Falta, si no se ha hecho, **desplegar `release` en Vercel a mano**.
- **0.9.0**: publicada (tag y release hechos con `release:deploy`).
- **0.9.1**: publicada (doble clic en una plantilla la previsualiza).
- **0.10.0**: publicada (PWA instalable y app de escritorio para Windows, macOS y Linux).
- **0.10.2**: publicada (al cambiar de proyecto se pisaba el archivo del mismo nombre).
- **0.11.0**: publicada, con los 7 instaladores adjuntos. Con ella se prueba el instalador de Windows (pendiente de la persona responsable).
- **0.12.0**: publicada y desplegada (importar archivos y proyecto, logo nuevo).
- **0.13.0**: publicada y desplegada, con los 7 instaladores (asistente de IA, índices fijos en los datos, guía para probar en local).
- **0.14.0**: preparada en una PR (versión, CHANGELOG, guía `docs/releases/v0.14.0.md`): actualizar dentro de la app de escritorio, palabras prohibidas en el CI, icono en los instaladores y arreglos de `start:desktop` en Windows. Falta mergearla, lanzar `npm run release:deploy` y desplegar `release` en Vercel. Es la primera que se actualiza sola; desde la 0.13 se llega con «Descargar».
- **0.10.1**: publicada. Antes: preparada en una PR (versión, CHANGELOG, guía `docs/releases/v0.10.1.md`): ejemplos genéricos en las pruebas. Falta mergearla y lanzar `npm run release:deploy`; los instaladores se construyen y adjuntan solos.

## 0.11 (publicada)
- **PR A** (web, PWA y escritorio): exportar para correo (P-23), varias páginas (P-24) y plantillas propias (P-25). Mergeada.
- **PR B** (solo escritorio): espacios de trabajo por cliente (P-26) y aviso de versión nueva (P-27). Mergeada.
- El instalador de Windows se prueba con la 0.11 (decisión de la persona responsable).

## 0.12 (publicada)
- **Importar archivos e importar proyecto** (P-28 y P-29): diseño aprobado, programado y mergeado (PR 71). «Importar archivos» añade al proyecto abierto; «Importar proyecto» está en «Mis proyectos» y crea uno nuevo.
- **Logo nuevo**: propuesta D («Mensajero», el pug con la hoja en la boca; mesa L-01), mergeada (PR 72; SVG, favicon, iconos de la PWA, Apple, Android, Windows y escritorio; `npm run brand:icons`).

## 0.13 (publicada)
- **Índices fijos en los datos** (`productos[1].name`): mergeado (PR 74).
- **Asistente de IA** (P-30 a P-34, solo escritorio y local con las CLI `claude`/`copilot`): mergeado (PR 75). Para probarlo a mano: [PROBAR-EN-LOCAL.md](PROBAR-EN-LOCAL.md).
- **`npm run start:desktop` / `test:desktop`** y la batería de pruebas en local: mergeado (PR 76).

## 0.14 (preparada)
- **Actualizar dentro de la app de escritorio** (P-35 y P-36): mergeado (PR 80). Probado de verdad con un AppImage local. Guía reutilizable en [ACTUALIZAR-ESCRITORIO.md](ACTUALIZAR-ESCRITORIO.md).
- **Palabras prohibidas en el CI, icono de escritorio en los instaladores y versión 0.0.0 desde el código**: mergeado (PR 79). Arreglos de Windows (CRLF, dependencias de escritorio): PR 78.

## Propuesta en estudio
- **PugIDE de escritorio** (Windows, macOS, Linux): fases 0–2 hechas en la PR que lo trae (PWA instalable, Electron, empaquetado y CI; sin firma, gratis). Guía para instalar en [INSTALAR.md](INSTALAR.md), detalle en [ESCRITORIO.md](ESCRITORIO.md). Siguiente: aviso de versión nueva (diseño primero) y espacios por cliente.

## Plan 0.9
| Pieza | Estado |
|---|---|
| P-15 / P-16 compartir con opciones y abrir como proyecto nuevo | ✅ en master |
| P-17 visor de JSON en árbol | ✅ en master |
| P-18 renombrar y borrar carpetas | ✅ en master |
| P-19 ventana baja / zoom 200 % | ✅ en master |
| P-20 botones de «Problemas» | ✅ en master |
| Claves de traducción calculadas | ✅ en master |
| `npm run release:deploy` (un solo comando) | ✅ en master (arreglo de «release ya adelantada»: PR 59, mergeada) |
| P-21 tema Automático/Oscuro/Claro, enlaces de salto, F6 | ✅ en master (PR 60) |
| P-22 idioma por defecto y de reserva (sin plurales automáticos) | ✅ en master (PR 60) |
| Preparar `0.9.0` (CHANGELOG, `npm run release:guide -- 0.9.0`) | 🔄 en su PR |

## Pendiente de la persona responsable
- Mergear la PR de la 0.10.1.
- Después, desde la carpeta del proyecto: `npm run release:deploy`, comprobar que el flujo «Escritorio» adjunta los instaladores, y desplegar `release` en Vercel a mano.
- Probar el instalador de Windows (y, si hay quien tenga Mac, el de macOS).
