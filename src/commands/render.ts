import { copyFileSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, statSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { runCheck, type CheckFinding } from './check.js';
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
import { parseEncoderProfile, type EncoderProfile } from '../encode/profiles.js';
import {
  budgetToBytes,
  isTransparentFrame,
  outputFormats,
  resolveAmbient,
  resolveFrameCapture,
  type DemoConfig,
  type FrameCaptureMode,
  type FrameCapturePlan,
  type MotionBlur,
  type OutputFormat,
} from '../config/schema.js';
import { applyPreset, parsePresetNames } from '../config/presets.js';
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
import { briefSummary, resolveInferredAssumptions } from '../qa/brief.js';
import { createInputManifest } from '../qa/inputManifest.js';
import { resolveShotGraph } from '../render/shotGraph.js';
import { measureRenderedQa, type RenderedQaFinding } from '../qa/rendered.js';
import { structuralSignature } from '../qa/signature.js';
import { appearanceSignature } from '../qa/diversity.js';

interface LadderStep {
  fps: number;
  width: number;
}

interface RenderTarget {
  preset?: string;
  config: DemoConfig;
  changes: string[];
}

export interface PrimaryOutput {
  preset?: string;
  file: string;
  format: OutputFormat;
}

export interface AssetOutTarget {
  source: string;
  dest: string;
}

interface ManagedMove {
  stage: string;
  final: string;
}

export interface ReportCinematic {
  ambient: NonNullable<ReturnType<typeof resolveAmbient>>;
}

export interface ReportMotionBlurOutput {
  preset?: string;
  format: OutputFormat;
  motionBlur: MotionBlur;
  captureMode: FrameCaptureMode;
  policy: 'off' | 'cinematic' | 'gif-cinematic-skip' | 'force' | 'gif-force';
}

export interface ReportMotionBlur {
  requested: MotionBlur;
  outputs: ReportMotionBlurOutput[];
}

function finding(code: string, message: string, details?: Record<string, unknown>): CheckFinding {
  return details ? { code, message, details } : { code, message };
}

function findingKey(item: CheckFinding): string {
  return `${item.code}\0${item.message}`;
}

function addFinding(target: Map<string, CheckFinding>, item: CheckFinding): void {
  target.set(findingKey(item), item);
}

function reportFinding(item: CheckFinding): { code: string; message: string } {
  return { code: item.code, message: item.message };
}

function printFindings(items: CheckFinding[], mark: 'x' | '!' | 'i'): void {
  for (const item of items) console.log(`  ${mark} ${item.message}`);
}

function ladderSteps(fps: number, width: number): LadderStep[] {
  const steps: LadderStep[] = [{ fps, width }];
  if (fps > 12) steps.push({ fps: 12, width });
  if (width > 400) steps.push({ fps: Math.min(fps, 12), width: 400 });
  return steps.filter(
    (step, i) => i === 0 || steps.findIndex((s) => s.fps === step.fps && s.width === step.width) === i,
  );
}

export function renderInputKey(
  config: DemoConfig,
  baseDir: string,
  fps: number,
  capture: FrameCapturePlan,
): string {
  const input = {
    baseDir,
    scenes: config.scenes,
    shots: config.shots,
    frame: config.frame,
    theme: config.theme,
    fps,
    quality: config.output.quality,
    motionBlur: capture.motionBlur,
    captureMode: capture.mode,
    format: capture.format,
  };
  return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex').slice(0, 12);
}

function outputFileName(base: string, preset: string | undefined, format: OutputFormat): string {
  return preset ? `${base}.${preset}.${format}` : `${base}.${format}`;
}

function primaryFormat(config: DemoConfig): OutputFormat {
  return outputFormats(config.output)[0];
}

export function resolveAssetOutTargets(assetOut: string | undefined, outputs: PrimaryOutput[]): AssetOutTarget[] {
  if (!assetOut || outputs.length === 0) return [];
  const target = path.resolve(assetOut);
  if (outputs.length > 1) {
    if (existsSync(target) && !statSync(target).isDirectory()) {
      throw new Error('--asset-out must be a directory when rendering multiple presets');
    }
    return outputs.map((output) => ({ source: output.file, dest: path.join(target, path.basename(output.file)) }));
  }

  const [output] = outputs;
  const isDir = existsSync(target) && statSync(target).isDirectory();
  const dest = isDir ? path.join(target, path.basename(output.file)) : target;
  return [{ source: output.file, dest }];
}

function copyPrimaryOutputs(targets: AssetOutTarget[]): void {
  for (const target of targets) {
    mkdirSync(path.dirname(target.dest), { recursive: true });
    copyFileSync(target.source, target.dest);
  }
}

function effectiveConfigForFormat(config: DemoConfig, format: OutputFormat): DemoConfig {
  if (format !== 'gif' || !isTransparentFrame(config.frame) || !config.frame.shadow) return config;
  return { ...config, frame: { ...config.frame, shadow: false } as DemoConfig['frame'] };
}

function annotateTransparency<T extends OutputReport>(
  report: T,
  config: DemoConfig,
  format: OutputFormat,
): T {
  if (!isTransparentFrame(config.frame)) return report;
  report.transparent = true;
  report.transparencyMode = format === 'gif' ? '1-bit' : 'alpha';
  return report;
}

function annotateCapture<T extends OutputReport>(report: T, frames: RenderedFrames): T {
  report.captureMode = frames.captureMode;
  report.motionBlur = frames.motionBlur;
  return report;
}

function copiedAssetFor(file: string, targets: AssetOutTarget[]): string | undefined {
  const source = path.resolve(file);
  return targets.find((target) => path.resolve(target.source) === source)?.dest;
}

function canonicalPreviewTarget(targets: RenderTarget[]): RenderTarget {
  const rank = { draft: 0, standard: 1, high: 2 } as const;
  return targets.reduce((best, target) =>
    rank[target.config.output.quality] > rank[best.config.output.quality] ? target : best,
  );
}

function resolveBriefForReport(
  config: DemoConfig,
  suppliedAssumptions: string[] = [],
  allowInferred = false,
): { brief: object; notices: CheckFinding[] } {
  const summary = briefSummary(config);
  if (summary.confirmed) {
    return { brief: { ...summary, mode: 'user-confirmed', confirmed: true }, notices: [] };
  }
  if (!allowInferred) {
    return { brief: summary, notices: [] };
  }

  const { assumptions, notices } = resolveInferredAssumptions(config, suppliedAssumptions);
  return {
    brief: {
      ...summary,
      mode: 'inferred',
      confirmed: false,
      assumptions,
    },
    notices,
  };
}

export function resolveReportCinematic(config: DemoConfig): ReportCinematic | undefined {
  const ambient = resolveAmbient(config);
  return ambient ? { ambient } : undefined;
}

function reportMotionBlurPolicy(capture: FrameCapturePlan): ReportMotionBlurOutput['policy'] {
  if (capture.motionBlur === 'off') return 'off';
  if (capture.motionBlur === 'cinematic' && capture.format === 'gif' && capture.mode === 'directCapture') {
    return 'gif-cinematic-skip';
  }
  if (capture.motionBlur === 'force' && capture.format === 'gif' && capture.mode === 'blurredCapture') {
    return 'gif-force';
  }
  return capture.motionBlur;
}

export function resolveReportMotionBlur(targets: Array<{ preset?: string; config: DemoConfig }>): ReportMotionBlur {
  return {
    requested: targets[0]?.config.output.motionBlur ?? 'off',
    outputs: targets.flatMap((target) =>
      outputFormats(target.config.output).map((format) => {
        const capture = resolveFrameCapture(target.config.output, format);
        return {
          ...(target.preset ? { preset: target.preset } : {}),
          format,
          motionBlur: capture.motionBlur,
          captureMode: capture.mode,
          policy: reportMotionBlurPolicy(capture),
        };
      }),
    ),
  };
}

function promoteManagedOutputs(
  outDir: string,
  stageDir: string,
  moves: ManagedMove[],
  keepFrames: boolean,
): void {
  for (const move of moves) {
    mkdirSync(path.dirname(move.final), { recursive: true });
    rmSync(move.final, { force: true });
    renameSync(move.stage, move.final);
  }

  const stagePreviewDir = path.join(stageDir, 'preview');
  if (existsSync(stagePreviewDir)) {
    const finalPreviewDir = path.join(outDir, 'preview');
    rmSync(finalPreviewDir, { recursive: true, force: true });
    renameSync(stagePreviewDir, finalPreviewDir);
  }

  const stageReport = path.join(stageDir, 'report.json');
  if (existsSync(stageReport)) {
    const finalReport = path.join(outDir, 'report.json');
    rmSync(finalReport, { force: true });
    renameSync(stageReport, finalReport);
  }

  const stageFrames = path.join(stageDir, '.frames');
  const finalFrames = path.join(outDir, '.frames');
  if (keepFrames && existsSync(stageFrames)) {
    rmSync(finalFrames, { recursive: true, force: true });
    renameSync(stageFrames, finalFrames);
  } else if (!keepFrames) {
    rmSync(finalFrames, { recursive: true, force: true });
  }
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
    autonomous?: boolean;
    assumptions?: string[];
    encoderProfile?: EncoderProfile | string;
  },
): Promise<void> {
  const encoderProfile = parseEncoderProfile(opts.encoderProfile);
  const presets = parsePresetNames(opts.for);
  const baseCheck = await runCheck(configFile, {
    allowRawScreenshots: opts.allowRawScreenshots,
    allowInferred: opts.autonomous,
    forDestinations: presets,
  });
  const { loaded, errors: baseErrors } = baseCheck;
  const reportBrief = resolveBriefForReport(loaded.config, opts.assumptions, opts.autonomous);
  const reportCinematic = resolveReportCinematic(loaded.config);
  const targets: RenderTarget[] =
    presets.length > 0
      ? presets.map((preset) => {
          const applied = applyPreset(loaded.config, preset);
          return { preset, config: applied.config, changes: applied.changes };
        })
      : [{ config: loaded.config, changes: [] }];
  const reportMotionBlur = resolveReportMotionBlur(targets);

  const errorSet = new Map<string, CheckFinding>();
  const warningSet = new Map<string, CheckFinding>();
  const noticeSet = new Map<string, CheckFinding>();
  for (const error of baseErrors) addFinding(errorSet, error);
  for (const warning of baseCheck.warnings) addFinding(warningSet, warning);
  for (const notice of baseCheck.notices) addFinding(noticeSet, notice);
  for (const notice of reportBrief.notices) addFinding(noticeSet, notice);
  if (reportCinematic?.ambient) {
    addFinding(
      noticeSet,
      finding(
        'cinematic.ambient.timeline',
        `cinematic ambient ${reportCinematic.ambient.type} resolved as ${reportCinematic.ambient.scope}-wide for v1`,
      ),
    );
  }

  for (const target of targets) {
    for (const change of target.changes) console.log(`  ! preset ${target.preset} overrides ${change}`);
  }
  const errors = [...errorSet.values()];
  const warnings = [...warningSet.values()];
  const notices = [...noticeSet.values()];

  printFindings(errors, 'x');
  printFindings(warnings, '!');
  printFindings(notices, 'i');
  if (errors.length > 0) {
    const firstError = errors[0] ? ` First error: ${errors[0].message}.` : '';
    const briefError = errors.find((error) => error.code === 'brief.unconfirmed' || error.code === 'brief.incomplete');
    if (briefError) {
      throw new Error(
        `refusing to render: brief interview is not user-confirmed. ${briefError.message} ` +
          'Use --autonomous only for an explicitly inferred/headless run.',
      );
    }
    throw new Error(
      `refusing to render: ${errors.length} blocking error${errors.length === 1 ? '' : 's'} above.${firstError} ` +
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

  const needsGifski = targets.some(
    (target) => outputFormats(target.config.output).includes('gif') && !isTransparentFrame(target.config.frame),
  );
  if (needsGifski && !(await ensureGifski(opts.download !== false))) {
    console.log('  hint: gifski unavailable; encoding GIF with ffmpeg (install gifski or allow downloads for best quality)');
  }
  const inputManifest = createInputManifest(loaded, targets, encoderProfile, baseCheck.story?.context);
  const shotGraph = resolveShotGraph(loaded.config);
  const stageDir = mkdtempSync(path.join(outDir, '.demoframe-stage-'));
  const framesRoot = path.join(stageDir, '.frames');

  const frameCache = new Map<string, RenderedFrames>();
  const getFrames = async (config: DemoConfig, fps: number, format: OutputFormat): Promise<RenderedFrames> => {
    const capture = resolveFrameCapture(config.output, format);
    const key = renderInputKey(config, baseDir, fps, capture);
    const cached = frameCache.get(key);
    if (cached) return cached;
    const doc = await buildDocument(config, baseDir, fps);
    console.log(
      `rendering ${doc.timeline.frameCount} ${capture.mode} frames for ${format.toUpperCase()} at ${fps}fps ` +
        `(${config.output.quality} quality)...`,
    );
    const frames = await renderFrames(
      doc,
      config.output.quality,
      path.join(framesRoot, key),
      (done, total) => {
        if (done % 25 === 0 || done === total) process.stdout.write(`\r  frame ${done}/${total}`);
      },
      capture,
    );
    process.stdout.write('\n');
    frameCache.set(key, frames);
    return frames;
  };

  const reports: OutputReport[] = [];
  const attempts: Array<{
    preset?: string;
    format: string;
    fps: number;
    width: number;
    motionBlur: MotionBlur;
    captureMode: FrameCaptureMode;
    sizeBytes: number;
    encoderProfile: EncoderProfile;
    withinBudget: boolean | undefined;
  }> = [];
  const primaryOutputs: PrimaryOutput[] = [];

  try {
    for (const target of targets) {
      const { config, preset } = target;
      const budgetBytes = budgetToBytes(config.output.budget);
      const formats = outputFormats(config.output);
      const primary = primaryFormat(config);

      for (const format of formats) {
        if (format === 'mp4' || format === 'webm') continue;
        const renderConfig = effectiveConfigForFormat(config, format);
        const outPath = path.join(stageDir, outputFileName(name, preset, format));
        let final: OutputReport | null = null;
        for (const step of ladderSteps(config.output.fps, config.output.width)) {
          const frames = await getFrames(renderConfig, step.fps, format);
          console.log(`encoding ${format.toUpperCase()} at ${step.width}px / ${step.fps}fps...`);
          if (format === 'gif') {
            const encoding = await encodeGif(frames, step.width, outPath, {
              profile: encoderProfile,
              quality: renderConfig.output.quality,
              transparent: isTransparentFrame(renderConfig.frame),
            });
            final = annotateTransparency(inspectGif(outPath, encoding, budgetBytes, step.fps), renderConfig, format);
          } else {
            const encoding = await encodeWebp(frames, step.width, outPath, {
              profile: encoderProfile,
              quality: renderConfig.output.quality,
            });
            final = annotateTransparency(await inspectWebp(outPath, encoding, budgetBytes, step.fps), renderConfig, format);
          }
          final = annotateCapture(final, frames);
          if (preset) final.preset = preset;
          attempts.push({
            preset,
            format,
            fps: step.fps,
            width: step.width,
            motionBlur: frames.motionBlur,
            captureMode: frames.captureMode,
            sizeBytes: final.sizeBytes,
            encoderProfile,
            withinBudget: final.withinBudget,
          });
          if (final.withinBudget) break;
          console.log(
            `  over budget: ${(final.sizeBytes / 1024 / 1024).toFixed(2)}MB > ${(budgetBytes / 1024 / 1024).toFixed(1)}MB, retrying`,
          );
        }
        if (final) {
          reports.push(final);
          if (format === primary) primaryOutputs.push({ preset, file: final.file, format });
          if (!final.withinBudget) {
            console.log(
              `\n${format.toUpperCase()} is still over budget after the retry ladder. Suggestions: shorten scene durations, ` +
                'use transition: cut instead of crossfade/push/dip-to-color, avoid photographic screenshots, or switch to format: mp4.',
            );
          }
        }
      }

      if (formats.includes('mp4')) {
        const mp4Path = path.join(stageDir, outputFileName(name, preset, 'mp4'));
        let final: OutputReport | null = null;
        for (const step of ladderSteps(config.output.fps, config.output.width)) {
          const frames = await getFrames(config, step.fps, 'mp4');
          console.log(`encoding MP4 at ${step.width}px / ${step.fps}fps...`);
          const encoding = await encodeMp4(frames, step.width, mp4Path, {
            profile: encoderProfile,
            quality: config.output.quality,
          });
          final = inspectMp4(mp4Path, encoding, budgetBytes);
          final = annotateCapture(final, frames);
          if (preset) final.preset = preset;
          attempts.push({
            preset,
            format: 'mp4',
            fps: step.fps,
            width: step.width,
            motionBlur: frames.motionBlur,
            captureMode: frames.captureMode,
            sizeBytes: final.sizeBytes,
            encoderProfile,
            withinBudget: final.withinBudget,
          });
          if (final.withinBudget) break;
          console.log(
            `  over budget: ${(final.sizeBytes / 1024 / 1024).toFixed(2)}MB > ${(budgetBytes / 1024 / 1024).toFixed(1)}MB, retrying`,
          );
        }
        if (final) {
          reports.push(final);
          if (primary === 'mp4') primaryOutputs.push({ preset, file: final.file, format: 'mp4' });
          if (!final.withinBudget) {
            console.log(
              '\nMP4 is still over budget after the retry ladder. Suggestions: shorten scene durations, lower output.fps, ' +
                'lower output.width, or use output.quality: draft.',
            );
          }
        }
      }

      if (formats.includes('webm')) {
        const webmPath = path.join(stageDir, outputFileName(name, preset, 'webm'));
        let final: OutputReport | null = null;
        for (const step of ladderSteps(config.output.fps, config.output.width)) {
          const frames = await getFrames(config, step.fps, 'webm');
          console.log(`encoding WebM at ${step.width}px / ${step.fps}fps...`);
          const encoding = await encodeWebm(frames, step.width, webmPath, {
            profile: encoderProfile,
            quality: config.output.quality,
          });
          final = inspectWebm(webmPath, encoding, budgetBytes);
          final = annotateCapture(final, frames);
          if (preset) final.preset = preset;
          attempts.push({
            preset,
            format: 'webm',
            fps: step.fps,
            width: step.width,
            motionBlur: frames.motionBlur,
            captureMode: frames.captureMode,
            sizeBytes: final.sizeBytes,
            encoderProfile,
            withinBudget: final.withinBudget,
          });
          if (final.withinBudget) break;
          console.log(
            `  over budget: ${(final.sizeBytes / 1024 / 1024).toFixed(2)}MB > ${(budgetBytes / 1024 / 1024).toFixed(1)}MB, retrying`,
          );
        }
        if (final) {
          reports.push(final);
          if (primary === 'webm') primaryOutputs.push({ preset, file: final.file, format: 'webm' });
          if (!final.withinBudget) {
            console.log(
              '\nWebM is still over budget after the retry ladder. Suggestions: shorten scene durations, lower output.fps, ' +
                'lower output.width, or use output.quality: draft.',
            );
          }
        }
      }
    }
  } catch (err) {
    rmSync(stageDir, { recursive: true, force: true });
    throw err;
  }

  try {
    let previews: string[] = [];
    let layout: Array<{ sceneIndex: number; sceneName: string; kind: string; detail: string }> = [];
    let renderedQa: RenderedQaFinding[] = [];
    if (opts.stills !== false) {
      const previewDir = path.join(stageDir, 'preview');
      const previewTarget = canonicalPreviewTarget(targets);
      console.log('writing preview stills...');
      const artifacts = await writePreviewArtifacts({ ...loaded, config: previewTarget.config }, previewDir);
      previews = artifacts.files;
      layout = artifacts.layout;
      renderedQa = artifacts.renderedQa;
    } else {
      const previewTarget = canonicalPreviewTarget(targets);
      const doc = await buildDocument(previewTarget.config, baseDir);
      const session = await openRenderSession(doc, previewTarget.config.output.quality);
      try {
        layout = await measureLayout(session, doc.timeline);
        renderedQa = await measureRenderedQa(session, doc.timeline, previewTarget.config);
      } finally {
        await session.close();
      }
    }

    const layoutWarnings = layout.map((item) =>
      finding('layout.finding', `layout scenes[${item.sceneIndex}] ${item.kind}: ${item.detail}`, {
        sceneIndex: item.sceneIndex,
        kind: item.kind,
      }),
    );
    const renderedQaWarnings = renderedQa.map((item) => finding(item.code, item.message, item.details));
    const allWarnings = [...warnings, ...layoutWarnings, ...renderedQaWarnings];
    printFindings(layoutWarnings, '!');
    for (const item of renderedQa) console.log(`  ! ${item.message}`);

    const outputMoves: ManagedMove[] = reports.map((report) => ({
      stage: report.file,
      final: path.join(outDir, path.basename(report.file)),
    }));
    const finalByStage = new Map(outputMoves.map((move) => [path.resolve(move.stage), move.final]));
    for (const report of reports) {
      report.file = finalByStage.get(path.resolve(report.file)) ?? path.join(outDir, path.basename(report.file));
    }
    for (const output of primaryOutputs) {
      output.file =
        finalByStage.get(path.resolve(output.file)) ?? path.join(outDir, path.basename(output.file));
    }

    const assetOutTargets = resolveAssetOutTargets(opts.assetOut, primaryOutputs);
    const previewEntries = previews.map((file) => path.join('preview', path.basename(file)));
    writeReportJson(stageDir, reports, {
      title: loaded.config.title ?? name,
      config: configPath,
      ...(presets.length > 0 ? { presets } : {}),
      budgetBytes: targets.length === 1 ? budgetToBytes(targets[0].config.output.budget) : undefined,
      brief: reportBrief.brief,
      ...(baseCheck.story?.active
        ? {
            story: {
              version: 2,
              profile: baseCheck.story.profile,
              profileSource: baseCheck.story.profileSource,
              proofBindings: baseCheck.story.proofBindings,
              appearanceDelta: baseCheck.story.appearanceDelta,
            },
          }
        : {}),
      ...(baseCheck.story?.context
        ? {
            contextManifest: {
              file: baseCheck.story.context.file,
              hash: baseCheck.story.context.hash,
              entryIds: [...baseCheck.story.context.entries.keys()],
            },
          }
        : {}),
      ...(reportCinematic ? { cinematic: reportCinematic } : {}),
      motionBlur: reportMotionBlur,
      shotGraph,
      structuralSignature: structuralSignature(loaded.config),
      appearanceSignature: appearanceSignature(loaded.config),
      inputManifest,
      attempts,
      errors: [],
      warnings: allWarnings.map(reportFinding),
      notices: notices.map(reportFinding),
      layout,
      renderedQa,
      previews: previewEntries,
    });

    if (opts.strict && (layout.length > 0 || renderedQa.length > 0)) {
      throw new Error(
        `render failed under --strict: ${layout.length} layout and ${renderedQa.length} rendered QA findings above`,
      );
    }

    promoteManagedOutputs(outDir, stageDir, outputMoves, opts.keepFrames);

    for (const report of reports) printReport(report);
    console.log(`\nreport: ${path.join(outDir, 'report.json')}`);
    copyPrimaryOutputs(assetOutTargets);

    const embeddable = reports.find((r) => r.format === 'webp') ?? reports.find((r) => r.format === 'gif');
    if (embeddable) {
      const embeddableTarget =
        targets.find((target) => target.preset === embeddable.preset) ?? targets[0];
      const exportedWidth = embeddable.width ?? embeddableTarget.config.output.width;
      const width = embeddableTarget.config.output.displayWidth ?? Math.round(exportedWidth * 0.6);
      const snippetFile = copiedAssetFor(embeddable.file, assetOutTargets) ?? embeddable.file;
      console.log(
        `\nREADME snippet:\n  <img src="${path.relative(process.cwd(), snippetFile)}" alt="${loaded.config.title ?? name}" width="${width}">`,
      );
    }
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}
