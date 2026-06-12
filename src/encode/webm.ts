import { run } from './exec.js';
import { ffmpegPath } from '../env/doctor.js';
import type { RenderedFrames } from '../render/frames.js';

export async function encodeWebm(
  frames: RenderedFrames,
  width: number,
  outFile: string,
): Promise<void> {
  const ffmpeg = ffmpegPath();
  if (!ffmpeg) throw new Error('bundled ffmpeg is missing; run "demoframe doctor"');
  await run(ffmpeg, [
    '-y', '-framerate', String(frames.fps), '-i', frames.pattern,
    '-vf', `scale=${width}:-2:flags=lanczos,format=yuv420p`,
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32',
    '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1',
    '-an',
    outFile,
  ]);
}
