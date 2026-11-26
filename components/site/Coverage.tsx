'use client';

import { useState } from 'react';

type Pin = { id: string; x: number; y: number; dy: number; name: string; kind: string; address: string; soon: boolean; partner?: string; phone?: string; email?: string; short: string };

interface Props {
  title: string;
  lead: string;
  w: number;
  h: number;
  step: number;
  ar: [number, number][];
  sa: [number, number][];
  pins: Pin[];
  soonLabel: string;
  repLabel: string;
}

/** Mapa de puntos del Cono Sur con los centros y representantes, sincronizado con la lista. */
export default function Coverage(p: Props) {
  const [active, setActive] = useState<string | null>(null);
  const r = p.step * 0.32;
  return (
    <div className="coverage">
      <div>
        <h2 className="h2">{p.title}</h2>
        <p className="lead" style={{ marginTop: 20 }}>
          {p.lead}
        </p>
      <ul className="locs">
        {p.pins.map((l) => (
          <li
            key={l.id}
            className="loc"
            data-active={active === l.id}
            onMouseEnter={() => setActive(l.id)}
            onMouseLeave={() => setActive(null)}
            tabIndex={0}
            onFocus={() => setActive(l.id)}
            onBlur={() => setActive(null)}
          >
            <b>
              {l.name}
              {l.soon ? <span className="soon">{p.soonLabel}</span> : null}
            </b>
            <span className="kind">{l.kind}</span>
            <span className="addr">
              {l.address}
              {l.partner ? (
                <>
                  <br />
                  {p.repLabel}: {l.partner}
                </>
              ) : null}
              {l.phone || l.email ? (
                <>
                  <br />
                  {l.phone ? <a href={`tel:${l.phone.replace(/[^+\d]/g, '')}`}>{l.phone}</a> : null}
                  {l.phone && l.email ? <br /> : null}
                  {l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : null}
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      </div>
      <div className="map" data-map>
        <svg viewBox={`0 0 ${p.w} ${p.h}`} role="img" aria-label={p.pins.map((x) => x.name).join(', ')}>
          <g className="d-sa">
            {p.sa.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={r} />
            ))}
          </g>
          <g className="d-ar">
            {p.ar.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={r} />
            ))}
          </g>
          {p.pins.map((l) => {
            const left = l.x > p.w * 0.62;
            return (
              <g key={l.id} className={`pin${l.soon ? ' soon' : ''}`} data-active={active === l.id} onMouseEnter={() => setActive(l.id)} onMouseLeave={() => setActive(null)}>
                <circle className="halo" cx={l.x} cy={l.y} r={active === l.id ? 26 : 16} />
                <circle className="core" cx={l.x} cy={l.y} r={7} />
                <text x={left ? l.x - 14 : l.x + 14} y={l.y + 5 + l.dy} textAnchor={left ? 'end' : 'start'}>
                  {l.short}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
