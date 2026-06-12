import { readdirSync } from 'node:fs';
import path from 'node:path';
import { run } from './exec.js';
import { ffmpegPath, gifskiPath } from '../env/doctor.js';
import type { RenderedFrames } from '../render/frames.js';

export interface GifEncodeResult {
  encoder: 'gifski' | 'ffmpeg';
}

export async function encodeGif(
  frames: RenderedFrames,
  width: number,
  outFile: string,
): Promise<GifEncodeResult> {
  const gifski = gifskiPath();
  if (gifski) {
    const files = readdirSync(frames.dir)
      .filter((f) => f.endsWith('.png'))
      .sort()
      .map((f) => path.join(frames.dir, f));
    await run(gifski, [
      '--fps', String(frames.fps),
      '--width', String(width),
      '--quality', '90',
      '-o', outFile,
      ...files,
    ]);
    return { encoder: 'gifski' };
  }

  const ffmpeg = ffmpegPath();
  if (!ffmpeg) throw new Error('neither gifski nor bundled ffmpeg is available; run "demoframe doctor"');
  const palette = path.join(frames.dir, 'palette.png');
  const scale = `scale=${width}:-2:flags=lanczos`;
  await run(ffmpeg, [
    '-y', '-framerate', String(frames.fps), '-i', frames.pattern,
    '-vf', `${scale},palettegen=stats_mode=diff`,
    palette,
  ]);
  await run(ffmpeg, [
    '-y', '-framerate', String(frames.fps), '-i', frames.pattern, '-i', palette,
    '-lavfi', `${scale} [x]; [x][1:v] paletteuse=dither=sierra2_4a`,
    '-loop', '0',
    outFile,
  ]);
  return { encoder: 'ffmpeg' };
}

export function gifskiAvailable(): boolean {
  return gifskiPath() !== null;
}
