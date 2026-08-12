import * as esbuild from 'esbuild';
import { cpSync, readFileSync, writeFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');

// Копируем только HTML-файлы в dist
cpSync('src/devtools.html', 'dist/devtools.html');
cpSync('src/panel.html', 'dist/panel.html');

// Копируем и исправляем manifest
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));

// Сборка без бандлинга (content, background, inject, devtools)
const ctx = await esbuild.context({
  entryPoints: [
    'src/inject.ts',
    'src/content.ts',
    'src/background.ts',
    'src/devtools.ts',
  ],
  bundle: false,
  minify: !isWatch,
  outdir: 'dist',
});

// Бандл panel.tsx с React
const panelCtx = await esbuild.context({
  entryPoints: ['src/panel.tsx'],
  bundle: true,
  minify: !isWatch,
  outdir: 'dist',
  format: 'iife',
});

if (isWatch) {
  await ctx.watch();
  await panelCtx.watch();
  console.log('Watching for changes...');
} else {
  await ctx.rebuild();
  await panelCtx.rebuild();
  await ctx.dispose();
  await panelCtx.dispose();
  console.log('Build complete.');
}
