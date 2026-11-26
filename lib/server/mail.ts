import 'server-only';
import { Resend } from 'resend';

export const mailConfigured = () => !!process.env.RESEND_API_KEY;

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

let client: Resend | null = null;

/** Envía un email con Resend. Devuelve el error como texto, o null si salió. */
export async function sendMail(opts: { from: string; to: string[]; subject: string; html: string; text: string; replyTo?: string }): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return 'RESEND_API_KEY no configurada';
  client ??= new Resend(key);
  try {
    const { error } = await client.emails.send(opts);
    return error ? error.message : null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Error de Resend';
  }
}

/** Remitente para los emails del sistema (acceso al panel). */
export const systemFrom = () => process.env.MAIL_FROM || 'SAS Web <onboarding@resend.dev>';

export function magicLinkEmail(link: string, minutes: number) {
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f3f6f9;padding:32px 16px">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;padding:32px;color:#19324E">
<p style="margin:0 0 4px;font-size:13px;color:#5b6b7e">SAS South America Supplier</p>
<h1 style="margin:0 0 16px;font-size:22px">Ingresar al panel del sitio</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#2c3e54">Tocá el botón para entrar. El enlace vence en ${minutes} minutos y sirve una sola vez.</p>
<p style="margin:0 0 24px"><a href="${esc(link)}" style="display:inline-block;background:#19324E;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold">Ingresar al panel</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#5b6b7e">Si no pediste este enlace, ignorá este email: nadie puede entrar sin abrirlo.</p>
</div></div>`;
  const text = `Ingresar al panel del sitio de SAS\n\n${link}\n\nEl enlace vence en ${minutes} minutos y sirve una sola vez. Si no lo pediste, ignorá este email.`;
  return { html, text };
}
