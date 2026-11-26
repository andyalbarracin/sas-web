"""Capturas de QA del sitio. python3 scripts/qa/shots.py <base_url> <outdir> [desktop|mobile] [path] [scrolls...]
Cada scroll es una posición en px (o 'sel:#id' para ir a un ancla). Captura el viewport en cada posición."""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright

async def main(base, outdir, mode='desktop', path='/', scrolls=('0',)):
  out = pathlib.Path(outdir); out.mkdir(parents=True, exist_ok=True)
  vp = {'width': 1440, 'height': 900} if mode == 'desktop' else {'width': 390, 'height': 844}
  async with async_playwright() as p:
    b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = await b.new_context(viewport=vp, device_scale_factor=1 if mode == 'desktop' else 2, is_mobile=(mode != 'desktop'), has_touch=(mode != 'desktop'))
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    await pg.goto(base + path, wait_until='networkidle')
    await pg.wait_for_timeout(2500)
    slug = path.strip('/').replace('/', '_') or 'home'
    for i, s in enumerate(scrolls):
      if s.startswith('sel:'):
        sel, _, off = s[4:].partition('+')
        await pg.evaluate("([s, o]) => { const el = document.querySelector(s); const y = el.getBoundingClientRect().top + window.scrollY + o; (window.__lenis ? window.__lenis.scrollTo(y, {immediate: true, force: true}) : window.scrollTo(0, y)); }", [sel, int(off or 0)])
      else:
        y = int(s)
        await pg.evaluate("(y) => window.__lenis ? window.__lenis.scrollTo(y, {immediate: true}) : window.scrollTo(0, y)", y)
      await pg.wait_for_timeout(1600)
      await pg.screenshot(path=str(out / f'{mode}-{slug}-{i:02d}.png'))
    for e in errs[:12]: print('ERR', e)
    await b.close()

if __name__ == '__main__':
  a = sys.argv
  asyncio.run(main(a[1], a[2], a[3] if len(a) > 3 else 'desktop', a[4] if len(a) > 4 else '/', a[5:] or ['0']))
