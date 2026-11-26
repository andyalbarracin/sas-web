import { NextResponse } from 'next/server';
import { COOKIE, DEMO_USER, cookieOptions, createSession, demoAccess } from '@/lib/server/auth';

export const runtime = 'nodejs';

/** Acceso de prueba: abre la sesión sin email. Solo con `next dev` o con ADMIN_MAGIC_LINK_LOG=1. */
export async function POST() {
  if (!demoAccess()) return NextResponse.json({ ok: false, error: 'No disponible' }, { status: 404 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, createSession(DEMO_USER), cookieOptions);
  return res;
}
