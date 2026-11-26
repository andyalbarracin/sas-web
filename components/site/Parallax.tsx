'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Imagen con desplazamiento parallax dentro de su marco. */
export default function Parallax({ src, alt, caption, note }: { src: string; alt: string; caption?: string; note?: string }) {
  const fig = useRef<HTMLElement>(null);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tw = gsap.fromTo(
      img.current,
      { yPercent: -9 },
      { yPercent: 9, ease: 'none', scrollTrigger: { trigger: fig.current, start: 'top bottom', end: 'bottom top', scrub: true } },
    );
    return () => {
      tw.scrollTrigger?.kill();
      tw.kill();
    };
  }, []);
  return (
    <figure className="company-band" ref={fig}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={src} alt={alt} loading="lazy" />
      {caption ? (
        <figcaption>
          {caption}
          {note ? <small>{note}</small> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
