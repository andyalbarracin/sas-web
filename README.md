# SAS South America Supplier · sitio web

Sitio institucional y catálogo de SAS con modelos 3D interactivos, versión en inglés, herramientas técnicas (alojamientos de O‑ring y conversor de presión) y un panel para editar el contenido sin tocar código.

Un desarrollo de Zaire Technologies.

## Qué incluye

- **Inicio de una página**: portada 3D (sello cartucho que se desarma al bajar, con el nombre de cada pieza), empresa, índice de las 9 líneas, bomba de proceso que se despieza y recorre las piezas enlazadas a cada línea, servicios, recorrido de reacondicionamiento, herramientas, mapa de cobertura, marcas, notas técnicas y contacto.
- **Una página por línea** con visor 3D que se gira con el mouse o el dedo, foto de catálogo, normas, aplicaciones y variantes.
- **Español e inglés**: `/productos/sellos-mecanicos` ↔ `/en/products/mechanical-seals`.
- **Herramientas técnicas** (`/herramientas`): Zaire Calc con los colores de SAS.
- **Notas técnicas** (`/notas`) editables.
- **Panel `/admin`** con acceso por **enlace mágico por email** (sin contraseñas): logos, secciones, textos, productos, servicios, notas, ubicaciones, marcas, pie, formulario, WhatsApp y bandeja de consultas.
- **Formulario** con Resend: envía cada consulta y la guarda en la bandeja.
- **SEO**: metadatos por página, `hreflang`, `sitemap.xml`, `robots.txt` y redirecciones 301 desde las direcciones del sitio en Wix.
- **Accesibilidad**: teclado, foco visible, contraste AA, respeta «reducir movimiento».

## Puesta en marcha local

Requiere Node 20.9 o superior (ver `.nvmrc`). No hace falta ningún archivo `.env`.

```bash
npm install
npm run dev            # http://localhost:3000
```

- Sitio: `http://localhost:3000` (inglés en `/en`).
- Panel: `http://localhost:3000/admin`. En desarrollo acepta cualquier email y el enlace de acceso aparece en la terminal.
- Lo que se edita en local se guarda en la carpeta `data/` (ignorada por git).

## Almacenamiento (sin base de datos)

| Dónde corre | Dónde guarda |
|---|---|
| Local (`npm run dev`) o servidor propio | carpeta `data/` |
| Vercel | Blob store **privado** de Vercel conectado al proyecto |

El modo se elige solo. En Vercel el disco es de solo lectura y se borra en cada deploy: por eso el panel guarda en el Blob store. Las imágenes subidas se sirven por `/media/...` desde el sitio.

## Documentación

La documentación no está en este repositorio: vive en la carpeta de trabajo, junto a `sas-web/` (`SAS-sitio-web/docs/`). Localmente: [`../docs/`](../docs/README.md).

| Archivo | Contenido |
|---|---|
| `../docs/tecnico/deploy.md` | Publicación en Vercel (con Blob store) + Resend, dominio y DNS |
| `../docs/hardening/README.md` | Estado de seguridad actual y plan (tareas en `checklist.md`) |
| `../docs/tecnico/panel.md` | Guía de uso del panel para SAS |
| `../docs/tecnico/diseno.md` | Decisiones de diseño, 3D e imágenes |
| `../docs/tecnico/handoff-tecnico-sitio-web.md` | Arquitectura, rutas, almacenamiento, variables y deploy |

## Estructura

```
app/
  [lang]/                 sitio público (es en la raíz, en bajo /en; ver proxy.ts)
  admin/                  panel y página de acceso (/admin/acceder)
  api/contact/            formulario → Resend + bandeja
  api/admin/              contenido, imágenes, mensajes, sesión y enlace mágico
  media/[...path]/        imágenes subidas en modo archivo
components/
  site/                   portada 3D, bomba, índice, mapa, formulario, cabecera, pie
  admin/                  panel y campos del editor
lib/
  content/                tipos, contenido inicial (seed) y datos del mapa — sin dependencias de servidor
  server/                 solo servidor: auth, almacenamiento (data/ o Vercel Blob), emails, límites de pedidos
  three/                  modelos 3D procedurales (sello, bomba y las 9 líneas)
  i18n.ts, routes.ts      textos fijos y rutas por idioma
public/                   logos SAS (SVG), renders, fotos de SAS, logos de marcas, Zaire Calc
scripts/
  3d/                     renders de producto
  qa/                     prueba de punta a punta, galería y video
docs/                     README con el enlace a ../../docs/
proxy.ts                  idioma por URL y redirecciones del sitio anterior
```

## Scripts

| Comando | Para qué |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run build` / `npm start` | Producción |
| `npm run typecheck` | Chequeo de tipos |
| `npm run assets:3d` | Regenera `public/img/render` desde los modelos 3D (Python + Playwright) |
| `npm run assets:map` | Regenera el mapa de puntos |
| `npm run qa:e2e` | Prueba de formulario y panel (servidor con `ADMIN_MAGIC_LINK_LOG=1` y su salida en `SAS_LOG`) |
| `npm run qa:gallery` | Capturas de escritorio y celular |

## Variables de entorno

Ninguna es obligatoria en desarrollo. En Vercel: `SITE_URL`, `ADMIN_EMAILS`, `ADMIN_SECRET`, `RESEND_API_KEY`, `MAIL_FROM` (las credenciales del Blob store las agrega Vercel al conectarlo). Ver `.env.example`.
