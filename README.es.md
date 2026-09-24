# Agent Lab

**by edudevcol**

[English README](README.md)

Agent Lab es una demo visual de QA. Le das una URL y seis agentes revisan la página cargada en paralelo, recorren el DOM, marcan hallazgos y generan un reporte JSON junto con un reporte HTML legible.

## Requisitos

- Node.js 18 o superior
- Chromium instalado mediante Playwright

## Instalación

```bash
npm install
npm run setup
cp .env.example .env
```

En PowerShell, usa `Copy-Item .env.example .env` en lugar de `cp`.

## Uso

```bash
npm start -- https://www.saucedemo.com
```

El navegador se abre maximizado. Al terminar, los reportes JSON y HTML se abren automáticamente. Los reportes se guardan en `reports/`, que está ignorado por Git.

## Configuración

Copia `.env.example` como `.env`. No subas `.env` ni pongas una API key real en `.env.example`.

| Variable         | Valores                                      | Efecto                                                                  |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| `SPEED`          | Número positivo, por ejemplo `0.5`, `1`, `2` | Ralentiza o acelera la ejecución visual.                                |
| `HEADLESS`       | `true` o `false`                             | Ejecuta con o sin navegador visible.                                    |
| `KEEP_OPEN`      | `true` o `false`                             | Mantiene abierto el navegador después de la auditoría para una demo.    |
| `GEMINI_API_KEY` | Vacía o una clave válida                     | Activa comentarios, calificaciones y prioridades opcionales por agente. |
| `GEMINI_MODEL`   | Nombre de un modelo                          | Selecciona el modelo Gemini para la revisión opcional.                  |

## IA y privacidad

Sin `GEMINI_API_KEY`, los seis agentes locales funcionan normalmente y no se envían datos de la página a un servicio de IA. Con una clave, la auditoría local se ejecuta primero y sus hallazgos se envían a Gemini para obtener comentarios por agente, una calificación de una a cinco estrellas y hasta tres prioridades. Si Gemini no está disponible, el reporte local sigue siendo válido.

## Agentes

| Agente             | Revisa                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------- |
| AC Accesibilidad   | `lang`, `alt` de imágenes, etiquetas de campos, nombres accesibles y encabezados             |
| SE Seguridad       | HTTPS, cabeceras de seguridad, contenido mixto, formularios, scripts externos y clickjacking |
| EN Enlaces         | Enlaces vacíos, inválidos o inaccesibles mediante comprobaciones HTTP reales                 |
| SC SEO y contenido | Título, descripción, viewport, Open Graph y jerarquía de encabezados                         |
| FO Formularios     | Campos de texto, validación de email y botones de envío sin enviar formularios               |
| RE Rendimiento     | Tiempo de carga, transferencia, tamaño de imágenes y carga diferida                          |

## Añadir un agente

Añade un objeto a `AGENTS` en `src/browser/agent-lab.js`. Usa `ag.inspect()` para un hallazgo de elemento y `ag.inspectPage()` para un hallazgo de página. Las severidades son `error`, `warn` y `ok`.

## Alcance y uso responsable

Esta es una demo educativa, no sustituye una auditoría completa de seguridad, accesibilidad, SEO o rendimiento. Ejecútala solo contra sitios propios o autorizados. No navega fuera de la página cargada y el agente de formularios nunca envía formularios.

## Comunidad y licencia

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para las pautas de desarrollo y [SECURITY.md](SECURITY.md) para informar problemas de seguridad. Licencia [MIT](LICENSE).
