"""Video de recorrido del sitio cuadro por cuadro (modo ?capture=1, determinístico).
python3 scripts/qa/capture-video.py <base_url> <out.mp4> [desktop|mobile] [path]"""
import asyncio, sys, pathlib, shutil, subprocess
from playwright.async_api import async_playwright

BASE, OUT = sys.argv[1], sys.argv[2]
MODE = sys.argv[3] if len(sys.argv) > 3 else 'desktop'
PATH = sys.argv[4] if len(sys.argv) > 4 else '/'
FR = pathlib.Path('/tmp/sas-frames-' + MODE)

async def main():
  if FR.exists(): shutil.rmtree(FR)
  FR.mkdir(parents=True)
  vp = {'width': 1280, 'height': 800} if MODE == 'desktop' else {'width': 390, 'height': 844}
  async with async_playwright() as p:
    b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = await b.new_context(viewport=vp, device_scale_factor=1 if MODE == 'desktop' else 2, is_mobile=MODE != 'desktop', has_touch=MODE != 'desktop')
    pg = await ctx.new_page()
    sep = '&' if '?' in PATH else '?'
    await pg.goto(BASE + PATH + sep + 'capture=1', wait_until='networkidle')
    await pg.wait_for_timeout(3500)
    total = await pg.evaluate('document.documentElement.scrollHeight - innerHeight')
    # tramos lentos: secciones fijadas (portada y bomba)
    slow = await pg.evaluate("""() => [...document.querySelectorAll('.pin-spacer')].map(s => { const t = s.getBoundingClientRect().top + scrollY; return [t, t + s.offsetHeight - innerHeight]; })""")
    ys, y = [], 0.0
    hold = 20 if MODE == 'desktop' else 14
    ys += [0] * hold
    fast, slow_v = (30, 16) if MODE == 'desktop' else (20, 12)
    while y < total:
      v = slow_v if any(a - 50 <= y <= z for a, z in slow) else fast
      y = min(total, y + v)
      ys.append(int(y))
    ys += [int(total)] * hold
    print('frames', len(ys), 'total', total, 'pins', slow)
    for i, yy in enumerate(ys):
      await pg.evaluate('(y) => new Promise(r => { window.scrollTo(0, y); requestAnimationFrame(() => requestAnimationFrame(r)); })', yy)
      await pg.screenshot(path=str(FR / f'{i:05d}.jpg'), type='jpeg', quality=88)
      if i % 100 == 0: print('frame', i, flush=True)
    await b.close()
  subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '24', '-i', str(FR / '%05d.jpg'), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], check=True)
  print('video', OUT)

asyncio.run(main())
