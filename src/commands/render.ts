import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { runCheck } from './check.js';
import { ensureChromium } from '../env/install.js';
import { ensureGifski } from '../env/gifski.js';
import { writePreviewStills } from './preview.js';
import { buildDocument } from '../templates/document.js';
import { renderFrames, type RenderedFrames } from '../render/frames.js';
import { encodeGif } from '../encode/gif.js';
import { encodeMp4 } from '../encode/mp4.js';
import { encodeWebp } from '../encode/webp.js';
import { encodeWebm } from '../encode/webm.js';
import { budgetToBytes, outputFormats } from '../config/schema.js';
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

interface LadderStep {
  fps: number;
  width: number;
}

function ladderSteps(fps: number, width: number): LadderStep[] {
  const steps: LadderStep[] = [{ fps, width }];
  if (fps > 12) steps.push({ fps: 12, width });
  if (width > 400) steps.push({ fps: Math.min(fps, 12), width: 400 });
  return steps.filter(
    (step, i) => i === 0 || steps.findIndex((s) => s.fps === step.fps && s.width === step.width) === i,
  );
}

export async function runRender(
  configFile: string,
  opts: { out: string; keepFrames: boolean; download?: boolean; stills?: boolean; for?: string; allowRawScreenshots?: boolean },
): Promise<void> {
  const { loaded, errors, warnings } = await runCheck(configFile, {
    allowRawScreenshots: opts.allowRawScreenshots,
  });
  for (const e of errors) console.log(`  x ${e}`);
  for (const w of warnings) console.log(`  ! ${w}`);
  if (errors.length > 0) {
    throw new Error(
      `refusing to render: ${errors.length} blocking error${errors.length === 1 ? '' : 's'} above. ` +
        'Reconstruct the flow as synthetic scenes, or pass --allow-raw-screenshots if a raw-screenshot demo is intended.',
    );
  }
  const { baseDir, configPath } = loaded;
  let config = loaded.config;
  if (opts.for) {
    const applied = applyPreset(config, opts.for);
    config = applied.config;
    for (const change of applied.changes) console.log(`  ! preset ${opts.for} overrides ${change}`);
  }
  await ensureChromium(opts.download !== false);
  const name = path.basename(configPath).replace(/\.(ya?ml|json)$/i, '');
  const outDir = path.resolve(opts.out);
  mkdirSync(outDir, { recursive: true });
  const framesRoot = path.join(outDir, '.frames');
  const budgetBytes = budgetToBytes(config.output.budget);
  const formats = outputFormats(config.output);

  if (formats.includes('gif') && !(await ensureGifski(opts.download !== false))) {
    console.log('  hint: gifski unavailable; encoding GIF with ffmpeg (install gifski or allow downloads for best quality)');
  }

  const framesByFps = new Map<number, RenderedFrames>();
  const getFrames = async (fps: number): Promise<RenderedFrames> => {
    const cached = framesByFps.get(fps);
    if (cached) return cached;
    const doc = await buildDocument(config, baseDir, fps);
    console.log(`rendering ${doc.timeline.frameCount} frames at ${fps}fps (${config.output.quality} quality)...`);
    const frames = await renderFrames(doc, config.output.quality, path.join(framesRoot, `fps${fps}`), (done, total) => {
      if (done % 25 === 0 || done === total) process.stdout.write(`\r  frame ${done}/${total}`);
    });
    process.stdout.write('\n');
    framesByFps.set(fps, frames);
    return frames;
  };

  const reports: OutputReport[] = [];
  const attempts: Array<{ format: string; fps: number; width: number; sizeBytes: number }> = [];

  try {
    for (const format of formats) {
      if (format === 'mp4' || format === 'webm') continue;
      const outPath = path.join(outDir, `${name}.${format}`);
      let final: OutputReport | null = null;
      for (const step of ladderSteps(config.output.fps, config.output.width)) {
        const frames = await getFrames(step.fps);
        console.log(`encoding ${format.toUpperCase()} at ${step.width}px / ${step.fps}fps...`);
        if (format === 'gif') {
          const { encoder } = await encodeGif(frames, step.width, outPath);
          final = inspectGif(outPath, encoder, budgetBytes, step.fps);
        } else {
          await encodeWebp(frames, step.width, outPath);
          final = await inspectWebp(outPath, budgetBytes, step.fps);
        }
        attempts.push({ format, fps: step.fps, width: step.width, sizeBytes: final.sizeBytes });
        if (final.withinBudget) break;
        console.log(
          `  over budget: ${(final.sizeBytes / 1024 / 1024).toFixed(2)}MB > ${(budgetBytes / 1024 / 1024).toFixed(1)}MB, retrying`,
        );
      }
      if (final) {
        reports.push(final);
        if (!final.withinBudget) {
          console.log(
            `\n${format.toUpperCase()} is still over budget after the retry ladder. Suggestions: shorten scene durations, ` +
              'use transition: cut instead of crossfade, avoid photographic screenshots, or switch to format: mp4.',
          );
        }
      }
    }

    if (formats.includes('mp4')) {
      const mp4Path = path.join(outDir, `${name}.mp4`);
      const frames = await getFrames(config.output.fps);
      console.log(`encoding MP4 at ${config.output.width}px / ${config.output.fps}fps...`);
      await encodeMp4(frames, config.output.width, mp4Path);
      reports.push(inspectMp4(mp4Path));
    }

    if (formats.includes('webm')) {
      const webmPath = path.join(outDir, `${name}.webm`);
      const frames = await getFrames(config.output.fps);
      console.log(`encoding WebM at ${config.output.width}px / ${config.output.fps}fps...`);
      await encodeWebm(frames, config.output.width, webmPath);
      reports.push(inspectWebm(webmPath));
    }
  } finally {
    if (!opts.keepFrames) rmSync(framesRoot, { recursive: true, force: true });
  }

  let previews: string[] = [];
  if (opts.stills !== false) {
    const previewDir = path.join(outDir, 'preview');
    console.log('writing preview stills...');
    previews = await writePreviewStills({ ...loaded, config }, previewDir);
  }

  for (const report of reports) printReport(report);
  const reportFile = writeReportJson(outDir, reports, {
    title: config.title ?? name,
    config: configPath,
    ...(opts.for ? { preset: opts.for } : {}),
    budgetBytes,
    attempts,
    warnings,
    previews: previews.map((f) => path.relative(outDir, f)),
  });
  console.log(`\nreport: ${reportFile}`);

  const embeddable = reports.find((r) => r.format === 'webp') ?? reports.find((r) => r.format === 'gif');
  if (embeddable) {
    const width = config.output.displayWidth ?? Math.round(config.output.width * 0.6);
    console.log(
      `\nREADME snippet:\n  <img src="${path.relative(process.cwd(), embeddable.file)}" alt="${config.title ?? name}" width="${width}">`,
    );
  }
}
