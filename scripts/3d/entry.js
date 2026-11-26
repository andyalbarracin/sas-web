import * as THREE from 'three';
import { createStage, project } from '../../lib/three/stage.js';
import { buildSeal, setExplode } from '../../lib/three/seal.js';
import { buildPump, setPumpExplode } from '../../lib/three/pump.js';
import { PRODUCT_MODELS, settle } from '../../lib/three/products.js';
import { POSES } from '../../lib/three/poses.js';
import { frameProduct } from '../../lib/three/frame.js';
window.THREE = THREE;
window.SAS3D = { createStage, project, buildSeal, setExplode, buildPump, setPumpExplode, PRODUCT_MODELS, settle, POSES };

let stage = null;
window.renderProduct = (slug, W = 1600, H = 1200) => {
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  const canvas = document.getElementById('c');
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  if (stage) stage.dispose();
  stage = createStage(canvas, { preserve: true, dpr: 1, shadowY: -80 });
  stage.resize(W, H);
  frameProduct(stage, slug, W, H);
  stage.render();
  return true;
};
window.productSlugs = () => Object.keys(POSES);
