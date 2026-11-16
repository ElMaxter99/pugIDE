# Estado del proyecto

Se actualiza en cada PR (regla en [CLAUDE.md](../CLAUDE.md), «Cómo se informa a la persona responsable»). Última revisión: 2026-11-15.

## Versiones
- **0.8.0**: publicada (tag `v0.8.0` y release de GitHub hechos). La rama `release` ya contiene la 0.8.0 y, por un merge manual, trabajo de la 0.9 hasta la PR 57. Falta, si no se ha hecho, **desplegar `release` en Vercel a mano**.
- **0.9.0**: publicada (tag y release hechos con `release:deploy`).
- **0.9.1**: publicada (doble clic en una plantilla la previsualiza).
- **0.10.0**: publicada (PWA instalable y app de escritorio para Windows, macOS y Linux).
- **0.10.2**: publicada (al cambiar de proyecto se pisaba el archivo del mismo nombre).
- **0.11.0**: publicada, con los 7 instaladores adjuntos. Con ella se prueba el instalador de Windows (pendiente de la persona responsable).
- **0.12.0**: publicada y desplegada (importar archivos y proyecto, logo nuevo).
- **0.13.0**: publicada y desplegada, con los 7 instaladores (asistente de IA, índices fijos en los datos, guía para probar en local).
- **0.14.0**: publicada y desplegada, con sus instaladores y los archivos de actualización. Es la primera que se actualiza sola; desde la 0.13 se llega con «Descargar».
- **0.15.0**: preparada en una PR (versión, CHANGELOG, guía `docs/releases/v0.15.0.md`): diferencias en conflictos, Datos como tabla, autoguardado sin reescribir imágenes, fuentes sin conexión y «Cambios completos». Falta mergearla, lanzar `npm run release:deploy` y desplegar `release` en Vercel. Es la primera que se instala con «Actualizar» desde la 0.14.0.
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

## 0.14 (publicada)
- **Actualizar dentro de la app de escritorio** (P-35 y P-36): mergeado (PR 80). Probado de verdad con un AppImage local. Guía reutilizable en [ACTUALIZAR-ESCRITORIO.md](ACTUALIZAR-ESCRITORIO.md).
- **Palabras prohibidas en el CI, icono de escritorio en los instaladores y versión 0.0.0 desde el código**: mergeado (PR 79). Arreglos de Windows (CRLF, dependencias de escritorio): PR 78.

## 0.15 (preparada)
- **«Cambios completos» en las notas de cada release**: mergeado (PR 82).
- **El autoguardado ya no reescribe las imágenes** (biblioteca con assets aparte): mergeado (PR 83).
- **Ver diferencias en un conflicto** (P-37): mergeado (PR 84), con el arreglo de «Cargar el del disco» en el archivo abierto.
- **La zona de Datos como tabla CLAVE / VALOR** (P-38): mergeado (PR 85), con `playwright-core` 1.65.1 (el CI pasó a Ubuntu 26.04) y las fuentes guardadas por el service worker para que se vean sin conexión.

## En curso: fase 19 (plan aprobado)
- **0.15.1** mantenimiento: mergeado (PR 87).
- **Sesión en IndexedDB** (19.2): en su PR (88).
- **P-39 PDF nativo** (diseño P-39 a P-41 aprobado): PR 89, CI en verde en los tres sistemas.
- **P-40 abrir `.pug` y carpetas con PugIDE**: PR 90 (encima de la 89).
- **P-41 pasar un proyecto a una carpeta**: en su PR (encima de la 90).

## Plan de la fase 19
Plan completo en [PLAN.md](PLAN.md), fase 19:
- **0.15.1** mantenimiento: `eslint` 10 (cierra `npm audit`), parches de Angular, Monaco, Electron.
- **0.16** proyectos grandes (sesión en IndexedDB, PDF con tablas enormes) y escritorio con diseño: PDF nativo (P-39), abrir `.pug` con PugIDE (P-40), mover un proyecto a una carpeta (P-41).
- **0.17** un PDF por plantilla (P-42) y datos desde un endpoint de OpenAPI (P-43).

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
| Preparar `0.9.0` (CHANGELOG, `npm run release:guide -- 0.9.0`) | ✅ publicada |

## Pendiente de la persona responsable
- Mergear la PR de la 0.15.0, lanzar `npm run release:deploy`, desplegar `release` en Vercel y probar «Actualizar» desde la 0.14.0.
- Aprobar el plan de la fase 19.
