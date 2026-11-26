import 'server-only';

/**
 * Límite de pedidos en memoria del proceso (ventana deslizante).
 * Alcanza para un servidor propio. En Vercel cada instancia tiene su propia memoria:
 * para un límite global, sumar reglas de límite de pedidos en Vercel Firewall (ver ../docs/hardening/checklist.md).
 */
const buckets = new Map<string, number[]>();

export function hit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return list.length > max;
}

export function clientIp(req: Request) {
  return (req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
}
