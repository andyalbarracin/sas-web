// Pose y encuadre de cada modelo de producto (renders y visor 3D).
const PI = Math.PI;
export const POSES = {
  'sellos-mecanicos': { ry: -0.15 },
  'sistemas-auxiliares-api': { ry: 0.7, cam: [-0.4, 0.22, 1], zoom: 1.0 },
  'sellos-dgs': { ry: PI - 0.75, rx: 0.2 },
  'protectores-de-rodamientos': { ry: PI - 1.05, rx: 0.32 },
  'sellos-neumaticos': { ry: PI - 0.5, rx: 0.1 },
  empaquetaduras: { ry: -0.3 },
  'spare-parts': { cam: [-0.3, 0.75, 1], zoom: 0.95 },
  'bombas-centrifugas': { cam: [-0.45, 0.42, 1], zoom: 0.98 },
  'cabezales-de-perforacion': { ry: PI + 0.4, rx: 0.12 },
  'iso-ptfe': { ry: PI - 1.05, rx: 0.32 },
  'iso-bronze': { ry: PI - 1.05, rx: 0.32 },
  'iso-inox': { ry: PI - 1.05, rx: 0.32 },
  'pack-ptfe': { ry: -0.3 },
  'pack-aramid': { ry: -0.3 },
  'pack-graphite': { ry: -0.3 },
  'pack-combined': { ry: -0.3 },
  'drill-adapter': { ry: PI + 0.9, rx: 0.1 },
  'drill-extension': { ry: PI + 1.1, rx: 0.1 },
};
