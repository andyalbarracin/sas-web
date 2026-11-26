'use client';

import { useState } from 'react';

type Svc = { id: string; title: string; short: string; points: string[]; image?: string };

export default function Services({ title, lead, items }: { title: string; lead: string; items: Svc[] }) {
  const [open, setOpen] = useState(items[0]?.id ?? '');
  const shown = items.find((s) => s.id === open) ?? items[0];
  return (
    <div className="services">
      <div className="services-aside">
        <h2 className="h2">{title}</h2>
        <p className="lead">{lead}</p>
        <div className="duo" aria-hidden="true">
          {items
            .filter((s) => s.image)
            .map((s) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s.id} src={s.image} alt="" loading="lazy" data-active={s.id === shown?.id} />
            ))}
        </div>
      </div>
      <div>
        {items.map((s) => (
          <details
            key={s.id}
            className="svc"
            open={s.id === open}
            onToggle={(e) => {
              const el = e.currentTarget;
              if (el.open) setOpen(s.id);
              else if (open === s.id) setOpen('');
            }}
          >
            <summary
              onClick={(e) => {
                e.preventDefault();
                setOpen((v) => (v === s.id ? '' : s.id));
              }}
            >
              <b>{s.title}</b>
              <span>{s.short}</span>
              <i aria-hidden="true" />
            </summary>
            <ul>
              {s.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
