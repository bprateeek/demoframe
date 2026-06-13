import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadConfig, type LoadedConfig } from '../config/load.js';
import { scanForPrivateData } from '../config/privacy.js';
import { budgetToBytes, normalizeLogo } from '../config/schema.js';
import { resolveTimeline } from '../render/timeline.js';

export interface CheckResult {
  loaded: LoadedConfig;
  warnings: string[];
}

type AssetKind = 'screenshot' | 'logo' | 'font' | 'avatar';

function referencedAssets(loaded: LoadedConfig): Array<{ at: string; file: string; kind: AssetKind }> {
  const refs: Array<{ at: string; file: string; kind: AssetKind }> = [];
  const { config, baseDir } = loaded;
  const logo = normalizeLogo(config.theme.logo);
  if (logo) refs.push({ at: 'theme.logo', file: path.resolve(baseDir, logo.src), kind: 'logo' });
  if (typeof config.theme.font === 'object') {
    const { sans, mono } = config.theme.font;
    if (sans) refs.push({ at: 'theme.font.sans', file: path.resolve(baseDir, sans), kind: 'font' });
    if (mono) refs.push({ at: 'theme.font.mono', file: path.resolve(baseDir, mono), kind: 'font' });
  }
  config.scenes.forEach((scene, i) => {
    if (scene.type === 'screenshot') {
      refs.push({ at: `scenes[${i}].src`, file: path.resolve(baseDir, scene.src), kind: 'screenshot' });
    }
    if (scene.type === 'chat' && scene.avatars) {
      for (const role of ['user', 'assistant'] as const) {
        const spec = scene.avatars[role];
        if (typeof spec === 'string') {
          refs.push({
            at: `scenes[${i}].avatars.${role}`,
            file: path.resolve(baseDir, spec),
            kind: 'avatar',
          });
        }
      }
    }
  });
  return refs;
}

async function screenshotSizeWarnings(loaded: LoadedConfig): Promise<string[]> {
  const warnings: string[] = [];
  const budget = budgetToBytes(loaded.config.output.budget);
  for (const ref of referencedAssets(loaded)) {
    if (ref.kind !== 'screenshot' || !existsSync(ref.file)) continue;
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

  if (loaded.config.frame.type === 'terminal' && loaded.config.scenes.some((s) => s.type === 'chat')) {
    warnings.push(
      'chat scenes pair best with the phone or browser frame; bubbles read oddly inside a terminal window',
    );
  }

  warnings.push(...(await screenshotSizeWarnings(loaded)));

  // Screenshot-dominant demos read as "screenshots pasted in a frame". Count a
  // hold against the scene it extends (renderIndex), so a screenshot -> hold ->
  // hold tail cannot dodge the warning.
  const tl = resolveTimeline(loaded.config);
  const shotDuration = tl.scenes.reduce(
    (sum, ts) => sum + (loaded.config.scenes[ts.renderIndex].type === 'screenshot' ? ts.duration : 0),
    0,
  );
  if (tl.duration > 0 && shotDuration / tl.duration > 0.5) {
    const content = loaded.config.scenes.filter((s) => s.type !== 'hold');
    const framelessGallery =
      loaded.config.frame.type === 'none' &&
      content.length > 0 &&
      content.every((s) => s.type === 'screenshot');
    warnings.push(
      framelessGallery
        ? 'every scene is a raw screenshot in a frameless demo; this reads as "screenshots pasted in a frame". Rebuild the flow as synthetic scenes (typing/steps/status-card/chat) and use the screenshots only as reference.'
        : `screenshot scenes are ${Math.round((shotDuration / tl.duration) * 100)}% of the runtime; raw screenshots read as "pasted screenshots". Reconstruct the flow with synthetic scenes and keep screenshot scenes for when the screenshot itself is the subject.`,
    );
  }

  loaded.config.scenes.forEach((scene, i) => {
    if (scene.celebrate && loaded.config.scenes.slice(i + 1).some((s) => s.type !== 'hold')) {
      warnings.push(
        `scenes[${i}]: celebrate fires before the end; put it on the final scene or a trailing hold so the burst lands on the closing frame`,
      );
    }
  });

  return { loaded, warnings };
}
