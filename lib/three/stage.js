// Escenario común: renderer, entorno de estudio, luces y sombra de contacto.
import * as THREE from 'three';

/** Estudio fotográfico: sala gris con cajas de luz, para reflejos con contraste en metales. */
function studioScene() {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), new THREE.MeshBasicMaterial({ color: 0xd8dce1, side: THREE.BackSide }));
  room.position.y = 6;
  env.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0xb4bac2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.9;
  env.add(floor);
  const panel = (w, h, pos, look, k, tint = 0xffffff) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(k), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(...pos);
    mesh.lookAt(...look);
    env.add(mesh);
  };
  panel(14, 9, [0, 15.5, 2], [0, 0, 0], 2.6); // cenital
  panel(3.2, 12, [-14, 4, 6], [0, 2, 0], 5.5); // franja izquierda (key)
  panel(2.4, 12, [13, 4, -8], [0, 2, 0], 3.6, 0xd6e6ff); // contraluz frío
  panel(16, 4, [0, 1.5, 17], [0, 1, 0], 2.2); // frontal bajo
  panel(20, 1.2, [0, -1.2, -18], [0, 1, 0], 0.4); // horizonte trasero oscuro
  panel(6, 6, [9, 7, 12], [0, 2, 0], 1.4);
  // banderas negras: generan las franjas oscuras que leen como metal
  const flag = (w, h, pos, look, c = 0x15191f) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(...look); env.add(m);
  };
  flag(4, 14, [-12, 3, -10], [0, 2, 0]);
  flag(5, 12, [14, 3, 8], [0, 2, 0]);
  flag(18, 2.2, [0, -2.6, 12], [0, 0, 0], 0x2a3038);
  return env;
}

function blobTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(25,50,78,0.55)');
  g.addColorStop(0.45, 'rgba(25,50,78,0.22)');
  g.addColorStop(1, 'rgba(25,50,78,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ fov?: number, shadowY?: number, shadowSize?: [number, number], dpr?: number, exposure?: number, preserve?: boolean }} o
 */
export function createStage(canvas, o = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: !!o.preserve,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(o.dpr ?? window.devicePixelRatio ?? 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = o.exposure ?? 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(studioScene(), 0.02).texture;
  scene.environment = env;
  scene.environmentIntensity = o.envIntensity ?? 0.9;

  const camera = new THREE.PerspectiveCamera(o.fov ?? 24, 1, 1, 5000);

  const key = new THREE.DirectionalLight(0xffffff, o.key ?? 2.4);
  key.position.set(-180, 320, 260);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -260;
  key.shadow.camera.right = 260;
  key.shadow.camera.top = 260;
  key.shadow.camera.bottom = -260;
  key.shadow.camera.near = 10;
  key.shadow.camera.far = 1200;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xdbe7f5, o.rim ?? 1.3);
  rim.position.set(260, 120, -300);
  scene.add(rim);

  const fill = new THREE.HemisphereLight(0xffffff, 0xc9d3de, 0.35);
  scene.add(fill);

  const floorY = o.shadowY ?? -80;
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.ShadowMaterial({ color: 0x19324e, opacity: o.shadowOpacity ?? 0.16 }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = floorY;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const [bw, bd] = o.shadowSize ?? [320, 140];
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(bw, bd),
    new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: o.blobOpacity ?? 0.55 }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = floorY + 0.2;
  scene.add(blob);

  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function dispose() {
    env.dispose();
    pmrem.dispose();
    renderer.dispose();
  }

  return { renderer, scene, camera, key, rim, blob, shadowPlane, resize, dispose, render: () => renderer.render(scene, camera) };
}

/** Proyecta un punto local de un objeto a coordenadas CSS del canvas. */
export function project(obj, local, camera, w, h, out = { x: 0, y: 0, z: 0 }) {
  const v = local.clone();
  obj.localToWorld(v);
  v.project(camera);
  out.x = (v.x * 0.5 + 0.5) * w;
  out.y = (-v.y * 0.5 + 0.5) * h;
  out.z = v.z;
  return out;
}
