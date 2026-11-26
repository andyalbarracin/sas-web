import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/server/auth';
import { MAX_UPLOAD, saveUpload } from '@/lib/server/store';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get('file');
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'Falta el archivo' }, { status: 400 });
  if (file.size > MAX_UPLOAD) return NextResponse.json({ ok: false, error: 'La imagen supera los 8 MB.' }, { status: 413 });
  try {
    const url = await saveUpload(Buffer.from(await file.arrayBuffer()), file.name, file.type);
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Error al subir' }, { status: 400 });
  }
}
