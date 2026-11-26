import type { Lang, SiteContent } from '@/lib/content/types';
import { t, ui } from '@/lib/i18n';
import { anchor, home, productHref, toolsHref, notesHref } from '@/lib/routes';
import { InstagramIcon, LinkedInIcon, WhatsAppIcon } from './icons';

export function Footer({ c, lang }: { c: SiteContent; lang: Lang }) {
  const u = ui(lang);
  const year = new Date().getFullYear();
  const sec = (id: Parameters<typeof anchor>[1]) => c.sections.find((s) => s.id === id);
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="foot-logo" src={c.brand.logoReverse} alt="SAS South America Supplier" width={240} height={39} />
            <p style={{ maxWidth: '36ch', margin: 0 }}>{t(c.footer.blurb, lang)}</p>
            <div className="social">
              {c.footer.instagram ? (
                <a href={c.footer.instagram} target="_blank" rel="noopener" aria-label="Instagram">
                  <InstagramIcon />
                </a>
              ) : null}
              {c.footer.linkedin ? (
                <a href={c.footer.linkedin} target="_blank" rel="noopener" aria-label="LinkedIn">
                  <LinkedInIcon />
                </a>
              ) : null}
            </div>
          </div>
          <div>
            <h2>{u.footer.navigate}</h2>
            <ul>
              <li>
                <a href={home(lang)}>{u.home}</a>
              </li>
              {(['empresa', 'servicios', 'proceso', 'cobertura'] as const)
                .filter((id) => sec(id)?.enabled)
                .map((id) => (
                  <li key={id}>
                    <a href={anchor(lang, id)}>{t(sec(id)!.label, lang)}</a>
                  </li>
                ))}
              {sec('herramientas')?.enabled ? (
                <li>
                  <a href={toolsHref(lang)}>{t(sec('herramientas')!.label, lang)}</a>
                </li>
              ) : null}
              {sec('novedades')?.enabled && c.articles.some((a) => a.published) ? (
                <li>
                  <a href={notesHref(lang)}>{t(sec('novedades')!.label, lang)}</a>
                </li>
              ) : null}
            </ul>
          </div>
          <div>
            <h2>{u.footer.lines}</h2>
            <ul>
              {c.products
                .filter((p) => p.enabled)
                .map((p) => (
                  <li key={p.id}>
                    <a href={productHref(lang, p.slug[lang])}>{t(p.name, lang)}</a>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <h2>{u.footer.contact}</h2>
            <ul>
              <li>
                <a href={`mailto:${c.contact.salesEmail}`}>{c.contact.salesEmail}</a>
              </li>
              <li>
                <a href={`tel:${c.contact.phone.replace(/[^+\d]/g, '')}`}>{c.contact.phone}</a>
              </li>
              {c.whatsapp.enabled && c.whatsapp.number ? (
                <li>
                  <a href={`https://wa.me/${c.whatsapp.number.replace(/\D/g, '')}`} target="_blank" rel="noopener">
                    {u.whatsapp}
                  </a>
                </li>
              ) : null}
              <li>
                <a href={`mailto:${c.contact.jobsEmail}`}>{u.contact.jobs}</a>
              </li>
              {c.trace.enabled && c.trace.url ? (
                <li>
                  <a href={c.trace.url} target="_blank" rel="noopener">
                    {t(c.trace.label, lang)}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>
            © {year} {t(c.footer.legal, lang)}
          </span>
          {c.footer.showCredit ? (
            <a href="https://zairetech.com" target="_blank" rel="noopener">
              {u.footer.credit}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

export function WhatsApp({ c, lang }: { c: SiteContent; lang: Lang }) {
  if (!c.whatsapp.enabled || !c.whatsapp.number) return null;
  const href = `https://wa.me/${c.whatsapp.number.replace(/\D/g, '')}?text=${encodeURIComponent(t(c.whatsapp.message, lang))}`;
  return (
    <a className="wa" href={href} target="_blank" rel="noopener" aria-label={t(c.whatsapp.label, lang)}>
      <WhatsAppIcon />
      <span>{t(c.whatsapp.label, lang)}</span>
    </a>
  );
}
