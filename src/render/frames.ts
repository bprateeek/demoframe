import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { BuiltDocument } from '../templates/document.js';
import type { FrameCaptureMode, MotionBlur, Output, OutputFormat } from '../config/schema.js';
import { openRenderSession } from './browser.js';
import { computeAlphaBox, cropPngFile } from './crop.js';

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

async function blurredCapture(
  doc: BuiltDocument,
  quality: Output['quality'],
  outDir: string,
  onProgress?: (done: number, total: number) => void,
): Promise<CaptureResult> {
  return directCapture(doc, quality, outDir, onProgress);
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
