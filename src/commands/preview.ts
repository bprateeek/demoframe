import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { runCheck } from './check.js';
import { ensureChromium } from '../env/install.js';
import type { LoadedConfig } from '../config/load.js';
import { buildDocument } from '../templates/document.js';
import { openRenderSession, type RenderSession } from '../render/browser.js';
import { applyCrop, computeAlphaBox, type AlphaBox } from '../render/crop.js';
import { measureLayout, type LayoutFinding } from '../qa/layout.js';
import { briefSummary, resolveInferredAssumptions } from '../qa/brief.js';

const GITHUB_DARK = '#0d1117';
const GITHUB_LIGHT = '#ffffff';
const TAP_PRESS = 0.94;

async function compositeOn(stillPng: Buffer, background: string, outFile: string): Promise<void> {
  const meta = await sharp(stillPng).metadata();
  const pad = 48;
  await sharp({
    create: {
      width: (meta.width ?? 0) + pad * 2,
      height: (meta.height ?? 0) + pad * 2,
      channels: 4,
      background,
    },
  })
    .composite([{ input: stillPng, left: pad, top: pad }])
    .png()
    .toFile(outFile);
}

async function compositeOnCheckerboard(stillPng: Buffer, outFile: string): Promise<void> {
  const meta = await sharp(stillPng).metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const cell = 16;
  const checkerboard = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <pattern id="c" width="${cell * 2}" height="${cell * 2}" patternUnits="userSpaceOnUse">
    <rect width="${cell}" height="${cell}" fill="#d7dee8"/>
    <rect x="${cell}" y="${cell}" width="${cell}" height="${cell}" fill="#d7dee8"/>
  </pattern>
  <rect width="100%" height="100%" fill="url(#c)"/>
</svg>`);
  await sharp(checkerboard).composite([{ input: stillPng, left: 0, top: 0 }]).png().toFile(outFile);
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

interface CropPlan {
  box: AlphaBox;
  marginPx: number;
}

function previewSampleTimes(doc: Awaited<ReturnType<typeof buildDocument>>): number[] {
  const times: number[] = [];
  for (const ts of doc.timeline.scenes) {
    times.push(ts.start + ts.duration * 0.15, ts.start + ts.duration * 0.5, ts.start + ts.duration * 0.9);
    if (ts.data.tap) times.push(ts.start + ts.duration * TAP_PRESS);
    if (ts.data.celebrate) times.push(ts.start + Math.min(0.2, ts.duration * 0.25));
  }
  times.push(Math.max(0, doc.timeline.duration - 0.05));
  return [...new Set(times.map((t) => Math.max(0, Math.min(doc.timeline.duration, t)).toFixed(3)))].map(Number);
}

async function transparentCropPlan(
  session: RenderSession,
  doc: Awaited<ReturnType<typeof buildDocument>>,
): Promise<CropPlan | undefined> {
  if (!doc.transparent) return undefined;
  const samples: Buffer[] = [];
  for (const t of previewSampleTimes(doc)) {
    await session.seek(t * 1000);
    samples.push(await session.screenshot());
  }
  return {
    box: await computeAlphaBox(samples),
    marginPx: Math.round(doc.frameMargin * session.scale),
  };
}

async function captureStill(session: RenderSession, crop: CropPlan | undefined): Promise<Buffer> {
  const still = await session.screenshot();
  return crop ? applyCrop(still, crop.box, crop.marginPx).png().toBuffer() : still;
}

export interface PreviewArtifacts {
  files: string[];
  layout: LayoutFinding[];
}

export async function writePreviewArtifacts(
  loaded: LoadedConfig,
  outDir: string,
): Promise<PreviewArtifacts> {
  const { config, baseDir } = loaded;
  mkdirSync(outDir, { recursive: true });

  const doc = await buildDocument(config, baseDir);
  const session = await openRenderSession(doc, config.output.quality);
  const written: string[] = [];
  let layout: LayoutFinding[] = [];
  try {
    const crop = await transparentCropPlan(session, doc);
    for (const ts of doc.timeline.scenes) {
      if (ts.type === 'hold') continue;
      const t = ts.start + ts.duration * 0.65;
      await session.seek(t * 1000);
      const file = path.join(outDir, `scene_${ts.index}_${slug(ts.name ?? ts.type)}.png`);
      await sharp(await captureStill(session, crop)).png().toFile(file);
      written.push(file);
    }

    for (const ts of doc.timeline.scenes) {
      const rendered = config.scenes[ts.renderIndex];
      if (ts.data.tap) {
        await session.seek((ts.start + ts.duration * TAP_PRESS) * 1000);
        const label = rendered.type === 'status-card' ? 'cta' : 'tap';
        const file = path.join(outDir, `moment_${ts.index}_${label}.png`);
        await sharp(await captureStill(session, crop)).png().toFile(file);
        written.push(file);
      }
      if (ts.data.celebrate) {
        await session.seek((ts.start + Math.min(0.2, ts.duration * 0.25)) * 1000);
        const file = path.join(outDir, `moment_${ts.index}_celebrate.png`);
        await sharp(await captureStill(session, crop)).png().toFile(file);
        written.push(file);
      }
    }

    await session.seek((doc.timeline.duration - 0.05) * 1000);
    const finalStill = await captureStill(session, crop);

    if (doc.transparent) {
      const checkerFile = path.join(outDir, 'final_transparent_checkerboard.png');
      await compositeOnCheckerboard(finalStill, checkerFile);
      written.push(checkerFile);
    }

    const displayWidth = config.output.displayWidth ?? Math.round(config.output.width * 0.6);
    const readmeSize = await sharp(finalStill).resize({ width: displayWidth }).png().toBuffer();
    const readmeFile = path.join(outDir, 'final_readme_size.png');
    await sharp(readmeSize).toFile(readmeFile);
    written.push(readmeFile);

    const darkFile = path.join(outDir, 'final_github_dark.png');
    const lightFile = path.join(outDir, 'final_github_light.png');
    await compositeOn(readmeSize, GITHUB_DARK, darkFile);
    await compositeOn(readmeSize, GITHUB_LIGHT, lightFile);
    written.push(darkFile, lightFile);

    layout = await measureLayout(session, doc.timeline);
  } finally {
    await session.close();
  }
  return { files: written, layout };
}

export async function writePreviewStills(loaded: LoadedConfig, outDir: string): Promise<string[]> {
  return (await writePreviewArtifacts(loaded, outDir)).files;
}

export async function runPreview(
  configFile: string,
  opts: { out: string; download?: boolean; autonomous?: boolean; assumptions?: string[] },
): Promise<void> {
  const { loaded, errors, warnings, notices } = await runCheck(configFile, {
    allowInferred: opts.autonomous,
  });
  for (const e of errors) console.log(`  x ${e.message}`);
  for (const w of warnings) console.log(`  ! ${w.message}`);
  for (const n of notices) console.log(`  i ${n.message}`);
  const summary = briefSummary(loaded.config);
  if (opts.autonomous && !summary.confirmed) {
    const resolved = resolveInferredAssumptions(loaded.config, opts.assumptions);
    for (const n of resolved.notices) console.log(`  i ${n.message}`);
    if (resolved.assumptions.length > 0) {
      console.log('\ninferred assumptions:');
      for (const assumption of resolved.assumptions) console.log(`  - ${assumption}`);
    }
  }
  if (errors.length > 0) {
    const firstError = errors[0] ? ` First error: ${errors[0].message}.` : '';
    throw new Error(
      `refusing to preview: ${errors.length} blocking error${errors.length === 1 ? '' : 's'} above.${firstError}`,
    );
  }
  await ensureChromium(opts.download !== false);

  const outDir = path.resolve(opts.out);
  const { files: written, layout } = await writePreviewArtifacts(loaded, outDir);

  console.log(`\nwrote ${written.length} previews to ${outDir}:`);
  for (const file of written) console.log(`  ${path.basename(file)}`);
  if (layout.length > 0) {
    console.log(`\n${layout.length} layout finding${layout.length === 1 ? '' : 's'}:`);
    for (const finding of layout) {
      console.log(`  ! scenes[${finding.sceneIndex}] ${finding.kind}: ${finding.detail}`);
    }
  }
  console.log(
    '\nreview checklist: text readable at README size, no clipped copy, dark-mode background looks intentional',
  );
}
