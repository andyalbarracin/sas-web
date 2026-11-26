import { build } from 'esbuild';
await build({ entryPoints: ['scripts/3d/entry.js'], bundle: true, format: 'iife', outfile: 'scripts/3d/bundle.js', logLevel: 'warning' });
console.log('harness listo');
