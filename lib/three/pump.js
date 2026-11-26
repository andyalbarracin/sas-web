// Bomba centrífuga de proceso (succión axial, back pull-out) sobre base,
// con motor, acople, soporte de rodamientos, sello cartucho y pote API.
import * as THREE from 'three';
import { ring, profile, rod, extrude, circlePath, cylBetween, pipe, merge, materials, mesh } from './kit.js';
import { buildSeal } from './seal.js';
import { PUMP_LABELS } from './labels.js';

function voluteShape() {
  const s = new THREE.Shape();
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const th = t * Math.PI * 2;
    const r = 96 + 42 * t;
    const x = Math.cos(th) * r;
    const y = Math.sin(th) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.lineTo(138, 70);
  s.lineTo(98, 70);
  s.closePath();
  return s;
}

function flange(rOut, rIn, z0, t, holes, holeR, bcd) {
  const sh = new THREE.Shape();
  sh.absarc(0, 0, rOut, 0, Math.PI * 2, false);
  sh.holes.push(circlePath(rIn, 0, 0, true));
  for (let i = 0; i < holes; i++) {
    const a = (i / holes) * Math.PI * 2 + Math.PI / holes;
    sh.holes.push(circlePath(holeR, Math.cos(a) * bcd, Math.sin(a) * bcd, true));
  }
  return extrude(sh, z0, t, 1.2, 64);
}

function vane(rot) {
  const pts = [];
  const r0 = 30, r1 = 84, k = 0.9;
  const N = 24;
  const center = [];
  for (let i = 0; i <= N; i++) {
    const r = r0 + ((r1 - r0) * i) / N;
    const th = -k * Math.log(r / r0) + rot;
    center.push([Math.cos(th) * r, Math.sin(th) * r]);
  }
  const w = 2.6;
  const left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const a = center[Math.max(0, i - 1)], b = center[Math.min(N, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    dx /= l; dy /= l;
    left.push([center[i][0] - dy * w, center[i][1] + dx * w]);
    right.push([center[i][0] + dy * w, center[i][1] - dx * w]);
  }
  const s = new THREE.Shape();
  s.moveTo(...left[0]);
  left.forEach((p) => s.lineTo(...p));
  right.reverse().forEach((p) => s.lineTo(...p));
  s.closePath();
  return s;
}

export function buildPump() {
  const M = materials();
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const parts = [];
  const fades = [];
  const add = (key, obj, dz, anchor, delay = 0, dy = 0, dx = 0) => {
    body.add(obj);
    parts.push({ key, object: obj, explode: new THREE.Vector3(dx, dy, dz), anchor, delay, base: obj.position.clone() });
    return obj;
  };

  const BASE_Y = -168;

  // ── Carcasa (voluta) ────────────────────────────────────────────────
  const casing = new THREE.Group();
  const vol = extrude(voluteShape(), -236, 66, 17, 96);
  casing.add(mesh(vol, M.bluePaint));
  // boca de succión axial
  casing.add(mesh(ring(30, 40, -300, -228, 1.2), M.bluePaint));
  casing.add(mesh(flange(60, 30, -312, 14, 8, 5.5, 49), M.bluePaint));
  // descarga vertical tangencial
  const dTop = 214;
  casing.add(mesh(cylBetween(new THREE.Vector3(118, 40, -203), new THREE.Vector3(118, dTop - 12, -203), 30, 48), M.bluePaint));
  const df = flange(50, 22, 0, 13, 8, 4.8, 40);
  df.rotateX(-Math.PI / 2);
  df.translate(118, dTop - 13, -203);
  casing.add(mesh(df, M.bluePaint));
  // patas de la carcasa
  [-1, 1].forEach((sx) => {
    const g = new THREE.BoxGeometry(34, Math.abs(BASE_Y) - 100, 46);
    g.translate(sx * 70, BASE_Y + (Math.abs(BASE_Y) - 100) / 2 + 10, -203);
    casing.add(mesh(g, M.bluePaint));
  });
  // bulones de la tapa
  const bolts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p = new THREE.Vector3(Math.cos(a) * 122, Math.sin(a) * 122, -166);
    bolts.push(cylBetween(p, p.clone().setZ(-158), 5, 6));
  }
  casing.add(mesh(merge(bolts), M.steelDark));
  add('casing', casing, -170, new THREE.Vector3(118, dTop, -203), 0.0);

  // ── Impulsor cerrado ────────────────────────────────────────────────
  const imp = new THREE.Group();
  imp.add(mesh(ring(16, 86, -179, -174, 0.8), M.steelPolish));
  imp.add(mesh(ring(19.6, 30, -186, -160, 0.8), M.steelPolish));
  imp.add(
    mesh(
      profile([
        [34, -210],
        [41, -210],
        [41, -203],
        [86, -194],
        [86, -190],
        [37, -199],
        [34, -199.5],
      ]),
      M.steelPolish,
    ),
  );
  const vanes = [];
  for (let i = 0; i < 6; i++) vanes.push(extrude(vane((i / 6) * Math.PI * 2), -194, 16, 0.6, 12));
  imp.add(mesh(merge(vanes), M.steelPolish));
  add('impeller', imp, -112, new THREE.Vector3(0, 86, -186), 0.06);

  // ── Tapa de carcasa / cámara de sellado ─────────────────────────────
  const cover = new THREE.Group();
  cover.add(mesh(ring(50, 132, -160, -146, 1.4), M.bluePaint));
  cover.add(mesh(ring(44, 60, -146, -110, 1.2), M.bluePaint));
  cover.add(mesh(flange(84, 44, -112, 10, 4, 5, 70), M.bluePaint));
  add('cover', cover, -60, new THREE.Vector3(0, -132, -153), 0.1);

  // ── Eje ─────────────────────────────────────────────────────────────
  const shaft = mesh(
    profile([
      [0, -160],
      [13, -160],
      [14, -159],
      [14, -132],
      [20, -132],
      [20, 172],
      [17, 172],
      [17, 268],
      [16, 269],
      [0, 269],
    ]),
    M.steelPolish,
    'eje',
  );
  add('shaft', shaft, 0, new THREE.Vector3(0, 20, 166), 0.0);

  // ── Sello cartucho ──────────────────────────────────────────────────
  const seal = buildSeal();
  seal.body.rotation.y = 0;
  seal.body.position.z = -85;
  const sealG = new THREE.Group();
  sealG.add(seal.body);
  add('seal', sealG, -10, new THREE.Vector3(0, 62, -85), 0.14, 128, -150);

  // ── Soporte de rodamientos con linterna ─────────────────────────────
  const frame = new THREE.Group();
  frame.add(mesh(flange(84, 40, -122 + 20, 10, 4, 5, 70), M.bluePaint)); // brida linterna
  const ribs = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const g = new THREE.BoxGeometry(18, 16, 66);
    g.translate(0, 70, -60);
    g.rotateZ(a);
    ribs.push(g);
  }
  frame.add(mesh(merge(ribs), M.bluePaint));
  frame.add(mesh(ring(36, 64, -30, -20, 1.2), M.bluePaint));
  frame.add(
    mesh(
      profile([
        [40, -20],
        [60, -20],
        [60, 150],
        [56, 156],
        [40, 156],
      ]),
      M.bluePaint,
    ),
  );
  frame.add(mesh(ring(22, 44, 150, 162, 1), M.bluePaint));
  // pata
  const foot = new THREE.BoxGeometry(110, Math.abs(BASE_Y) - 40, 120);
  foot.translate(0, BASE_Y + (Math.abs(BASE_Y) - 40) / 2 + 10, 66);
  frame.add(mesh(foot, M.bluePaint));
  // visor de aceite y venteo
  frame.add(mesh(cylBetween(new THREE.Vector3(-58, -18, 70), new THREE.Vector3(-66, -18, 70), 9, 32), M.steelDark));
  frame.add(mesh(cylBetween(new THREE.Vector3(-66, -18, 70), new THREE.Vector3(-67.5, -18, 70), 7.5, 32), M.glass));
  frame.add(mesh(cylBetween(new THREE.Vector3(0, 58, 110), new THREE.Vector3(0, 72, 110), 6, 6), M.brass));
  add('frame', frame, 0, new THREE.Vector3(0, 60, 70), 0.0);

  // ── Protectores de rodamientos (bronce) ─────────────────────────────
  const iso = new THREE.Group();
  iso.add(mesh(ring(20.2, 34, -40, -30, 0.8), M.bronze));
  iso.add(mesh(ring(20.2, 30, -44, -40, 0.6), M.bronze));
  const isoOut = new THREE.Group();
  isoOut.add(mesh(ring(20.2, 30, 162, 172, 0.8), M.bronze));
  add('isolator', iso, -12, new THREE.Vector3(0, 34, -38), 0.16, 40);
  add('isolatorOut', isoOut, 12, new THREE.Vector3(0, 30, 168), 0.16);

  // ── Acople ──────────────────────────────────────────────────────────
  const hubA = mesh(ring(17, 46, 196, 228, 1.4), M.steelDark);
  add('hubA', hubA, 34, new THREE.Vector3(0, 46, 212), 0.2);
  const spider = new THREE.Group();
  spider.add(mesh(ring(20, 44, 228, 236, 1), M.rubber));
  add('spider', spider, 70, new THREE.Vector3(0, 44, 232), 0.22);
  const hubB = mesh(ring(17, 46, 236, 268, 1.4), M.steelDark);
  add('hubB', hubB, 106, new THREE.Vector3(0, 46, 252), 0.24);

  // ── Motor ───────────────────────────────────────────────────────────
  const motor = new THREE.Group();
  const MZ0 = 300, MZ1 = 580;
  motor.add(mesh(cylBetween(new THREE.Vector3(0, 0, 268), new THREE.Vector3(0, 0, 300), 17, 32), M.steelPolish));
  motor.add(
    mesh(
      profile([
        [0, MZ0 - 8],
        [70, MZ0 - 8],
        [98, MZ0 + 6],
        [98, MZ1],
        [92, MZ1 + 6],
        [0, MZ1 + 6],
      ]),
      M.motor,
    ),
  );
  const fins = [];
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    if (Math.sin(a) < -0.82) continue;
    const g = new THREE.BoxGeometry(3, 14, MZ1 - MZ0 - 30);
    g.translate(0, 104, (MZ0 + MZ1) / 2 + 6);
    g.rotateZ(a);
    fins.push(g);
  }
  motor.add(mesh(merge(fins), M.motor));
  // tapa de ventilador
  motor.add(mesh(profile([[0, MZ1 + 6], [100, MZ1 + 6], [104, MZ1 + 12], [104, MZ1 + 60], [96, MZ1 + 72], [0, MZ1 + 72]]), M.motor));
  const grille = [];
  for (let r = 14; r < 86; r += 9) grille.push(ring(r, r + 4.2, MZ1 + 72, MZ1 + 74, 0.4));
  motor.add(mesh(merge(grille), M.black));
  // caja de bornes
  const tb = new THREE.BoxGeometry(84, 46, 96);
  tb.translate(0, 120, MZ0 + 110);
  motor.add(mesh(tb, M.motor));
  const tbl = new THREE.BoxGeometry(90, 6, 102);
  tbl.translate(0, 145, MZ0 + 110);
  motor.add(mesh(tbl, M.motor));
  // patas del motor
  [-1, 1].forEach((sx) => {
    const g = new THREE.BoxGeometry(40, Math.abs(BASE_Y) - 70, 220);
    g.translate(sx * 64, BASE_Y + (Math.abs(BASE_Y) - 70) / 2 + 10, (MZ0 + MZ1) / 2);
    motor.add(mesh(g, M.motor));
  });
  // placa de características
  const plate = new THREE.BoxGeometry(1, 30, 60);
  plate.translate(-99.5, 30, MZ0 + 170);
  motor.add(mesh(plate, M.steelPolish));
  add('motor', motor, 140, new THREE.Vector3(0, 150, 420), 0.26);

  // ── Base ────────────────────────────────────────────────────────────
  const base = new THREE.Group();
  const bp = new THREE.BoxGeometry(300, 22, 980);
  bp.translate(0, BASE_Y, 140);
  base.add(mesh(bp, M.motor));
  const lip = new THREE.BoxGeometry(310, 8, 990);
  lip.translate(0, BASE_Y - 14, 140);
  base.add(mesh(lip, M.steelDark));
  add('base', base, 0, new THREE.Vector3(150, BASE_Y, 0), 0);

  // ── Pote de sello (plan API) con soporte y cañerías ─────────────────
  const pot = new THREE.Group();
  const PX = 150, PZ = 30, PY0 = 60, PY1 = 250;
  pot.add(mesh(cylBetween(new THREE.Vector3(PX, BASE_Y, PZ), new THREE.Vector3(PX, PY0 - 18, PZ), 9, 24), M.navy));
  pot.add(
    mesh(
      (() => {
        const pts = [];
        const r = 34;
        for (let i = 0; i <= 10; i++) {
          const a = (i / 10) * (Math.PI / 2);
          pts.push([Math.sin(a) * r, PY0 + 12 - Math.cos(a) * 12]);
        }
        for (let i = 0; i <= 10; i++) {
          const a = (i / 10) * (Math.PI / 2);
          pts.push([Math.cos(a) * r, PY1 - 12 + Math.sin(a) * 12]);
        }
        const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 64);
        g.translate(PX, 0, PZ);
        return g;
      })(),
      M.steelPolish,
    ),
  );
  // indicador de nivel
  pot.add(mesh(cylBetween(new THREE.Vector3(PX - 40, PY0 + 24, PZ), new THREE.Vector3(PX - 40, PY1 - 24, PZ), 5, 16), M.glass));
  pot.add(mesh(cylBetween(new THREE.Vector3(PX - 40, PY0 + 24, PZ), new THREE.Vector3(PX - 40, PY0 + 90, PZ), 3.6, 16), M.blue));
  [PY0 + 24, PY1 - 24].forEach((y) => pot.add(mesh(cylBetween(new THREE.Vector3(PX - 34, y, PZ), new THREE.Vector3(PX - 46, y, PZ), 5, 6), M.steelDark)));
  // manómetro
  pot.add(mesh(cylBetween(new THREE.Vector3(PX, PY1, PZ), new THREE.Vector3(PX, PY1 + 30, PZ), 3.5, 12), M.steel));
  const dial = new THREE.Group();
  dial.add(mesh(cylBetween(new THREE.Vector3(PX, PY1 + 52, PZ - 6), new THREE.Vector3(PX, PY1 + 52, PZ + 6), 22, 40), M.steelPolish));
  dial.add(mesh(cylBetween(new THREE.Vector3(PX, PY1 + 52, PZ + 6), new THREE.Vector3(PX, PY1 + 52, PZ + 6.6), 19, 40), M.gauge));
  pot.add(dial);
  // válvulas
  [PY1 - 40, PY0 + 30].forEach((y) => {
    pot.add(mesh(cylBetween(new THREE.Vector3(PX + 34, y, PZ), new THREE.Vector3(PX + 54, y, PZ), 4, 12), M.steel));
    pot.add(mesh(cylBetween(new THREE.Vector3(PX + 54, y - 8, PZ), new THREE.Vector3(PX + 54, y + 8, PZ), 6.5, 6), M.brass));
    pot.add(mesh(cylBetween(new THREE.Vector3(PX + 54, y + 8, PZ), new THREE.Vector3(PX + 54, y + 22, PZ), 1.8, 8), M.steel));
    pot.add(mesh(cylBetween(new THREE.Vector3(PX + 46, y + 22, PZ), new THREE.Vector3(PX + 62, y + 22, PZ), 2.2, 8), M.blue));
  });
  add('pot', pot, 0, new THREE.Vector3(PX - 34, PY0 + 120, PZ), 0);

  // cañerías desde los puertos de la brida hasta el pote
  const tubes = new THREE.Group();
  const portA = new THREE.Vector3(Math.cos(Math.PI / 2 - 0.42) * 56, Math.sin(Math.PI / 2 - 0.42) * 56, -100.5);
  const portB = new THREE.Vector3(Math.cos(Math.PI / 2 + 0.42) * 56, Math.sin(Math.PI / 2 + 0.42) * 56, -100.5);
  const tubeMat = M.steel.clone();
  tubeMat.transparent = true;
  tubes.add(mesh(pipe([portA, portA.clone().add(new THREE.Vector3(6, 26, 0)), new THREE.Vector3(80, 110, -30), new THREE.Vector3(PX - 30, PY0 + 34, PZ)], 3.2), tubeMat));
  tubes.add(mesh(pipe([portB, portB.clone().add(new THREE.Vector3(-4, 40, 4)), new THREE.Vector3(50, 190, -20), new THREE.Vector3(PX - 26, PY1 - 30, PZ)], 3.2), tubeMat));
  body.add(tubes);
  fades.push(tubeMat);

  body.rotation.y = Math.PI / 2;
  body.position.x = -120;
  return { root, body, parts, fades, labels: PUMP_LABELS };
}

export { PUMP_LABELS };

export function setPumpExplode(model, p) {
  for (const part of model.parts) {
    const t = Math.min(1, Math.max(0, (p - part.delay) / (1 - part.delay * 1.1)));
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    part.object.position.copy(part.base).addScaledVector(part.explode, e);
  }
  const fade = 1 - Math.min(1, p * 6);
  for (const m of model.fades) {
    m.opacity = fade;
    m.visible = fade > 0.01;
  }
}
