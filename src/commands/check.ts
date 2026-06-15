import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadConfig, type LoadedConfig } from '../config/load.js';
import { scanForPrivateData } from '../config/privacy.js';
import {
  budgetToBytes,
  frameViewport,
  isTransparentFrame,
  normalizeLogo,
  outputFormats,
  type DemoConfig,
} from '../config/schema.js';
import { briefWarnings, screenshotRuntimeShare } from '../qa/brief.js';

export interface CheckResult {
  loaded: LoadedConfig;
  errors: string[];
  warnings: string[];
}

export interface CheckOptions {
  allowRawScreenshots?: boolean;
  forDestinations?: string[];
  skipBrief?: boolean;
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

function estimatedSourceWidth(config: DemoConfig): number {
  const viewport = frameViewport(config.frame);
  if (!isTransparentFrame(config.frame)) return viewport.width;
  const deviceInset = config.frame.type === 'phone' ? 32 : config.frame.type === 'none' ? 0 : 48;
  const shadowAllowance = config.frame.shadow && config.frame.type !== 'none' ? 120 : 0;
  return Math.max(1, viewport.width - deviceInset + shadowAllowance + (config.frame.margin ?? 0) * 2);
}

function readmeLegibilityWarnings(loaded: LoadedConfig): string[] {
  const sourceWidth = estimatedSourceWidth(loaded.config);
  const displayWidth = loaded.config.output.displayWidth ?? Math.round(loaded.config.output.width * 0.6);
  const displayScale = displayWidth / sourceWidth;
  const estimatedBodyPx = 14 * displayScale;
  if (estimatedBodyPx >= 5.25) return [];
  return [
    `README display width ${displayWidth}px makes small body text about ${estimatedBodyPx.toFixed(1)}px; ` +
      'increase output.width or output.displayWidth for readable README embeds',
  ];
}

export async function runCheckLoaded(
  loaded: LoadedConfig,
  opts: CheckOptions = {},
): Promise<CheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const ref of referencedAssets(loaded)) {
    if (!existsSync(ref.file)) {
      errors.push(`${ref.at}: asset not found at ${ref.file}`);
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
  if (loaded.config.output.quality === 'draft' && loaded.config.scenes.some((s) => s.type === 'screen')) {
    warnings.push('screen scenes contain dense product UI; use output.quality: standard or high for crisp text');
  }

  const formats = outputFormats(loaded.config.output);
  if (isTransparentFrame(loaded.config.frame)) {
    if (formats.some((format) => format === 'mp4' || format === 'webm')) {
      errors.push(
        'transparent output is a policy error for mp4/webm: alpha is not reliably useful for our target destinations; use webp.',
      );
    }
    if (formats.includes('gif')) {
      warnings.push(
        'transparent GIF uses hard 1-bit edges and drops the soft shadow; use webp for clean transparent edges, or frame.outside: "#hex" for a solid fallback.',
      );
    }
    if (loaded.config.frame.type === 'none') {
      warnings.push(
        'frame.outside: transparent with frame.type: none has no device bezel to mask; the content edge becomes the cutout.',
      );
    }
  } else if (loaded.config.frame.margin !== undefined) {
    warnings.push('frame.margin only affects transparent cutouts and is otherwise ignored.');
  }

  warnings.push(...(await screenshotSizeWarnings(loaded)));
  warnings.push(...readmeLegibilityWarnings(loaded));
  if (!opts.skipBrief) {
    warnings.push(...briefWarnings(loaded.config, { forDestinations: opts.forDestinations }));
  }

  // Screenshot-dominant demos read as "screenshots pasted in a frame". Count a
  // hold against the scene it extends (renderIndex), so a screenshot -> hold ->
  // hold tail cannot dodge the warning.
  const screenshotShare = screenshotRuntimeShare(loaded.config);
  if (screenshotShare.totalDuration > 0 && screenshotShare.share > 0.5) {
    const content = loaded.config.scenes.filter((s) => s.type !== 'hold');
    const framelessGallery =
      loaded.config.frame.type === 'none' &&
      content.length > 0 &&
      content.every((s) => s.type === 'screenshot');
    if (framelessGallery) {
      // The unambiguous "pasted screenshots" case: a frameless demo whose every
      // content scene is a raw screenshot. This is a hard error so render refuses
      // it; --allow-raw-screenshots demotes it for intentional raw demos.
      (opts.allowRawScreenshots ? warnings : errors).push(
          'every scene is a raw screenshot in a frameless demo; this reads as "screenshots pasted in a frame". ' +
          'Rebuild the flow as synthetic scenes (typing/steps/status-card/chat/screen) and use the screenshots only as reference. ' +
          'If a raw-screenshot demo is intended (bug report, before/after proof), pass --allow-raw-screenshots.',
      );
    } else {
      warnings.push(
        `screenshot scenes are ${Math.round(screenshotShare.share * 100)}% of the runtime; raw screenshots read as "pasted screenshots". Reconstruct the flow with synthetic scenes such as screen, typing, steps, status-card, or chat, and keep screenshot scenes for when the screenshot itself is the subject.`,
      );
    }
  }

  loaded.config.scenes.forEach((scene, i) => {
    if (scene.celebrate && loaded.config.scenes.slice(i + 1).some((s) => s.type !== 'hold')) {
      warnings.push(
        `scenes[${i}]: celebrate fires before the end; put it on the final scene or a trailing hold so the burst lands on the closing frame`,
      );
    }
  });

  return { loaded, errors, warnings };
}

export async function runCheck(file: string, opts: CheckOptions = {}): Promise<CheckResult> {
  return runCheckLoaded(loadConfig(file), opts);
}
