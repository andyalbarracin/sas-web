// Arma un modelo de producto en un escenario y encuadra la cámara.
import * as THREE from 'three';
import { PRODUCT_MODELS, settle } from './products.js';
import { POSES } from './poses.js';

/**
 * @param {ReturnType<import('./stage.js').createStage>} stage
 * @param {string} slug
 * @param {number} W
 * @param {number} H
 */
export function frameProduct(stage, slug, W, H) {
  const pose = POSES[slug] || {};
  const pivot = new THREE.Group(); // gira el visor
  const wrap = new THREE.Group();
  const obj = PRODUCT_MODELS[slug]();
  wrap.add(obj);
  obj.rotation.x += pose.rx ?? 0;
  obj.rotation.y += pose.ry ?? 0;
  obj.rotation.z += pose.rz ?? 0;
  pivot.add(wrap);
  stage.scene.add(pivot);
  const box = settle(wrap, -80);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const k = Math.max(size.x, size.z);
  stage.blob.scale.set((k / 300) * 1.25, (k / 140) * 0.5 + 0.4, 1);
  const s = stage.key.shadow.camera;
  const R = sphere.radius * 1.6;
  s.left = -R; s.right = R; s.top = R; s.bottom = -R;
  s.updateProjectionMatrix();
  const dir = new THREE.Vector3(...(pose.cam ?? [-0.42, 0.38, 1])).normalize();
  const fov = (stage.camera.fov * Math.PI) / 180;
  const dist = (sphere.radius * (pose.zoom ?? 1.08)) / Math.sin(fov / 2) / Math.min(1, W / H);
  stage.camera.position.copy(center).addScaledVector(dir, dist);
  stage.camera.lookAt(center.x, center.y + (pose.ly ?? 0), center.z);
  // el pivote gira alrededor del centro del modelo
  pivot.position.set(center.x, 0, center.z);
  wrap.position.x -= center.x;
  wrap.position.z -= center.z;
  return { pivot, center, sphere };
}
