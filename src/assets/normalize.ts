import path from 'node:path';
import { statSync } from 'node:fs';
import sharp from 'sharp';

const cache = new Map<string, string>();

export async function normalizeImageToDataUrl(file: string, maxDim = 2400): Promise<string> {
  const abs = path.resolve(file);
  const key = `${abs}:${statSync(abs).mtimeMs}:${maxDim}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const buffer = await sharp(abs)
    .rotate()
    .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  cache.set(key, dataUrl);
  return dataUrl;
}
