'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  model?: string;
  image: string;
  photo?: string;
  alt: string;
  labels: { render: string; photo: string; hint: string };
}

/** Visor de producto: render 3D que se puede girar, o la foto de catálogo. */
export default function ProductViewer({ model, image, photo, alt, labels }: Props) {
  const [tab, setTab] = useState<'3d' | 'photo'>('3d');
  const [live, setLive] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!model || tab !== '3d') return;
    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = async () => {
      const [stageMod, frameMod] = await Promise.all([import('@/lib/three/stage.js'), import('@/lib/three/frame.js')]);
      if (disposed || !canvasRef.current || !boxRef.current) return;
      let st: ReturnType<typeof stageMod.createStage>;
      try {
        st = stageMod.createStage(canvasRef.current, { shadowY: -80, dpr: Math.min(window.devicePixelRatio || 1, 1.75) });
      } catch {
        return;
      }
      const r = boxRef.current.getBoundingClientRect();
      // Encuadre con la misma proporción que los renders (4:3)
      st.resize(r.width, r.height);
      const { pivot } = frameMod.frameProduct(st, model, 1600, 1200);
      const s = { rot: 0, vel: reduce ? 0 : 0.0035, drag: false, x: 0, tilt: 0 };
      const c = canvasRef.current;
      const down = (e: PointerEvent) => {
        s.drag = true;
        s.x = e.clientX;
        c.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        if (!s.drag) return;
        const dx = e.clientX - s.x;
        s.x = e.clientX;
        s.vel = dx * 0.004;
        s.rot += dx * 0.01;
      };
      const up = () => (s.drag = false);
      c.addEventListener('pointerdown', down);
      c.addEventListener('pointermove', move);
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      const ro = new ResizeObserver(() => {
        const b = boxRef.current!.getBoundingClientRect();
        st.resize(b.width, b.height);
      });
      ro.observe(boxRef.current);
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        if (!s.drag) {
          s.rot += s.vel;
          const idle = reduce ? 0 : 0.0035;
          s.vel += (idle - s.vel) * 0.03;
        }
        pivot.rotation.y = s.rot;
        st.render();
      };
      loop();
      setLive(true);
      cleanup = () => {
        ro.disconnect();
        c.removeEventListener('pointerdown', down);
        c.removeEventListener('pointermove', move);
        c.removeEventListener('pointerup', up);
        c.removeEventListener('pointercancel', up);
        st.dispose();
      };
    };
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) {
        io.disconnect();
        start();
      }
    });
    io.observe(boxRef.current!);
    return () => {
      disposed = true;
      io.disconnect();
      cancelAnimationFrame(raf);
      cleanup?.();
      setLive(false);
    };
  }, [model, tab]);

  return (
    <div className="viewer" ref={boxRef}>
      {tab === 'photo' && photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={alt} style={{ background: '#fff' }} />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={alt} style={{ opacity: live ? 0 : 1, transition: 'opacity .4s' }} />
          {model ? <canvas ref={canvasRef} aria-hidden="true" /> : null}
        </>
      )}
      <div className="viewer-bar">
        {photo ? (
          <div className="viewer-tabs" role="group">
            <button type="button" aria-pressed={tab === '3d'} onClick={() => setTab('3d')}>
              {labels.render}
            </button>
            <button type="button" aria-pressed={tab === 'photo'} onClick={() => setTab('photo')}>
              {labels.photo}
            </button>
          </div>
        ) : (
          <span />
        )}
        {tab === '3d' && live ? <span className="viewer-hint">{labels.hint}</span> : null}
      </div>
    </div>
  );
}
