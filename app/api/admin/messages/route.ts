import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/server/auth';
import { deleteMessage, listMessages, updateMessage } from '@/lib/server/store';

export const runtime = 'nodejs';
const deny = () => NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });

export async function GET() {
  if (!(await isAdmin())) return deny();
  return NextResponse.json(await listMessages());
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return deny();
  const { id, read } = await req.json();
  await updateMessage(String(id), { read: !!read });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return deny();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await deleteMessage(id);
  return NextResponse.json({ ok: true });
}
