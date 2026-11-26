'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Recorrido de reacondicionamiento: la línea avanza con el scroll y marca cada etapa. */
export default function Process({ steps }: { steps: { title: string; body: string }[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const line = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (line.current) line.current.style.transform = 'scaleX(1)';
      return;
    }
    const dots = ref.current!.querySelectorAll<HTMLElement>('.step-dot');
    const tw = gsap.to(line.current, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: ref.current,
        start: 'top 75%',
        end: 'bottom 55%',
        scrub: new URLSearchParams(location.search).has('capture') ? true : 0.6,
        onUpdate: (s) => {
          dots.forEach((d, i) => {
            const on = s.progress >= i / steps.length;
            d.style.background = on ? 'var(--ink)' : '';
            d.style.color = on ? '#fff' : '';
          });
        },
      },
    });
    return () => {
      tw.scrollTrigger?.kill();
      tw.kill();
    };
  }, [steps.length]);
  return (
    <ol className="steps" ref={ref}>
      <span className="steps-line" aria-hidden="true">
        <i ref={line} />
      </span>
      {steps.map((s, i) => (
        <li className="step" key={s.title}>
          <span className="step-dot" aria-hidden="true">
            {i + 1}
          </span>
          <h3 className="h3">{s.title}</h3>
          <p>{s.body}</p>
        </li>
      ))}
    </ol>
  );
}
