import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContent } from '@/lib/server/store';
import type { Lang, SiteContent } from '@/lib/content/types';
import { t, ui } from '@/lib/i18n';
import { resolve, home, productHref, anchor, noteHref, notesHref, alternate } from '@/lib/routes';
import ProductViewer from '@/components/site/ProductViewer';
import ZaireCalc from '@/components/site/ZaireCalc';
import Markdown from '@/components/site/Markdown';

type Params = Promise<{ lang: string; path: string[] }>;

function fmtDate(d: string, lang: Lang) {
  return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, path } = (await params) as { lang: Lang; path: string[] };
  const c = await getContent();
  const r = resolve(lang, path, c);
  if (!r) return {};
  const other = lang === 'es' ? 'en' : 'es';
  const alternates = { languages: { [other]: alternate(lang, r, c) } };
  if (r.kind === 'product') {
    const p = c.products.find((x) => x.id === r.id)!;
    return { title: t(p.name, lang), description: t(p.body, lang).split(/\n{2,}/)[0], alternates, openGraph: { images: [p.image] } };
  }
  if (r.kind === 'tools') return { title: ui(lang).toolsPage.title, description: ui(lang).toolsPage.lead, alternates };
  if (r.kind === 'notes') return { title: t(c.articlesIntro.title, lang), description: t(c.articlesIntro.lead, lang), alternates };
  const a = c.articles.find((x) => x.slug === r.slug)!;
  return { title: t(a.title, lang), description: t(a.excerpt, lang), alternates, openGraph: { images: a.cover ? [a.cover] : [] } };
}

function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="crumbs">
        {items.map((i) => (
          <li key={i.label}>{i.href ? <a href={i.href}>{i.label}</a> : <span aria-current="page">{i.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}

function ProductPage({ c, lang, id }: { c: SiteContent; lang: Lang; id: string }) {
  const u = ui(lang);
  const p = c.products.find((x) => x.id === id)!;
  const paras = t(p.body, lang).split(/\n{2,}/);
  const services = c.services.filter((s) => s.enabled);
  const others = c.products.filter((x) => x.enabled && x.id !== id).slice(0, 8);
  const ask = `${home(lang)}?tema=${encodeURIComponent(t(p.name, lang))}#${anchor(lang, 'contacto').split('#')[1]}`;
  return (
    <>
      <section className="sec page-top" style={{ paddingBottom: 'clamp(56px, 7vw, 96px)' }}>
        <div className="wrap">
          <Crumbs items={[{ label: u.home, href: home(lang) }, { label: t(c.productsIntro.title, lang), href: anchor(lang, 'productos') }, { label: t(p.name, lang) }]} />
          <div className="pd-hero">
            <div>
              <h1 className="display" style={{ fontSize: 'clamp(2.8rem, 5.4vw, 5.4rem)' }}>
                {t(p.name, lang)}
              </h1>
              <p className="lead">{t(p.short, lang)}</p>
              <dl className="pd-meta">
                {p.standards.length ? (
                  <div>
                    <dt>{u.standards}</dt>
                    <dd>
                      <ul className="chips">
                        {p.standards.map((s) => (
                          <li className="chip" key={s}>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>{u.applications}</dt>
                  <dd>{t(p.applications, lang)}</dd>
                </div>
              </dl>
              <div className="hero-cta" style={{ marginTop: 32 }}>
                <a className="btn btn-primary" href={ask}>
                  {u.askAbout}
                </a>
              </div>
            </div>
            <ProductViewer model={p.model} image={p.image} photo={p.photo} alt={t(p.name, lang)} labels={{ render: u.render, photo: u.photo, hint: u.rotateHint }} />
          </div>
        </div>
      </section>
      <section className="sec sec-white" style={{ paddingBlock: 'clamp(64px, 8vw, 120px)' }}>
        <div className="wrap pd-body">
          <div>
            <h2 className="h2" style={{ fontSize: 'clamp(2rem, 3.2vw, 3rem)' }}>
              {t(p.subTitle, lang)}
            </h2>
          </div>
          <div>
            <div className="prose" style={{ marginBottom: 40 }}>
              {paras.map((x, i) => (
                <p key={i}>{x}</p>
              ))}
            </div>
            <ul className="subs">
              {p.sub.map((s) => (
                <li className="sub" key={s.name.es}>
                  {s.image || s.render ? (
                    <div className="sub-img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.image || s.render} alt={t(s.name, lang)} loading="lazy" />
                    </div>
                  ) : (
                    <div className="sub-img ph" aria-hidden="true">
                      <span>{t(s.name, lang).replace(/^(Tipo|Type)\s+/, '')}</span>
                    </div>
                  )}
                  <b>{t(s.name, lang)}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="sec" style={{ paddingBlock: 'clamp(64px, 8vw, 120px)' }}>
        <div className="wrap">
          <header className="sec-head">
            <h2 className="h2" style={{ fontSize: 'clamp(2rem, 3.2vw, 3rem)' }}>
              {t(c.servicesIntro.title, lang)}
            </h2>
            <p className="lead">{t(c.servicesIntro.lead, lang)}</p>
          </header>
          <ul className="svc-mini">
            {services.map((s) => (
              <li key={s.id}>
                <a href={anchor(lang, 'servicios')}>
                  <b>{t(s.title, lang)}</b>
                  <span>{t(s.short, lang)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="sec sec-paper2" style={{ paddingBlock: 'clamp(64px, 8vw, 120px)' }}>
        <div className="wrap">
          <h2 className="h2" style={{ fontSize: 'clamp(2rem, 3.2vw, 3rem)', marginBottom: 32 }}>
            {u.related}
          </h2>
          <ul className="related">
            {others.map((o) => (
              <li key={o.id}>
                <a href={productHref(lang, o.slug[lang])}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.image} alt="" loading="lazy" />
                  <b>{t(o.name, lang)}</b>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function ToolsPage({ lang }: { lang: Lang }) {
  const u = ui(lang);
  return (
    <section className="sec page-top tools-page">
      <div className="wrap">
        <Crumbs items={[{ label: u.home, href: home(lang) }, { label: u.toolsPage.title }]} />
        <header className="sec-head">
          <h1 className="display" style={{ fontSize: 'clamp(2.8rem, 5.4vw, 5.4rem)' }}>
            {u.toolsPage.title}
          </h1>
          <p className="lead">{u.toolsPage.lead}</p>
        </header>
        <ZaireCalc lang={lang} />
      </div>
    </section>
  );
}

function NotesPage({ c, lang }: { c: SiteContent; lang: Lang }) {
  const u = ui(lang);
  const list = c.articles.filter((a) => a.published).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="sec page-top">
      <div className="wrap">
        <Crumbs items={[{ label: u.home, href: home(lang) }, { label: t(c.articlesIntro.title, lang) }]} />
        <header className="sec-head">
          <h1 className="display" style={{ fontSize: 'clamp(2.8rem, 5.4vw, 5.4rem)' }}>
            {t(c.articlesIntro.title, lang)}
          </h1>
          <p className="lead">{t(c.articlesIntro.lead, lang)}</p>
        </header>
        <div className="notes">
          {list.map((a) => (
            <a className="note" key={a.id} href={noteHref(lang, a.slug)}>
              <div>
                {a.cover ? (
                  <div className="note-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.cover} alt="" loading="lazy" />
                  </div>
                ) : null}
              </div>
              <div>
                <time dateTime={a.date}>{fmtDate(a.date, lang)}</time>
                <h3>{t(a.title, lang)}</h3>
                <p>{t(a.excerpt, lang)}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function NotePage({ c, lang, slug }: { c: SiteContent; lang: Lang; slug: string }) {
  const u = ui(lang);
  const a = c.articles.find((x) => x.slug === slug)!;
  return (
    <article className="sec page-top">
      <div className="wrap">
        <Crumbs items={[{ label: u.home, href: home(lang) }, { label: t(c.articlesIntro.title, lang), href: notesHref(lang) }, { label: t(a.title, lang) }]} />
        <div className="article-grid">
          <div className="article">
            <time dateTime={a.date} className="kicker" style={{ display: 'block' }}>
              {fmtDate(a.date, lang)}
            </time>
            <h1 className="display" style={{ fontSize: 'clamp(2.6rem, 5vw, 4.8rem)', marginBottom: 24 }}>
              {t(a.title, lang)}
            </h1>
            <p className="lead" style={{ maxWidth: '52ch', marginBottom: 40 }}>
              {t(a.excerpt, lang)}
            </p>
            <Markdown text={t(a.body, lang)} />
          </div>
          <aside className="article-aside">
            {a.cover ? (
              <div className="note-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.cover} alt="" />
              </div>
            ) : null}
            <div className="article-cta">
              <b className="h3">{lang === 'es' ? '¿Tenés un equipo que falla seguido?' : 'Got a machine that keeps failing?'}</b>
              <p>{t(c.contact.lead, lang)}</p>
              <a className="btn btn-primary" href={anchor(lang, 'contacto')}>
                {u.quote}
              </a>
              <a className="link" href={notesHref(lang)}>
                {u.allNotes}
              </a>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}

export default async function Page({ params }: { params: Params }) {
  const { lang, path } = (await params) as { lang: Lang; path: string[] };
  const c = await getContent();
  const r = resolve(lang, path, c);
  if (!r) notFound();
  if (r.kind === 'tools' && !c.sections.find((s) => s.id === 'herramientas')?.enabled) notFound();
  if (r.kind === 'product') return <ProductPage c={c} lang={lang} id={r.id} />;
  if (r.kind === 'tools') return <ToolsPage lang={lang} />;
  if (r.kind === 'notes') return <NotesPage c={c} lang={lang} />;
  return <NotePage c={c} lang={lang} slug={r.slug} />;
}

