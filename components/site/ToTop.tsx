'use client';

import { useEffect, useState } from 'react';
import type Lenis from 'lenis';
import { ArrowUpIcon } from './icons';

/** Botón «Volver arriba». Aparece después de bajar una pantalla; usa el scroll suave de Lenis si está activo. */
export default function ToTop({ label }: { label: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const update = () => setShow(window.scrollY > window.innerHeight);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  function up(e: React.MouseEvent<HTMLButtonElement>) {
    const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    // con teclado, el foco vuelve al principio de la página
    if (e.detail === 0) document.querySelector<HTMLElement>('.skip')?.focus({ preventScroll: true });
  }

  return (
    <button type="button" className={`to-top${show ? ' is-on' : ''}`} onClick={up} aria-label={label} title={label}>
      <ArrowUpIcon />
    </button>
  );
}
