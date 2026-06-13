import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { runCheck } from './check.js';
import { ensureChromium } from '../env/install.js';
import type { LoadedConfig } from '../config/load.js';
import { buildDocument } from '../templates/document.js';
import { openRenderSession } from '../render/browser.js';
import { measureLayout, type LayoutFinding } from '../qa/layout.js';

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

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
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
    for (const ts of doc.timeline.scenes) {
      if (ts.type === 'hold') continue;
      const t = ts.start + ts.duration * 0.65;
      await session.seek(t * 1000);
      const file = path.join(outDir, `scene_${ts.index}_${slug(ts.name ?? ts.type)}.png`);
      await session.screenshot(file);
      written.push(file);
    }

    for (const ts of doc.timeline.scenes) {
      const rendered = config.scenes[ts.renderIndex];
      if (ts.data.tap) {
        await session.seek((ts.start + ts.duration * TAP_PRESS) * 1000);
        const label = rendered.type === 'status-card' ? 'cta' : 'tap';
        const file = path.join(outDir, `moment_${ts.index}_${label}.png`);
        await session.screenshot(file);
        written.push(file);
      }
      if (ts.data.celebrate) {
        await session.seek((ts.start + Math.min(0.2, ts.duration * 0.25)) * 1000);
        const file = path.join(outDir, `moment_${ts.index}_celebrate.png`);
        await session.screenshot(file);
        written.push(file);
      }
    }

    await session.seek((doc.timeline.duration - 0.05) * 1000);
    const finalStill = await session.screenshot();

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
  opts: { out: string; download?: boolean },
): Promise<void> {
  const { loaded, errors, warnings } = await runCheck(configFile);
  for (const e of errors) console.log(`  x ${e}`);
  for (const w of warnings) console.log(`  ! ${w}`);
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
