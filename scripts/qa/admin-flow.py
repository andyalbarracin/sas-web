"""Prueba de punta a punta: formulario de contacto, login al panel, edición, subida de imagen y publicación."""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3100'
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/qa-admin'); OUT.mkdir(parents=True, exist_ok=True)

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    ok = lambda name, cond: print(('OK  ' if cond else 'FAIL'), name)

    # 1. Formulario de contacto (validación + envío)
    await pg.goto(BASE + '/?tema=Sellos%20DGS#contacto', wait_until='networkidle')
    await pg.wait_for_timeout(1500)
    ok('tema preseleccionado desde la URL', await pg.locator('#f-interest').input_value() == 'Sellos DGS')
    await pg.click('button[type=submit]')
    ok('validación de campos obligatorios', await pg.locator('.err').count() >= 2)
    await pg.fill('#f-name', 'Prueba')
    await pg.fill('#f-last', 'QA')
    await pg.fill('#f-company', 'Planta Demo')
    await pg.fill('#f-email', 'qa@example.com')
    await pg.fill('#f-phone', '+54 11 0000 0000')
    await pg.fill('#f-msg', 'Bomba ANSI con sello cartucho doble, pérdidas en arranque.')
    await pg.wait_for_timeout(1600)
    await pg.click('button[type=submit]')
    await pg.wait_for_selector('.form-ok', timeout=10000)
    ok('consulta enviada', True)
    await pg.locator('.form').screenshot(path=str(OUT / 'form-ok.png'))

    # 2. Panel: acceso con enlace mágico (el servidor de QA corre con ADMIN_MAGIC_LINK_LOG=1)
    import re, os
    LOG = os.environ.get('SAS_LOG', '/tmp/sas-web.log')
    def last_link():
      links = re.findall(r'(https?://\S+/admin/acceder#t=\S+)', open(LOG).read())
      return links[-1] if links else None
    await pg.goto(BASE + '/admin', wait_until='networkidle')
    await pg.screenshot(path=str(OUT / 'login.png'))
    before = last_link()
    await pg.fill('#email', 'intruso@example.com')
    await pg.click('button[type=submit]')
    await pg.wait_for_selector('.a-note')
    ok('email no autorizado: misma respuesta y sin enlace', last_link() == before)
    await pg.click('text=Usar otro email')
    await pg.fill('#email', 'andy@zairetech.com')
    await pg.click('button[type=submit]')
    await pg.wait_for_selector('.a-note')
    await pg.screenshot(path=str(OUT / 'login-enviado.png'))
    await pg.wait_for_timeout(300)
    link = last_link()
    ok('genera el enlace para un email autorizado', bool(link) and link != before)
    await pg.goto(link, wait_until='networkidle')
    ok('el token no queda en la barra de direcciones', '#t=' not in pg.url)
    await pg.screenshot(path=str(OUT / 'acceder.png'))
    await pg.click('button:has-text("Ingresar")')
    await pg.wait_for_selector('.a-app', timeout=15000)
    ok('ingresa al panel', True)
    await pg.screenshot(path=str(OUT / 'panel-general.png'))
    other = await (await b.new_context()).new_page()
    await other.goto(link, wait_until='networkidle')
    await other.click('button:has-text("Ingresar")')
    await other.wait_for_selector('.a-err')
    ok('el enlace no se puede usar dos veces', 'ya se usó' in await other.locator('.a-err').inner_text())
    other = await (await b.new_context()).new_page()
    await other.goto(BASE + '/admin/acceder#t=falso.token', wait_until='networkidle')
    await other.click('button:has-text("Ingresar")')
    await other.wait_for_selector('.a-err')
    ok('rechaza un enlace falso', True)

    # 3. Editar el título del inicio y publicar
    await pg.click('.a-side >> text=Inicio')
    await pg.wait_for_timeout(300)
    title = pg.locator('.a-field:has(.a-label:text-is("Título")) textarea').first
    await title.fill('Sellos mecánicos y reparaciones de todas las marcas. (QA)')
    ok('marca cambios sin guardar', 'sin guardar' in (await pg.locator('.a-state').inner_text()))
    await pg.screenshot(path=str(OUT / 'panel-inicio.png'))
    await pg.click('text=Guardar cambios')
    await pg.wait_for_selector('.a-state.ok', timeout=10000)
    ok('guarda y publica', True)

    # 4. Subir una imagen (logo de marca)
    await pg.click('.a-side >> text=Marcas')
    await pg.wait_for_timeout(300)
    await pg.locator('.a-item-title').first.click()
    async with pg.expect_file_chooser() as fc:
      await pg.locator('.a-item-body >> text=Subir imagen').first.click()
    chooser = await fc.value
    await chooser.set_files('public/brand/sas-mark-64.png')
    await pg.wait_for_function("() => [...document.querySelectorAll('.a-item-body input.a-mono')].some(i => i.value.startsWith('/media/') || i.value.startsWith('http'))", timeout=10000)
    ok('sube imagen', True)
    await pg.screenshot(path=str(OUT / 'panel-marcas.png'))

    # 5. Productos: abrir editor
    await pg.click('.a-side >> text=Productos')
    await pg.wait_for_timeout(300)
    await pg.locator('.a-item-title').first.click()
    await pg.wait_for_timeout(300)
    await pg.screenshot(path=str(OUT / 'panel-productos.png'), full_page=True)

    # 6. Mensajes recibidos
    await pg.click('.a-side >> text=Mensajes recibidos')
    await pg.wait_for_selector('.a-msg', timeout=10000)
    ok('la consulta aparece en el panel', 'Prueba QA' in await pg.locator('.a-msg').first.inner_text())
    await pg.screenshot(path=str(OUT / 'panel-mensajes.png'))

    # 7. El sitio refleja el cambio
    site = await ctx.new_page()
    await site.goto(BASE + '/', wait_until='networkidle')
    ok('el sitio muestra el título editado', '(QA)' in await site.locator('h1').inner_text())

    # 8. Restablecer el título original
    await pg.click('.a-side >> text=Inicio')
    await pg.wait_for_timeout(300)
    title = pg.locator('.a-field:has(.a-label:text-is("Título")) textarea').first
    await title.fill('Sellos mecánicos y reparaciones de todas las marcas.')
    await pg.click('text=Guardar cambios')
    await pg.wait_for_selector('.a-state.ok', timeout=10000)
    ok('restaura el título', True)

    # 9. API protegida sin sesión
    anon = await b.new_context()
    r = await anon.request.get(BASE + '/api/admin/content')
    ok('API del panel exige sesión (401)', r.status == 401)
    for e in errs[:10]: print('ERR', e)
    await b.close()

asyncio.run(main())
