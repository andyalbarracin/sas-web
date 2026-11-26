import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Acceso al panel con enlace mágico por email (sin contraseñas ni servicios de autenticación externos).
 *
 * - ADMIN_EMAILS: lista de emails autorizados, separados por coma.
 * - ADMIN_SECRET: firma los enlaces y la sesión (HMAC-SHA256). Obligatoria en producción.
 * - El enlace vence a los 15 minutos y se puede usar una sola vez.
 * - La sesión es una cookie httpOnly firmada que dura 12 horas.
 *
 * En desarrollo (`next dev`), si ADMIN_EMAILS está vacía se acepta cualquier email
 * y el enlace se muestra en la consola del servidor.
 */

export const COOKIE = 'sas_admin';
export const LINK_TTL = 15 * 60_000;
const SESSION_TTL = 12 * 60 * 60_000;
const isProd = process.env.NODE_ENV === 'production';

export const isDevMode = () => !isProd;

/**
 * Acceso de prueba sin email (botón en la pantalla de acceso): con `next dev`, o en producción con
 * ADMIN_MAGIC_LINK_LOG=1. Cualquiera con la URL entra al panel: quitar la variable antes de entregar el sitio.
 */
export const DEMO_USER = 'acceso-de-prueba';
export const demoAccess = () => !isProd || process.env.ADMIN_MAGIC_LINK_LOG === '1';

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string) {
  const list = adminEmails();
  if (!list.length) return !isProd;
  return list.includes(email.trim().toLowerCase());
}

/** Problemas de configuración que impiden ingresar (se muestran en la pantalla de acceso). */
export function authConfigProblem(): string | null {
  if (demoAccess()) return null;
  if (isProd && !process.env.ADMIN_SECRET) return 'Falta ADMIN_SECRET en las variables de entorno.';
  if (isProd && (process.env.ADMIN_SECRET || '').length < 32) return 'ADMIN_SECRET debe tener al menos 32 caracteres.';
  if (isProd && !adminEmails().length) return 'Falta ADMIN_EMAILS en las variables de entorno.';
  return null;
}

function secret() {
  const s = process.env.ADMIN_SECRET;
  if (s) return s;
  if (isProd && !demoAccess()) throw new Error('ADMIN_SECRET no configurada');
  return 'sas-web-dev-secret-solo-para-desarrollo';
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (payload: string, purpose: string) => crypto.createHmac('sha256', secret()).update(`${purpose}.${payload}`).digest('base64url');

function verify<T extends { exp: number }>(token: string | undefined, purpose: string): T | null {
  if (!token || token.length > 2048) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  let expected: string;
  try {
    expected = sign(payload, purpose);
  } catch {
    return null;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as T;
    return typeof data.exp === 'number' && data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

// ── Enlace mágico ────────────────────────────────────────────────────
export type LinkClaims = { sub: string; jti: string; exp: number };

export function createLinkToken(email: string): string {
  const claims: LinkClaims = { sub: email.toLowerCase(), jti: crypto.randomUUID(), exp: Date.now() + LINK_TTL };
  const payload = b64(claims);
  return `${payload}.${sign(payload, 'link')}`;
}

export const verifyLinkToken = (t: string | undefined) => verify<LinkClaims>(t, 'link');

// ── Sesión ───────────────────────────────────────────────────────────
export type SessionClaims = { sub: string; exp: number };

export function createSession(email: string) {
  const payload = b64({ sub: email, exp: Date.now() + SESSION_TTL } satisfies SessionClaims);
  return `${payload}.${sign(payload, 'session')}`;
}

/** Email de la sesión activa, o null. También revalida que el email siga autorizado. */
export async function currentAdmin(): Promise<string | null> {
  const c = await cookies();
  const s = verify<SessionClaims>(c.get(COOKIE)?.value, 'session');
  if (!s) return null;
  if (s.sub === DEMO_USER) return demoAccess() ? s.sub : null;
  if (!isAllowedEmail(s.sub)) return null;
  return s.sub;
}

export async function isAdmin() {
  return (await currentAdmin()) !== null;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: isProd && process.env.SAS_INSECURE_COOKIE !== '1',
  path: '/',
  maxAge: SESSION_TTL / 1000,
};

/** URL pública para armar el enlace (no se confía en el encabezado Host en producción). */
export function publicOrigin(req: Request) {
  const env = process.env.SITE_URL?.replace(/\/$/, '');
  if (env && isProd) return env;
  return env || new URL(req.url).origin;
}
