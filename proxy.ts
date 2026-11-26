import { NextResponse, type NextRequest } from 'next/server';

// Direcciones del sitio anterior (Wix) → nuevas, para no perder posicionamiento.
const LEGACY: Record<string, string> = {
  '/sellosmecánicos': '/productos/sellos-mecanicos',
  '/sellosmecanicos': '/productos/sellos-mecanicos',
  '/sistemasauxiliaresapi': '/productos/sistemas-auxiliares-api',
  '/sellosdgs': '/productos/sellos-dgs',
  '/protectoresderodamientos': '/productos/protectores-de-rodamientos',
  '/sellsneumaticos': '/productos/sellos-neumaticos',
  '/sellosneumaticos': '/productos/sellos-neumaticos',
  '/empaquetaduras': '/productos/empaquetaduras',
  '/spareparts': '/productos/spare-parts',
  '/bombascentrifugas': '/productos/bombas-centrifugas',
  '/cabezalesdeperforacion': '/productos/cabezales-de-perforacion',
  '/services-7': '/#servicios',
};

// Español en la raíz (/productos/...), inglés bajo /en. Internamente todo vive en app/[lang].
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname).toLowerCase().replace(/\/$/, '');
  } catch {
    /* ruta mal codificada */
  }
  const legacy = LEGACY[decoded];
  if (legacy) return NextResponse.redirect(new URL(legacy, request.url), 301);
  if (pathname === '/es' || pathname.startsWith('/es/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url, 308);
  }
  if (pathname === '/en' || pathname.startsWith('/en/')) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/es${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api|admin|media|_next|brand|img|zaire-calc|favicon|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)'],
};
