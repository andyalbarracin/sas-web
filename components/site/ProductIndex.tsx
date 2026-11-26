'use client';

import { useState } from 'react';

type Item = { id: string; name: string; short: string; href: string; image: string; standards: string[]; body: string };

/** Índice de líneas: la lista controla el escenario con el render de cada producto. */
export default function ProductIndex({ items, cta }: { items: Item[]; cta: string }) {
  const [active, setActive] = useState(0);
  const cur = items[active] ?? items[0];
  return (
    <div className="pindex">
      <ul className="plist">
        {items.map((it, i) => (
          <li key={it.id}>
            <a href={it.href} data-active={i === active} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pthumb" src={it.image} alt="" loading="lazy" width={96} height={72} />
              <b>{it.name}</b>
              <small>{it.short}</small>
            </a>
          </li>
        ))}
      </ul>
      <div className="pstage" aria-hidden="true">
        <div className="pstage-img">
          {items.map((it, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={it.id} src={it.image} alt="" data-active={i === active} loading={i < 2 ? 'eager' : 'lazy'} />
          ))}
        </div>
        <div className="pstage-info">
          <div>
            <b className="h3">{cur.name}</b>
            <p>{cur.body}</p>
          </div>
          <a className="btn btn-ghost btn-sm" href={cur.href} tabIndex={-1}>
            {cta}
          </a>
          {cur.standards.length ? (
            <ul className="chips" style={{ gridColumn: '1 / -1' }}>
              {cur.standards.map((s) => (
                <li className="chip" key={s}>
                  {s}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
