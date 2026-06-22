import { run } from './exec.js';
import { ffmpegPath } from '../env/doctor.js';
import type { RenderedFrames } from '../render/frames.js';
import { legacySettings, mp4Crf, type EncodeOptions, type EncodeResult } from './profiles.js';

export async function encodeMp4(
  frames: RenderedFrames,
  width: number,
  outFile: string,
  opts: EncodeOptions,
): Promise<EncodeResult> {
  const ffmpeg = ffmpegPath();
  if (!ffmpeg) throw new Error('bundled ffmpeg is missing; run "demoframe doctor"');
  const crf = mp4Crf(opts.quality);
  const settings =
    opts.profile === 'modern'
      ? {
          ...legacySettings('mp4', width, frames.fps),
          videoCodec: 'libx264',
          preset: 'slow',
          profile: 'high',
          crf,
          pixelFormat: 'yuv420p',
          movflags: '+faststart',
          audio: false,
        }
      : {
          ...legacySettings('mp4', width, frames.fps),
          videoCodec: 'ffmpeg-default',
          pixelFormat: 'yuv420p',
          movflags: '+faststart',
          audio: false,
        };
  const args = [
    '-y', '-framerate', String(frames.fps), '-i', frames.pattern,
    '-vf', `scale=${width}:-2:flags=lanczos,format=yuv420p`,
  ];
  if (opts.profile === 'modern') {
    args.push(
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-profile:v', 'high',
      '-crf', String(crf),
    );
  }
  args.push('-movflags', '+faststart', '-an', outFile);
  await run(ffmpeg, args);
  return { encoder: 'ffmpeg', profile: opts.profile, settings };
}
