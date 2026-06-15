import { readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { RenderedFrames } from '../render/frames.js';

// ffmpeg's libwebp encoder writes every frame independently, which produces
// files several times larger than the equivalent GIF. sharp goes through
// libwebp's AnimEncoder, which encodes inter-frame deltas and dedupes
// identical frames.
export async function encodeWebp(
  frames: RenderedFrames,
  width: number,
  outFile: string,
): Promise<void> {
  const files = readdirSync(frames.dir)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => path.join(frames.dir, f));
  const resized = await Promise.all(
    files.map((f) => sharp(f).resize({ width }).png().toBuffer()),
  );
  await sharp(resized, { join: { animated: true } })
    .webp({
      quality: 82,
      alphaQuality: 100,
      effort: 4,
      loop: 0,
      // a scalar delay only applies to the first frame; every frame needs one
      delay: files.map(() => Math.round(1000 / frames.fps)),
      minSize: true,
      mixed: true,
    })
    .toFile(outFile);
}
