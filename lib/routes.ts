import type { Lang, SiteContent, SectionId } from './content/types';

const SEG = {
  es: { product: 'productos', tools: 'herramientas', notes: 'notas' },
  en: { product: 'products', tools: 'tools', notes: 'notes' },
} as const;

/** Anclas de las secciones de inicio, por idioma. */
export const ANCHOR: Record<Lang, Record<SectionId, string>> = {
  es: {
    hero: 'inicio',
    empresa: 'empresa',
    productos: 'productos',
    bomba: 'en-una-bomba',
    servicios: 'servicios',
    proceso: 'reacondicionamiento',
    herramientas: 'herramientas',
    cobertura: 'cobertura',
    marcas: 'marcas',
    novedades: 'notas',
    contacto: 'contacto',
  },
  en: {
    hero: 'home',
    empresa: 'company',
    productos: 'products',
    bomba: 'inside-a-pump',
    servicios: 'services',
    proceso: 'reconditioning',
    herramientas: 'tools',
    cobertura: 'coverage',
    marcas: 'brands',
    novedades: 'notes',
    contacto: 'contact',
  },
};

export const home = (lang: Lang) => (lang === 'es' ? '/' : '/en');
export const anchor = (lang: Lang, id: SectionId) => `${home(lang)}#${ANCHOR[lang][id]}`;
export const productHref = (lang: Lang, slug: string) => `${lang === 'es' ? '' : '/en'}/${SEG[lang].product}/${slug}`;
export const toolsHref = (lang: Lang) => `${lang === 'es' ? '' : '/en'}/${SEG[lang].tools}`;
export const notesHref = (lang: Lang) => `${lang === 'es' ? '' : '/en'}/${SEG[lang].notes}`;
export const noteHref = (lang: Lang, slug: string) => `${notesHref(lang)}/${slug}`;

export type Resolved =
  | { kind: 'product'; id: string }
  | { kind: 'tools' }
  | { kind: 'notes' }
  | { kind: 'note'; slug: string }
  | null;

/** Resuelve /productos/x, /herramientas, /notas, /notas/x (y sus equivalentes en inglés). */
export function resolve(lang: Lang, path: string[], content: SiteContent): Resolved {
  const s = SEG[lang];
  if (path[0] === s.product && path.length === 2) {
    const p = content.products.find((x) => x.enabled && x.slug[lang] === path[1]);
    return p ? { kind: 'product', id: p.id } : null;
  }
  if (path[0] === s.tools && path.length === 1) return { kind: 'tools' };
  if (path[0] === s.notes && path.length === 1) return { kind: 'notes' };
  if (path[0] === s.notes && path.length === 2) {
    const a = content.articles.find((x) => x.published && x.slug === path[1]);
    return a ? { kind: 'note', slug: a.slug } : null;
  }
  return null;
}

/** URL equivalente en el otro idioma, para el selector de idioma. */
export function alternate(lang: Lang, r: Resolved | 'home', content: SiteContent): string {
  const other: Lang = lang === 'es' ? 'en' : 'es';
  if (r === 'home' || r === null) return home(other);
  if (r.kind === 'product') {
    const p = content.products.find((x) => x.id === r.id)!;
    return productHref(other, p.slug[other]);
  }
  if (r.kind === 'tools') return toolsHref(other);
  if (r.kind === 'notes') return notesHref(other);
  return noteHref(other, r.slug);
}
