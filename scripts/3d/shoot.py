"""Renderiza escenas 3D en Chromium headless y guarda PNG.
Uso: python3 scripts/3d/shoot.py <script.js> <out.png> [w h]
El script recibe `S` (SAS3D), `T` (THREE), `canvas`, `W`, `H` y debe terminar
llamando a `done()` después del último render.
"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).parent

async def main(js_path, out, w=1400, h=900, dpr=1):
    js = pathlib.Path(js_path).read_text()
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=dpr)
        logs = []
        pg.on('console', lambda m: logs.append(m.text))
        pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
        await pg.goto((HERE / 'harness.html').as_uri())
        await pg.evaluate("""(js) => new Promise((res, rej) => {
          const S = window.SAS3D, T = window.THREE, canvas = document.getElementById('c');
          const W = innerWidth, H = innerHeight;
          canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
          const done = () => requestAnimationFrame(() => res(true));
          try { new Function('S','T','canvas','W','H','done', js)(S,T,canvas,W,H,done); } catch (e) { rej(e); }
        })""", js)
        transparent = out.endswith('.alpha.png')
        await pg.screenshot(path=out.replace('.alpha', ''), omit_background=transparent)
        for l in logs: print(l)
        await b.close()

if __name__ == '__main__':
    a = sys.argv
    asyncio.run(main(a[1], a[2], int(a[3]) if len(a) > 3 else 1400, int(a[4]) if len(a) > 4 else 900, float(a[5]) if len(a) > 5 else 1))
