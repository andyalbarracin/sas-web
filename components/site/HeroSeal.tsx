'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Props {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  facts: { value: string; label: string }[];
  labels: Record<string, string>;
  caption: string;
  hint: string;
  explode: boolean;
}

const SHOW = ['rotary', 'carbon', 'statOring', 'springs', 'gland', 'sleeve', 'collar', 'clips'];
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function HeroSeal(p: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const factsRef = useRef<HTMLDivElement>(null);
  const calloutsRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const capture = new URLSearchParams(location.search).has('capture');

    (async () => {
      const [THREE, stageMod, sealMod] = await Promise.all([import('three'), import('@/lib/three/stage.js'), import('@/lib/three/seal.js')]);
      if (disposed || !canvasRef.current || !wrapRef.current) return;
      let st: ReturnType<typeof stageMod.createStage>;
      try {
        st = stageMod.createStage(canvasRef.current, { shadowY: -78, dpr: Math.min(window.devicePixelRatio || 1, 1.75) });
      } catch {
        return; // sin WebGL: queda el póster
      }
      const model = sealMod.buildSeal();
      st.scene.add(model.root);
      const cam = st.camera;
      const A = { pos: new THREE.Vector3(-196, 124, 344), look: new THREE.Vector3(0, -6, 0) };
      const B = { pos: new THREE.Vector3(-96, 118, 540), look: new THREE.Vector3(-30, -4, 0) };
      const look = new THREE.Vector3();
      const state = { target: 0, p: 0, mx: 0, my: 0, sx: 0, sy: 0, W: 1, H: 1, desktop: true, visible: true };

      const fit = () => {
        const r = wrapRef.current!.getBoundingClientRect();
        state.W = Math.max(1, r.width);
        state.H = Math.max(1, r.height);
        state.desktop = window.innerWidth > 960;
        st.resize(state.W, state.H);
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(wrapRef.current);

      // Etiquetas
      const box = calloutsRef.current!;
      const items = SHOW.map((key) => ({
        key,
        part: model.parts.find((x: { key: string }) => x.key === key)!,
        label: box.querySelector<HTMLElement>(`.callout[data-k="${key}"]`)!,
        line: box.querySelector<SVGLineElement>(`line[data-k="${key}"]`)!,
        dot: box.querySelector<SVGCircleElement>(`circle[data-k="${key}"]`)!,
        sx: 0,
        sy: 0,
      }));
      const tmp = new THREE.Vector3();

      const onMove = (e: PointerEvent) => {
        state.mx = (e.clientX / window.innerWidth) * 2 - 1;
        state.my = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener('pointermove', onMove, { passive: true });

      const io = new IntersectionObserver(([en]) => (state.visible = en.isIntersecting), { rootMargin: '100px' });
      io.observe(sectionRef.current!);

      const t0 = performance.now();
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (!state.visible || document.hidden) return;
        state.p += (state.target - state.p) * (capture ? 1 : 0.14);
        if (Math.abs(state.target - state.p) < 0.0005) state.p = state.target;
        const pr = state.p;
        sealMod.setExplode(model, pr);
        const time = (now - t0) / 1000;
        state.sx += (state.mx - state.sx) * 0.05;
        if (capture) state.sx = state.sy = 0;
        state.sy += (state.my - state.sy) * 0.05;
        const idle = reduce ? 0 : 1;
        model.root.rotation.y = (Math.sin((capture ? window.scrollY / 900 : time) * 0.32) * 0.2 * idle + state.sx * 0.12 * idle) * (1 - pr * 0.85);
        model.root.rotation.x = state.sy * 0.05 * idle * (1 - pr);
        const e = sealMod.easeInOut(pr);
        cam.position.lerpVectors(A.pos, B.pos, e);
        look.lerpVectors(A.look, B.look, e);
        cam.lookAt(look);
        if (state.desktop) cam.setViewOffset(state.W, state.H, -state.W * 0.19 * (1 - e), -state.H * 0.02, state.W, state.H);
        else cam.setViewOffset(state.W, state.H, -state.W * 0.07, 0, state.W, state.H);
        st.render();

        // copia y datos
        const fade = state.desktop ? smooth(0.08, 0.42, pr) : 0;
        if (copyRef.current) {
          copyRef.current.style.opacity = String(1 - fade);
          copyRef.current.style.transform = `translate3d(0, ${-fade * 40}px, 0)`;
          copyRef.current.style.visibility = fade > 0.99 ? 'hidden' : 'visible';
        }
        if (factsRef.current) factsRef.current.style.opacity = String(1 - fade);
        if (hintRef.current) hintRef.current.style.opacity = String(1 - smooth(0.02, 0.15, pr));
        const show = state.desktop ? smooth(0.62, 0.9, pr) : 0;
        if (captionRef.current) captionRef.current.style.opacity = String(show);
        box.style.opacity = String(show);
        if (show > 0.001) {
          const sorted = items
            .map((it) => {
              tmp.copy(it.part.anchor);
              it.part.object.localToWorld(tmp);
              tmp.project(cam);
              it.sx = (tmp.x * 0.5 + 0.5) * state.W;
              it.sy = (-tmp.y * 0.5 + 0.5) * state.H;
              return it;
            })
            .sort((a, b) => a.sx - b.sx);
          const lastX = { up: [-1e9, -1e9], dn: [-1e9, -1e9] };
          sorted.forEach((it) => {
            const up = it.sy < state.H * 0.5;
            const lanes = up ? lastX.up : lastX.dn;
            // elige el carril libre más cercano para no pisar la etiqueta anterior
            const row = it.sx - lanes[0] > 170 ? 0 : it.sx - lanes[1] > 170 ? 1 : 0;
            lanes[row] = it.sx;
            const base = up ? Math.min(state.H * 0.2, it.sy - 60) : Math.max(state.H * 0.8, it.sy + 60);
            const ly = up ? base - row * 30 : base + row * 30;
            it.line.setAttribute('x1', String(it.sx));
            it.line.setAttribute('y1', String(it.sy));
            it.line.setAttribute('x2', String(it.sx));
            it.line.setAttribute('y2', String(up ? ly + 10 : ly - 8));
            it.dot.setAttribute('cx', String(it.sx));
            it.dot.setAttribute('cy', String(it.sy));
            it.label.style.transform = `translate3d(${it.sx}px, ${up ? ly - 12 : ly - 4}px, 0) translateX(-50%)`;
          });
        }
      };
      raf = requestAnimationFrame(frame);
      setReady(true);

      // Scroll: despiece
      const mm = gsap.matchMedia();
      if (p.explode && !reduce) {
        mm.add('(min-width: 961px)', () => {
          const trig = ScrollTrigger.create({
            trigger: sectionRef.current,
            start: 'top top',
            end: '+=150%',
            pin: pinRef.current,
            scrub: capture ? true : 0.4,
            onUpdate: (s) => (state.target = s.progress),
          });
          return () => trig.kill();
        });
        mm.add('(max-width: 960px)', () => {
          const trig = ScrollTrigger.create({
            trigger: wrapRef.current,
            start: 'top 70%',
            end: 'bottom 25%',
            scrub: 0.4,
            onUpdate: (s) => (state.target = s.progress),
          });
          return () => trig.kill();
        });
      }

      cleanup = () => {
        mm.revert();
        ro.disconnect();
        io.disconnect();
        window.removeEventListener('pointermove', onMove);
        st.dispose();
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [p.explode]);

  return (
    <section className="hero" id={p.id} ref={sectionRef} aria-label={p.title}>
      <div className="hero-pin" ref={pinRef}>
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-canvas" ref={wrapRef} data-ready={ready}>
          <div className="hero-poster" style={{ backgroundImage: 'url(/img/render/sellos-mecanicos.webp)' }} aria-hidden="true" />
          <canvas ref={canvasRef} aria-hidden="true" />
        </div>
        <div className="callouts" ref={calloutsRef} aria-hidden="true" style={{ opacity: 0 }}>
          <svg>
            {SHOW.map((k) => (
              <g key={k}>
                <line data-k={k} />
                <circle data-k={k} r={3.5} />
              </g>
            ))}
          </svg>
          {SHOW.map((k) => (
            <span key={k} className="callout" data-k={k}>
              {p.labels[k]}
            </span>
          ))}
        </div>
        <div className="hero-caption" ref={captionRef}>
          {p.caption}
        </div>
        <div className="wrap hero-wrap">
          <div className="hero-copy" ref={copyRef}>
            <p className="kicker">{p.eyebrow}</p>
            <h1 className="display">{p.title}</h1>
            <p className="lead">{p.lead}</p>
            <div className="hero-cta">
              <a className="btn btn-primary" href={p.ctaPrimary.href}>
                {p.ctaPrimary.label}
              </a>
              <a className="btn btn-ghost" href={p.ctaSecondary.href}>
                {p.ctaSecondary.label}
              </a>
            </div>
          </div>
        </div>
        <div className="facts" ref={factsRef}>
          <div className="wrap">
            <ul>
              {p.facts.map((f) => (
                <li key={f.value}>
                  <b>{f.value}</b>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {p.explode ? (
          <div className="scroll-hint" ref={hintRef} aria-hidden="true">
            {p.hint}
            <i />
          </div>
        ) : null}
      </div>
    </section>
  );
}
