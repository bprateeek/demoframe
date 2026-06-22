import { readdirSync } from 'node:fs';
import path from 'node:path';
import { run } from './exec.js';
import { ffmpegPath } from '../env/doctor.js';
import { resolveGifski } from '../env/gifski.js';
import type { RenderedFrames } from '../render/frames.js';
import { gifQuality, legacySettings, type EncodeOptions, type EncodeResult } from './profiles.js';

export async function encodeGif(
  frames: RenderedFrames,
  width: number,
  outFile: string,
  opts: { transparent?: boolean } & EncodeOptions,
): Promise<EncodeResult> {
  const quality = opts.profile === 'modern' ? gifQuality(opts.quality) : 90;
  const gifski = resolveGifski();
  if (gifski && !opts.transparent) {
    const files = readdirSync(frames.dir)
      .filter((f) => f.endsWith('.png'))
      .sort()
      .map((f) => path.join(frames.dir, f));
    await run(gifski, [
      '--fps', String(frames.fps),
      '--width', String(width),
      '--quality', String(quality),
      '-o', outFile,
      ...files,
    ]);
    return {
      encoder: 'gifski',
      profile: opts.profile,
      settings: {
        ...legacySettings('gif', width, frames.fps),
        quality,
        transparent: false,
      },
    };
  }

  const ffmpeg = ffmpegPath();
  if (!ffmpeg) {
    throw new Error(
      opts.transparent
        ? 'bundled ffmpeg is required for transparent GIF output; run "demoframe doctor"'
        : 'neither gifski nor bundled ffmpeg is available; run "demoframe doctor"',
    );
  }
  const palette = path.join(frames.dir, 'palette.png');
  const scale = `scale=${width}:-2:flags=lanczos`;
  const paletteOptions = opts.transparent
    ? `${scale},palettegen=stats_mode=diff:reserve_transparent=1`
    : `${scale},palettegen=stats_mode=diff`;
  const useOptions = opts.transparent
    ? `${scale} [x]; [x][1:v] paletteuse=dither=sierra2_4a:alpha_threshold=128`
    : `${scale} [x]; [x][1:v] paletteuse=dither=sierra2_4a`;
  await run(ffmpeg, [
    '-y', '-framerate', String(frames.fps), '-i', frames.pattern,
    '-vf', paletteOptions,
    palette,
  ]);
  await run(ffmpeg, [
    '-y', '-framerate', String(frames.fps), '-i', frames.pattern, '-i', palette,
    '-lavfi', useOptions,
    '-loop', '0',
    outFile,
  ]);
  return {
    encoder: 'ffmpeg',
    profile: opts.profile,
    settings: {
      ...legacySettings('gif', width, frames.fps),
      palettegen: paletteOptions,
      paletteuse: useOptions,
      loop: 0,
      transparent: Boolean(opts.transparent),
    },
  };
}
