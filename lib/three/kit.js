// Kit de geometría y materiales para los modelos procedurales de SAS.
// Todo se construye a lo largo del eje Z (eje del equipo). Unidades ≈ mm.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const SEG = 128;

/**
 * Sólido de revolución con aristas nítidas: cada tramo del perfil es su propio
 * torno, así las normales no se promedian entre caras.
 * @param {Array<[number, number]>} pts perfil cerrado [radio, z]
 */
export function revolve(pts, segments = SEG, closed = true) {
  const parts = [];
  const n = pts.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    const g = new THREE.LatheGeometry(
      [new THREE.Vector2(Math.max(a[0], 0.0001), a[1]), new THREE.Vector2(Math.max(b[0], 0.0001), b[1])],
      segments,
    );
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  merged.rotateX(Math.PI / 2); // eje Y del torno → eje Z del equipo
  return merged;
}

/** Anillo con chaflanes en las cuatro aristas. */
export function ring(rIn, rOut, z0, z1, c = 0.6, segments = SEG) {
  const k = Math.min(c, (rOut - rIn) / 3, (z1 - z0) / 3);
  return revolve(
    [
      [rIn + k, z0],
      [rOut - k, z0],
      [rOut, z0 + k],
      [rOut, z1 - k],
      [rOut - k, z1],
      [rIn + k, z1],
      [rIn, z1 - k],
      [rIn, z0 + k],
    ],
    segments,
  );
}

/** Perfil libre: lista de [r, z] recorrida en sentido horario. */
export function profile(pts, segments = SEG) {
  return revolve(pts, segments, true);
}

/** Cilindro macizo con chaflán. */
export function rod(r, z0, z1, c = 0.6, segments = SEG) {
  const k = Math.min(c, r / 3, (z1 - z0) / 3);
  return revolve(
    [
      [0, z0],
      [r - k, z0],
      [r, z0 + k],
      [r, z1 - k],
      [r - k, z1],
      [0, z1],
    ],
    segments,
  );
}

/** O-ring sobre el eje Z. */
export function oring(R, d, z, segments = SEG) {
  const g = new THREE.TorusGeometry(R, d / 2, 20, segments);
  g.translate(0, 0, z);
  return g;
}

/** Resorte helicoidal a lo largo de Z, centrado en (x, y). */
export function spring(x, y, rCoil, wire, z0, z1, turns) {
  class Helix extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const a = t * turns * Math.PI * 2;
      return target.set(x + Math.cos(a) * rCoil, y + Math.sin(a) * rCoil, z0 + (z1 - z0) * t);
    }
  }
  return new THREE.TubeGeometry(new Helix(), Math.round(turns * 36), wire, 10, false);
}

/** Extrusión de un Shape a lo largo de Z entre z0 y z0+depth, con bisel. */
export function extrude(shape, z0, depth, bevel = 0.8, curveSegments = 48) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments,
  });
  g.translate(0, 0, z0 + bevel);
  return g;
}

export function circlePath(r, cx = 0, cy = 0, cw = false) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, cw);
  return p;
}

/** Ranura (agujero oblongo) como Path. */
export function slotPath(cx, cy, len, w, angle) {
  const p = new THREE.Path();
  const r = w / 2;
  const dx = Math.cos(angle) * len / 2;
  const dy = Math.sin(angle) * len / 2;
  p.absarc(cx + dx, cy + dy, r, angle - Math.PI / 2, angle + Math.PI / 2, false);
  p.absarc(cx - dx, cy - dy, r, angle + Math.PI / 2, angle + (3 * Math.PI) / 2, false);
  p.closePath();
  return p;
}

/** Cilindro orientado entre dos puntos (para tornillos, caños, tapones). */
export function cylBetween(a, b, r, radialSegments = 24, capped = true) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, radialSegments, 1, !capped);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.applyQuaternion(q);
  g.translate(a.x, a.y, a.z);
  return g;
}

/** Caño curvo que sigue una lista de puntos. */
export function pipe(points, r, tension = 0.2) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', tension);
  return new THREE.TubeGeometry(curve, Math.max(48, points.length * 24), r, 18, false);
}

export function merge(list) {
  const g = mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)), false);
  return g;
}

// ── Materiales ────────────────────────────────────────────────────────────

const cache = new Map();

/** Textura de ruido fino para dar grano de mecanizado a la rugosidad. */
function grainTexture() {
  if (typeof document === 'undefined') return null;
  if (cache.has('grain')) return cache.get('grain');
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d');
  const img = x.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const row = Math.floor(i / s);
    const v = 150 + Math.sin(row * 0.9) * 18 + (Math.random() - 0.5) * 60;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 1);
  cache.set('grain', t);
  return t;
}

/** Textura de trenzado para empaquetaduras. */
export function braidTexture(base, alt) {
  if (typeof document === 'undefined') return null;
  const key = `braid-${base}-${alt}`;
  if (cache.has(key)) return cache.get(key);
  const w = 512, h = 128;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);
  const cell = 32;
  for (let j = 0; j < h / cell + 1; j++) {
    for (let i = 0; i < w / cell + 1; i++) {
      const cx = i * cell + (j % 2 ? cell / 2 : 0);
      const cy = j * cell;
      const g = x.createLinearGradient(cx - cell / 2, cy, cx + cell / 2, cy);
      const tint = alt && (i + j) % 4 === 0 ? alt : base;
      g.addColorStop(0, 'rgba(0,0,0,0.35)');
      g.addColorStop(0.5, tint);
      g.addColorStop(1, 'rgba(0,0,0,0.35)');
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(cx, cy, cell * 0.62, cell * 0.36, Math.PI / 5, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.25)';
      x.lineWidth = 1;
      for (let k = -2; k <= 2; k++) {
        x.beginPath();
        x.moveTo(cx - cell * 0.5, cy + k * 4 - cell * 0.15);
        x.lineTo(cx + cell * 0.5, cy + k * 4 + cell * 0.15);
        x.stroke();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 1);
  cache.set(key, t);
  return t;
}

export function materials() {
  if (cache.has('mats')) return cache.get('mats');
  const grain = grainTexture();
  const m = {
    steel: new THREE.MeshPhysicalMaterial({ color: 0xc3c9d1, metalness: 1, roughness: 0.24, roughnessMap: grain }),
    steelDark: new THREE.MeshPhysicalMaterial({ color: 0x8a929e, metalness: 1, roughness: 0.38, roughnessMap: grain }),
    steelPolish: new THREE.MeshPhysicalMaterial({ color: 0xd9dee5, metalness: 1, roughness: 0.1 }),
    cast: new THREE.MeshPhysicalMaterial({ color: 0x9aa1aa, metalness: 0.7, roughness: 0.5 }),
    sic: new THREE.MeshPhysicalMaterial({ color: 0x4b5059, metalness: 0.35, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.12 }),
    carbon: new THREE.MeshPhysicalMaterial({ color: 0x232529, metalness: 0.15, roughness: 0.42 }),
    tungsten: new THREE.MeshPhysicalMaterial({ color: 0x6d7178, metalness: 0.85, roughness: 0.16 }),
    rubber: new THREE.MeshPhysicalMaterial({ color: 0x1b1d21, metalness: 0, roughness: 0.72, sheen: 0.4, sheenColor: 0x44505c }),
    bronze: new THREE.MeshPhysicalMaterial({ color: 0xc08e4f, metalness: 1, roughness: 0.32 }),
    brass: new THREE.MeshPhysicalMaterial({ color: 0xc9a356, metalness: 1, roughness: 0.28 }),
    blue: new THREE.MeshPhysicalMaterial({ color: 0x1d70b6, metalness: 0.15, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.25 }),
    bluePaint: new THREE.MeshPhysicalMaterial({ color: 0x24589a, metalness: 0.25, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    navy: new THREE.MeshPhysicalMaterial({ color: 0x1f3a5c, metalness: 0.2, roughness: 0.5, clearcoat: 0.3 }),
    motor: new THREE.MeshPhysicalMaterial({ color: 0x6b737d, metalness: 0.45, roughness: 0.48 }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xb8322c, metalness: 0.2, roughness: 0.45, clearcoat: 0.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 0.9, thickness: 2, transparent: true, opacity: 0.55 }),
    gauge: new THREE.MeshPhysicalMaterial({ color: 0xf4f6f8, metalness: 0, roughness: 0.35 }),
    ptfeGraphite: new THREE.MeshPhysicalMaterial({ color: 0x3a3d42, metalness: 0.1, roughness: 0.55 }),
    black: new THREE.MeshPhysicalMaterial({ color: 0x15171a, metalness: 0.3, roughness: 0.5 }),
    gold: new THREE.MeshPhysicalMaterial({ color: 0xc69b3c, metalness: 1, roughness: 0.3 }),
    carbide: new THREE.MeshPhysicalMaterial({ color: 0x2b2d31, metalness: 0.6, roughness: 0.22, clearcoat: 0.5 }),
  };
  cache.set('mats', m);
  return m;
}

export function packingMaterial(base, alt) {
  return new THREE.MeshPhysicalMaterial({ map: braidTexture(base, alt), roughness: 0.85, metalness: 0, sheen: 0.6, sheenColor: new THREE.Color(base) });
}

export function mesh(geo, mat, name) {
  const m = new THREE.Mesh(geo, mat);
  if (name) m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
