# Estado del proyecto

Se actualiza en cada PR (regla en [CLAUDE.md](../CLAUDE.md), «Cómo se informa a la persona responsable»). Última revisión: 2026-11-09.

## Versiones
- **0.8.0**: publicada (tag `v0.8.0` y release de GitHub hechos). La rama `release` ya contiene la 0.8.0 y, por un merge manual, trabajo de la 0.9 hasta la PR 57. Falta, si no se ha hecho, **desplegar `release` en Vercel a mano**.
- **0.9.0**: publicada (tag y release hechos con `release:deploy`).
- **0.9.1**: publicada (doble clic en una plantilla la previsualiza).
- **0.10.0**: publicada (PWA instalable y app de escritorio para Windows, macOS y Linux).
- **0.10.1**: preparada en una PR (versión, CHANGELOG, guía `docs/releases/v0.10.1.md`): ejemplos genéricos en las pruebas. Falta mergearla y lanzar `npm run release:deploy`; los instaladores se construyen y adjuntan solos.

## En curso: 0.11
- **PR B** (solo escritorio): espacios de trabajo por cliente (P-26) y aviso de versión nueva (P-27). Programada.
- El instalador de Windows se prueba con la 0.11 (decisión de la persona responsable).

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
