'use client';

import { createElement, useEffect, useState } from 'react';

const SRC = '/zaire-calc/zaire-calc.js';
let loading: Promise<void> | null = null;

function load() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (customElements.get('zaire-calc')) return Promise.resolve();
  if (!loading) {
    loading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error('zaire-calc'));
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Herramientas técnicas de Zaire (Web Components) con la paleta de SAS. */
export default function ZaireCalc({ tag = 'zaire-calc', lang, company = 'SAS', attrs = {} }: { tag?: 'zaire-calc' | 'zaire-pressure' | 'zaire-oring'; lang: string; company?: string; attrs?: Record<string, string> }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    load().then(() => setOk(true)).catch(() => setOk(false));
  }, []);
  const style = {
    '--zaire-accent': '#1D70B6',
    '--zaire-ink': '#19324E',
    '--zaire-ink-2': '#44546A',
    '--zaire-ink-3': '#5A687B',
    '--zaire-line': '#D3DAE2',
    '--zaire-line-2': '#E5E9EE',
    '--zaire-sunken': '#F1F4F7',
    '--zaire-font': "'Barlow', system-ui, sans-serif",
    '--zaire-font-cond': "'Barlow Condensed', 'Barlow', sans-serif",
    display: 'block',
    minHeight: 360,
  } as React.CSSProperties;
  return (
    <div style={style}>
      {ok ? createElement(tag, { lang, company, credit: 'false', fonts: 'none', ...attrs }) : null}
    </div>
  );
}
