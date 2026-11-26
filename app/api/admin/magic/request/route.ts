import { NextResponse } from 'next/server';
import { LINK_TTL, authConfigProblem, createLinkToken, isAllowedEmail, isDevMode, publicOrigin } from '@/lib/server/auth';
import { magicLinkEmail, mailConfigured, sendMail, systemFrom } from '@/lib/server/mail';
import { clientIp, hit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

// Respuesta idéntica exista o no el email: no se puede averiguar quién tiene acceso.
const SENT = { ok: true, message: 'Si ese email tiene acceso, te llega un enlace para ingresar. Vence en 15 minutos.' };

export async function POST(req: Request) {
  const problem = authConfigProblem();
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 503 });

  const ip = clientIp(req);
  if (hit(`magic-ip:${ip}`, 6, 15 * 60_000)) {
    return NextResponse.json({ ok: false, error: 'Demasiados pedidos. Probá de nuevo en unos minutos.' }, { status: 429 });
  }
  let email = '';
  try {
    email = String((await req.json()).email ?? '').trim().toLowerCase().slice(0, 160);
  } catch {
    /* cuerpo vacío */
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, error: 'Revisá el email.' }, { status: 422 });
  if (hit(`magic-email:${email}`, 3, 15 * 60_000)) return NextResponse.json(SENT);
  if (!isAllowedEmail(email)) {
    console.warn('[admin] pedido de acceso de un email no autorizado');
    return NextResponse.json(SENT);
  }

  // El token va en el fragmento (#): no viaja al servidor ni queda en registros
  // ni en la cabecera Referer, y los escáneres de enlaces no lo consumen.
  const link = `${publicOrigin(req)}/admin/acceder#t=${createLinkToken(email)}`;
  const minutes = LINK_TTL / 60_000;

  if (!mailConfigured()) {
    if (isDevMode() || process.env.ADMIN_MAGIC_LINK_LOG === '1') {
      console.info(`\n[admin] Enlace de acceso para ${email}:\n${link}\n`);
      // Solo con `next dev`: el enlace vuelve en la respuesta y la pantalla de acceso lo muestra.
      return NextResponse.json({ ...SENT, dev: true, ...(isDevMode() ? { link } : {}) });
    }
    console.error('[admin] RESEND_API_KEY no configurada: no se puede enviar el enlace');
    return NextResponse.json({ ok: false, error: 'El envío de emails no está configurado.' }, { status: 503 });
  }
  const { html, text } = magicLinkEmail(link, minutes);
  const err = await sendMail({ from: systemFrom(), to: [email], subject: 'Tu enlace para ingresar al panel de SAS', html, text });
  if (err) {
    console.error('[admin] no se pudo enviar el enlace:', err);
    return NextResponse.json({ ok: false, error: 'No pudimos enviar el email. Probá de nuevo.' }, { status: 502 });
  }
  return NextResponse.json(SENT);
}
