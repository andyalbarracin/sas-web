import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/server/auth';
import { listUploads } from '@/lib/server/store';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json(await listUploads());
}
