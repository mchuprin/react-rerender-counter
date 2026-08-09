import * as esbuild from 'esbuild';
import { cpSync, readFileSync, writeFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');

// Копируем статические файлы в dist
cpSync('src', 'dist', { recursive: true });
// cpSync('icons', 'dist/icons', { recursive: true });

// Копируем и исправляем manifest (меняем пути на src/)
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
// Пути в manifest уже указывают на dist, копируем как есть
writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));

const ctx = await esbuild.context({
  entryPoints: [
    'src/inject.ts',
    'src/content.ts',
    'src/background.ts',
    'src/devtools.ts'
  ],
  bundle: false,        // пока не бандлим — нет импортов
  minify: !isWatch,     // минификация только в проде
  outdir: 'dist',
});

if (isWatch) {
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log('Build complete.');
}