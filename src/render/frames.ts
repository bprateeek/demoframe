import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { BuiltDocument } from '../templates/document.js';
import type { Output } from '../config/schema.js';
import { openRenderSession } from './browser.js';

export interface RenderedFrames {
  dir: string;
  count: number;
  fps: number;
  pattern: string;
  sourceWidth: number;
  sourceHeight: number;
}

export async function renderFrames(
  doc: BuiltDocument,
  quality: Output['quality'],
  outDir: string,
  onProgress?: (done: number, total: number) => void,
): Promise<RenderedFrames> {
  mkdirSync(outDir, { recursive: true });
  const session = await openRenderSession(doc, quality);
  const { frameCount, fps } = doc.timeline;
  try {
    for (let i = 0; i < frameCount; i++) {
      await session.seek((i / fps) * 1000);
      await session.screenshot(path.join(outDir, `frame_${String(i).padStart(4, '0')}.png`));
      onProgress?.(i + 1, frameCount);
    }
  } finally {
    await session.close();
  }
  return {
    dir: outDir,
    count: frameCount,
    fps,
    pattern: path.join(outDir, 'frame_%04d.png'),
    sourceWidth: doc.viewport.width * session.scale,
    sourceHeight: doc.viewport.height * session.scale,
  };
}
