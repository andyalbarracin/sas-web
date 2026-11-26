import { geoMercator } from 'd3-geo';
import { getContent } from '@/lib/server/store';
import type { Lang, SiteContent, SectionId } from '@/lib/content/types';
import { t, ui } from '@/lib/i18n';
import { ANCHOR, anchor, productHref, toolsHref, noteHref, notesHref } from '@/lib/routes';
import { SEAL_LABELS } from '@/lib/three/labels';
import mapData from '@/lib/content/map.json';
import HeroSeal from '@/components/site/HeroSeal';
import Parallax from '@/components/site/Parallax';
import ProductIndex from '@/components/site/ProductIndex';
import PumpStory from '@/components/site/PumpStory';
import Services from '@/components/site/Services';
import Process from '@/components/site/Process';
import ZaireCalc from '@/components/site/ZaireCalc';
import Coverage from '@/components/site/Coverage';
import ContactForm from '@/components/site/ContactForm';

const firstPara = (s: string) => s.split(/\n{2,}/)[0];

function fmtDate(d: string, lang: Lang) {
  return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Section({ id, c, lang }: { id: SectionId; c: SiteContent; lang: Lang }) {
  const u = ui(lang);
  const aid = ANCHOR[lang][id];
  switch (id) {
    case 'hero':
      return (
        <HeroSeal
          id={aid}
          eyebrow={t(c.hero.eyebrow, lang)}
          title={t(c.hero.title, lang)}
          lead={t(c.hero.lead, lang)}
          ctaPrimary={{ label: t(c.hero.ctaPrimary, lang), href: anchor(lang, 'productos') }}
          ctaSecondary={{ label: t(c.hero.ctaSecondary, lang), href: anchor(lang, 'contacto') }}
          facts={c.hero.facts.map((f) => ({ value: f.value, label: t(f.label, lang) }))}
          labels={Object.fromEntries(Object.entries(SEAL_LABELS).map(([k, v]) => [k, v[lang]]))}
          caption={u.explodeHint}
          hint={u.scrollHint}
          explode={c.hero.showExplode}
        />
      );

    case 'empresa':
      return (
        <section className="sec" id={aid}>
          <div className="wrap">
            <div className="company">
              <div>
                <h2 className="h2">{t(c.company.title, lang)}</h2>
                <p className="company-statement">{t(c.company.statement, lang)}</p>
                <p className="company-intro">{t(c.company.intro, lang)}</p>
              </div>
              <dl className="pillars">
                {c.company.pillars.map((p) => (
                  <div className="pillar" key={p.title.es}>
                    <dt>{t(p.title, lang)}</dt>
                    <dd>{t(p.body, lang)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {c.company.image ? (
              <Parallax
                src={c.company.image}
                alt=""
                caption={lang === 'es' ? 'Cualquier marca, modelo u origen.' : 'Any brand, model or origin.'}
                note={lang === 'es' ? 'Cada sello reacondicionado pasa una prueba neumática final según API 682.' : 'Every reconditioned seal passes a final pneumatic test to API 682.'}
              />
            ) : null}
          </div>
        </section>
      );

    case 'productos': {
      const items = c.products
        .filter((p) => p.enabled)
        .map((p) => ({
          id: p.id,
          name: t(p.name, lang),
          short: t(p.short, lang),
          href: productHref(lang, p.slug[lang]),
          image: p.image,
          standards: p.standards,
          body: firstPara(t(p.body, lang)),
        }));
      return (
        <section className="sec sec-white" id={aid}>
          <div className="wrap">
            <header className="sec-head">
              <h2 className="h2">{t(c.productsIntro.title, lang)}</h2>
              <p className="lead">{t(c.productsIntro.lead, lang)}</p>
            </header>
            <ProductIndex items={items} cta={u.viewProduct} />
          </div>
        </section>
      );
    }

    case 'bomba': {
      const callouts = c.pump.callouts
        .map((co) => {
          const prod = c.products.find((p) => p.id === co.product && p.enabled);
          return { part: co.part, title: t(co.title, lang), body: t(co.body, lang), href: prod ? productHref(lang, prod.slug[lang]) : anchor(lang, 'productos') };
        });
      return <PumpStory id={aid} title={t(c.pump.title, lang)} lead={t(c.pump.lead, lang)} callouts={callouts} stepLabel={u.pumpStep} />;
    }

    case 'servicios':
      return (
        <section className="sec" id={aid}>
          <div className="wrap">
            <Services
              title={t(c.servicesIntro.title, lang)}
              lead={t(c.servicesIntro.lead, lang)}
              items={c.services
                .filter((s) => s.enabled)
                .map((s) => ({ id: s.id, title: t(s.title, lang), short: t(s.short, lang), points: s.points.map((x) => t(x, lang)), image: s.image }))}
            />
          </div>
        </section>
      );

    case 'proceso':
      return (
        <section className="sec sec-paper2" id={aid}>
          <div className="wrap">
            <header className="sec-head">
              <h2 className="h2">{t(c.process.title, lang)}</h2>
              <p className="lead">{t(c.process.lead, lang)}</p>
            </header>
            <Process steps={c.process.steps.map((s) => ({ title: t(s.title, lang), body: t(s.body, lang) }))} />
          </div>
        </section>
      );

    case 'herramientas':
      return (
        <section className="sec" id={aid}>
          <div className="wrap tools">
            <div>
              <h2 className="h2">{t(c.tools.title, lang)}</h2>
              <p className="lead" style={{ marginTop: 20 }}>
                {t(c.tools.lead, lang)}
              </p>
              <ul>
                {c.tools.points.map((x) => (
                  <li key={x.es}>{t(x, lang)}</li>
                ))}
              </ul>
              <a className="btn btn-primary" href={toolsHref(lang)}>
                {u.openTools}
              </a>
            </div>
            <div className="tools-live">
              <p className="tools-live-label">{u.tryIt}</p>
              <ZaireCalc tag="zaire-pressure" lang={lang} />
            </div>
          </div>
        </section>
      );

    case 'cobertura': {
      const proj = geoMercator().scale(mapData.proj.scale).translate(mapData.proj.translate as [number, number]).center(mapData.proj.center as [number, number]);
      const pins = c.coverage.locations.map((l) => {
        const [x, y] = proj([l.lon, l.lat]) ?? [0, 0];
        return { id: l.id, x, y, dy: 0, name: t(l.name, lang), kind: t(l.kind, lang), address: l.address, soon: l.soon, partner: l.partner, phone: l.phone, email: l.email, short: t(l.name, lang).split(',')[0].replace('Ciudad de Buenos Aires', 'CABA').replace('Buenos Aires City', 'CABA') };
      });
      // separa etiquetas de puntos muy cercanos
      pins.forEach((a, i) =>
        pins.slice(i + 1).forEach((b) => {
          if (Math.hypot(a.x - b.x, a.y - b.y) < 22) {
            const [hi, lo] = a.y <= b.y ? [a, b] : [b, a];
            hi.dy = -11;
            lo.dy = 11;
          }
        }),
      );
      return (
        <section className="sec sec-white" id={aid}>
          <div className="wrap">
            <Coverage
              title={t(c.coverage.title, lang)}
              lead={t(c.coverage.lead, lang)}
              w={mapData.w}
              h={mapData.h}
              step={mapData.step}
              ar={mapData.ar as [number, number][]}
              sa={mapData.sa as [number, number][]}
              pins={pins}
              soonLabel={u.soon}
              repLabel={u.representative}
            />
          </div>
        </section>
      );
    }

    case 'marcas':
      return (
        <section className="sec" id={aid}>
          <div className="wrap">
            <header className="sec-head">
              <h2 className="h2">{t(c.brands.title, lang)}</h2>
              <p className="lead">{t(c.brands.lead, lang)}</p>
            </header>
            <ul className="brands">
              {c.brands.items.map((b) => {
                const inner = b.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logo} alt={b.name} loading="lazy" />
                ) : (
                  <span className="name">{b.name}</span>
                );
                return (
                  <li key={b.name}>
                    {b.url ? (
                      <a href={b.url} target="_blank" rel="noopener">
                        {inner}
                      </a>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      );

    case 'novedades': {
      const list = c.articles.filter((a) => a.published).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
      if (!list.length) return null;
      return (
        <section className="sec sec-white" id={aid}>
          <div className="wrap">
            <header className="sec-head">
              <h2 className="h2">{t(c.articlesIntro.title, lang)}</h2>
              <p className="lead">
                {t(c.articlesIntro.lead, lang)}{' '}
                <a className="link" href={notesHref(lang)}>
                  {u.allNotes}
                </a>
              </p>
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

    case 'contacto': {
      const k = c.contact;
      const tel = (x: string) => `tel:${x.replace(/[^+\d]/g, '')}`;
      return (
        <section className="sec" id={aid}>
          <div className="wrap contact">
            <div>
              <h2 className="h2">{t(k.title, lang)}</h2>
              <p className="lead" style={{ marginTop: 20 }}>
                {t(k.lead, lang)}
              </p>
              <dl className="cinfo">
                <div>
                  <dt>{u.contact.sales}</dt>
                  <dd>
                    <a href={`mailto:${k.salesEmail}`}>{k.salesEmail}</a>
                  </dd>
                </div>
                <div>
                  <dt>{u.contact.phone}</dt>
                  <dd>
                    <a href={tel(k.phone)}>{k.phone}</a>
                  </dd>
                </div>
                <div>
                  <dt>{u.contact.quotes}</dt>
                  <dd>
                    <a href={`mailto:${k.quoteEmail}`}>{k.quoteEmail}</a>
                  </dd>
                </div>
                <div>
                  <dt>{u.contact.office}</dt>
                  <dd>
                    {c.coverage.locations.find((l) => l.id === 'caba')?.address ?? 'CABA'}
                    <br />
                    <a href={`mailto:${k.officeEmail}`}>{k.officeEmail}</a>
                  </dd>
                </div>
                <div>
                  <dt>{u.contact.jobs}</dt>
                  <dd>
                    {u.contact.jobsNote}: <a href={`mailto:${k.jobsEmail}`}>{k.jobsEmail}</a>
                  </dd>
                </div>
              </dl>
            </div>
            <ContactForm lang={lang} ui={u.form} interests={[...k.interests.map((x) => t(x, lang)), ...c.products.filter((p) => p.enabled).map((p) => t(p.name, lang)).filter((n) => !k.interests.some((x) => t(x, lang) === n))]} success={t(k.success, lang)} fallbackEmail={k.salesEmail} />
          </div>
        </section>
      );
    }
    default:
      return null;
  }
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang };
  const c = await getContent();
  return (
    <>
      {c.sections
        .filter((s) => s.enabled)
        .map((s) => (
          <Section key={s.id} id={s.id} c={c} lang={lang} />
        ))}
    </>
  );
}
