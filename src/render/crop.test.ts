import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { applyCrop, computeAlphaBox } from './crop.js';

function rectPng(rects: Array<{ x: number; y: number; width: number; height: number }>): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
    <rect width="10" height="10" fill="transparent"/>
    ${rects
      .map((rect) => `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="black"/>`)
      .join('')}
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

describe('alpha crop', () => {
  it('computes a union alpha box across frames and applies margin in rendered pixels', async () => {
    const first = await rectPng([{ x: 1, y: 2, width: 3, height: 4 }]);
    const second = await rectPng([{ x: 6, y: 5, width: 2, height: 2 }]);

    const box = await computeAlphaBox([first, second]);
    expect(box).toEqual({ left: 1, top: 2, width: 7, height: 5 });

    const cropped = await applyCrop(first, box, 4).png().toBuffer();
    const meta = await sharp(cropped).metadata();
    expect(meta.width).toBe(15);
    expect(meta.height).toBe(13);
    expect(meta.hasAlpha).toBe(true);
  });

  it('falls back to the full canvas when every sampled frame is transparent', async () => {
    const empty = await rectPng([]);
    await expect(computeAlphaBox([empty])).resolves.toEqual({ left: 0, top: 0, width: 10, height: 10 });
  });
});
