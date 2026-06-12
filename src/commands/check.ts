import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadConfig, type LoadedConfig } from '../config/load.js';
import { scanForPrivateData } from '../config/privacy.js';
import { budgetToBytes } from '../config/schema.js';

export interface CheckResult {
  loaded: LoadedConfig;
  warnings: string[];
}

function referencedAssets(loaded: LoadedConfig): Array<{ at: string; file: string }> {
  const refs: Array<{ at: string; file: string }> = [];
  const { config, baseDir } = loaded;
  if (config.theme.logo) refs.push({ at: 'theme.logo', file: path.resolve(baseDir, config.theme.logo) });
  config.scenes.forEach((scene, i) => {
    if (scene.type === 'screenshot') {
      refs.push({ at: `scenes[${i}].src`, file: path.resolve(baseDir, scene.src) });
    }
  });
  return refs;
}

async function screenshotSizeWarnings(loaded: LoadedConfig): Promise<string[]> {
  const warnings: string[] = [];
  const budget = budgetToBytes(loaded.config.output.budget);
  for (const ref of referencedAssets(loaded)) {
    if (!ref.at.endsWith('.src') || !existsSync(ref.file)) continue;
    try {
      const image = sharp(ref.file);
      const [meta, stats] = await Promise.all([image.metadata(), image.stats()]);
      const megapixels = ((meta.width ?? 0) * (meta.height ?? 0)) / 1e6;
      const noise =
        stats.channels.reduce((sum, c) => sum + c.stdev, 0) / Math.max(stats.channels.length, 1);
      if (noise > 70 || megapixels > 4) {
        warnings.push(
          `${ref.at}: ${path.basename(ref.file)} looks ${noise > 70 ? 'photographic/high-noise' : 'very large'} ` +
            `(${meta.width}x${meta.height}, noise ${noise.toFixed(0)}); it may blow the ` +
            `${(budget / 1024 / 1024).toFixed(1)}MB GIF budget. Consider format: mp4, a UI-style screenshot, or pan: none.`,
        );
      }
    } catch {
      warnings.push(`${ref.at}: could not decode ${path.basename(ref.file)} as an image`);
    }
  }
  return warnings;
}

export async function runCheck(file: string): Promise<CheckResult> {
  const loaded = loadConfig(file);
  const warnings: string[] = [];

  for (const ref of referencedAssets(loaded)) {
    if (!existsSync(ref.file)) {
      warnings.push(`${ref.at}: asset not found at ${ref.file}`);
    }
  }

  for (const finding of scanForPrivateData(loaded.config)) {
    warnings.push(
      `${finding.path}: contains what looks like a ${finding.kind} ("${finding.excerpt}"); ` +
        `this will be baked into a published asset`,
    );
  }
  for (const ref of referencedAssets(loaded)) {
    for (const finding of scanForPrivateData(path.basename(ref.file), ref.at)) {
      if (finding.kind !== 'URL') {
        warnings.push(`${finding.path}: asset filename contains a ${finding.kind}`);
      }
    }
  }

  warnings.push(...(await screenshotSizeWarnings(loaded)));

  return { loaded, warnings };
}
