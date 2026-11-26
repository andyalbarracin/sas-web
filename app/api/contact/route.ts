import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { addMessage, getContent } from '@/lib/server/store';
import { esc, mailConfigured, sendMail } from '@/lib/server/mail';
import { clientIp, hit } from '@/lib/server/rate-limit';
import type { ContactMessage } from '@/lib/content/types';

export const runtime = 'nodejs';

const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  // Anti-spam: campo trampa y tiempo mínimo de llenado (respuesta "ok" para no dar pistas).
  if (body.website || Number(body.elapsed ?? 0) < 1500) return NextResponse.json({ ok: true });
  if (hit(`contact:${clientIp(req)}`, 5, 10 * 60_000)) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });

  const m: ContactMessage = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: clip(body.name, 80),
    lastName: clip(body.lastName, 80),
    company: clip(body.company, 120),
    email: clip(body.email, 160),
    phone: clip(body.phone, 40),
    interest: clip(body.interest, 120),
    message: clip(body.message, 5000),
    lang: body.lang === 'en' ? 'en' : 'es',
    delivered: false,
  };
  if (!m.name || !m.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email)) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 422 });
  }

  const c = await getContent();
  const to = c.contact.recipients.filter(Boolean);
  if (mailConfigured() && to.length) {
    const rows: [string, string][] = [
      ['Nombre', `${m.name} ${m.lastName}`.trim()],
      ['Empresa', m.company],
      ['Email', m.email],
      ['Teléfono', m.phone],
      ['Tema', m.interest],
      ['Idioma', m.lang === 'es' ? 'Español' : 'Inglés'],
    ];
    const filled = rows.filter(([, v]) => v);
    const html = `<div style="font-family:Arial,sans-serif;color:#19324E;font-size:15px;line-height:1.5">
<h2 style="margin:0 0 12px;font-size:18px">Nueva consulta desde la web</h2>
<table style="border-collapse:collapse;margin-bottom:16px">${filled
      .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#5b6b7e">${k}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`)
      .join('')}</table>
<div style="white-space:pre-wrap;border-top:1px solid #d3dbe4;padding-top:12px">${esc(m.message)}</div></div>`;
    const subject = `${c.contact.subjectPrefix} ${m.interest ? m.interest + ': ' : ''}${m.name} ${m.lastName}`.replace(/[\r\n]+/g, ' ').trim();
    const err = await sendMail({
      from: c.contact.fromEmail || process.env.MAIL_FROM || 'SAS Web <onboarding@resend.dev>',
      to,
      replyTo: m.email,
      subject,
      html,
      text: `${filled.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${m.message}`,
    });
    if (err) m.error = err;
    else m.delivered = true;
  } else {
    m.error = mailConfigured() ? 'Sin destinatarios configurados' : 'RESEND_API_KEY no configurada: el mensaje quedó guardado en el panel';
  }

  try {
    await addMessage(m);
  } catch (e) {
    console.error('[contact] no se pudo guardar', e);
    if (!m.delivered) return NextResponse.json({ ok: false, error: 'store' }, { status: 500 });
  }
  if (!m.delivered) console.warn('[contact]', m.error);
  return NextResponse.json({ ok: true });
}
