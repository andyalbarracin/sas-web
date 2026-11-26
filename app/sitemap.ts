import type { MetadataRoute } from 'next';
import { getContent } from '@/lib/server/store';
import { home, productHref, toolsHref, notesHref, noteHref } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const c = await getContent();
  const base = (process.env.SITE_URL || 'https://www.sas-supplier.com').replace(/\/$/, '');
  const urls: MetadataRoute.Sitemap = [];
  const both = (es: string, en: string, priority = 0.7) => {
    urls.push({ url: base + es, priority, alternates: { languages: { es: base + es, en: base + en } } });
    urls.push({ url: base + en, priority: priority - 0.1, alternates: { languages: { es: base + es, en: base + en } } });
  };
  both(home('es'), home('en'), 1);
  c.products.filter((p) => p.enabled).forEach((p) => both(productHref('es', p.slug.es), productHref('en', p.slug.en), 0.8));
  if (c.sections.find((s) => s.id === 'herramientas')?.enabled) both(toolsHref('es'), toolsHref('en'), 0.6);
  const notes = c.articles.filter((a) => a.published);
  if (notes.length) both(notesHref('es'), notesHref('en'), 0.5);
  notes.forEach((a) => both(noteHref('es', a.slug), noteHref('en', a.slug), 0.5));
  return urls;
}
