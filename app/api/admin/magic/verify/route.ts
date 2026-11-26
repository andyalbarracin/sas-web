import { NextResponse } from 'next/server';
import { COOKIE, cookieOptions, createSession, isAllowedEmail, verifyLinkToken } from '@/lib/server/auth';
import { consumeLoginToken } from '@/lib/server/store';
import { clientIp, hit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  // Solo desde el propio sitio
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin && origin !== process.env.SITE_URL?.replace(/\/$/, '')) return fail('Origen no permitido.', 403);
  if (hit(`verify-ip:${clientIp(req)}`, 20, 15 * 60_000)) return fail('Demasiados intentos.', 429);

  let token = '';
  try {
    token = String((await req.json()).token ?? '');
  } catch {
    /* cuerpo vacío */
  }
  const claims = verifyLinkToken(token);
  if (!claims) return fail('El enlace no es válido o venció. Pedí uno nuevo.', 401);
  if (!isAllowedEmail(claims.sub)) return fail('Este email ya no tiene acceso.', 403);
  try {
    const fresh = await consumeLoginToken(claims.jti, claims.sub, claims.exp);
    if (!fresh) return fail('Este enlace ya se usó. Pedí uno nuevo.', 401);
  } catch (e) {
    console.error('[admin] no se pudo registrar el uso del enlace', e);
    return fail('No se pudo validar el enlace. Probá de nuevo.', 500);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, createSession(claims.sub), cookieOptions);
  return res;
}
