// Sello mecánico tipo cartucho simple, con datos para la vista explosionada.
import * as THREE from 'three';
import { SEAL_LABELS } from './labels.js';
import { ring, profile, oring, spring, extrude, slotPath, circlePath, cylBetween, merge, materials, mesh } from './kit.js';

/**
 * @typedef {{ object: THREE.Object3D, key: string, explode: THREE.Vector3, anchor: THREE.Vector3, delay: number }} Part
 */

function glandShape() {
  // Brida de cuatro brazos con ranuras para bulones.
  const s = new THREE.Shape();
  const R = 47; // cuerpo
  const arm = 66; // alcance de los brazos
  const w = 13; // semiancho del brazo
  const n = 4;
  const start = Math.PI / 4;
  for (let i = 0; i < n; i++) {
    const a = start + (i * Math.PI * 2) / n;
    const a0 = a - Math.asin(w / R);
    const a1 = a + Math.asin(w / R);
    const ux = Math.cos(a), uy = Math.sin(a);
    const px = -uy, py = ux;
    const p0 = [Math.cos(a0) * R, Math.sin(a0) * R];
    const tipC = [ux * (arm - w), uy * (arm - w)];
    if (i === 0) s.moveTo(p0[0], p0[1]);
    else s.lineTo(p0[0], p0[1]);
    s.lineTo(tipC[0] - px * w, tipC[1] - py * w);
    s.absarc(tipC[0], tipC[1], w, a - Math.PI / 2, a + Math.PI / 2, false);
    s.lineTo(Math.cos(a1) * R, Math.sin(a1) * R);
    const next = start + ((i + 1) * Math.PI * 2) / n - Math.asin(w / R);
    s.absarc(0, 0, R, a1, next, false);
  }
  s.closePath();
  s.holes.push(circlePath(27));
  for (let i = 0; i < n; i++) {
    const a = start + (i * Math.PI * 2) / n;
    s.holes.push(slotPath(Math.cos(a) * (arm - w - 2), Math.sin(a) * (arm - w - 2), 9, 8.5, a));
  }
  return s;
}

function clip(mats, angle) {
  // Clip de centrado (bronce), perfil en L extruido tangencialmente.
  const sh = new THREE.Shape();
  sh.moveTo(34, 15);
  sh.lineTo(41, 15);
  sh.lineTo(41, 27);
  sh.lineTo(31.5, 27);
  sh.lineTo(31.5, 21);
  sh.lineTo(34, 21);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 8, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5, bevelSegments: 2 });
  // (x=r, y=z, z=tangente) → reubicar: r sobre X, z de equipo sobre Z
  g.translate(0, 0, -4);
  g.rotateX(Math.PI / 2); // y→z(equipo), z→-y(tangente)
  const screw = cylBetween(new THREE.Vector3(41, 0, 23.5), new THREE.Vector3(44.5, 0, 23.5), 2.6, 6);
  const grp = new THREE.Group();
  grp.add(mesh(g, mats.bronze));
  grp.add(mesh(screw, mats.steelDark));
  grp.rotation.z = angle;
  return grp;
}

export function buildSeal(opts = {}) {
  const mats = materials();
  const root = new THREE.Group();
  root.name = 'sello-cartucho';
  const body = new THREE.Group();
  root.add(body);
  /** @type {Part[]} */
  const parts = [];
  const add = (key, obj, dz, anchorLocal, delay = 0, radial = null) => {
    body.add(obj);
    const explode = new THREE.Vector3(0, 0, dz);
    parts.push({ key, object: obj, explode, radial, anchor: anchorLocal, delay, base: obj.position.clone() });
    return obj;
  };

  // Camisa con resalto de arrastre
  const sleeve = mesh(
    profile([
      [20, -42],
      [29.4, -42],
      [30, -41.4],
      [30, -36.6],
      [29.4, -36],
      [23.6, -36],
      [23, -35.4],
      [23, 35.4],
      [22.4, 36],
      [20.6, 36],
      [20, 35.4],
    ]),
    mats.steelPolish,
    'camisa',
  );
  add('sleeve', sleeve, 0, new THREE.Vector3(0, 23, 30), 0);

  const sleeveOring = mesh(oring(21.2, 2.4, -39), mats.rubber, 'oring-camisa');
  add('sleeveOring', sleeveOring, -112, new THREE.Vector3(0, 22, -39), 0.0);

  // Cara rotativa (SiC)
  const rotary = mesh(ring(23.6, 37, -35, -26.5, 0.8), mats.sic, 'cara-rotativa');
  add('rotary', rotary, -86, new THREE.Vector3(0, 37, -30), 0.04);
  const rotaryOring = mesh(oring(24.8, 2.3, -31), mats.rubber);
  add('rotaryOring', rotaryOring, -98, new THREE.Vector3(0, 25, -31), 0.02);

  // Cara estacionaria (carbón grafito) con nariz
  const carbon = mesh(
    profile([
      [26.2, -26.5],
      [33, -26.5],
      [33.4, -26],
      [33.4, -23.6],
      [35.6, -23.6],
      [36.2, -23],
      [36.2, -17.6],
      [35.6, -17],
      [25.6, -17],
      [25, -17.6],
      [25, -23],
      [25.6, -23.6],
      [25.8, -26],
    ]),
    mats.carbon,
    'cara-estacionaria',
  );
  add('carbon', carbon, -54, new THREE.Vector3(0, 36, -21), 0.08);
  const statOring = mesh(oring(37.4, 2.4, -20.2), mats.rubber);
  add('statOring', statOring, -42, new THREE.Vector3(0, 38.5, -20), 0.1);

  // Anillo de empuje
  const thrust = mesh(ring(26, 38.5, -17, -14, 0.5), mats.steel, 'anillo-empuje');
  add('thrust', thrust, -30, new THREE.Vector3(0, 38.5, -15.5), 0.12);

  // Resortes (8)
  const springs = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    springs.push(spring(Math.cos(a) * 32.5, Math.sin(a) * 32.5, 1.9, 0.5, -14, -5, 6));
  }
  const springMesh = mesh(merge(springs), mats.steel, 'resortes');
  add('springs', springMesh, -18, new THREE.Vector3(0, 34.5, -9), 0.14);

  // Brida (glándula): cuerpo, bridas con brazos, cubo exterior
  const glandHub = profile([
    [27.5, -25],
    [45.2, -25],
    [46, -24.2],
    [46, -6],
    [27.5, -6],
  ]);
  const glandFlange = extrude(glandShape(), -6, 12, 1.1);
  const glandOut = profile([
    [25.4, 6],
    [35, 6],
    [35, 15.2],
    [34.2, 16],
    [26.2, 16],
    [25.4, 15.2],
  ]);
  const gland = new THREE.Group();
  gland.name = 'brida';
  gland.add(mesh(merge([glandHub, glandOut]), mats.cast));
  gland.add(mesh(glandFlange, mats.cast));
  // Conexiones (flush / quench) con tapones azules
  const plugs = new THREE.Group();
  [Math.PI / 2 - 0.42, Math.PI / 2 + 0.42].forEach((a) => {
    const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    const p0 = dir.clone().multiplyScalar(42).setZ(-15.5);
    const p1 = dir.clone().multiplyScalar(52).setZ(-15.5);
    gland.add(mesh(cylBetween(p0, p1, 5.2, 28), mats.cast));
    const c0 = dir.clone().multiplyScalar(52).setZ(-15.5);
    const c1 = dir.clone().multiplyScalar(56.5).setZ(-15.5);
    plugs.add(mesh(cylBetween(c0, c1, 4.1, 6), mats.blue));
  });
  gland.add(plugs);
  add('gland', gland, 14, new THREE.Vector3(0, 60, 0), 0.18);

  const gasket = mesh(oring(49.5, 2.6, -25.6), mats.rubber, 'junta');
  add('gasket', gasket, -4, new THREE.Vector3(0, -51, -25.6), 0.16);

  // Collarín de arrastre con prisioneros
  const collar = new THREE.Group();
  collar.add(mesh(ring(23, 33, 17, 30, 0.9), mats.steelPolish));
  const screws = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const d = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    screws.push(cylBetween(d.clone().multiplyScalar(32.2).setZ(24.5), d.clone().multiplyScalar(33.25).setZ(24.5), 2.4, 6));
  }
  collar.add(mesh(merge(screws), mats.black));
  add('collar', collar, 52, new THREE.Vector3(0, 33, 24), 0.22);

  // Clips de centrado
  const clips = new THREE.Group();
  for (let i = 0; i < 3; i++) clips.add(clip(mats, (i / 3) * Math.PI * 2 + Math.PI / 2 + Math.PI / 3));
  add('clips', clips, 34, new THREE.Vector3(0, -40, 26), 0.26, 16);

  // Orientación: eje del equipo en X de mundo
  body.rotation.y = Math.PI / 2;

  return { root, body, parts, labels: SEAL_LABELS };
}

export { SEAL_LABELS };

/**
 * Aplica el progreso de explosión (0 = armado, 1 = despiece).
 * @param {{parts: any[]}} model
 * @param {number} p
 */
export function setExplode(model, p) {
  for (const part of model.parts) {
    const t = clamp01((p - part.delay) / (1 - part.delay * 1.2));
    const e = easeInOut(t);
    part.object.position.copy(part.base).addScaledVector(part.explode, e);
    if (part.radial) {
      // Los clips salen radialmente
      part.object.children.forEach((c) => {
        const a = c.rotation.z;
        c.position.set(Math.cos(a) * part.radial * e, Math.sin(a) * part.radial * e, 0);
      });
    }
  }
}

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
