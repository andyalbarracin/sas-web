'use client';

import { useId, useRef, useState } from 'react';
import type { L } from '@/lib/content/types';

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`a-field${wide ? ' a-wide' : ''}`}>
      <span className="a-label">{label}</span>
      {children}
      {hint ? <span className="a-hint">{hint}</span> : null}
    </div>
  );
}

export function Text({ value, onChange, placeholder, type = 'text', mono }: { value: string | number | undefined; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean }) {
  return <input className={`a-input${mono ? ' a-mono' : ''}`} type={type} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

export function Area({ value, onChange, rows = 4 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return <textarea className="a-input" rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}

/** Campo bilingüe: español e inglés lado a lado. */
export function LText({ label, value, onChange, multiline, rows = 3, hint }: { label: string; value: L; onChange: (v: L) => void; multiline?: boolean; rows?: number; hint?: string }) {
  const v = value ?? { es: '', en: '' };
  const input = (lang: 'es' | 'en') =>
    multiline ? (
      <textarea className="a-input" rows={rows} value={v[lang] ?? ''} onChange={(e) => onChange({ ...v, [lang]: e.target.value })} />
    ) : (
      <input className="a-input" value={v[lang] ?? ''} onChange={(e) => onChange({ ...v, [lang]: e.target.value })} />
    );
  return (
    <div className="a-field a-wide">
      <span className="a-label">{label}</span>
      <div className="a-bi">
        <label>
          <i>ES</i>
          {input('es')}
        </label>
        <label>
          <i>EN</i>
          {input('en')}
        </label>
      </div>
      {hint ? <span className="a-hint">{hint}</span> : null}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="a-toggle">
      <input id={id} type="checkbox" role="switch" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        <span className="a-switch" aria-hidden="true" />
        <span>
          {label}
          {hint ? <small>{hint}</small> : null}
        </span>
      </label>
    </div>
  );
}

export function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select className="a-input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Imagen: vista previa, subir, quitar o pegar una URL. */
export function ImageField({ label, value, onChange, hint, dark }: { label: string; value?: string; onChange: (v: string) => void; hint?: string; dark?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  async function upload(f: File) {
    setBusy(true);
    setErr('');
    const fd = new FormData();
    fd.append('file', f);
    try {
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'No se pudo subir');
      onChange(j.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo subir');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  }
  return (
    <div className="a-field a-wide">
      <span className="a-label">{label}</span>
      <div className="a-img">
        <div className={`a-img-prev${dark ? ' dark' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="" /> : <span>Sin imagen</span>}
        </div>
        <div className="a-img-side">
          <input className="a-input a-mono" value={value ?? ''} placeholder="/img/... o https://..." onChange={(e) => onChange(e.target.value)} />
          <div className="a-row">
            <button type="button" className="a-btn" onClick={() => ref.current?.click()} disabled={busy}>
              {busy ? 'Subiendo…' : 'Subir imagen'}
            </button>
            {value ? (
              <button type="button" className="a-btn a-btn-quiet" onClick={() => onChange('')}>
                Quitar
              </button>
            ) : null}
          </div>
          <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml,image/gif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          {err ? <span className="a-err">{err}</span> : null}
          {hint ? <span className="a-hint">{hint}</span> : null}
        </div>
      </div>
    </div>
  );
}

/** Lista editable con agregar, quitar y reordenar. */
export function List<T>({
  items,
  onChange,
  render,
  title,
  make,
  addLabel = 'Agregar',
  open: openDefault = false,
  minItems = 0,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  render: (item: T, set: (v: T) => void, i: number) => React.ReactNode;
  title: (item: T, i: number) => string;
  make?: () => T;
  addLabel?: string;
  open?: boolean;
  minItems?: number;
}) {
  const [open, setOpen] = useState<number | null>(openDefault ? 0 : null);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen(open === i ? j : open);
  };
  return (
    <div className="a-list">
      {items.map((it, i) => (
        <div className="a-item" key={i} data-open={open === i}>
          <div className="a-item-head">
            <button type="button" className="a-item-title" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <span className="a-caret" aria-hidden="true" />
              {title(it, i) || '(sin título)'}
            </button>
            <div className="a-item-tools">
              <button type="button" className="a-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                ↑
              </button>
              <button type="button" className="a-icon" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Bajar">
                ↓
              </button>
              <button
                type="button"
                className="a-icon a-danger"
                disabled={items.length <= minItems}
                onClick={() => {
                  if (confirm('¿Quitar este elemento?')) onChange(items.filter((_, k) => k !== i));
                }}
                aria-label="Quitar"
              >
                ×
              </button>
            </div>
          </div>
          {open === i ? (
            <div className="a-item-body">
              {render(
                it,
                (v) => {
                  const next = items.slice();
                  next[i] = v;
                  onChange(next);
                },
                i,
              )}
            </div>
          ) : null}
        </div>
      ))}
      {make ? (
        <button
          type="button"
          className="a-btn a-add"
          onClick={() => {
            onChange([...items, make()]);
            setOpen(items.length);
          }}
        >
          + {addLabel}
        </button>
      ) : null}
    </div>
  );
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
