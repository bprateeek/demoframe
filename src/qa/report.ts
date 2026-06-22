import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { parseGif } from './gifInfo.js';
import { ffmpegPath } from '../env/doctor.js';
import type { EncoderProfile, EncoderSettings } from '../encode/profiles.js';
import type { FrameCaptureMode, MotionBlur } from '../config/schema.js';

export interface OutputReport {
  file: string;
  format: 'gif' | 'webp' | 'mp4' | 'webm';
  transparent: boolean;
  transparencyMode: 'alpha' | '1-bit' | 'none';
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationS: number | null;
  fps: number | null;
  frameCount: number | null;
  loopsForever: boolean | null;
  hasAudio: boolean | null;
  encoder?: string;
  encoderProfile?: EncoderProfile;
  encoderSettings?: EncoderSettings;
  captureMode?: FrameCaptureMode;
  motionBlur?: MotionBlur;
  budgetBytes?: number;
  withinBudget?: boolean;
  preset?: string;
}

export interface ReportEncoding {
  encoder: string;
  profile: EncoderProfile;
  settings: EncoderSettings;
}

export function inspectGif(
  file: string,
  encoding: ReportEncoding,
  budgetBytes: number,
  encodeFps: number,
): OutputReport {
  const buffer = readFileSync(file);
  const info = parseGif(buffer);
  const sizeBytes = statSync(file).size;
  return {
    file,
    format: 'gif',
    transparent: false,
    transparencyMode: 'none',
    sizeBytes,
    width: info.width,
    height: info.height,
    durationS: info.durationS,
    // gifski merges identical frames with longer delays, so fps is the encode
    // rate, not frameCount / duration
    fps: encodeFps,
    frameCount: info.frameCount,
    loopsForever: info.loopsForever,
    hasAudio: false,
    encoder: encoding.encoder,
    encoderProfile: encoding.profile,
    encoderSettings: encoding.settings,
    budgetBytes,
    withinBudget: sizeBytes <= budgetBytes,
  };
}

function probeWithFfmpeg(file: string, report: OutputReport): OutputReport {
  const ffmpeg = ffmpegPath();
  if (ffmpeg) {
    const probe = spawnSync(ffmpeg, ['-i', file], { encoding: 'utf8' });
    const meta = probe.stderr ?? '';
    const dim = meta.match(/Video:.* (\d{2,5})x(\d{2,5})/);
    if (dim) {
      report.width = parseInt(dim[1], 10);
      report.height = parseInt(dim[2], 10);
    }
    const dur = meta.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (dur) {
      report.durationS =
        parseInt(dur[1], 10) * 3600 + parseInt(dur[2], 10) * 60 + parseFloat(dur[3]);
    }
    const fps = meta.match(/(\d+(?:\.\d+)?) fps/);
    if (fps) report.fps = parseFloat(fps[1]);
    report.hasAudio = /Stream #.*Audio:/.test(meta);
  }
  return report;
}

export function inspectMp4(file: string, encoding: ReportEncoding, budgetBytes: number): OutputReport {
  const sizeBytes = statSync(file).size;
  return probeWithFfmpeg(file, {
    file,
    format: 'mp4',
    transparent: false,
    transparencyMode: 'none',
    sizeBytes,
    width: null,
    height: null,
    durationS: null,
    fps: null,
    frameCount: null,
    loopsForever: null,
    hasAudio: null,
    encoder: encoding.encoder,
    encoderProfile: encoding.profile,
    encoderSettings: encoding.settings,
    budgetBytes,
    withinBudget: sizeBytes <= budgetBytes,
  });
}

export function inspectWebm(file: string, encoding: ReportEncoding, budgetBytes: number): OutputReport {
  const sizeBytes = statSync(file).size;
  return probeWithFfmpeg(file, {
    file,
    format: 'webm',
    transparent: false,
    transparencyMode: 'none',
    sizeBytes,
    width: null,
    height: null,
    durationS: null,
    fps: null,
    frameCount: null,
    loopsForever: null,
    hasAudio: null,
    encoder: encoding.encoder,
    encoderProfile: encoding.profile,
    encoderSettings: encoding.settings,
    budgetBytes,
    withinBudget: sizeBytes <= budgetBytes,
  });
}

export async function inspectWebp(
  file: string,
  encoding: ReportEncoding,
  budgetBytes: number,
  encodeFps: number,
): Promise<OutputReport> {
  const sizeBytes = statSync(file).size;
  const report: OutputReport = {
    file,
    format: 'webp',
    transparent: false,
    transparencyMode: 'none',
    sizeBytes,
    width: null,
    height: null,
    durationS: null,
    fps: encodeFps,
    frameCount: null,
    loopsForever: null,
    hasAudio: false,
    encoder: encoding.encoder,
    encoderProfile: encoding.profile,
    encoderSettings: encoding.settings,
    budgetBytes,
    withinBudget: sizeBytes <= budgetBytes,
  };
  const meta = await sharp(file, { animated: true }).metadata();
  report.width = meta.width ?? null;
  report.height = meta.pages ? Math.round((meta.height ?? 0) / meta.pages) : (meta.height ?? null);
  report.frameCount = meta.pages ?? null;
  if (meta.delay && meta.delay.length > 0) {
    report.durationS = meta.delay.reduce((sum, d) => sum + d, 0) / 1000;
  }
  report.loopsForever = meta.loop === 0;
  return report;
}

export function printReport(report: OutputReport): void {
  const kb = (report.sizeBytes / 1024).toFixed(0);
  console.log(`\n${path.basename(report.file)} (${report.format})`);
  console.log(`  size: ${kb}KB${report.withinBudget === false ? ' (OVER BUDGET)' : ''}`);
  if (report.width) console.log(`  dimensions: ${report.width}x${report.height}`);
  if (report.durationS != null) console.log(`  duration: ${report.durationS.toFixed(1)}s`);
  if (report.fps != null) console.log(`  fps: ${report.fps}`);
  if (report.frameCount != null) console.log(`  frames: ${report.frameCount}`);
  if (report.loopsForever != null) console.log(`  loops: ${report.loopsForever ? 'forever' : 'NO (missing loop marker)'}`);
  if (report.hasAudio != null) console.log(`  audio: ${report.hasAudio ? 'PRESENT (unexpected)' : 'none'}`);
  if (report.encoder) console.log(`  encoder: ${report.encoder}`);
  if (report.encoderProfile) console.log(`  encoder profile: ${report.encoderProfile}`);
  if (report.transparent) console.log(`  transparency: ${report.transparencyMode}`);
}

export function writeReportJson(outDir: string, reports: OutputReport[], extra: Record<string, unknown>): string {
  const file = path.join(outDir, 'report.json');
  writeFileSync(file, `${JSON.stringify({ ...extra, outputs: reports }, null, 2)}\n`);
  return file;
}
