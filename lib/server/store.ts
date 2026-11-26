import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { BlobNotFoundError, del, get, head, list, put } from '@vercel/blob';
import { SEED } from '@/lib/content/seed';
import type { ContactMessage, SiteContent } from '@/lib/content/types';

/**
 * Almacenamiento del contenido editable, las consultas, las imágenes subidas y los
 * enlaces de acceso ya usados. Sin base de datos.
 *
 * - "file" (local): carpeta data/. Es el modo de `npm run dev` y de un servidor propio.
 * - "blob" (Vercel): un Blob store PRIVADO conectado al proyecto. Vercel lo autentica solo
 *   (OIDC o BLOB_READ_WRITE_TOKEN). Las imágenes se sirven por /media/..., nunca por URL pública.
 *
 * El modo se elige solo: en Vercel o con BLOB_READ_WRITE_TOKEN → blob; si no → file.
 * SAS_STORE=file|blob lo fuerza.
 */

export type StoreMode = 'file' | 'blob';

export const storeMode = (): StoreMode => {
  const forced = process.env.SAS_STORE;
  if (forced === 'file' || forced === 'blob') return forced;
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL ? 'blob' : 'file';
};

const DATA_DIR = process.env.SAS_DATA_DIR || path.join(process.cwd(), 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const TOKENS_FILE = path.join(DATA_DIR, 'login-tokens.json');

// Rutas dentro del Blob store
const B = {
  content: 'site/content.json',
  backups: 'site/backups/',
  messages: 'messages/',
  uploads: 'uploads/',
  usedTokens: 'auth/used/',
};

// ── Vercel Blob (privado) ────────────────────────────────────────────
function blobError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (/token|unauthori|forbidden|credential|oidc/i.test(msg)) {
    return new Error('Falta conectar un Blob store privado al proyecto en Vercel (Storage → Create → Blob → Private).');
  }
  return e instanceof Error ? e : new Error(msg);
}

async function blobText(pathname: string): Promise<string | null> {
  try {
    const r = await get(pathname, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return await new Response(r.stream).text();
  } catch (e) {
    if (e instanceof Error && /not.?found/i.test(e.name + e.message)) return null;
    throw blobError(e);
  }
}

async function blobPutJson(pathname: string, value: unknown, overwrite = true) {
  try {
    await put(pathname, JSON.stringify(value, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: overwrite,
      cacheControlMaxAge: 60,
    });
  } catch (e) {
    throw blobError(e);
  }
}

async function blobListAll(prefix: string) {
  const out: { pathname: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  try {
    do {
      const r = await list({ prefix, cursor, limit: 1000 });
      out.push(...r.blobs.map((b) => ({ pathname: b.pathname, uploadedAt: new Date(b.uploadedAt) })));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
  } catch (e) {
    throw blobError(e);
  }
  return out;
}

// ── Mezcla con los valores por defecto ───────────────────────────────
// Si una versión futura del sitio agrega campos, el contenido guardado los hereda del seed.
type Json = Record<string, unknown>;
function fill<T>(saved: T, base: T): T {
  if (Array.isArray(base)) return (Array.isArray(saved) ? saved : base) as T;
  if (base && typeof base === 'object') {
    const out: Json = { ...(base as Json) };
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      for (const [k, v] of Object.entries(saved as Json)) {
        out[k] = k in (base as Json) ? fill(v, (base as Json)[k]) : v;
      }
    }
    return out as T;
  }
  return (saved === undefined || saved === null ? base : saved) as T;
}

/** Completa secciones que falten (si el seed agrega una nueva). */
function normalize(c: SiteContent): SiteContent {
  const ids = new Set(c.sections.map((s) => s.id));
  for (const s of SEED.sections) if (!ids.has(s.id)) c.sections.push(s);
  return c;
}

// ── Contenido ────────────────────────────────────────────────────────
let memo: { at: number; key: string; value: SiteContent } | null = null;
const TTL = 10_000;

export async function getContent(): Promise<SiteContent> {
  if (storeMode() === 'blob') {
    if (memo && Date.now() - memo.at < TTL) return memo.value;
    try {
      const raw = await blobText(B.content);
      const value = raw ? normalize(fill(JSON.parse(raw) as SiteContent, SEED)) : SEED;
      memo = { at: Date.now(), key: 'blob', value };
      return value;
    } catch (e) {
      console.error('[store] no se pudo leer el contenido', e instanceof Error ? e.message : e);
      return memo?.value ?? SEED;
    }
  }
  try {
    const st = await fs.stat(CONTENT_FILE);
    const key = String(st.mtimeMs);
    if (memo && memo.key === key) return memo.value;
    const raw = JSON.parse(await fs.readFile(CONTENT_FILE, 'utf8')) as SiteContent;
    const value = normalize(fill(raw, SEED));
    memo = { at: Date.now(), key, value };
    return value;
  } catch {
    return SEED;
  }
}

export async function saveContent(next: SiteContent): Promise<SiteContent> {
  const value: SiteContent = { ...next, updatedAt: new Date().toISOString() };
  if (storeMode() === 'blob') {
    // respaldo de la versión anterior y limpieza: se conservan las últimas 20
    const prev = await blobText(B.content);
    if (prev) await blobPutJson(`${B.backups}content-${Date.now()}.json`, JSON.parse(prev), false);
    await blobPutJson(B.content, value);
    const backups = (await blobListAll(B.backups)).sort((a, b) => a.pathname.localeCompare(b.pathname));
    const old = backups.slice(0, Math.max(0, backups.length - 20)).map((b) => b.pathname);
    if (old.length) await del(old).catch(() => undefined);
    memo = { at: Date.now(), key: 'blob', value };
    return value;
  }
  await fs.mkdir(path.join(DATA_DIR, 'backups'), { recursive: true });
  try {
    await fs.copyFile(CONTENT_FILE, path.join(DATA_DIR, 'backups', `content-${Date.now()}.json`));
    const files = (await fs.readdir(path.join(DATA_DIR, 'backups'))).filter((f) => f.startsWith('content-')).sort();
    for (const f of files.slice(0, Math.max(0, files.length - 20))) await fs.unlink(path.join(DATA_DIR, 'backups', f));
  } catch {
    /* primera vez: no hay archivo previo */
  }
  const tmp = CONTENT_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, CONTENT_FILE);
  memo = null;
  return value;
}

export async function resetContent(): Promise<SiteContent> {
  return saveContent(structuredClone(SEED));
}

// ── Consultas del formulario ─────────────────────────────────────────
// En Blob, una consulta por archivo: no hay escrituras concurrentes sobre un mismo archivo.
const msgPath = (m: Pick<ContactMessage, 'id' | 'createdAt'>) => `${B.messages}${m.createdAt.replace(/[:.]/g, '-')}_${m.id}.json`;

export async function addMessage(m: ContactMessage) {
  if (storeMode() === 'blob') return blobPutJson(msgPath(m), m, false);
  const all = await listMessages();
  all.unshift(m);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(all.slice(0, 2000), null, 2));
}

export async function listMessages(): Promise<ContactMessage[]> {
  if (storeMode() === 'blob') {
    const files = (await blobListAll(B.messages)).sort((a, b) => b.pathname.localeCompare(a.pathname)).slice(0, 300);
    const out = await Promise.all(files.map(async (f) => JSON.parse((await blobText(f.pathname)) || 'null') as ContactMessage | null));
    return out.filter((x): x is ContactMessage => !!x);
  }
  try {
    return JSON.parse(await fs.readFile(MESSAGES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function findMessagePath(id: string) {
  const files = await blobListAll(B.messages);
  return files.find((f) => f.pathname.endsWith(`_${id}.json`))?.pathname;
}

export async function updateMessage(id: string, patch: Partial<Pick<ContactMessage, 'read'>>) {
  if (storeMode() === 'blob') {
    const p = await findMessagePath(id);
    if (!p) return;
    const m = JSON.parse((await blobText(p)) || 'null') as ContactMessage | null;
    if (m) await blobPutJson(p, { ...m, ...patch });
    return;
  }
  const all = await listMessages();
  const i = all.findIndex((m) => m.id === id);
  if (i >= 0) all[i] = { ...all[i], ...patch };
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(all, null, 2));
}

export async function deleteMessage(id: string) {
  if (storeMode() === 'blob') {
    const p = await findMessagePath(id);
    if (p) await del(p).catch((e) => Promise.reject(blobError(e)));
    return;
  }
  const all = (await listMessages()).filter((m) => m.id !== id);
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(all, null, 2));
}

// ── Imágenes ─────────────────────────────────────────────────────────
const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
};
export const MEDIA_TYPES: Record<string, string> = Object.fromEntries(Object.entries(ALLOWED).map(([k, v]) => [v, k]));
export const MAX_UPLOAD = 8 * 1024 * 1024;

/** Guarda una imagen y devuelve su URL pública dentro del sitio (/media/...). */
export async function saveUpload(buf: Buffer, originalName: string, mime: string): Promise<string> {
  const ext = ALLOWED[mime];
  if (!ext) throw new Error('Formato no admitido. Usá PNG, JPG, WebP, AVIF, SVG o GIF.');
  if (buf.length > MAX_UPLOAD) throw new Error('La imagen supera los 8 MB.');
  const base =
    originalName
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'imagen';
  const name = `${base}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
  if (storeMode() === 'blob') {
    try {
      await put(`${B.uploads}${name}`, buf, { access: 'private', contentType: mime, addRandomSuffix: false, allowOverwrite: false });
    } catch (e) {
      throw blobError(e);
    }
  } else {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
  }
  return `/media/${name}`;
}

/** Lee una imagen subida para servirla por /media/... */
export async function readUpload(name: string): Promise<{ body: BodyInit; type: string } | null> {
  const ext = name.split('.').pop() || '';
  const type = MEDIA_TYPES[ext] || 'application/octet-stream';
  if (storeMode() === 'blob') {
    try {
      const r = await get(`${B.uploads}${name}`, { access: 'private' });
      if (!r || r.statusCode !== 200) return null;
      return { body: r.stream as BodyInit, type };
    } catch {
      return null;
    }
  }
  try {
    return { body: new Blob([new Uint8Array(await fs.readFile(path.join(UPLOAD_DIR, name)))], { type }), type };
  } catch {
    return null;
  }
}

export async function listUploads(): Promise<string[]> {
  if (storeMode() === 'blob') {
    return (await blobListAll(B.uploads)).map((b) => `/media/${b.pathname.slice(B.uploads.length)}`);
  }
  try {
    return (await fs.readdir(UPLOAD_DIR)).filter((f) => !f.startsWith('.')).map((f) => `/media/${f}`);
  } catch {
    return [];
  }
}

// ── Enlaces de acceso de un solo uso ────────────────────────────────
/**
 * Marca un enlace como usado. Devuelve false si ya se había usado.
 * En Blob se crea un archivo por enlace sin permitir sobrescritura: un segundo intento falla.
 */
export async function consumeLoginToken(jti: string, _email: string, exp: number): Promise<boolean> {
  const key = crypto.createHash('sha256').update(jti).digest('hex');
  if (storeMode() === 'blob') {
    const p = `${B.usedTokens}${key}`;
    const exists = async () => {
      try {
        await head(p);
        return true;
      } catch (e) {
        if (e instanceof BlobNotFoundError) return false;
        throw blobError(e);
      }
    };
    if (await exists()) return false;
    try {
      await put(p, JSON.stringify({ exp }), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: false });
      return true;
    } catch (e) {
      // sin sobrescritura: si otro pedido lo creó en el medio, el enlace ya se usó
      if (await exists()) return false;
      throw blobError(e);
    }
  }
  let all: { key: string; exp: number }[] = [];
  try {
    all = JSON.parse(await fs.readFile(TOKENS_FILE, 'utf8'));
  } catch {
    /* sin archivo todavía */
  }
  all = all.filter((t) => t.exp > Date.now() - 86_400_000);
  if (all.some((t) => t.key === key)) return false;
  all.push({ key, exp });
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TOKENS_FILE, JSON.stringify(all));
  return true;
}
