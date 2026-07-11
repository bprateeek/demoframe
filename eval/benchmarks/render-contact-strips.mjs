#!/usr/bin/env node
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { loadConfig } from '../../dist/config/load.js';
import { buildDocument } from '../../dist/templates/document.js';
import { openRenderSession } from '../../dist/render/browser.js';

const benchmarksDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(benchmarksDir, '../..');
const artifactsRoot = path.join(benchmarksDir, 'artifacts');
const benchmarkNames = ['readme-loop-cli', 'social-film-dashboard', 'product-tour-ui'];
const sampleKinds = ['entry', 'peak', 'exit'];

function svgLabel(width, height, text, options = {}) {
  const { size = 20, x = 12, y = Math.round(height / 2), anchor = 'start', color = '#dbe7f2' } = options;
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#09111b"/>
    <text x="${x}" y="${y}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" font-weight="700" text-anchor="${anchor}" dominant-baseline="middle">${escaped}</text>
  </svg>`);
}

async function launchBrowser() {
  const args = ['--force-color-profile=srgb', '--hide-scrollbars', '--disable-lcd-text'];
  try {
    return await chromium.launch({ headless: true, args });
  } catch {
    return chromium.launch({ headless: true, args: [...args, '--single-process', '--no-zygote'] });
  }
}

async function captureTarget(benchmark, outDir) {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: benchmark.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const targetUrl = new URL(pathToFileURL(path.join(benchmarksDir, benchmark.id, benchmark.target)));
  targetUrl.searchParams.set('paused', '1');
  await page.goto(targetUrl.href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const captures = new Map();
  try {
    for (const shot of benchmark.shots) {
      const times = { entry: shot.start + 0.08, peak: shot.peak, exit: Math.max(shot.start, shot.end - 0.08) };
      for (const kind of sampleKinds) {
        await page.evaluate((ms) => window.__seek(ms), times[kind] * 1000);
        const file = path.join(outDir, 'target', `${shot.id}-${kind}.png`);
        mkdirSync(path.dirname(file), { recursive: true });
        await page.screenshot({ path: file, type: 'png', animations: 'disabled' });
        captures.set(`${shot.id}:${kind}`, file);
      }
    }
  } finally {
    await browser.close();
  }
  return captures;
}

async function captureBaseline(benchmark, outDir) {
  const configFile = path.join(benchmarksDir, benchmark.id, benchmark.baseline);
  const loaded = loadConfig(configFile);
  const document = await buildDocument(loaded.config, loaded.baseDir);
  const session = await openRenderSession(document, 'draft');
  const captures = new Map();
  try {
    for (const shot of benchmark.shots) {
      const targetTimes = { entry: shot.start + 0.08, peak: shot.peak, exit: Math.max(shot.start, shot.end - 0.08) };
      for (const kind of sampleKinds) {
        const baselineTime = (targetTimes[kind] / benchmark.durationS) * document.timeline.duration;
        await session.seek(baselineTime * 1000);
        const file = path.join(outDir, 'baseline', `${shot.id}-${kind}.png`);
        mkdirSync(path.dirname(file), { recursive: true });
        await session.screenshot(file);
        captures.set(`${shot.id}:${kind}`, file);
      }
    }
  } finally {
    await session.close();
  }
  return captures;
}

async function normalizedPng(file, width, height) {
  return sharp(file).resize(width, height, { fit: 'cover', position: 'centre' }).png().toBuffer();
}

async function timelineStrip(benchmark, captures, outFile, label) {
  const cellW = 300;
  const cellH = Math.round((cellW * benchmark.viewport.height) / benchmark.viewport.width);
  const rowLabelW = 118;
  const colHeaderH = 34;
  const rowGap = 7;
  const width = rowLabelW + cellW * 3;
  const height = colHeaderH + benchmark.shots.length * (cellH + rowGap) - rowGap;
  const composites = [
    { input: svgLabel(rowLabelW, colHeaderH, label, { size: 13 }), left: 0, top: 0 },
    ...sampleKinds.map((kind, index) => ({
      input: svgLabel(cellW, colHeaderH, kind, { size: 12, x: cellW / 2, anchor: 'middle', color: '#86a0b7' }),
      left: rowLabelW + index * cellW,
      top: 0,
    })),
  ];
  for (const [row, shot] of benchmark.shots.entries()) {
    const top = colHeaderH + row * (cellH + rowGap);
    composites.push({ input: svgLabel(rowLabelW, cellH, shot.id, { size: 13 }), left: 0, top });
    for (const [column, kind] of sampleKinds.entries()) {
      composites.push({
        input: await normalizedPng(captures.get(`${shot.id}:${kind}`), cellW, cellH),
        left: rowLabelW + column * cellW,
        top,
      });
    }
  }
  await sharp({ create: { width, height, channels: 3, background: '#09111b' } }).composite(composites).png().toFile(outFile);
}

async function pairwiseStrip(benchmark, baseline, target, outFile) {
  const cellW = benchmark.shots.length > 5 ? 205 : 240;
  const cellH = Math.round((cellW * benchmark.viewport.height) / benchmark.viewport.width);
  const labelW = 112;
  const headerH = 34;
  const width = labelW + cellW * benchmark.shots.length;
  const height = headerH + cellH * 2 + 7;
  const composites = [];
  for (const [column, shot] of benchmark.shots.entries()) {
    composites.push({
      input: svgLabel(cellW, headerH, shot.id, { size: 11, x: cellW / 2, anchor: 'middle', color: '#86a0b7' }),
      left: labelW + column * cellW,
      top: 0,
    });
    composites.push({ input: await normalizedPng(baseline.get(`${shot.id}:peak`), cellW, cellH), left: labelW + column * cellW, top: headerH });
    composites.push({ input: await normalizedPng(target.get(`${shot.id}:peak`), cellW, cellH), left: labelW + column * cellW, top: headerH + cellH + 7 });
  }
  composites.push({ input: svgLabel(labelW, cellH, 'baseline', { size: 13 }), left: 0, top: headerH });
  composites.push({ input: svgLabel(labelW, cellH, 'target', { size: 13 }), left: 0, top: headerH + cellH + 7 });
  await sharp({ create: { width, height, channels: 3, background: '#09111b' } }).composite(composites).png().toFile(outFile);
}

async function main() {
  if (!process.argv.includes('--keep')) rmSync(artifactsRoot, { recursive: true, force: true });
  mkdirSync(artifactsRoot, { recursive: true });
  for (const name of benchmarkNames) {
    const benchmark = JSON.parse(readFileSync(path.join(benchmarksDir, name, 'benchmark.json'), 'utf8'));
    const outDir = path.join(artifactsRoot, name);
    console.log(`capturing ${name}`);
    const [baseline, target] = await Promise.all([
      captureBaseline(benchmark, outDir),
      captureTarget(benchmark, outDir),
    ]);
    await timelineStrip(benchmark, baseline, path.join(outDir, 'contact-baseline.png'), 'baseline');
    await timelineStrip(benchmark, target, path.join(outDir, 'contact-target.png'), 'target');
    await pairwiseStrip(benchmark, baseline, target, path.join(outDir, 'contact-pairwise.png'));
  }
  console.log(`contact strips written to ${path.relative(repoRoot, artifactsRoot)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
