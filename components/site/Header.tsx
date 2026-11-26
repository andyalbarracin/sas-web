'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Lang, L, SectionId } from '@/lib/content/types';
import type { UIStrings } from '@/lib/i18n';

type NavItem = { id: SectionId; label: string; href: string };
type ProductLink = { id: string; name: string; short: string; href: string; image: string; slugs: L };

interface Props {
  lang: Lang;
  ui: UIStrings;
  logo: string;
  homeHref: string;
  nav: NavItem[];
  products: ProductLink[];
  toolsHref: string;
  contactHref: string;
  /** Pares de slugs para el cambio de idioma. */
  routes: { products: L[]; notes: string[] };
  traceLink?: { href: string; label: string } | null;
}

const SEG = { es: { p: 'productos', t: 'herramientas', n: 'notas' }, en: { p: 'products', t: 'tools', n: 'notes' } };

/** Calcula la URL equivalente en el otro idioma a partir de la ruta actual. */
function altPath(pathname: string, lang: Lang, routes: Props['routes']) {
  const other: Lang = lang === 'es' ? 'en' : 'es';
  const base = (l: Lang) => (l === 'es' ? '' : '/en');
  const parts = pathname.replace(/^\/en(?=\/|$)/, '').split('/').filter(Boolean);
  if (parts.length === 0) return base(other) || '/';
  if (parts[0] === SEG[lang].p && parts[1]) {
    const pair = routes.products.find((s) => s[lang] === parts[1]);
    if (pair) return `${base(other)}/${SEG[other].p}/${pair[other]}`;
  }
  if (parts[0] === SEG[lang].t) return `${base(other)}/${SEG[other].t}`;
  if (parts[0] === SEG[lang].n) return `${base(other)}/${SEG[other].n}${parts[1] ? '/' + parts[1] : ''}`;
  return base(other) || '/';
}

export default function Header(p: Props) {
  const pathname = usePathname() || '/';
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mega, setMega] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      setSolid(y > 24);
      // se oculta al bajar rápido, vuelve al subir
      if (!mega && !drawer) setHidden(y > 480 && y > last + 4);
      if (y < last - 4) setHidden(false);
      last = y;
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [mega, drawer]);

  useEffect(() => {
    setMega(false);
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mega) btnRef.current?.focus();
        setMega(false);
        setDrawer(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [mega]);

  useEffect(() => {
    document.documentElement.style.overflow = drawer ? 'hidden' : '';
  }, [drawer]);

  const openSoon = () => {
    window.clearTimeout(closeTimer.current);
    setMega(true);
  };
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMega(false), 180);
  };

  const alt = altPath(pathname, p.lang, p.routes);

  return (
    <>
      <a className="skip" href="#main">
        {p.ui.skip}
      </a>
      <header className="hdr" data-solid={solid || mega || drawer} data-hidden={hidden && !mega && !drawer}>
        <div className="wrap hdr-in">
          <a className="hdr-logo" href={p.homeHref} aria-label="SAS South America Supplier">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.logo} alt="SAS South America Supplier" width={214} height={35} />
          </a>
          <nav className="nav" aria-label={p.ui.menu}>
            {p.nav.map((n) =>
              n.id === 'productos' ? (
                <button
                  key={n.id}
                  ref={btnRef}
                  type="button"
                  aria-expanded={mega}
                  aria-controls="mega"
                  onClick={() => setMega((v) => !v)}
                  onMouseEnter={openSoon}
                  onMouseLeave={closeSoon}
                >
                  {n.label}
                  <span className="nav-caret" aria-hidden="true" />
                </button>
              ) : (
                <a key={n.id} href={n.href}>
                  {n.label}
                </a>
              ),
            )}
          </nav>
          <div className="hdr-tools">
            <a className="lang" href={alt} hrefLang={p.lang === 'es' ? 'en' : 'es'} aria-label={p.ui.langLabel}>
              {p.ui.langShort}
            </a>
            <a className="btn btn-primary btn-sm" href={p.contactHref}>
              {p.ui.quote}
            </a>
            <button
              type="button"
              className="burger"
              aria-expanded={drawer}
              aria-controls="drawer"
              aria-label={drawer ? p.ui.close : p.ui.menu}
              onClick={() => setDrawer((v) => !v)}
            >
              <span />
            </button>
          </div>
        </div>
        <div id="mega" ref={megaRef} className="mega" data-open={mega} onMouseEnter={openSoon} onMouseLeave={closeSoon}>
          <div className="wrap mega-in">
            {p.products.map((x) => (
              <a key={x.id} href={x.href} tabIndex={mega ? 0 : -1}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.image} alt="" loading="lazy" width={76} height={57} />
                <span>
                  <b>{x.name}</b>
                  <small>{x.short}</small>
                </span>
              </a>
            ))}
            <div className="mega-foot">
              <a className="link" href={p.nav.find((n) => n.id === 'productos')?.href} tabIndex={mega ? 0 : -1}>
                {p.ui.allProducts}
              </a>
              <a className="link" href={p.toolsHref} tabIndex={mega ? 0 : -1}>
                {p.lang === 'es' ? 'Herramientas técnicas' : 'Technical tools'}
              </a>
              {p.traceLink ? (
                <a className="link" href={p.traceLink.href} tabIndex={mega ? 0 : -1} target="_blank" rel="noopener">
                  {p.traceLink.label}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </header>
      <div id="drawer" className="drawer" data-open={drawer} aria-hidden={!drawer}>
        <nav aria-label={p.ui.menu}>
          {p.nav.map((n) => (
            <div key={n.id}>
              <a href={n.href} tabIndex={drawer ? 0 : -1} onClick={() => setDrawer(false)}>
                {n.label}
              </a>
              {n.id === 'productos' ? (
                <div className="sub">
                  {p.products.map((x) => (
                    <a key={x.id} href={x.href} tabIndex={drawer ? 0 : -1}>
                      {x.name}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          <a href={p.contactHref} tabIndex={drawer ? 0 : -1} onClick={() => setDrawer(false)}>
            {p.ui.quote}
          </a>
        </nav>
      </div>
    </>
  );
}
