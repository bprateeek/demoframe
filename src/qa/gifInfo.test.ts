import { describe, expect, it } from 'vitest';
import { parseGif } from './gifInfo.js';

function minimalGif({ loop = true, frames = 2, delayCs = 10 } = {}): Buffer {
  const parts: number[] = [];
  parts.push(...Buffer.from('GIF89a', 'ascii'));
  parts.push(2, 0, 3, 0, 0x00, 0, 0);
  if (loop) {
    parts.push(0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0', 'ascii'), 3, 1, 0, 0, 0);
  }
  for (let i = 0; i < frames; i++) {
    parts.push(0x21, 0xf9, 4, 0, delayCs & 0xff, delayCs >> 8, 0, 0);
    parts.push(0x2c, 0, 0, 0, 0, 2, 0, 3, 0, 0x00, 2, 1, 0x4c, 0);
  }
  parts.push(0x3b);
  return Buffer.from(parts);
}

describe('parseGif', () => {
  it('reads dimensions, frames, duration, and loop marker', () => {
    const info = parseGif(minimalGif());
    expect(info.width).toBe(2);
    expect(info.height).toBe(3);
    expect(info.frameCount).toBe(2);
    expect(info.durationS).toBeCloseTo(0.2);
    expect(info.loopsForever).toBe(true);
  });

  it('detects a missing loop marker', () => {
    expect(parseGif(minimalGif({ loop: false })).loopsForever).toBe(false);
  });

  it('rejects non-GIF data', () => {
    expect(() => parseGif(Buffer.from('PNG not gif'))).toThrow('not a GIF');
  });
});
