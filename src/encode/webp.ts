import { readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { RenderedFrames } from '../render/frames.js';
import { legacySettings, webpQuality, type EncodeOptions, type EncodeResult } from './profiles.js';

// ffmpeg's libwebp encoder writes every frame independently, which produces
// files several times larger than the equivalent GIF. sharp goes through
// libwebp's AnimEncoder, which encodes inter-frame deltas and dedupes
// identical frames.
export async function encodeWebp(
  frames: RenderedFrames,
  width: number,
  outFile: string,
  opts: EncodeOptions,
): Promise<EncodeResult> {
  const files = readdirSync(frames.dir)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => path.join(frames.dir, f));
  const resized = await Promise.all(
    files.map((f) => sharp(f).resize({ width }).png().toBuffer()),
  );
  const quality = opts.profile === 'modern' ? webpQuality(opts.quality) : 82;
  const settings = {
    ...legacySettings('webp', width, frames.fps),
    quality,
    alphaQuality: 100,
    effort: 4,
    loop: 0,
    minSize: true,
    mixed: true,
  };
  await sharp(resized, { join: { animated: true } })
    .webp({
      quality,
      alphaQuality: settings.alphaQuality as number,
      effort: settings.effort as number,
      loop: settings.loop as number,
      // a scalar delay only applies to the first frame; every frame needs one
      delay: files.map(() => Math.round(1000 / frames.fps)),
      minSize: settings.minSize as boolean,
      mixed: settings.mixed as boolean,
    })
    .toFile(outFile);
  return { encoder: 'sharp', profile: opts.profile, settings };
}
