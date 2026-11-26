"""Galería de capturas para presentar el sitio. python3 scripts/qa/gallery.py <base_url> <outdir>"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright

BASE, OUT = sys.argv[1], pathlib.Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

GO = "([s, o]) => { const el = s ? document.querySelector(s) : null; const y = (el ? el.getBoundingClientRect().top + scrollY : 0) + o; scrollTo(0, y); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }"

DESKTOP = [
  ('/', [
    ('01-portada', None, 0),
    ('02-portada-despiece', None, 1200),
    ('03-empresa', '#empresa', 0),
    ('04-productos', '#productos', 0),
    ('05-bomba', '#en-una-bomba', 0),
    ('06-bomba-despiece', '#en-una-bomba', 760),
    ('07-bomba-sello', '#en-una-bomba', 1250),
    ('08-bomba-protector', '#en-una-bomba', 2050),
    ('09-servicios', '#servicios', 0),
    ('10-reacondicionamiento', '#reacondicionamiento', -120),
    ('11-herramientas', '#herramientas', 0),
    ('12-cobertura', '#cobertura', 0),
    ('13-marcas-y-notas', '#marcas', 0),
    ('14-contacto', '#contacto', 0),
    ('15-pie', 'footer', -300),
  ]),
  ('/productos/sellos-mecanicos', [('20-producto-sellos', None, 0), ('21-producto-sellos-variantes', None, 760)]),
  ('/productos/empaquetaduras', [('22-producto-empaquetaduras', None, 0)]),
  ('/en/products/dry-gas-seals', [('23-en-producto-dgs', None, 0)]),
  ('/en', [('24-en-portada', None, 0)]),
  ('/herramientas', [('25-herramientas', None, 0)]),
  ('/notas/planes-api-entorno-del-sello', [('26-nota-tecnica', None, 0)]),
]
MOBILE = [
  ('/', [('30-movil-portada', None, 0), ('31-movil-despiece', None, 560), ('32-movil-productos', '#productos', 0), ('33-movil-bomba', '#en-una-bomba', 0), ('34-movil-contacto', '#contacto', 0)]),
  ('/productos/sistemas-auxiliares-api', [('35-movil-producto', None, 0)]),
]

async def run(p, pages, mobile):
  b = await p.chromium.launch(args=ARGS)
  vp = {'width': 390, 'height': 844} if mobile else {'width': 1440, 'height': 900}
  ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
  for path, shots in pages:
    pg = await ctx.new_page()
    sep = '&' if '?' in path else '?'
    await pg.goto(BASE + path + sep + 'capture=1', wait_until='networkidle')
    await pg.wait_for_timeout(2500)
    for name, sel, off in shots:
      await pg.evaluate(GO, [sel, off])
      await pg.wait_for_timeout(900)
      await pg.screenshot(path=str(OUT / f'{name}.png'))
      print('ok', name, flush=True)
    if path == '/' and not mobile:
      await pg.evaluate(GO, [None, 0])
      await pg.hover('.nav button')
      await pg.wait_for_timeout(700)
      await pg.screenshot(path=str(OUT / '16-menu-productos.png'))
      print('ok menu', flush=True)
    await pg.close()
  await b.close()

async def main():
  async with async_playwright() as p:
    await run(p, DESKTOP, False)
    await run(p, MOBILE, True)

asyncio.run(main())
