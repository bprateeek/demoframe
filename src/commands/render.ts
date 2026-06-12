import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { runCheck } from './check.js';
import { buildDocument } from '../templates/document.js';
import { renderFrames, type RenderedFrames } from '../render/frames.js';
import { encodeGif, gifskiAvailable } from '../encode/gif.js';
import { encodeMp4 } from '../encode/mp4.js';
import { budgetToBytes } from '../config/schema.js';
import { inspectGif, inspectMp4, printReport, writeReportJson, type OutputReport } from '../qa/report.js';

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
  opts: { out: string; keepFrames: boolean },
): Promise<void> {
  const { loaded, warnings } = await runCheck(configFile);
  for (const w of warnings) console.log(`  ! ${w}`);

  const { config, baseDir, configPath } = loaded;
  const name = path.basename(configPath).replace(/\.(ya?ml|json)$/i, '');
  const outDir = path.resolve(opts.out);
  mkdirSync(outDir, { recursive: true });
  const framesRoot = path.join(outDir, '.frames');
  const budgetBytes = budgetToBytes(config.output.budget);
  const wantGif = config.output.format !== 'mp4';
  const wantMp4 = config.output.format !== 'gif';

  if (wantGif && !gifskiAvailable()) {
    console.log('  hint: install gifski for best GIF quality (brew install gifski); using ffmpeg fallback');
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
  const attempts: Array<{ fps: number; width: number; sizeBytes: number }> = [];

  try {
    if (wantGif) {
      const gifPath = path.join(outDir, `${name}.gif`);
      let final: OutputReport | null = null;
      for (const step of ladderSteps(config.output.fps, config.output.width)) {
        const frames = await getFrames(step.fps);
        console.log(`encoding GIF at ${step.width}px / ${step.fps}fps...`);
        const { encoder } = await encodeGif(frames, step.width, gifPath);
        final = inspectGif(gifPath, encoder, budgetBytes, step.fps);
        attempts.push({ fps: step.fps, width: step.width, sizeBytes: final.sizeBytes });
        if (final.withinBudget) break;
        console.log(
          `  over budget: ${(final.sizeBytes / 1024 / 1024).toFixed(2)}MB > ${(budgetBytes / 1024 / 1024).toFixed(1)}MB, retrying`,
        );
      }
      if (final) {
        reports.push(final);
        if (!final.withinBudget) {
          console.log(
            '\nGIF is still over budget after the retry ladder. Suggestions: shorten scene durations, ' +
              'use transition: cut instead of crossfade, avoid photographic screenshots, or switch to format: mp4.',
          );
        }
      }
    }

    if (wantMp4) {
      const mp4Path = path.join(outDir, `${name}.mp4`);
      const frames = await getFrames(config.output.fps);
      console.log(`encoding MP4 at ${config.output.width}px / ${config.output.fps}fps...`);
      await encodeMp4(frames, config.output.width, mp4Path);
      reports.push(inspectMp4(mp4Path));
    }
  } finally {
    if (!opts.keepFrames) rmSync(framesRoot, { recursive: true, force: true });
  }

  for (const report of reports) printReport(report);
  const reportFile = writeReportJson(outDir, reports, {
    title: config.title ?? name,
    config: configPath,
    budgetBytes,
    attempts,
    warnings,
  });
  console.log(`\nreport: ${reportFile}`);

  const gifReport = reports.find((r) => r.format === 'gif');
  if (gifReport) {
    const width = config.output.displayWidth ?? Math.round(config.output.width * 0.6);
    console.log(
      `\nREADME snippet:\n  <img src="${path.relative(process.cwd(), gifReport.file)}" alt="${config.title ?? name}" width="${width}">`,
    );
  }
}
