'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Scroll suave (Lenis) sincronizado con GSAP ScrollTrigger. Se desactiva con "reducir movimiento". */
export default function SmoothScroll() {
  useEffect(() => {
    if (new URLSearchParams(location.search).has('capture')) document.documentElement.classList.add('capture');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('capture')) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 0.95 });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Anclas del menú: la sección queda arriba de todo. Mientras carga, la portada y la bomba fijadas
    // y las imágenes cambian la altura de la página, así que el destino se recalcula hasta llegar.
    let target: HTMLElement | null = null;
    const top = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;
    const go = (immediate: boolean) => {
      const el = target;
      if (!el) return;
      lenis.resize(); // el límite de scroll tiene que incluir la altura que se acaba de sumar
      lenis.scrollTo(top(el), {
        immediate,
        force: true,
        onComplete: () => {
          if (target === el && Math.abs(el.getBoundingClientRect().top) > 2) lenis.scrollTo(top(el), { immediate: true, force: true });
        },
      });
    };
    const byHash = (hash: string) => {
      const el = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
      return el && el.id !== 'main' ? el : null;
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
      const el = byHash(url.hash);
      if (!el) return;
      e.preventDefault();
      target = el;
      // un cuadro de espera: el menú del celular se cierra y libera el scroll
      requestAnimationFrame(() => go(false));
    };
    // el usuario toma el control: se deja de corregir
    const release = () => {
      target = null;
    };
    const resized = new ResizeObserver(() => go(!lenis.isScrolling));
    resized.observe(document.body);
    document.addEventListener('click', onClick);
    for (const ev of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) window.addEventListener(ev, release, { passive: true });
    target = byHash(location.hash);
    go(true);

    return () => {
      resized.disconnect();
      document.removeEventListener('click', onClick);
      for (const ev of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) window.removeEventListener(ev, release);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  return null;
}
