import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { runCheck, runCheckLoaded } from './check.js';
import { ensureChromium } from '../env/install.js';
import { ensureGifski } from '../env/gifski.js';
import { writePreviewArtifacts } from './preview.js';
import { buildDocument } from '../templates/document.js';
import { openRenderSession } from '../render/browser.js';
import { renderFrames, type RenderedFrames } from '../render/frames.js';
import { encodeGif } from '../encode/gif.js';
import { encodeMp4 } from '../encode/mp4.js';
import { encodeWebp } from '../encode/webp.js';
import { encodeWebm } from '../encode/webm.js';
import { budgetToBytes, outputFormats, type DemoConfig, type OutputFormat } from '../config/schema.js';
import { applyPreset } from '../config/presets.js';
import {
  inspectGif,
  inspectMp4,
  inspectWebm,
  inspectWebp,
  printReport,
  writeReportJson,
  type OutputReport,
} from '../qa/report.js';
import { measureLayout } from '../qa/layout.js';

interface LadderStep {
  fps: number;
  width: number;
}

interface RenderTarget {
  preset?: string;
  config: DemoConfig;
  changes: string[];
}

interface PrimaryOutput {
  preset?: string;
  file: string;
}

function ladderSteps(fps: number, width: number): LadderStep[] {
  const steps: LadderStep[] = [{ fps, width }];
  if (fps > 12) steps.push({ fps: 12, width });
  if (width > 400) steps.push({ fps: Math.min(fps, 12), width: 400 });
  return steps.filter(
    (step, i) => i === 0 || steps.findIndex((s) => s.fps === step.fps && s.width === step.width) === i,
  );
}

function parsePresets(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function renderInputKey(config: DemoConfig, baseDir: string, fps: number): string {
  const input = {
    baseDir,
    scenes: config.scenes,
    frame: config.frame,
    theme: config.theme,
    fps,
    quality: config.output.quality,
  };
  return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex').slice(0, 12);
}

function outputFileName(base: string, preset: string | undefined, format: OutputFormat): string {
  return preset ? `${base}.${preset}.${format}` : `${base}.${format}`;
}

function primaryFormat(config: DemoConfig): OutputFormat {
  return outputFormats(config.output)[0];
}

function copyPrimaryOutputs(assetOut: string | undefined, outputs: PrimaryOutput[]): void {
  if (!assetOut || outputs.length === 0) return;
  const target = path.resolve(assetOut);
  if (outputs.length > 1) {
    if (existsSync(target) && !statSync(target).isDirectory()) {
      throw new Error('--asset-out must be a directory when rendering multiple presets');
    }
    mkdirSync(target, { recursive: true });
    for (const output of outputs) {
      copyFileSync(output.file, path.join(target, path.basename(output.file)));
    }
    return;
  }

  const [output] = outputs;
  const isDir = existsSync(target) && statSync(target).isDirectory();
  const dest = isDir ? path.join(target, path.basename(output.file)) : target;
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(output.file, dest);
}

function canonicalPreviewTarget(targets: RenderTarget[]): RenderTarget {
  const rank = { draft: 0, standard: 1, high: 2 } as const;
  return targets.reduce((best, target) =>
    rank[target.config.output.quality] > rank[best.config.output.quality] ? target : best,
  );
}

export async function runRender(
  configFile: string,
  opts: {
    out: string;
    keepFrames: boolean;
    download?: boolean;
    stills?: boolean;
    for?: string;
    assetOut?: string;
    strict?: boolean;
    allowRawScreenshots?: boolean;
  },
): Promise<void> {
  const baseCheck = await runCheck(configFile, {
    allowRawScreenshots: opts.allowRawScreenshots,
  });
  const { loaded, errors } = baseCheck;
  const presets = parsePresets(opts.for);
  const targets: RenderTarget[] =
    presets.length > 0
      ? presets.map((preset) => {
          const applied = applyPreset(loaded.config, preset);
          return { preset, config: applied.config, changes: applied.changes };
        })
      : [{ config: loaded.config, changes: [] }];

  const warningSet = new Set<string>();
  for (const target of targets) {
    for (const change of target.changes) console.log(`  ! preset ${target.preset} overrides ${change}`);
    const checked = await runCheckLoaded(
      { ...loaded, config: target.config },
      { allowRawScreenshots: opts.allowRawScreenshots },
    );
    for (const warning of checked.warnings) {
      warningSet.add(target.preset ? `preset ${target.preset}: ${warning}` : warning);
    }
  }
  const warnings = [...warningSet];

  for (const e of errors) console.log(`  x ${e}`);
  for (const w of warnings) console.log(`  ! ${w}`);
  if (errors.length > 0) {
    throw new Error(
      `refusing to render: ${errors.length} blocking error${errors.length === 1 ? '' : 's'} above. ` +
        'Reconstruct the flow as synthetic scenes, or pass --allow-raw-screenshots if a raw-screenshot demo is intended.',
    );
  }
  if (opts.strict && warnings.length > 0) {
    throw new Error(`refusing to render under --strict: ${warnings.length} warning${warnings.length === 1 ? '' : 's'} above`);
  }
  const { baseDir, configPath } = loaded;
  await ensureChromium(opts.download !== false);
  const name = path.basename(configPath).replace(/\.(ya?ml|json)$/i, '');
  const outDir = path.resolve(opts.out);
  mkdirSync(outDir, { recursive: true });
  const framesRoot = path.join(outDir, '.frames');

  if (
    targets.some((target) => outputFormats(target.config.output).includes('gif')) &&
    !(await ensureGifski(opts.download !== false))
  ) {
    console.log('  hint: gifski unavailable; encoding GIF with ffmpeg (install gifski or allow downloads for best quality)');
  }

  const frameCache = new Map<string, RenderedFrames>();
  const getFrames = async (config: DemoConfig, fps: number): Promise<RenderedFrames> => {
    const key = renderInputKey(config, baseDir, fps);
    const cached = frameCache.get(key);
    if (cached) return cached;
    const doc = await buildDocument(config, baseDir, fps);
    console.log(`rendering ${doc.timeline.frameCount} frames at ${fps}fps (${config.output.quality} quality)...`);
    const frames = await renderFrames(doc, config.output.quality, path.join(framesRoot, key), (done, total) => {
      if (done % 25 === 0 || done === total) process.stdout.write(`\r  frame ${done}/${total}`);
    });
    process.stdout.write('\n');
    frameCache.set(key, frames);
    return frames;
  };

  const reports: OutputReport[] = [];
  const attempts: Array<{ preset?: string; format: string; fps: number; width: number; sizeBytes: number }> = [];
  const primaryOutputs: PrimaryOutput[] = [];

  try {
    for (const target of targets) {
      const { config, preset } = target;
      const budgetBytes = budgetToBytes(config.output.budget);
      const formats = outputFormats(config.output);
      const primary = primaryFormat(config);

      for (const format of formats) {
        if (format === 'mp4' || format === 'webm') continue;
        const outPath = path.join(outDir, outputFileName(name, preset, format));
        let final: OutputReport | null = null;
        for (const step of ladderSteps(config.output.fps, config.output.width)) {
          const frames = await getFrames(config, step.fps);
          console.log(`encoding ${format.toUpperCase()} at ${step.width}px / ${step.fps}fps...`);
          if (format === 'gif') {
            const { encoder } = await encodeGif(frames, step.width, outPath);
            final = inspectGif(outPath, encoder, budgetBytes, step.fps);
          } else {
            await encodeWebp(frames, step.width, outPath);
            final = await inspectWebp(outPath, budgetBytes, step.fps);
          }
          if (preset) final.preset = preset;
          attempts.push({ preset, format, fps: step.fps, width: step.width, sizeBytes: final.sizeBytes });
          if (final.withinBudget) break;
          console.log(
            `  over budget: ${(final.sizeBytes / 1024 / 1024).toFixed(2)}MB > ${(budgetBytes / 1024 / 1024).toFixed(1)}MB, retrying`,
          );
        }
        if (final) {
          reports.push(final);
          if (format === primary) primaryOutputs.push({ preset, file: final.file });
          if (!final.withinBudget) {
            console.log(
              `\n${format.toUpperCase()} is still over budget after the retry ladder. Suggestions: shorten scene durations, ` +
                'use transition: cut instead of crossfade, avoid photographic screenshots, or switch to format: mp4.',
            );
          }
        }
      }

      if (formats.includes('mp4')) {
        const mp4Path = path.join(outDir, outputFileName(name, preset, 'mp4'));
        const frames = await getFrames(config, config.output.fps);
        console.log(`encoding MP4 at ${config.output.width}px / ${config.output.fps}fps...`);
        await encodeMp4(frames, config.output.width, mp4Path);
        const report = inspectMp4(mp4Path);
        if (preset) report.preset = preset;
        reports.push(report);
        if (primary === 'mp4') primaryOutputs.push({ preset, file: report.file });
      }

      if (formats.includes('webm')) {
        const webmPath = path.join(outDir, outputFileName(name, preset, 'webm'));
        const frames = await getFrames(config, config.output.fps);
        console.log(`encoding WebM at ${config.output.width}px / ${config.output.fps}fps...`);
        await encodeWebm(frames, config.output.width, webmPath);
        const report = inspectWebm(webmPath);
        if (preset) report.preset = preset;
        reports.push(report);
        if (primary === 'webm') primaryOutputs.push({ preset, file: report.file });
      }
    }
  } finally {
    if (!opts.keepFrames) rmSync(framesRoot, { recursive: true, force: true });
  }

  let previews: string[] = [];
  let layout: Array<{ sceneIndex: number; sceneName: string; kind: string; detail: string }> = [];
  if (opts.stills !== false) {
    const previewDir = path.join(outDir, 'preview');
    const previewTarget = canonicalPreviewTarget(targets);
    console.log('writing preview stills...');
    const artifacts = await writePreviewArtifacts({ ...loaded, config: previewTarget.config }, previewDir);
    previews = artifacts.files;
    layout = artifacts.layout;
  } else {
    const previewTarget = canonicalPreviewTarget(targets);
    const doc = await buildDocument(previewTarget.config, baseDir);
    const session = await openRenderSession(doc, previewTarget.config.output.quality);
    try {
      layout = await measureLayout(session, doc.timeline);
    } finally {
      await session.close();
    }
  }

  const layoutWarnings = layout.map(
    (finding) => `layout scenes[${finding.sceneIndex}] ${finding.kind}: ${finding.detail}`,
  );
  const allWarnings = [...warnings, ...layoutWarnings];
  for (const w of layoutWarnings) console.log(`  ! ${w}`);

  copyPrimaryOutputs(opts.assetOut, primaryOutputs);

  for (const report of reports) printReport(report);
  const reportFile = writeReportJson(outDir, reports, {
    title: loaded.config.title ?? name,
    config: configPath,
    ...(presets.length > 0 ? { presets } : {}),
    budgetBytes: targets.length === 1 ? budgetToBytes(targets[0].config.output.budget) : undefined,
    attempts,
    warnings: allWarnings,
    layout,
    previews: previews.map((f) => path.relative(outDir, f)),
  });
  console.log(`\nreport: ${reportFile}`);

  if (opts.strict && layout.length > 0) {
    throw new Error(
      `render failed under --strict: ${layout.length} layout finding${layout.length === 1 ? '' : 's'} above`,
    );
  }

  const embeddable = reports.find((r) => r.format === 'webp') ?? reports.find((r) => r.format === 'gif');
  if (embeddable) {
    const embeddableTarget =
      targets.find((target) => target.preset === embeddable.preset) ?? targets[0];
    const width =
      embeddableTarget.config.output.displayWidth ?? Math.round(embeddableTarget.config.output.width * 0.6);
    console.log(
      `\nREADME snippet:\n  <img src="${path.relative(process.cwd(), embeddable.file)}" alt="${loaded.config.title ?? name}" width="${width}">`,
    );
  }
}
