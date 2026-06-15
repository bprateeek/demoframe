import { renameSync } from 'node:fs';
import sharp, { type Sharp } from 'sharp';

export interface AlphaBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type CropInput = string | Buffer;

async function alphaBounds(input: CropInput, threshold: number): Promise<AlphaBox | null> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  const channels = info.channels;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * channels + channels - 1];
      if (alpha <= threshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX === -1 || maxY === -1) return null;
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export async function computeAlphaBox(inputs: CropInput[], threshold = 2): Promise<AlphaBox> {
  if (inputs.length === 0) throw new Error('cannot compute alpha crop without frames');
  let union: AlphaBox | null = null;
  let fallback: AlphaBox | null = null;
  for (const input of inputs) {
    const meta = await sharp(input).metadata();
    fallback ??= {
      left: 0,
      top: 0,
      width: meta.width ?? 1,
      height: meta.height ?? 1,
    };
    const bounds = await alphaBounds(input, threshold);
    if (!bounds) continue;
    if (!union) {
      union = bounds;
      continue;
    }
    const right = Math.max(union.left + union.width, bounds.left + bounds.width);
    const bottom = Math.max(union.top + union.height, bounds.top + bounds.height);
    union = {
      left: Math.min(union.left, bounds.left),
      top: Math.min(union.top, bounds.top),
      width: right - Math.min(union.left, bounds.left),
      height: bottom - Math.min(union.top, bounds.top),
    };
  }
  return union ?? fallback ?? { left: 0, top: 0, width: 1, height: 1 };
}

export function applyCrop(input: CropInput, box: AlphaBox, marginPx = 0): Sharp {
  return sharp(input)
    .extract(box)
    .extend({
      top: marginPx,
      right: marginPx,
      bottom: marginPx,
      left: marginPx,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
}

export async function cropPngFile(file: string, box: AlphaBox, marginPx = 0): Promise<void> {
  const tmp = `${file}.crop.png`;
  await applyCrop(file, box, marginPx).png().toFile(tmp);
  renameSync(tmp, file);
}
