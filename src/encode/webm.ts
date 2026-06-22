import { run } from './exec.js';
import { ffmpegPath } from '../env/doctor.js';
import type { RenderedFrames } from '../render/frames.js';
import { legacySettings, webmCrf, type EncodeOptions, type EncodeResult } from './profiles.js';

export async function encodeWebm(
  frames: RenderedFrames,
  width: number,
  outFile: string,
  opts: EncodeOptions,
): Promise<EncodeResult> {
  const ffmpeg = ffmpegPath();
  if (!ffmpeg) throw new Error('bundled ffmpeg is missing; run "demoframe doctor"');
  const crf = opts.profile === 'modern' ? webmCrf(opts.quality) : 32;
  const settings = {
    ...legacySettings('webm', width, frames.fps),
    videoCodec: 'libvpx-vp9',
    bitrate: '0',
    crf,
    deadline: 'good',
    cpuUsed: 2,
    rowMt: true,
    pixelFormat: 'yuv420p',
    audio: false,
  };
  await run(ffmpeg, [
    '-y', '-framerate', String(frames.fps), '-i', frames.pattern,
    '-vf', `scale=${width}:-2:flags=lanczos,format=yuv420p`,
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf),
    '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1',
    '-an',
    outFile,
  ]);
  return { encoder: 'ffmpeg', profile: opts.profile, settings };
}
