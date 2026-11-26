// Modelos de cada línea de producto, para renders estáticos y visores 3D.
import * as THREE from 'three';
import { ring, profile, rod, oring, extrude, circlePath, slotPath, cylBetween, merge, materials, mesh, packingMaterial } from './kit.js';
import { buildSeal } from './seal.js';
import { buildPump } from './pump.js';

const group = (...objs) => {
  const g = new THREE.Group();
  objs.forEach((o) => g.add(o));
  return g;
};

/** Centra un grupo en el origen y lo apoya en y = floor. */
export function settle(obj, floor = -80) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y += floor - box.min.y;
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj);
}

// ── Pote de sello (sistema auxiliar API) ─────────────────────────────
export function buildSealPot() {
  const M = materials();
  const g = new THREE.Group();
  const Y0 = 0, Y1 = 230, R = 46;
  const shell = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2);
    shell.push(new THREE.Vector2(Math.sin(a) * R, Y0 + 16 - Math.cos(a) * 16));
  }
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2);
    shell.push(new THREE.Vector2(Math.cos(a) * R, Y1 - 16 + Math.sin(a) * 16));
  }
  g.add(mesh(new THREE.LatheGeometry(shell, 96), M.steelPolish));
  // soldaduras/anillos
  g.add(mesh(ring(R, R + 2.5, 0, 6).rotateX(-Math.PI / 2).translate(0, 60, 0), M.steel));
  // patas / soporte
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    g.add(mesh(cylBetween(new THREE.Vector3(Math.cos(a) * 34, 10, Math.sin(a) * 34), new THREE.Vector3(Math.cos(a) * 52, -70, Math.sin(a) * 52), 4, 12), M.navy));
  }
  const pad = new THREE.CylinderGeometry(62, 62, 6, 64);
  pad.translate(0, -73, 0);
  g.add(mesh(pad, M.navy));
  // visor de nivel con protección
  const lx = -R - 14;
  g.add(mesh(cylBetween(new THREE.Vector3(lx, 40, 0), new THREE.Vector3(lx, 190, 0), 6, 20), M.glass));
  g.add(mesh(cylBetween(new THREE.Vector3(lx, 40, 0), new THREE.Vector3(lx, 128, 0), 4.6, 20), M.blue));
  [40, 190].forEach((y) => {
    g.add(mesh(cylBetween(new THREE.Vector3(-R + 2, y, 0), new THREE.Vector3(lx, y, 0), 6, 16), M.steel));
    g.add(mesh(cylBetween(new THREE.Vector3(lx, y - 9, 0), new THREE.Vector3(lx, y + 9, 0), 9, 6), M.steelDark));
  });
  const guard = new THREE.BoxGeometry(2, 150, 18);
  guard.translate(lx - 9, 115, 0);
  g.add(mesh(guard, M.steelDark));
  // manómetro
  g.add(mesh(cylBetween(new THREE.Vector3(0, Y1, 0), new THREE.Vector3(0, Y1 + 34, 0), 4.5, 16), M.steel));
  g.add(mesh(cylBetween(new THREE.Vector3(0, Y1 + 34, 0), new THREE.Vector3(0, Y1 + 44, 0), 7, 6), M.brass));
  const dial = new THREE.Group();
  dial.add(mesh(cylBetween(new THREE.Vector3(0, 0, -9), new THREE.Vector3(0, 0, 9), 32, 64), M.steelPolish));
  dial.add(mesh(cylBetween(new THREE.Vector3(0, 0, 9), new THREE.Vector3(0, 0, 9.8), 28, 64), M.gauge));
  const needle = new THREE.BoxGeometry(2, 22, 1);
  needle.translate(0, 9, 10.4);
  needle.rotateZ(-0.7);
  dial.add(mesh(needle, M.red));
  for (let i = 0; i <= 10; i++) {
    const a = -2.3 + (i / 10) * 4.6;
    const t = new THREE.BoxGeometry(1, i % 5 ? 3 : 6, 0.6);
    t.translate(0, 23, 10.2);
    t.rotateZ(a);
    dial.add(mesh(t, M.black));
  }
  dial.position.set(0, Y1 + 76, 0);
  g.add(dial);
  // transmisor (sensor ATEX) en azul
  g.add(mesh(cylBetween(new THREE.Vector3(R - 2, 170, 0), new THREE.Vector3(R + 24, 170, 0), 5, 16), M.steel));
  const tx = new THREE.Group();
  tx.add(mesh(cylBetween(new THREE.Vector3(R + 24, 158, 0), new THREE.Vector3(R + 24, 196, 0), 15, 32), M.blue));
  tx.add(mesh(cylBetween(new THREE.Vector3(R + 24, 196, 0), new THREE.Vector3(R + 24, 202, 0), 16, 32), M.steelPolish));
  g.add(tx);
  // válvulas laterales
  [70, 120].forEach((y, i) => {
    const z = i ? 12 : -12;
    g.add(mesh(cylBetween(new THREE.Vector3(0, y, R - 4), new THREE.Vector3(0, y, R + 26), 4.5, 16), M.steel));
    g.add(mesh(cylBetween(new THREE.Vector3(0, y - 9, R + 26), new THREE.Vector3(0, y + 9, R + 26), 8, 6), M.brass));
    g.add(mesh(cylBetween(new THREE.Vector3(0, y + 9, R + 26), new THREE.Vector3(0, y + 24, R + 26), 2, 8), M.steel));
    g.add(mesh(cylBetween(new THREE.Vector3(-14, y + 24, R + 26), new THREE.Vector3(14, y + 24, R + 26), 2.6, 8), M.blue));
    g.add(mesh(cylBetween(new THREE.Vector3(0, y, R + 26), new THREE.Vector3(0, y, R + 46 + z), 4.5, 16), M.steel));
  });
  return g;
}

// ── DGS: anillo con ranuras espirales + cartucho ─────────────────────
export function buildDGS() {
  const M = materials();
  const g = new THREE.Group();
  // cartucho
  const housing = profile([
    [40, 0],
    [76, 0],
    [78, 2],
    [78, 46],
    [70, 50],
    [70, 70],
    [40, 70],
  ]);
  g.add(mesh(housing, M.steelPolish));
  const holes = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    holes.push(cylBetween(new THREE.Vector3(Math.cos(a) * 77.6, Math.sin(a) * 77.6, 24), new THREE.Vector3(Math.cos(a) * 78.4, Math.sin(a) * 78.4, 24), 2.6, 16));
  }
  g.add(mesh(merge(holes), M.black));
  g.add(mesh(ring(66, 78, 52, 56, 0.6), M.steel));
  // asiento rotativo con ranuras
  const seat = ring(36, 74, -16, 0, 0.8);
  const lapped = new THREE.MeshPhysicalMaterial({ color: 0xb9c0c8, metalness: 0.9, roughness: 0.1 });
  g.add(mesh(seat, lapped));
  const grooves = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Shape();
    const rot = (i / 14) * Math.PI * 2;
    const N = 18, k = 0.9;
    const p1 = [], p2 = [];
    for (let j = 0; j <= N; j++) {
      const r = 57 + (17.4 * j) / N;
      const th = rot + k * Math.log(r / 57);
      const w = 0.05 + 0.1 * (j / N);
      p1.push([Math.cos(th) * r, Math.sin(th) * r]);
      p2.push([Math.cos(th + w) * r, Math.sin(th + w) * r]);
    }
    s.moveTo(...p1[0]);
    p1.forEach((p) => s.lineTo(...p));
    p2.reverse().forEach((p) => s.lineTo(...p));
    s.closePath();
    grooves.push(extrude(s, -16.25, 0.4, 0, 4));
  }
  const gm = M.sic.clone();
  gm.color.set(0x59606a);
  gm.roughness = 0.4;
  g.add(mesh(merge(grooves), gm));
  g.add(mesh(ring(36, 44, -24, -16, 0.6), M.steelPolish));
  g.add(mesh(oring(37.5, 2.2, -19), M.rubber));
  return g;
}

// ── Protector de rodamientos (laberinto) ─────────────────────────────
export function buildIsolator(variant = 'bronze') {
  const M = materials();
  const rotorMat = variant === 'ptfe' ? M.ptfeGraphite : M.bronze;
  const statorMat = variant === 'ptfe' ? M.ptfeGraphite : variant === 'inox' ? M.steelPolish : M.bronze;
  const g = new THREE.Group();
  // estator con brida
  g.add(
    mesh(
      profile([
        [30, 0],
        [56, 0],
        [57, 1],
        [57, 9],
        [56, 10],
        [44, 10],
        [44, 34],
        [43, 35],
        [36, 35],
        [36, 30],
        [30, 30],
      ]),
      statorMat,
    ),
  );
  // ranuras del laberinto
  [16, 23].forEach((z) => g.add(mesh(ring(43.6, 44.2, z, z + 3, 0.2), M.black)));
  g.add(mesh(oring(44.8, 2.6, 28), M.rubber));
  // rotor
  g.add(
    mesh(
      profile([
        [22, -8],
        [40, -8],
        [41, -7],
        [41, 0],
        [32, 0],
        [32, 12],
        [22, 12],
      ]),
      rotorMat,
    ),
  );
  g.add(mesh(oring(23.6, 2.2, 6), M.rubber));
  // drenaje
  const d = new THREE.BoxGeometry(8, 6, 10);
  d.translate(0, -57, 5);
  g.add(mesh(d, M.black));
  return g;
}

// ── Sello neumático ─────────────────────────────────────────────────
export function buildPneumatic() {
  const M = materials();
  const g = new THREE.Group();
  const sh = new THREE.Shape();
  const w = 82, r = 16;
  sh.moveTo(-w + r, -w);
  sh.lineTo(w - r, -w);
  sh.quadraticCurveTo(w, -w, w, -w + r);
  sh.lineTo(w, w - r);
  sh.quadraticCurveTo(w, w, w - r, w);
  sh.lineTo(-w + r, w);
  sh.quadraticCurveTo(-w, w, -w, w - r);
  sh.lineTo(-w, -w + r);
  sh.quadraticCurveTo(-w, -w, -w + r, -w);
  sh.holes.push(circlePath(40, 0, 0, true));
  // ventanas
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const cx = Math.cos(a) * 82, cy = Math.sin(a) * 82;
    const p = new THREE.Path();
    const s = 16;
    p.moveTo(cx - s * Math.cos(a) * 0.2 - s * Math.sin(a), cy - s * Math.sin(a) * 0.2 + s * Math.cos(a));
    p.lineTo(cx - s * Math.cos(a) * 1.2, cy - s * Math.sin(a) * 1.2);
    p.lineTo(cx - s * Math.cos(a) * 0.2 + s * Math.sin(a), cy - s * Math.sin(a) * 0.2 - s * Math.cos(a));
    p.closePath();
    sh.holes.push(p);
  }
  g.add(mesh(extrude(sh, 0, 22, 1.6), M.steelPolish));
  g.add(mesh(ring(34, 50, -10, 0, 1), M.steel));
  g.add(mesh(ring(28, 40, -4, 26, 0.8), M.steelDark));
  g.add(mesh(oring(42, 4.4, 24), M.rubber));
  g.add(mesh(oring(31, 3.6, 4), M.blue));
  g.add(mesh(cylBetween(new THREE.Vector3(0, 82, 11), new THREE.Vector3(0, 92, 11), 5, 6), M.red));
  return g;
}

// ── Empaquetaduras ───────────────────────────────────────────────────
const PACK = {
  ptfe: ['#eef0ee', null],
  aramid: ['#e9c64a', null],
  graphite: ['#202226', null],
  combined: ['#202226', '#e5c043'],
};

export function packingRing(kind, R = 60, s = 12) {
  const [base, alt] = PACK[kind];
  const mat = packingMaterial(base, alt);
  const k = 1.4;
  const g = profile(
    [
      [R - s / 2 + k, -s / 2],
      [R + s / 2 - k, -s / 2],
      [R + s / 2, -s / 2 + k],
      [R + s / 2, s / 2 - k],
      [R + s / 2 - k, s / 2],
      [R - s / 2 + k, s / 2],
      [R - s / 2, s / 2 - k],
      [R - s / 2, -s / 2 + k],
    ],
    160,
  );
  return mesh(g, mat);
}

export function buildPacking(kind = 'combined') {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const r = packingRing(kind);
    r.rotation.x = -Math.PI / 2;
    r.position.set(i * 2.5, i * 12.6, -i * 1.5);
    g.add(r);
  }
  const up = packingRing(kind);
  up.rotation.set(0.12, 0.5, 0);
  up.position.set(95, 54, 40);
  g.add(up);
  return g;
}

export function buildPackingSet() {
  const g = new THREE.Group();
  ['ptfe', 'aramid', 'graphite', 'combined'].forEach((k, i) => {
    const r = packingRing(k, 46, 12);
    r.rotation.x = -Math.PI / 2 + 0.05;
    r.position.set((i - 1.5) * 112, 0, 0);
    g.add(r);
    const r2 = packingRing(k, 46, 12);
    r2.rotation.x = -Math.PI / 2 + 0.05;
    r2.position.set((i - 1.5) * 112, 13, 0);
    g.add(r2);
  });
  return g;
}

// ── Spare parts ─────────────────────────────────────────────────────
export function buildSpares() {
  const M = materials();
  const g = new THREE.Group();
  const sleeve = mesh(profile([[24, 0], [32, 0], [32, 6], [30, 7], [30, 120], [29, 121], [24, 121]]), M.steelPolish);
  sleeve.rotation.x = -Math.PI / 2;
  sleeve.position.set(-70, 0, 0);
  g.add(sleeve);
  const shaft = mesh(profile([[0, 0], [12, 0], [13, 1], [13, 60], [16, 60], [16, 150], [11, 150], [11, 190], [10, 191], [0, 191]]), M.steelPolish);
  shaft.rotation.set(0, 0.4, Math.PI / 2 - 0.05);
  shaft.position.set(20, 13, 70);
  g.add(shaft);
  const bush = mesh(ring(18, 30, 0, 44, 1), M.steel);
  bush.rotation.x = -Math.PI / 2;
  bush.position.set(30, 0, -40);
  g.add(bush);
  const carb = mesh(ring(22, 38, 0, 12, 0.8), M.tungsten);
  carb.rotation.x = -Math.PI / 2;
  carb.position.set(100, 0, 10);
  g.add(carb);
  const graph = mesh(ring(24, 36, 0, 16, 0.8), M.carbon);
  graph.rotation.x = -Math.PI / 2;
  graph.position.set(110, 0, -70);
  g.add(graph);
  return g;
}

// ── Perforación ─────────────────────────────────────────────────────
export function buildDrillBit() {
  const M = materials();
  const g = new THREE.Group();
  // cuerpo
  g.add(
    mesh(
      profile([
        [0, 0],
        [40, 0],
        [52, 10],
        [54, 26],
        [46, 34],
        [46, 70],
        [50, 74],
        [50, 120],
        [44, 126],
        [0, 126],
      ]),
      M.gold,
    ),
  );
  // ranuras de barrido
  const flutes = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const b = new THREE.BoxGeometry(10, 8, 40);
    b.translate(0, 50, 54);
    b.rotateZ(a);
    flutes.push(b);
  }
  g.add(mesh(merge(flutes), M.black));
  // botones de carburo
  const buttons = [];
  const addBtn = (r, a, tilt) => {
    const s = new THREE.SphereGeometry(7, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    s.rotateX(-Math.PI / 2);
    const cyl = new THREE.CylinderGeometry(7, 7, 4, 24);
    cyl.rotateX(Math.PI / 2);
    cyl.translate(0, 0, 2);
    const b = merge([s, cyl]);
    b.rotateY(tilt);
    b.rotateZ(a);
    const pos = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, r > 40 ? 6 : 0);
    b.translate(pos.x, pos.y, pos.z);
    buttons.push(b);
  };
  for (let i = 0; i < 9; i++) addBtn(44, (i / 9) * Math.PI * 2, -0.5);
  for (let i = 0; i < 6; i++) addBtn(24, (i / 6) * Math.PI * 2 + 0.3, 0);
  addBtn(0, 0, 0);
  const btn = merge(buttons);
  btn.rotateY(Math.PI);
  g.add(mesh(btn, M.carbide));
  // barra de extensión
  g.add(mesh(rod(40, 126, 330, 2), M.black));
  g.add(mesh(ring(40, 44, 300, 330, 1), M.steelDark));
  return g;
}

export function buildAdapter() {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(profile([[0, 0], [34, 0], [36, 2], [36, 60], [42, 66], [42, 120], [40, 122], [0, 122]]), M.gold));
  const thr = [];
  for (let z = 4; z < 56; z += 5) thr.push(ring(33, 36.6, z, z + 2.4, 0.3));
  g.add(mesh(merge(thr), M.brass));
  return g;
}

export function buildExtension() {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(rod(30, 0, 360, 2), M.black));
  g.add(mesh(ring(30, 38, 0, 36, 1), M.steelDark));
  g.add(mesh(ring(30, 38, 324, 360, 1), M.steelDark));
  return g;
}

/** Catálogo de modelos por slug de producto (y variantes). */
export const PRODUCT_MODELS = {
  'sellos-mecanicos': () => buildSeal().root,
  'sistemas-auxiliares-api': () => buildSealPot(),
  'sellos-dgs': () => buildDGS(),
  'protectores-de-rodamientos': () => buildIsolator('bronze'),
  'sellos-neumaticos': () => buildPneumatic(),
  empaquetaduras: () => buildPacking('combined'),
  'spare-parts': () => buildSpares(),
  'bombas-centrifugas': () => buildPump().root,
  'cabezales-de-perforacion': () => buildDrillBit(),
  // variantes
  'iso-ptfe': () => buildIsolator('ptfe'),
  'iso-bronze': () => buildIsolator('bronze'),
  'iso-inox': () => buildIsolator('inox'),
  'pack-ptfe': () => buildPacking('ptfe'),
  'pack-aramid': () => buildPacking('aramid'),
  'pack-graphite': () => buildPacking('graphite'),
  'pack-combined': () => buildPacking('combined'),
  'drill-adapter': () => buildAdapter(),
  'drill-extension': () => buildExtension(),
};
