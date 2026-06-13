import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { runCheck } from './check.js';
import { ensureChromium } from '../env/install.js';
import type { LoadedConfig } from '../config/load.js';
import { buildDocument } from '../templates/document.js';
import { openRenderSession } from '../render/browser.js';

const GITHUB_DARK = '#0d1117';
const GITHUB_LIGHT = '#ffffff';

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

export async function writePreviewStills(loaded: LoadedConfig, outDir: string): Promise<string[]> {
  const { config, baseDir } = loaded;
  mkdirSync(outDir, { recursive: true });

  const doc = await buildDocument(config, baseDir);
  const session = await openRenderSession(doc, config.output.quality);
  const written: string[] = [];
  try {
    for (const ts of doc.timeline.scenes) {
      if (ts.type === 'hold') continue;
      const t = ts.start + ts.duration * 0.65;
      await session.seek(t * 1000);
      const file = path.join(outDir, `scene_${ts.index}_${ts.type}.png`);
      await session.screenshot(file);
      written.push(file);
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
  } finally {
    await session.close();
  }
  return written;
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
  const written = await writePreviewStills(loaded, outDir);

  console.log(`\nwrote ${written.length} previews to ${outDir}:`);
  for (const file of written) console.log(`  ${path.basename(file)}`);
  console.log(
    '\nreview checklist: text readable at README size, no clipped copy, dark-mode background looks intentional',
  );
}
