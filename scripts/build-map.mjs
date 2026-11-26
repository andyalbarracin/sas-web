// Genera el mapa de puntos del Cono Sur (Argentina destacada) para la sección Cobertura.
// Salida: lib/content/map.json  →  { w, h, step, ar: [[x,y]...], sa: [[x,y]...], proj: {...} }
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoMercator, geoContains } from 'd3-geo';

const topo = JSON.parse(readFileSync('node_modules/world-atlas/countries-50m.json', 'utf8'));
const all = feature(topo, topo.objects.countries).features;
const AR = new Set(['032', '238']); // Argentina e Islas Malvinas
const SA = new Set(['076', '152', '858', '600', '068', '604']);
const ar = all.filter((f) => AR.has(String(f.id).padStart(3, '0')));
const sa = all.filter((f) => SA.has(String(f.id).padStart(3, '0')));

const W = 560, H = 900, STEP = 9;
const frame = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-76, -20.5], [-52, -20.5], [-52, -56], [-76, -56], [-76, -20.5]]] } };
const proj = geoMercator().fitExtent([[12, 12], [W - 12, H - 12]], frame);

const dots = { ar: [], sa: [] };
for (let y = STEP / 2; y < H; y += STEP) {
  for (let x = STEP / 2; x < W; x += STEP) {
    const ll = proj.invert([x, y]);
    if (!ll) continue;
    if (ar.some((f) => geoContains(f, ll))) dots.ar.push([x, y]);
    else if (sa.some((f) => geoContains(f, ll))) dots.sa.push([x, y]);
  }
}
const out = { w: W, h: H, step: STEP, ar: dots.ar, sa: dots.sa, proj: { scale: proj.scale(), translate: proj.translate(), center: proj.center() } };
writeFileSync('lib/content/map.json', JSON.stringify(out));
console.log('dots', dots.ar.length, dots.sa.length, 'scale', proj.scale().toFixed(2));
