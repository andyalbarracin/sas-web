import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/server/auth';
import { getContent, resetContent, saveContent } from '@/lib/server/store';
import type { SiteContent } from '@/lib/content/types';

export const runtime = 'nodejs';

const deny = () => NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });

/** Validación estructural mínima: evita guardar algo que rompa el sitio. */
function valid(c: Partial<SiteContent>): string | null {
  const need = ['brand', 'seo', 'sections', 'hero', 'company', 'products', 'services', 'process', 'tools', 'coverage', 'brands', 'articles', 'contact', 'whatsapp', 'footer'] as const;
  for (const k of need) if (!(k in c)) return `Falta la sección "${k}"`;
  if (!Array.isArray(c.products) || !Array.isArray(c.sections) || !Array.isArray(c.articles)) return 'Formato inválido';
  const slugs = new Set<string>();
  for (const p of c.products) {
    for (const l of ['es', 'en'] as const) {
      const s = p.slug?.[l];
      if (!s || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return `El enlace de "${p.name?.es || p.id}" (${l.toUpperCase()}) solo puede tener minúsculas, números y guiones.`;
      if (slugs.has(l + s)) return `Hay dos productos con el enlace "${s}".`;
      slugs.add(l + s);
    }
  }
  const art = new Set<string>();
  for (const a of c.articles) {
    if (!a.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug)) return `El enlace de la nota "${a.title?.es || a.id}" solo puede tener minúsculas, números y guiones.`;
    if (art.has(a.slug)) return `Hay dos notas con el enlace "${a.slug}".`;
    art.add(a.slug);
  }
  for (const r of c.contact?.recipients ?? []) if (r && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r)) return `"${r}" no es un email válido.`;
  if (c.whatsapp?.enabled && !/^\d{8,15}$/.test((c.whatsapp.number || '').replace(/\D/g, ''))) return 'El número de WhatsApp debe tener entre 8 y 15 dígitos, con código de país (ej. 5491156974929).';
  return null;
}

export async function GET() {
  if (!(await isAdmin())) return deny();
  return NextResponse.json(await getContent());
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) return deny();
  let body: SiteContent;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }
  const err = valid(body);
  if (err) return NextResponse.json({ ok: false, error: err }, { status: 422 });
  try {
    const saved = await saveContent(body);
    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true, content: saved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Error al guardar' }, { status: 500 });
  }
}

/** Restablece el contenido original. */
export async function DELETE() {
  if (!(await isAdmin())) return deny();
  const saved = await resetContent();
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, content: saved });
}
