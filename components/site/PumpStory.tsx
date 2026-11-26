'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Callout {
  part: string;
  title: string;
  body: string;
  href: string;
}

interface Props {
  id: string;
  title: string;
  lead: string;
  callouts: Callout[];
  stepLabel: string;
}

const EXPLODE_END = 0.22;
const FOCUS = 1580;

export default function PumpStory(p: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);
  const activeRef = useRef(-1);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const capture = new URLSearchParams(location.search).has('capture');

    (async () => {
      const [THREE, stageMod, pumpMod] = await Promise.all([import('three'), import('@/lib/three/stage.js'), import('@/lib/three/pump.js')]);
      if (disposed || !canvasRef.current || !wrapRef.current) return;
      let st: ReturnType<typeof stageMod.createStage>;
      try {
        st = stageMod.createStage(canvasRef.current, {
          shadowY: -180,
          shadowSize: [1300, 500],
          fov: 26,
          dpr: Math.min(window.devicePixelRatio || 1, 1.5),
        });
      } catch {
        return;
      }
      const sc = st.key.shadow.camera;
      sc.left = -800;
      sc.right = 800;
      sc.top = 800;
      sc.bottom = -800;
      sc.updateProjectionMatrix();
      st.renderer.shadowMap.autoUpdate = false;
      st.renderer.shadowMap.needsUpdate = true;
      let lastEx = -1;
      const model = pumpMod.buildPump();
      st.scene.add(model.root);
      model.root.updateMatrixWorld(true);

      const cam = st.camera;
      const A = { pos: new THREE.Vector3(-720, 660, 1640), look: new THREE.Vector3(20, -40, 0) };
      const B = { pos: new THREE.Vector3(-780, 720, 2180), look: new THREE.Vector3(-90, -40, 0) };
      const dir = new THREE.Vector3(-0.55, 0.5, 1).normalize();
      const camPos = A.pos.clone();
      const camLook = A.look.clone();
      const wantPos = new THREE.Vector3();
      const wantLook = new THREE.Vector3();
      const tmp = new THREE.Vector3();
      const state = { target: 0, p: 0, W: 1, H: 1, desktop: true, visible: false, dirty: true };

      const parts = p.callouts.map((c) => model.parts.find((x: { key: string }) => x.key === c.part));

      const fit = () => {
        const r = wrapRef.current!.getBoundingClientRect();
        state.W = Math.max(1, r.width);
        state.H = Math.max(1, r.height);
        state.desktop = window.innerWidth > 960;
        st.resize(state.W, state.H);
        state.dirty = true;
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(wrapRef.current);
      const io = new IntersectionObserver(([en]) => (state.visible = en.isIntersecting), { rootMargin: '200px' });
      io.observe(sectionRef.current!);

      const focusOf = (i: number, out: InstanceType<typeof THREE.Vector3>) => {
        const part = parts[i];
        if (!part) return out.copy(B.look);
        out.copy(part.anchor);
        part.object.localToWorld(out);
        return out;
      };

      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!state.visible || document.hidden) return;
        if (!state.desktop) {
          // celular: vista despiezada estática
          if (!state.dirty) return;
          pumpMod.setPumpExplode(model, 1);
          st.renderer.shadowMap.needsUpdate = true;
          cam.clearViewOffset();
          cam.position.set(-600, 560, 1580);
          cam.lookAt(-60, -30, 0);
          st.render();
          state.dirty = false;
          return;
        }
        state.p += (state.target - state.p) * (capture ? 1 : 0.12);
        const pr = state.p;
        const ex = Math.min(1, pr / EXPLODE_END);
        if (ex !== lastEx) {
          pumpMod.setPumpExplode(model, ex);
          model.root.updateMatrixWorld(true);
          st.renderer.shadowMap.needsUpdate = true;
          lastEx = ex;
        }

        let idx = -1;
        if (pr > EXPLODE_END + 0.02) idx = Math.min(p.callouts.length - 1, Math.floor(((pr - EXPLODE_END) / (1 - EXPLODE_END)) * p.callouts.length));
        if (idx !== activeRef.current) {
          activeRef.current = idx;
          setActive(idx);
        }

        const N = p.callouts.length;
        const e = ex < 0.5 ? 4 * ex * ex * ex : 1 - Math.pow(-2 * ex + 2, 3) / 2;
        // vista general (armado → despiece)
        const overPos = tmp.copy(A.pos).lerp(B.pos, e).clone();
        const overLook = new THREE.Vector3().lerpVectors(A.look, B.look, e);
        if (idx < 0) {
          wantPos.copy(overPos);
          wantLook.copy(overLook);
        } else {
          // dentro de cada pieza: el primer 40 % viaja desde la anterior
          const local = ((pr - EXPLODE_END) / (1 - EXPLODE_END)) * N - idx;
          const k = Math.min(1, Math.max(0, local / 0.4));
          const b = k * k * (3 - 2 * k);
          // mira hacia la pieza sin perder el conjunto de vista
          const toLook = focusOf(idx, new THREE.Vector3()).lerp(B.look, 0.38);
          const toPos = toLook.clone().addScaledVector(dir, FOCUS);
          const fromLook = idx > 0 ? focusOf(idx - 1, new THREE.Vector3()).lerp(B.look, 0.38) : overLook;
          const fromPos = idx > 0 ? fromLook.clone().addScaledVector(dir, FOCUS) : overPos;
          wantLook.lerpVectors(fromLook, toLook, b);
          wantPos.lerpVectors(fromPos, toPos, b);
        }
        camPos.lerp(wantPos, capture ? 1 : 0.2);
        camLook.lerp(wantLook, capture ? 1 : 0.2);
        cam.position.copy(camPos);
        cam.lookAt(camLook);
        cam.setViewOffset(state.W, state.H, -state.W * (idx < 0 ? 0.15 + 0.07 * ex : 0.2), 0, state.W, state.H);
        st.render();

        // marcador sobre la pieza activa
        const m = markerRef.current!;
        const tg = tagRef.current!;
        if (idx >= 0) {
          focusOf(idx, tmp).project(cam);
          const x = (tmp.x * 0.5 + 0.5) * state.W;
          const y = (-tmp.y * 0.5 + 0.5) * state.H;
          m.style.opacity = '1';
          m.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          tg.style.opacity = '1';
          tg.style.transform = `translate3d(${x + 22}px, ${y - 44}px, 0)`;
        } else {
          m.style.opacity = '0';
          tg.style.opacity = '0';
        }
      };
      raf = requestAnimationFrame(frame);

      const mm = gsap.matchMedia();
      mm.add('(min-width: 961px)', () => {
        const trig = ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'top top',
          end: reduce ? '+=1' : `+=${100 + p.callouts.length * 55}%`,
          pin: pinRef.current,
          scrub: reduce ? false : capture ? true : 0.5,
          onUpdate: (s) => (state.target = reduce ? 1 : s.progress),
        });
        if (reduce) state.target = 1;
        return () => trig.kill();
      });

      cleanup = () => {
        mm.revert();
        ro.disconnect();
        io.disconnect();
        st.dispose();
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [p.callouts]);

  const cur = active >= 0 ? p.callouts[active] : null;

  return (
    <section className="pump" id={p.id} ref={sectionRef}>
      <div className="pump-pin" ref={pinRef}>
        <div className="pump-canvas" ref={wrapRef}>
          <canvas ref={canvasRef} aria-hidden="true" />
          <div className="pump-marker" ref={markerRef} aria-hidden="true" />
          <div className="pump-tag" ref={tagRef} aria-hidden="true">
            {cur?.title}
          </div>
        </div>
        <div className="pump-copy">
          <div className="wrap">
            <h2 className="h2">{p.title}</h2>
            <p className="lead">{p.lead}</p>
          </div>
        </div>
        <div className="pump-steps">
          <div className="wrap">
            <ol>
              {p.callouts.map((c, i) => (
                <li key={c.part} data-active={i === active}>
                  <a href={c.href}>
                    <b>
                      <em>
                        {p.stepLabel} {String(i + 1).padStart(2, '0')}
                      </em>
                      {c.title}
                    </b>
                    <p>{c.body}</p>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
