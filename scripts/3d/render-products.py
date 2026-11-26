"""Renderiza los modelos de producto a WebP con fondo transparente (public/img/render).
python3 scripts/3d/render-products.py [outdir] [slug ...]"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright
from PIL import Image

HERE = pathlib.Path(__file__).parent

async def main(outdir, slugs):
  out = pathlib.Path(outdir); out.mkdir(parents=True, exist_ok=True)
  async with async_playwright() as p:
    b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = await b.new_page(viewport={'width': 1600, 'height': 1200})
    pg.on('pageerror', lambda e: print('ERR', e))
    await pg.goto((HERE / 'harness.html').as_uri())
    slugs = slugs or await pg.evaluate('productSlugs()')
    for slug in slugs:
      await pg.evaluate('(s) => renderProduct(s)', slug)
      png = out / f'{slug}.png'
      await pg.locator('#c').screenshot(path=str(png), omit_background=True)
      Image.open(png).convert('RGBA').save(out / f'{slug}.webp', 'WEBP', quality=88, method=6)
      png.unlink()
      print('ok', slug)
    await b.close()

if __name__ == '__main__':
  asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'public/img/render', sys.argv[2:]))
