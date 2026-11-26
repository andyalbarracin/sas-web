import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-semi-condensed/500.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '../site.css';

import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { getContent } from '@/lib/server/store';
import type { Lang } from '@/lib/content/types';
import { t, ui } from '@/lib/i18n';
import { anchor, home, productHref, toolsHref } from '@/lib/routes';
import Header from '@/components/site/Header';
import SmoothScroll from '@/components/site/SmoothScroll';
import { Footer, WhatsApp } from '@/components/site/Footer';
import ToTop from '@/components/site/ToTop';

export const dynamic = 'force-dynamic';

const isLang = (x: string): x is Lang => x === 'es' || x === 'en';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const c = await getContent();
  const base = process.env.SITE_URL || 'https://www.sas-supplier.com';
  return {
    metadataBase: new URL(base),
    title: { default: t(c.seo.title, lang), template: `%s | SAS South America Supplier` },
    description: t(c.seo.description, lang),
    icons: { icon: c.brand.favicon },
    openGraph: {
      type: 'website',
      siteName: 'SAS South America Supplier',
      locale: lang === 'es' ? 'es_AR' : 'en_US',
      title: t(c.seo.title, lang),
      description: t(c.seo.description, lang),
      images: ['/img/render/sellos-mecanicos.webp'],
    },
  };
}

export const viewport: Viewport = { themeColor: '#f3f6f9', width: 'device-width', initialScale: 1 };

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const c = await getContent();
  const u = ui(lang);
  const enabled = (id: string) => c.sections.find((s) => s.id === id)?.enabled;
  const nav = c.sections
    .filter((s) => s.enabled && s.nav)
    .map((s) => ({ id: s.id, label: t(s.label, lang), href: s.id === 'herramientas' ? toolsHref(lang) : anchor(lang, s.id) }));
  const products = c.products
    .filter((p) => p.enabled)
    .map((p) => ({ id: p.id, name: t(p.name, lang), short: t(p.short, lang), href: productHref(lang, p.slug[lang]), image: p.image, slugs: p.slug }));

  return (
    <html lang={lang === 'es' ? 'es-AR' : 'en'}>
      <body>
        <Header
          lang={lang}
          ui={u}
          logo={c.brand.logo}
          homeHref={home(lang)}
          nav={nav}
          products={products}
          toolsHref={toolsHref(lang)}
          contactHref={enabled('contacto') ? anchor(lang, 'contacto') : `mailto:${c.contact.salesEmail}`}
          routes={{ products: c.products.map((p) => p.slug), notes: c.articles.map((a) => a.slug) }}
          traceLink={c.trace.enabled && c.trace.url ? { href: c.trace.url, label: t(c.trace.label, lang) } : null}
        />
        <main id="main">{children}</main>
        <Footer c={c} lang={lang} />
        <WhatsApp c={c} lang={lang} />
        <ToTop label={u.toTop} />
        <SmoothScroll />
      </body>
    </html>
  );
}
