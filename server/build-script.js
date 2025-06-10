import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['public/script-full.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  outfile: 'public/script.js',
  platform: 'browser'
}); 