'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Article, Brand, ContactMessage, L, Location, Product, SiteContent } from '@/lib/content/types';
import { Area, Field, ImageField, List, LText, Select, Text, Toggle, slugify } from './fields';

type Env = { store: 'file' | 'blob'; resend: boolean; user: string };
type Up = (fn: (d: SiteContent) => void) => void;

const PANELS = [
  { id: 'general', label: 'General' },
  { id: 'secciones', label: 'Secciones' },
  { id: 'inicio', label: 'Inicio' },
  { id: 'empresa', label: 'Empresa' },
  { id: 'productos', label: 'Productos' },
  { id: 'bomba', label: 'Bomba interactiva' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'proceso', label: 'Reacondicionamiento' },
  { id: 'herramientas', label: 'Herramientas' },
  { id: 'cobertura', label: 'Cobertura' },
  { id: 'marcas', label: 'Marcas' },
  { id: 'notas', label: 'Notas técnicas' },
  { id: 'contacto', label: 'Formulario de contacto' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'pie', label: 'Pie de página' },
  { id: 'mensajes', label: 'Mensajes recibidos' },
  { id: 'avanzado', label: 'Avanzado' },
] as const;
type PanelId = (typeof PANELS)[number]['id'];

const E: L = { es: '', en: '' };
const MODELS = [
  { value: '', label: 'Sin modelo 3D (solo imagen)' },
  { value: 'sellos-mecanicos', label: 'Sello cartucho' },
  { value: 'sistemas-auxiliares-api', label: 'Pote de sello API' },
  { value: 'sellos-dgs', label: 'Sello DGS' },
  { value: 'protectores-de-rodamientos', label: 'Protector de rodamientos' },
  { value: 'sellos-neumaticos', label: 'Sello neumático' },
  { value: 'empaquetaduras', label: 'Empaquetadura' },
  { value: 'spare-parts', label: 'Spare parts' },
  { value: 'bombas-centrifugas', label: 'Bomba centrífuga' },
  { value: 'cabezales-de-perforacion', label: 'Cabezal de perforación' },
];
const PARTS = [
  { value: 'seal', label: 'Sello mecánico' },
  { value: 'pot', label: 'Pote / sistema auxiliar' },
  { value: 'isolator', label: 'Protector de rodamientos' },
  { value: 'shaft', label: 'Eje' },
  { value: 'cover', label: 'Cámara de sellado' },
  { value: 'casing', label: 'Carcasa' },
  { value: 'impeller', label: 'Impulsor' },
  { value: 'frame', label: 'Soporte de rodamientos' },
  { value: 'hubA', label: 'Acople' },
  { value: 'motor', label: 'Motor' },
];

function Panel({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="a-panel">
      <header>
        <h1>{title}</h1>
        {intro ? <p>{intro}</p> : null}
      </header>
      <div className="a-grid">{children}</div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="a-group">
      <legend>{title}</legend>
      <div className="a-grid">{children}</div>
    </fieldset>
  );
}

export default function AdminApp({ initial, env }: { initial: SiteContent; env: Env }) {
  const [c, setC] = useState<SiteContent>(initial);
  const [saved, setSaved] = useState<SiteContent>(initial);
  const [panel, setPanel] = useState<PanelId>('general');
  const [status, setStatus] = useState<{ kind: 'ok' | 'err' | 'busy'; text: string } | null>(null);
  const dirty = useMemo(() => JSON.stringify(c) !== JSON.stringify(saved), [c, saved]);

  const up: Up = useCallback((fn) => {
    setC((prev) => {
      const d = structuredClone(prev);
      fn(d);
      return d;
    });
  }, []);

  useEffect(() => {
    const h = location.hash.slice(1) as PanelId;
    if (PANELS.some((p) => p.id === h)) setPanel(h);
  }, []);
  useEffect(() => {
    history.replaceState(null, '', `#${panel}`);
    window.scrollTo(0, 0);
  }, [panel]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save() {
    setStatus({ kind: 'busy', text: 'Guardando…' });
    const r = await fetch('/api/admin/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) {
      setStatus({ kind: 'err', text: 'La sesión venció. Volvé a ingresar (tus cambios siguen en pantalla).' });
      return;
    }
    if (!r.ok || !j.ok) {
      setStatus({ kind: 'err', text: j.error || 'No se pudo guardar.' });
      return;
    }
    setC(j.content);
    setSaved(j.content);
    setStatus({ kind: 'ok', text: 'Cambios publicados en el sitio.' });
    setTimeout(() => setStatus(null), 3500);
  }

  async function logout() {
    if (dirty && !confirm('Hay cambios sin guardar. ¿Salir igual?')) return;
    await fetch('/api/admin/logout', { method: 'POST' });
    location.href = '/admin';
  }

  // Atajo Ctrl/Cmd + S
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) save();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  return (
    <div className="a-app">
      <header className="a-top">
        <a href="/" className="a-brand" target="_blank" rel="noopener">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.brand.logo || '/brand/sas-logo.svg'} alt="SAS" />
          <span>Panel del sitio</span>
        </a>
        <div className="a-top-right">
          <span className={`a-state ${status?.kind ?? (dirty ? 'dirty' : 'clean')}`} role="status">
            {status?.text ?? (dirty ? 'Cambios sin guardar' : 'Todo guardado')}
          </span>
          <a className="a-btn a-btn-quiet" href="/" target="_blank" rel="noopener">
            Ver sitio
          </a>
          <button type="button" className="a-btn a-btn-quiet" onClick={() => setC(saved)} disabled={!dirty}>
            Descartar
          </button>
          <button type="button" className="a-btn a-btn-primary" onClick={save} disabled={!dirty || status?.kind === 'busy'}>
            Guardar cambios
          </button>
          <button type="button" className="a-btn a-btn-quiet" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <div className="a-body">
        <nav className="a-side" aria-label="Secciones del panel">
          {PANELS.map((p) => (
            <button key={p.id} type="button" aria-current={panel === p.id ? 'page' : undefined} onClick={() => setPanel(p.id)}>
              {p.label}
            </button>
          ))}
          <div className="a-side-foot">
            <span>Almacenamiento: {env.store === 'blob' ? 'Vercel Blob' : 'archivo local (data/)'}</span>
            <span>Envío de emails: {env.resend ? 'Resend activo' : 'sin configurar'}</span>
            <span>Sesión: {env.user}</span>
          </div>
        </nav>
        <main className="a-main" key={panel}>
          {renderPanel(panel, c, up, env)}
        </main>
      </div>
    </div>
  );
}

function renderPanel(panel: PanelId, c: SiteContent, up: Up, env: Env) {
  switch (panel) {
    case 'general':
      return (
        <Panel title="General" intro="Logos, nombre y textos para buscadores. Los logos en SVG se ven nítidos en cualquier pantalla.">
          <ImageField label="Logo principal (fondo claro)" value={c.brand.logo} onChange={(v) => up((d) => void (d.brand.logo = v))} />
          <ImageField label="Logo en negativo (pie de página, fondo navy)" value={c.brand.logoReverse} onChange={(v) => up((d) => void (d.brand.logoReverse = v))} dark />
          <ImageField label="Isotipo" value={c.brand.mark} onChange={(v) => up((d) => void (d.brand.mark = v))} />
          <ImageField label="Ícono del navegador (favicon)" value={c.brand.favicon} onChange={(v) => up((d) => void (d.brand.favicon = v))} hint="SVG o PNG cuadrado de al menos 64 × 64 px." />
          <LText label="Título para buscadores" value={c.seo.title} onChange={(v) => up((d) => void (d.seo.title = v))} />
          <LText label="Descripción para buscadores" value={c.seo.description} onChange={(v) => up((d) => void (d.seo.description = v))} multiline hint="Entre 140 y 160 caracteres funciona mejor en Google." />
        </Panel>
      );

    case 'secciones':
      return (
        <Panel title="Secciones" intro="Activá, ocultá y ordená las secciones de la página de inicio. El nombre es el que aparece en el menú.">
          <div className="a-wide">
            <List
              items={c.sections}
              onChange={(v) => up((d) => void (d.sections = v))}
              title={(s) => `${s.label.es}${s.enabled ? '' : ' · oculta'}${s.nav ? ' · en el menú' : ''}`}
              render={(s, set) => (
                <>
                  <Toggle label="Visible en el sitio" checked={s.enabled} onChange={(v) => set({ ...s, enabled: v })} />
                  <Toggle label="Mostrar en el menú principal" checked={s.nav} onChange={(v) => set({ ...s, nav: v })} />
                  <LText label="Nombre" value={s.label} onChange={(v) => set({ ...s, label: v })} />
                </>
              )}
            />
          </div>
        </Panel>
      );

    case 'inicio':
      return (
        <Panel title="Inicio" intro="La primera pantalla: título, bajada, botones y los cuatro datos destacados.">
          <LText label="Texto sobre el título" value={c.hero.eyebrow} onChange={(v) => up((d) => void (d.hero.eyebrow = v))} />
          <LText label="Título" value={c.hero.title} onChange={(v) => up((d) => void (d.hero.title = v))} multiline rows={2} />
          <LText label="Bajada" value={c.hero.lead} onChange={(v) => up((d) => void (d.hero.lead = v))} multiline />
          <LText label="Botón principal" value={c.hero.ctaPrimary} onChange={(v) => up((d) => void (d.hero.ctaPrimary = v))} />
          <LText label="Botón secundario" value={c.hero.ctaSecondary} onChange={(v) => up((d) => void (d.hero.ctaSecondary = v))} />
          <Toggle label="Despiece del sello al hacer scroll" hint="Si lo apagás, el sello queda armado y la portada no se fija al bajar." checked={c.hero.showExplode} onChange={(v) => up((d) => void (d.hero.showExplode = v))} />
          <div className="a-wide">
            <span className="a-label">Datos destacados</span>
            <List
              items={c.hero.facts}
              onChange={(v) => up((d) => void (d.hero.facts = v))}
              title={(f) => f.value}
              make={() => ({ value: 'Nuevo', label: { ...E } })}
              render={(f, set) => (
                <>
                  <Field label="Dato">
                    <Text value={f.value} onChange={(v) => set({ ...f, value: v })} />
                  </Field>
                  <LText label="Descripción" value={f.label} onChange={(v) => set({ ...f, label: v })} />
                </>
              )}
            />
          </div>
        </Panel>
      );

    case 'empresa':
      return (
        <Panel title="Empresa">
          <LText label="Título" value={c.company.title} onChange={(v) => up((d) => void (d.company.title = v))} />
          <LText label="Frase destacada" value={c.company.statement} onChange={(v) => up((d) => void (d.company.statement = v))} multiline rows={2} />
          <LText label="Texto" value={c.company.intro} onChange={(v) => up((d) => void (d.company.intro = v))} multiline />
          <ImageField label="Imagen panorámica" value={c.company.image} onChange={(v) => up((d) => void (d.company.image = v))} hint="Horizontal, al menos 1800 px de ancho. Se muestra en duotono azul." />
          <div className="a-wide">
            <span className="a-label">Pilares</span>
            <List
              items={c.company.pillars}
              onChange={(v) => up((d) => void (d.company.pillars = v))}
              title={(p) => p.title.es}
              make={() => ({ title: { ...E }, body: { ...E } })}
              render={(p, set) => (
                <>
                  <LText label="Título" value={p.title} onChange={(v) => set({ ...p, title: v })} />
                  <LText label="Texto" value={p.body} onChange={(v) => set({ ...p, body: v })} multiline />
                </>
              )}
            />
          </div>
        </Panel>
      );

    case 'productos':
      return (
        <Panel title="Productos" intro="Cada línea tiene su página. El orden de la lista es el orden del menú y del índice.">
          <LText label="Título de la sección" value={c.productsIntro.title} onChange={(v) => up((d) => void (d.productsIntro.title = v))} />
          <LText label="Bajada de la sección" value={c.productsIntro.lead} onChange={(v) => up((d) => void (d.productsIntro.lead = v))} multiline rows={2} />
          <div className="a-wide">
            <List<Product>
              items={c.products}
              onChange={(v) => up((d) => void (d.products = v))}
              title={(p) => `${p.name.es}${p.enabled ? '' : ' · oculto'}`}
              make={() => ({
                id: `p-${Date.now().toString(36)}`,
                enabled: false,
                slug: { es: 'nueva-linea', en: 'new-line' },
                name: { es: 'Nueva línea', en: 'New line' },
                short: { ...E },
                body: { ...E },
                standards: [],
                applications: { ...E },
                subTitle: { es: 'Tipos', en: 'Types' },
                sub: [],
                image: '',
                photo: '',
                model: '',
              })}
              addLabel="Agregar línea"
              render={(p, set) => <ProductEditor p={p} set={set} />}
            />
          </div>
        </Panel>
      );

    case 'bomba':
      return (
        <Panel title="Bomba interactiva" intro="La bomba se desarma al bajar y recorre estas piezas en orden. Cada pieza enlaza a una línea de producto.">
          <LText label="Título" value={c.pump.title} onChange={(v) => up((d) => void (d.pump.title = v))} />
          <LText label="Bajada" value={c.pump.lead} onChange={(v) => up((d) => void (d.pump.lead = v))} multiline rows={2} />
          <div className="a-wide">
            <List
              items={c.pump.callouts}
              onChange={(v) => up((d) => void (d.pump.callouts = v))}
              title={(x) => x.title.es}
              make={() => ({ part: 'motor', product: c.products[0]?.id ?? '', title: { ...E }, body: { ...E } })}
              addLabel="Agregar pieza"
              render={(x, set) => (
                <>
                  <Field label="Pieza de la bomba">
                    <Select value={x.part} onChange={(v) => set({ ...x, part: v })} options={PARTS} />
                  </Field>
                  <Field label="Enlaza a">
                    <Select value={x.product} onChange={(v) => set({ ...x, product: v })} options={c.products.map((p) => ({ value: p.id, label: p.name.es }))} />
                  </Field>
                  <LText label="Nombre" value={x.title} onChange={(v) => set({ ...x, title: v })} />
                  <LText label="Texto" value={x.body} onChange={(v) => set({ ...x, body: v })} multiline rows={2} />
                </>
              )}
            />
          </div>
        </Panel>
      );

    case 'servicios':
      return (
        <Panel title="Servicios">
          <LText label="Título de la sección" value={c.servicesIntro.title} onChange={(v) => up((d) => void (d.servicesIntro.title = v))} />
          <LText label="Bajada" value={c.servicesIntro.lead} onChange={(v) => up((d) => void (d.servicesIntro.lead = v))} multiline rows={2} />
          <div className="a-wide">
            <List
              items={c.services}
              onChange={(v) => up((d) => void (d.services = v))}
              title={(s) => `${s.title.es}${s.enabled ? '' : ' · oculto'}`}
              make={() => ({ id: `s-${Date.now().toString(36)}`, enabled: true, title: { ...E }, short: { ...E }, points: [], image: '' })}
              addLabel="Agregar servicio"
              render={(s, set) => (
                <>
                  <Toggle label="Visible" checked={s.enabled} onChange={(v) => set({ ...s, enabled: v })} />
                  <LText label="Nombre" value={s.title} onChange={(v) => set({ ...s, title: v })} />
                  <LText label="Resumen" value={s.short} onChange={(v) => set({ ...s, short: v })} multiline rows={2} />
                  <ImageField label="Foto" value={s.image} onChange={(v) => set({ ...s, image: v })} hint="Se muestra en duotono azul junto a la lista." />
                  <div className="a-wide">
                    <span className="a-label">Puntos</span>
                    <List
                      items={s.points}
                      onChange={(v) => set({ ...s, points: v })}
                      title={(x) => x.es.slice(0, 80)}
                      make={() => ({ ...E })}
                      addLabel="Agregar punto"
                      render={(x, setX) => <LText label="Texto" value={x} onChange={setX} multiline rows={2} />}
                    />
                  </div>
                </>
              )}
            />
          </div>
        </Panel>
      );

    case 'proceso':
      return (
        <Panel title="Reacondicionamiento" intro="Las etapas se muestran numeradas, en este orden.">
          <LText label="Título" value={c.process.title} onChange={(v) => up((d) => void (d.process.title = v))} />
          <LText label="Bajada" value={c.process.lead} onChange={(v) => up((d) => void (d.process.lead = v))} multiline rows={2} />
          <div className="a-wide">
            <List
              items={c.process.steps}
              onChange={(v) => up((d) => void (d.process.steps = v))}
              title={(s, i) => `${i + 1}. ${s.title.es}`}
              make={() => ({ title: { ...E }, body: { ...E } })}
              addLabel="Agregar etapa"
              render={(s, set) => (
                <>
                  <LText label="Etapa" value={s.title} onChange={(v) => set({ ...s, title: v })} />
                  <LText label="Texto" value={s.body} onChange={(v) => set({ ...s, body: v })} multiline rows={2} />
                </>
              )}
            />
          </div>
        </Panel>
      );

    case 'herramientas':
      return (
        <Panel title="Herramientas técnicas" intro="Calculadora de alojamientos de O‑ring y conversor de presión de Zaire. Se activan o desactivan desde Secciones.">
          <LText label="Título" value={c.tools.title} onChange={(v) => up((d) => void (d.tools.title = v))} />
          <LText label="Bajada" value={c.tools.lead} onChange={(v) => up((d) => void (d.tools.lead = v))} multiline rows={2} />
          <div className="a-wide">
            <List items={c.tools.points} onChange={(v) => up((d) => void (d.tools.points = v))} title={(x) => x.es} make={() => ({ ...E })} addLabel="Agregar punto" render={(x, set) => <LText label="Texto" value={x} onChange={set} />} />
          </div>
        </Panel>
      );

    case 'cobertura':
      return (
        <Panel title="Cobertura" intro="Las ubicaciones se marcan en el mapa con su latitud y longitud (podés copiarlas de Google Maps).">
          <LText label="Título" value={c.coverage.title} onChange={(v) => up((d) => void (d.coverage.title = v))} />
          <LText label="Bajada" value={c.coverage.lead} onChange={(v) => up((d) => void (d.coverage.lead = v))} multiline rows={2} />
          <div className="a-wide">
            <List<Location>
              items={c.coverage.locations}
              onChange={(v) => up((d) => void (d.coverage.locations = v))}
              title={(l) => `${l.name.es} · ${l.kind.es}`}
              make={() => ({ id: `l-${Date.now().toString(36)}`, name: { ...E }, kind: { es: 'Centro de servicios', en: 'Service centre' }, address: '', lat: -34.6, lon: -58.4, soon: false })}
              addLabel="Agregar ubicación"
              render={(l, set) => (
                <>
                  <LText label="Lugar" value={l.name} onChange={(v) => set({ ...l, name: v })} />
                  <LText label="Tipo" value={l.kind} onChange={(v) => set({ ...l, kind: v })} />
                  <Field label="Dirección" wide>
                    <Text value={l.address} onChange={(v) => set({ ...l, address: v })} />
                  </Field>
                  <Field label="Latitud">
                    <Text type="number" value={l.lat} onChange={(v) => set({ ...l, lat: Number(v) })} />
                  </Field>
                  <Field label="Longitud">
                    <Text type="number" value={l.lon} onChange={(v) => set({ ...l, lon: Number(v) })} />
                  </Field>
                  <Field label="Representante (opcional)">
                    <Text value={l.partner ?? ''} onChange={(v) => set({ ...l, partner: v })} />
                  </Field>
                  <Field label="Teléfono (opcional)">
                    <Text value={l.phone ?? ''} onChange={(v) => set({ ...l, phone: v })} />
                  </Field>
                  <Field label="Email (opcional)">
                    <Text value={l.email ?? ''} onChange={(v) => set({ ...l, email: v })} />
                  </Field>
                  <Toggle label="Marcar como «Próximamente»" checked={l.soon} onChange={(v) => set({ ...l, soon: v })} />
                </>
              )}
            />
          </div>
        </Panel>
      );

    case 'marcas':
      return (
        <Panel title="Marcas representadas">
          <LText label="Título" value={c.brands.title} onChange={(v) => up((d) => void (d.brands.title = v))} />
          <LText label="Bajada" value={c.brands.lead} onChange={(v) => up((d) => void (d.brands.lead = v))} />
          <div className="a-wide">
            <List<Brand>
              items={c.brands.items}
              onChange={(v) => up((d) => void (d.brands.items = v))}
              title={(b) => b.name}
              make={() => ({ name: 'Nueva marca', logo: '', url: '' })}
              addLabel="Agregar marca"
              render={(b, set) => (
                <>
                  <Field label="Nombre">
                    <Text value={b.name} onChange={(v) => set({ ...b, name: v })} />
                  </Field>
                  <Field label="Sitio web (opcional)">
                    <Text value={b.url ?? ''} onChange={(v) => set({ ...b, url: v })} placeholder="https://" />
                  </Field>
                  <ImageField label="Logo" value={b.logo} onChange={(v) => set({ ...b, logo: v })} hint="PNG transparente o SVG. Sin logo se muestra el nombre." />
                </>
              )}
            />
          </div>
        </Panel>
      );

    case 'notas':
      return (
        <Panel title="Notas técnicas" intro="Artículos breves. En el cuerpo podés usar: línea en blanco para separar párrafos, «## » para subtítulos, «- » para listas y **negrita**.">
          <LText label="Título de la sección" value={c.articlesIntro.title} onChange={(v) => up((d) => void (d.articlesIntro.title = v))} />
          <LText label="Bajada" value={c.articlesIntro.lead} onChange={(v) => up((d) => void (d.articlesIntro.lead = v))} />
          <div className="a-wide">
            <List<Article>
              items={c.articles}
              onChange={(v) => up((d) => void (d.articles = v))}
              title={(a) => `${a.title.es || 'Nota sin título'}${a.published ? '' : ' · borrador'}`}
              make={() => ({ id: `a-${Date.now().toString(36)}`, slug: `nota-${Date.now().toString(36)}`, published: false, date: new Date().toISOString().slice(0, 10), title: { ...E }, excerpt: { ...E }, body: { ...E }, cover: '' })}
              addLabel="Nueva nota"
              render={(a, set) => (
                <>
                  <Toggle label="Publicada" checked={a.published} onChange={(v) => set({ ...a, published: v })} />
                  <Field label="Fecha">
                    <Text type="date" value={a.date} onChange={(v) => set({ ...a, date: v })} />
                  </Field>
                  <LText label="Título" value={a.title} onChange={(v) => set({ ...a, title: v })} />
                  <Field label="Enlace" hint="Minúsculas, números y guiones. Es parte de la dirección de la nota." wide>
                    <div className="a-row">
                      <Text value={a.slug} onChange={(v) => set({ ...a, slug: v })} mono />
                      <button type="button" className="a-btn a-btn-quiet" onClick={() => set({ ...a, slug: slugify(a.title.es) })}>
                        Generar desde el título
                      </button>
                    </div>
                  </Field>
                  <LText label="Resumen" value={a.excerpt} onChange={(v) => set({ ...a, excerpt: v })} multiline rows={2} />
                  <LText label="Cuerpo" value={a.body} onChange={(v) => set({ ...a, body: v })} multiline rows={14} />
                  <ImageField label="Imagen de portada" value={a.cover} onChange={(v) => set({ ...a, cover: v })} />
                </>
              )}
            />
          </div>
        </Panel>
      );

    case 'contacto':
      return (
        <Panel title="Formulario de contacto" intro="Las consultas se envían por email con Resend y además quedan guardadas en «Mensajes recibidos».">
          {!env.resend ? (
            <div className="a-note a-wide">
              El envío por email todavía no está activo: falta la variable <code>RESEND_API_KEY</code>. Mientras tanto, las consultas se guardan en el panel.
            </div>
          ) : null}
          <LText label="Título" value={c.contact.title} onChange={(v) => up((d) => void (d.contact.title = v))} />
          <LText label="Bajada" value={c.contact.lead} onChange={(v) => up((d) => void (d.contact.lead = v))} multiline rows={2} />
          <Group title="Envío de consultas">
            <Field label="Destinatarios" hint="Uno por línea. Reciben cada consulta del formulario." wide>
              <Area rows={3} value={c.contact.recipients.join('\n')} onChange={(v) => up((d) => void (d.contact.recipients = v.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean)))} />
            </Field>
            <Field label="Remitente" hint="Debe ser de un dominio verificado en Resend. Ej.: SAS Web <web@sas-supplier.com>">
              <Text value={c.contact.fromEmail} onChange={(v) => up((d) => void (d.contact.fromEmail = v))} />
            </Field>
            <Field label="Prefijo del asunto">
              <Text value={c.contact.subjectPrefix} onChange={(v) => up((d) => void (d.contact.subjectPrefix = v))} />
            </Field>
            <LText label="Mensaje de confirmación" value={c.contact.success} onChange={(v) => up((d) => void (d.contact.success = v))} />
          </Group>
          <Group title="Datos de contacto visibles">
            <Field label="Email de ventas">
              <Text value={c.contact.salesEmail} onChange={(v) => up((d) => void (d.contact.salesEmail = v))} />
            </Field>
            <Field label="Teléfono">
              <Text value={c.contact.phone} onChange={(v) => up((d) => void (d.contact.phone = v))} />
            </Field>
            <Field label="Email de cotizaciones">
              <Text value={c.contact.quoteEmail} onChange={(v) => up((d) => void (d.contact.quoteEmail = v))} />
            </Field>
            <Field label="Email de oficinas">
              <Text value={c.contact.officeEmail} onChange={(v) => up((d) => void (d.contact.officeEmail = v))} />
            </Field>
            <Field label="Email para CV">
              <Text value={c.contact.jobsEmail} onChange={(v) => up((d) => void (d.contact.jobsEmail = v))} />
            </Field>
          </Group>
          <div className="a-wide">
            <span className="a-label">Temas del formulario (además de las líneas de producto)</span>
            <List items={c.contact.interests} onChange={(v) => up((d) => void (d.contact.interests = v))} title={(x) => x.es} make={() => ({ ...E })} addLabel="Agregar tema" render={(x, set) => <LText label="Tema" value={x} onChange={set} />} />
          </div>
        </Panel>
      );

    case 'whatsapp': {
      const num = c.whatsapp.number.replace(/\D/g, '');
      return (
        <Panel title="WhatsApp" intro="Botón flotante en todas las páginas.">
          <Toggle label="Mostrar el botón" checked={c.whatsapp.enabled} onChange={(v) => up((d) => void (d.whatsapp.enabled = v))} />
          <Field label="Número" hint="Con código de país y de área, sin espacios ni el 15. Ej.: 5491156974929">
            <Text value={c.whatsapp.number} onChange={(v) => up((d) => void (d.whatsapp.number = v))} mono />
          </Field>
          <LText label="Mensaje inicial" value={c.whatsapp.message} onChange={(v) => up((d) => void (d.whatsapp.message = v))} />
          <LText label="Texto del botón" value={c.whatsapp.label} onChange={(v) => up((d) => void (d.whatsapp.label = v))} />
          {num ? (
            <p className="a-wide">
              <a className="a-btn" href={`https://wa.me/${num}?text=${encodeURIComponent(c.whatsapp.message.es)}`} target="_blank" rel="noopener">
                Probar el enlace
              </a>
            </p>
          ) : null}
        </Panel>
      );
    }

    case 'pie':
      return (
        <Panel title="Pie de página">
          <LText label="Texto" value={c.footer.blurb} onChange={(v) => up((d) => void (d.footer.blurb = v))} multiline rows={2} />
          <LText label="Línea legal" value={c.footer.legal} onChange={(v) => up((d) => void (d.footer.legal = v))} hint="El año se agrega solo." />
          <Field label="Instagram">
            <Text value={c.footer.instagram} onChange={(v) => up((d) => void (d.footer.instagram = v))} placeholder="https://www.instagram.com/..." />
          </Field>
          <Field label="LinkedIn">
            <Text value={c.footer.linkedin} onChange={(v) => up((d) => void (d.footer.linkedin = v))} placeholder="https://www.linkedin.com/company/..." />
          </Field>
          <Toggle label="Mostrar crédito de desarrollo" checked={c.footer.showCredit} onChange={(v) => up((d) => void (d.footer.showCredit = v))} />
          <Group title="Seguimiento de reparaciones (Zaire Trace)">
            <Toggle label="Mostrar el enlace en el menú de productos y en el pie" checked={c.trace.enabled} onChange={(v) => up((d) => void (d.trace.enabled = v))} />
            <Field label="Dirección del portal">
              <Text value={c.trace.url} onChange={(v) => up((d) => void (d.trace.url = v))} placeholder="https://" />
            </Field>
            <LText label="Texto del enlace" value={c.trace.label} onChange={(v) => up((d) => void (d.trace.label = v))} />
          </Group>
        </Panel>
      );

    case 'mensajes':
      return <Messages />;

    case 'avanzado':
      return <Advanced c={c} up={up} />;
  }
}

function ProductEditor({ p, set }: { p: Product; set: (v: Product) => void }) {
  return (
    <>
      <Toggle label="Visible en el sitio" checked={p.enabled} onChange={(v) => set({ ...p, enabled: v })} />
      <LText label="Nombre" value={p.name} onChange={(v) => set({ ...p, name: v })} />
      <div className="a-field a-wide">
        <span className="a-label">Enlace de la página</span>
        <div className="a-bi">
          <label>
            <i>ES</i>
            <input className="a-input a-mono" value={p.slug.es} onChange={(e) => set({ ...p, slug: { ...p.slug, es: e.target.value } })} />
          </label>
          <label>
            <i>EN</i>
            <input className="a-input a-mono" value={p.slug.en} onChange={(e) => set({ ...p, slug: { ...p.slug, en: e.target.value } })} />
          </label>
        </div>
        <span className="a-hint">
          /productos/{p.slug.es} y /en/products/{p.slug.en}.{' '}
          <button type="button" className="a-linkbtn" onClick={() => set({ ...p, slug: { es: slugify(p.name.es), en: slugify(p.name.en) } })}>
            Generar desde el nombre
          </button>
        </span>
      </div>
      <LText label="Descripción corta (menú e índice)" value={p.short} onChange={(v) => set({ ...p, short: v })} />
      <LText label="Texto de la página" value={p.body} onChange={(v) => set({ ...p, body: v })} multiline rows={7} hint="Separá los párrafos con una línea en blanco." />
      <Field label="Normas" hint="Separadas por coma. Ej.: API 682, ANSI, DIN">
        <Text value={p.standards.join(', ')} onChange={(v) => set({ ...p, standards: v.split(',').map((x) => x.trim()).filter(Boolean) })} />
      </Field>
      <LText label="Aplicaciones" value={p.applications} onChange={(v) => set({ ...p, applications: v })} />
      <ImageField label="Imagen principal" value={p.image} onChange={(v) => set({ ...p, image: v })} hint="Se usa en el índice, el menú y como portada de la página. Ideal: 1600 × 1200 px con fondo transparente o blanco." />
      <ImageField label="Foto de catálogo (opcional)" value={p.photo} onChange={(v) => set({ ...p, photo: v })} hint="Aparece en la pestaña «Foto de catálogo» de la ficha." />
      <Field label="Modelo 3D interactivo">
        <Select value={p.model ?? ''} onChange={(v) => set({ ...p, model: v })} options={MODELS} />
      </Field>
      <LText label="Título del bloque de variantes" value={p.subTitle} onChange={(v) => set({ ...p, subTitle: v })} />
      <div className="a-wide">
        <span className="a-label">Variantes</span>
        <List
          items={p.sub}
          onChange={(v) => set({ ...p, sub: v })}
          title={(s) => s.name.es}
          make={() => ({ name: { ...E }, image: '' })}
          addLabel="Agregar variante"
          render={(s, setS) => (
            <>
              <LText label="Nombre" value={s.name} onChange={(v) => setS({ ...s, name: v })} />
              <ImageField label="Foto" value={s.image || s.render} onChange={(v) => setS({ ...s, image: v, render: v ? s.render : '' })} />
            </>
          )}
        />
      </div>
    </>
  );
}

function Messages() {
  const [list, setList] = useState<ContactMessage[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/admin/messages');
    if (!r.ok) return setErr('No se pudieron cargar los mensajes.');
    setList(await r.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function mark(m: ContactMessage) {
    await fetch('/api/admin/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, read: !m.read }) });
    load();
  }
  async function del(m: ContactMessage) {
    if (!confirm(`¿Borrar el mensaje de ${m.name}?`)) return;
    await fetch(`/api/admin/messages?id=${encodeURIComponent(m.id)}`, { method: 'DELETE' });
    load();
  }
  return (
    <Panel title="Mensajes recibidos" intro="Todas las consultas del formulario, se hayan enviado por email o no.">
      <div className="a-wide">
        {err ? <p className="a-err">{err}</p> : null}
        {!list ? <p>Cargando…</p> : null}
        {list && !list.length ? <p className="a-empty">Todavía no llegaron consultas. Cuando alguien complete el formulario, aparece acá.</p> : null}
        <div className="a-msgs">
          {list?.map((m) => (
            <article key={m.id} className={`a-msg${m.read ? ' read' : ''}`}>
              <header>
                <b>
                  {m.name} {m.lastName}
                </b>
                {m.company ? <span>{m.company}</span> : null}
                <time>{new Date(m.createdAt).toLocaleString('es-AR')}</time>
              </header>
              <p className="a-msg-meta">
                <a href={`mailto:${m.email}`}>{m.email}</a>
                {m.phone ? <> · {m.phone}</> : null}
                {m.interest ? <> · {m.interest}</> : null} · {m.lang.toUpperCase()}
              </p>
              <p className="a-msg-body">{m.message}</p>
              <footer>
                <span className={m.delivered ? 'a-ok' : 'a-warn'}>{m.delivered ? 'Enviado por email' : `No enviado por email${m.error ? `: ${m.error}` : ''}`}</span>
                <span className="a-row">
                  <a className="a-btn" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: consulta en sas-supplier.com')}`}>
                    Responder
                  </a>
                  <button type="button" className="a-btn a-btn-quiet" onClick={() => mark(m)}>
                    {m.read ? 'Marcar sin leer' : 'Marcar leído'}
                  </button>
                  <button type="button" className="a-btn a-btn-quiet a-danger" onClick={() => del(m)}>
                    Borrar
                  </button>
                </span>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Advanced({ c, up }: { c: SiteContent; up: Up }) {
  const [msg, setMsg] = useState('');
  function exportJson() {
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sas-contenido-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function importJson(f: File) {
    f.text().then((txt) => {
      try {
        const data = JSON.parse(txt) as SiteContent;
        if (!data.products || !data.sections) throw new Error();
        up((d) => Object.assign(d, data));
        setMsg('Contenido importado. Revisalo y tocá «Guardar cambios» para publicarlo.');
      } catch {
        setMsg('El archivo no es un respaldo válido del sitio.');
      }
    });
  }
  async function reset() {
    if (!confirm('Esto reemplaza todo el contenido por la versión original del sitio. ¿Continuar?')) return;
    const r = await fetch('/api/admin/content', { method: 'DELETE' });
    if (r.ok) location.reload();
  }
  return (
    <Panel title="Avanzado" intro="Respaldos del contenido. Cada vez que guardás, el panel también conserva las últimas 20 versiones.">
      <div className="a-wide a-row">
        <button type="button" className="a-btn" onClick={exportJson}>
          Descargar respaldo (JSON)
        </button>
        <label className="a-btn">
          Importar respaldo
          <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </label>
        <button type="button" className="a-btn a-btn-quiet a-danger" onClick={reset}>
          Restablecer contenido original
        </button>
      </div>
      {msg ? <p className="a-wide a-note">{msg}</p> : null}
    </Panel>
  );
}
