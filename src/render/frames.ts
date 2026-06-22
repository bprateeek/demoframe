import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { BuiltDocument } from '../templates/document.js';
import type { FrameCaptureMode, MotionBlur, Output, OutputFormat } from '../config/schema.js';
import { openRenderSession } from './browser.js';
import { computeAlphaBox, cropPngFile } from './crop.js';
import { timelineCinematicMotionWindows, type TimelineMotionWindow } from './sampling.js';
import type { Timeline, TimelineScene } from './timeline.js';

export interface RenderedFrames {
  dir: string;
  count: number;
  fps: number;
  pattern: string;
  sourceWidth: number;
  sourceHeight: number;
  captureMode: FrameCaptureMode;
  motionBlur: MotionBlur;
  format?: OutputFormat;
}

export interface FrameCaptureRequest {
  mode: FrameCaptureMode;
  motionBlur: MotionBlur;
  format?: OutputFormat;
}

interface CaptureResult {
  files: string[];
  scale: number;
}

export const SHUTTER_FRACTION = 0.5;
export const MOTION_BLUR_SUBFRAMES_BY_QUALITY = { draft: 1, standard: 3, high: 8 } as const;

const MAX_MOTION_BLUR_PIXELS = 24_000_000;
const MAX_MOTION_BLUR_ACCUMULATION_BYTES = 384 * 1024 * 1024;
const MAX_MOTION_BLUR_TOTAL_SUBFRAMES = 20_000;
const TEXT_MUTATION_SCENE_TYPES = new Set<TimelineScene['type']>([
  'typing',
  'terminal-playback',
  'metric-card',
  'screen',
]);

interface MotionBlurSampleWindow {
  start: number;
  end: number;
}

interface MotionBlurBounds {
  width: number;
  height: number;
  frameCount: number;
  subframesPerFrame: number;
}

async function directCapture(
  doc: BuiltDocument,
  quality: Output['quality'],
  outDir: string,
  onProgress?: (done: number, total: number) => void,
): Promise<CaptureResult> {
  const session = await openRenderSession(doc, quality);
  const { frameCount, fps } = doc.timeline;
  const files: string[] = [];
  const scale = session.scale;
  try {
    for (let i = 0; i < frameCount; i++) {
      await session.seek((i / fps) * 1000);
      const file = path.join(outDir, `frame_${String(i).padStart(4, '0')}.png`);
      await session.screenshot(file);
      files.push(file);
      onProgress?.(i + 1, frameCount);
    }
  } finally {
    await session.close();
  }
  return { files, scale };
}

function activeSceneAt(timeline: Timeline, time: number): TimelineScene {
  const active = timeline.scenes.find((scene) => time < scene.end - 1e-9);
  return active ?? timeline.scenes[timeline.scenes.length - 1];
}

function windowAtTime(windows: TimelineMotionWindow[], sceneIndex: number, time: number): TimelineMotionWindow | undefined {
  return windows.find((window) => window.sceneIndex === sceneIndex && time >= window.start && time < window.end);
}

function shouldAccumulateMotionBlur(scene: TimelineScene, window: TimelineMotionWindow | undefined): window is TimelineMotionWindow {
  if (!window) return false;
  // These scenes mutate typed text or counters during seek. Keep them direct
  // until capture can sample wrapper choreography independently from content.
  return !TEXT_MUTATION_SCENE_TYPES.has(scene.type);
}

function motionBlurredFrameCount(timeline: Timeline, windows: TimelineMotionWindow[]): number {
  let count = 0;
  for (let i = 0; i < timeline.frameCount; i++) {
    const frameTime = i / timeline.fps;
    const activeScene = activeSceneAt(timeline, frameTime);
    if (shouldAccumulateMotionBlur(activeScene, windowAtTime(windows, activeScene.index, frameTime))) count++;
  }
  return count;
}

export function motionBlurSampleWindow(
  timeline: Timeline,
  window: TimelineMotionWindow,
  frameTime: number,
): MotionBlurSampleWindow {
  const scene = timeline.scenes[window.sceneIndex];
  const halfShutter = SHUTTER_FRACTION / timeline.fps / 2;
  const start = Math.max(scene.start, window.start, frameTime - halfShutter, 0);
  const end = Math.min(scene.end, window.end, frameTime + halfShutter, timeline.duration);
  return end >= start ? { start, end } : { start: frameTime, end: frameTime };
}

export function motionBlurSubframeTimes(
  timeline: Timeline,
  window: TimelineMotionWindow,
  frameTime: number,
  subframes: number,
): number[] {
  if (subframes <= 1) return [frameTime];
  const sampleWindow = motionBlurSampleWindow(timeline, window, frameTime);
  const span = sampleWindow.end - sampleWindow.start;
  if (span <= 0) return [sampleWindow.start];
  return Array.from({ length: subframes }, (_, index) =>
    Number((sampleWindow.start + span * ((index + 0.5) / subframes)).toFixed(6)),
  );
}

export function assertMotionBlurBounds(bounds: MotionBlurBounds): void {
  const pixels = bounds.width * bounds.height;
  if (pixels > MAX_MOTION_BLUR_PIXELS) {
    throw new Error(
      `motion blur capture is too large: ${bounds.width}x${bounds.height} (${pixels} pixels) exceeds ` +
        `${MAX_MOTION_BLUR_PIXELS} pixels`,
    );
  }
  const estimatedBytes = pixels * 20;
  if (estimatedBytes > MAX_MOTION_BLUR_ACCUMULATION_BYTES) {
    throw new Error(
      `motion blur capture needs about ${Math.ceil(estimatedBytes / 1024 / 1024)}MB of raw accumulation memory; ` +
        `limit is ${Math.floor(MAX_MOTION_BLUR_ACCUMULATION_BYTES / 1024 / 1024)}MB`,
    );
  }
  const totalSubframes = bounds.frameCount * bounds.subframesPerFrame;
  if (totalSubframes > MAX_MOTION_BLUR_TOTAL_SUBFRAMES) {
    throw new Error(
      `motion blur capture would sample ${totalSubframes} subframes; limit is ${MAX_MOTION_BLUR_TOTAL_SUBFRAMES}`,
    );
  }
}

async function decodeRgba(png: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function accumulateSubframes(session: Awaited<ReturnType<typeof openRenderSession>>, times: number[]): Promise<Buffer> {
  let width = 0;
  let height = 0;
  let sumR: Uint32Array | undefined;
  let sumG: Uint32Array | undefined;
  let sumB: Uint32Array | undefined;
  let sumA: Uint32Array | undefined;

  for (const time of times) {
    await session.seek(time * 1000);
    const rgba = await decodeRgba(await session.screenshot());
    if (!sumR) {
      width = rgba.width;
      height = rgba.height;
      const pixels = width * height;
      sumR = new Uint32Array(pixels);
      sumG = new Uint32Array(pixels);
      sumB = new Uint32Array(pixels);
      sumA = new Uint32Array(pixels);
    } else if (rgba.width !== width || rgba.height !== height) {
      throw new Error(`motion blur subframe dimensions changed from ${width}x${height} to ${rgba.width}x${rgba.height}`);
    }

    const r = sumR;
    const g = sumG;
    const b = sumB;
    const a = sumA;
    if (!r || !g || !b || !a) throw new Error('motion blur capture failed to initialize accumulation buffers');
    for (let src = 0, pixel = 0; src < rgba.data.length; src += 4, pixel++) {
      const alpha = rgba.data[src + 3];
      // Accumulate premultiplied RGB so transparent frame edges do not tint the average.
      r[pixel] += rgba.data[src] * alpha;
      g[pixel] += rgba.data[src + 1] * alpha;
      b[pixel] += rgba.data[src + 2] * alpha;
      a[pixel] += alpha;
    }
  }

  if (!sumR || !sumG || !sumB || !sumA) throw new Error('motion blur capture received no subframes');
  const out = Buffer.alloc(width * height * 4);
  for (let pixel = 0, dst = 0; pixel < sumA.length; pixel++, dst += 4) {
    const alphaSum = sumA[pixel];
    const alpha = Math.round(alphaSum / times.length);
    out[dst + 3] = alpha;
    if (alphaSum === 0) continue;
    out[dst] = Math.min(255, Math.round((sumR[pixel] * 255) / alphaSum));
    out[dst + 1] = Math.min(255, Math.round((sumG[pixel] * 255) / alphaSum));
    out[dst + 2] = Math.min(255, Math.round((sumB[pixel] * 255) / alphaSum));
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function blurredCapture(
  doc: BuiltDocument,
  quality: Output['quality'],
  outDir: string,
  onProgress?: (done: number, total: number) => void,
): Promise<CaptureResult> {
  const session = await openRenderSession(doc, quality);
  const { frameCount, fps } = doc.timeline;
  const files: string[] = [];
  const scale = session.scale;
  const subframesPerFrame = MOTION_BLUR_SUBFRAMES_BY_QUALITY[quality];
  const windows = timelineCinematicMotionWindows(doc.timeline);
  assertMotionBlurBounds({
    width: doc.viewport.width * scale,
    height: doc.viewport.height * scale,
    frameCount: subframesPerFrame === 1 ? 0 : motionBlurredFrameCount(doc.timeline, windows),
    subframesPerFrame,
  });

  try {
    for (let i = 0; i < frameCount; i++) {
      const frameTime = i / fps;
      const activeScene = activeSceneAt(doc.timeline, frameTime);
      const activeWindow = windowAtTime(windows, activeScene.index, frameTime);
      const file = path.join(outDir, `frame_${String(i).padStart(4, '0')}.png`);
      if (!shouldAccumulateMotionBlur(activeScene, activeWindow) || subframesPerFrame === 1) {
        await session.seek(frameTime * 1000);
        await session.screenshot(file);
      } else {
        const sampleTimes = motionBlurSubframeTimes(doc.timeline, activeWindow, frameTime, subframesPerFrame);
        const png = await accumulateSubframes(session, sampleTimes);
        await sharp(png).toFile(file);
      }
      files.push(file);
      onProgress?.(i + 1, frameCount);
    }
  } finally {
    await session.close();
  }
  return { files, scale };
}

export async function renderFrames(
  doc: BuiltDocument,
  quality: Output['quality'],
  outDir: string,
  onProgress?: (done: number, total: number) => void,
  capture: FrameCaptureRequest = { mode: 'directCapture', motionBlur: 'off' },
): Promise<RenderedFrames> {
  mkdirSync(outDir, { recursive: true });
  const { frameCount, fps } = doc.timeline;
  const { files, scale } =
    capture.mode === 'blurredCapture'
      ? await blurredCapture(doc, quality, outDir, onProgress)
      : await directCapture(doc, quality, outDir, onProgress);
  let sourceWidth = doc.viewport.width * scale;
  let sourceHeight = doc.viewport.height * scale;
  if (doc.transparent) {
    const box = await computeAlphaBox(files);
    const marginPx = Math.round(doc.frameMargin * scale);
    for (const file of files) await cropPngFile(file, box, marginPx);
    sourceWidth = box.width + marginPx * 2;
    sourceHeight = box.height + marginPx * 2;
  }
  return {
    dir: outDir,
    count: frameCount,
    fps,
    pattern: path.join(outDir, 'frame_%04d.png'),
    sourceWidth,
    sourceHeight,
    captureMode: capture.mode,
    motionBlur: capture.motionBlur,
    format: capture.format,
  };
}
