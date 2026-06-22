import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { demoConfigSchema, type DemoConfig } from '../config/schema.js';
import { chromiumInstalled } from '../env/browser.js';
import { buildDocument } from '../templates/document.js';
import {
  assertMotionBlurBounds,
  motionBlurSubframeTimes,
  renderFrames,
  type FrameCaptureRequest,
} from './frames.js';
import { timelineCinematicMotionWindows } from './sampling.js';
import { resolveTimeline } from './timeline.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(name: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), `demoframe-${name}-`));
  tempDirs.push(dir);
  return dir;
}

function hashFile(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function frameHashes(files: string[]): string[] {
  return files.map(hashFile);
}

async function capture(config: DemoConfig, request: FrameCaptureRequest): Promise<string[]> {
  const doc = await buildDocument(config, root);
  const frames = await renderFrames(doc, config.output.quality, tempDir(request.mode), undefined, request);
  return frames.dir ? frameHashes(Array.from({ length: frames.count }, (_, i) => path.join(frames.dir, `frame_${String(i).padStart(4, '0')}.png`))) : [];
}

describe('motion blur sampling helpers', () => {
  it('clamps subframes to the active scene and motion window at cuts', () => {
    const timeline = resolveTimeline(
      demoConfigSchema.parse({
        frame: { type: 'browser' },
        output: { fps: 10 },
        scenes: [
          { type: 'code', duration: 1, code: 'const before = true;', reveal: 'none' },
          { type: 'code', duration: 1, code: 'const after = true;', reveal: 'none', cinematic: { motion: 'float-in' } },
        ],
      }),
    );
    const window = timelineCinematicMotionWindows(timeline)[0];
    expect(window).toBeDefined();
    if (!window) throw new Error('expected a cinematic motion window');

    expect(motionBlurSubframeTimes(timeline, window, 1, 8)).toEqual([
      1.001562, 1.004687, 1.007813, 1.010938, 1.014062, 1.017187, 1.020312, 1.023438,
    ]);
  });

  it('fails clearly when blur work would exceed safety bounds', () => {
    expect(() =>
      assertMotionBlurBounds({ width: 5000, height: 5000, frameCount: 1, subframesPerFrame: 3 }),
    ).toThrow(/exceeds .* pixels/);
    expect(() =>
      assertMotionBlurBounds({ width: 4600, height: 4600, frameCount: 1, subframesPerFrame: 3 }),
    ).toThrow(/raw accumulation memory/);
    expect(() =>
      assertMotionBlurBounds({ width: 960, height: 640, frameCount: 7000, subframesPerFrame: 3 }),
    ).toThrow(/would sample .* subframes/);
  });
});

describe.skipIf(!chromiumInstalled())('motion blur frame capture', () => {
  const direct: FrameCaptureRequest = { mode: 'directCapture', motionBlur: 'off', format: 'webp' };
  const blurred: FrameCaptureRequest = { mode: 'blurredCapture', motionBlur: 'cinematic', format: 'webp' };

  it('keeps direct capture deterministic when motion blur is off', { timeout: 60_000 }, async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      output: { fps: 5, quality: 'draft' },
      scenes: [{ type: 'code', duration: 1, code: 'const stable = true;', reveal: 'none' }],
    });

    const first = await capture(config, direct);
    const second = await capture(config, direct);

    expect(first).toEqual(second);
  });

  it('renders choreography-window blur deterministically and differently from direct capture', { timeout: 90_000 }, async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      output: { fps: 5, quality: 'standard' },
      scenes: [
        {
          type: 'code',
          duration: 1,
          code: 'const shipped = true;',
          reveal: 'none',
          cinematic: { motion: 'float-in' },
        },
      ],
    });

    const directHashes = await capture(config, direct);
    const blurredA = await capture(config, blurred);
    const blurredB = await capture(config, blurred);

    expect(blurredA).toEqual(blurredB);
    expect(blurredA[1]).not.toBe(directHashes[1]);
  });

  it('keeps text mutation frames direct even when wrapper choreography is active', { timeout: 90_000 }, async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      output: { fps: 5, quality: 'standard' },
      scenes: [{ type: 'typing', duration: 2, text: 'Readable text stays crisp', cinematic: { motion: 'float-in' } }],
    });

    const directHashes = await capture(config, direct);
    const blurredHashes = await capture(config, blurred);

    expect(blurredHashes[1]).toBe(directHashes[1]);
    expect(blurredHashes[8]).toBe(directHashes[8]);
  });
});
