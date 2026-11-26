export type Lang = 'es' | 'en';
export const LANGS: Lang[] = ['es', 'en'];

/** Texto bilingüe. */
export type L = { es: string; en: string };

export type SectionId =
  | 'hero'
  | 'empresa'
  | 'productos'
  | 'bomba'
  | 'servicios'
  | 'proceso'
  | 'herramientas'
  | 'cobertura'
  | 'marcas'
  | 'novedades'
  | 'contacto';

export interface Section {
  id: SectionId;
  enabled: boolean;
  /** Texto del menú y del ancla. */
  label: L;
  /** Mostrar en el menú principal. */
  nav: boolean;
}

export interface SubItem {
  name: L;
  note?: L;
  /** Foto real (subida desde el panel). */
  image?: string;
  /** Render 3D de referencia. */
  render?: string;
}

export interface Product {
  id: string;
  enabled: boolean;
  slug: L;
  name: L;
  /** Una línea para el índice y el menú. */
  short: L;
  /** Párrafos separados por línea en blanco. */
  body: L;
  standards: string[];
  applications: L;
  sub: SubItem[];
  subTitle: L;
  /** Imagen principal (render o foto subida). */
  image: string;
  /** Foto de catálogo de SAS. */
  photo?: string;
  /** Modelo 3D interactivo en la ficha. */
  model?: string;
}

export interface Service {
  id: string;
  enabled: boolean;
  title: L;
  short: L;
  points: L[];
  image?: string;
}

export interface Step {
  title: L;
  body: L;
}

export interface Location {
  id: string;
  name: L;
  kind: L;
  address: string;
  lat: number;
  lon: number;
  soon: boolean;
  partner?: string;
  phone?: string;
  email?: string;
}

export interface Brand {
  name: string;
  logo?: string;
  url?: string;
}

export interface Article {
  id: string;
  slug: string;
  published: boolean;
  date: string;
  title: L;
  excerpt: L;
  /** Markdown simple: párrafos, ## subtítulos, - listas. */
  body: L;
  cover?: string;
}

export interface PumpCallout {
  part: string;
  product: string;
  title: L;
  body: L;
}

export interface SiteContent {
  updatedAt: string;
  brand: {
    name: string;
    logo: string;
    logoReverse: string;
    mark: string;
    favicon: string;
  };
  seo: { title: L; description: L };
  sections: Section[];
  hero: {
    eyebrow: L;
    title: L;
    lead: L;
    ctaPrimary: L;
    ctaSecondary: L;
    facts: { value: string; label: L }[];
    showExplode: boolean;
  };
  company: {
    title: L;
    intro: L;
    statement: L;
    pillars: Step[];
    image: string;
  };
  productsIntro: { title: L; lead: L };
  products: Product[];
  pump: { title: L; lead: L; callouts: PumpCallout[] };
  servicesIntro: { title: L; lead: L };
  services: Service[];
  process: { title: L; lead: L; steps: Step[] };
  tools: { title: L; lead: L; points: L[] };
  coverage: { title: L; lead: L; locations: Location[] };
  brands: { title: L; lead: L; items: Brand[] };
  articlesIntro: { title: L; lead: L };
  articles: Article[];
  contact: {
    title: L;
    lead: L;
    salesEmail: string;
    phone: string;
    officeEmail: string;
    quoteEmail: string;
    jobsEmail: string;
    /** Destinatarios del formulario (Resend). */
    recipients: string[];
    /** Remitente verificado en Resend, p. ej. "SAS Web <web@sas-supplier.com>". */
    fromEmail: string;
    subjectPrefix: string;
    interests: L[];
    success: L;
  };
  whatsapp: {
    enabled: boolean;
    number: string;
    message: L;
    label: L;
  };
  trace: { enabled: boolean; url: string; label: L };
  footer: {
    blurb: L;
    legal: L;
    instagram: string;
    linkedin: string;
    showCredit: boolean;
  };
}

export interface ContactMessage {
  id: string;
  createdAt: string;
  name: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
  lang: Lang;
  delivered: boolean;
  error?: string;
  read?: boolean;
}
