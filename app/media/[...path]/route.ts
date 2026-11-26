import { readUpload } from '@/lib/server/store';

export const runtime = 'nodejs';

/** Sirve las imágenes subidas desde el panel (carpeta data/uploads en local, Blob privado en Vercel). */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const name = parts.join('/');
  if (!/^[a-z0-9-]+\.(png|jpg|webp|avif|gif|svg)$/.test(name)) return new Response('Not found', { status: 404 });
  const file = await readUpload(name);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(file.body, {
    headers: {
      'Content-Type': file.type,
      // los nombres son únicos: se puede cachear para siempre en el navegador y en la CDN de Vercel
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ...(file.type === 'image/svg+xml' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
    },
  });
}
