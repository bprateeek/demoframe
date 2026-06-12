import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { loadConfig } from './config/load.js';
import { buildDocument } from './templates/document.js';
import { openRenderSession } from './render/browser.js';
import { chromiumInstalled } from './env/browser.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const goldenDir = path.join(root, 'test', 'golden');
const SNAP_TIMES = [2.5, 5.5, 11.0];
// Goldens are rendered on the Linux CI leg; other platforms rasterize fonts
// differently (observed ~1.1% on Windows), so they get a looser bound
const MAX_DIFF_RATIO = process.platform === 'linux' ? 0.01 : 0.02;

describe.skipIf(!chromiumInstalled())('golden frames (fieldwork-hero)', () => {
  it('matches committed goldens within threshold', { timeout: 120_000 }, async () => {
    const { config, baseDir } = loadConfig(path.join(root, 'examples/fieldwork-hero/demo.yml'));
    const doc = await buildDocument(config, baseDir);
    const session = await openRenderSession(doc, 'draft');
    try {
      for (const t of SNAP_TIMES) {
        await session.seek(t * 1000);
        const actual = PNG.sync.read(await session.screenshot());
        const goldenFile = path.join(goldenDir, `hero_${t.toFixed(1)}.png`);
        if (!existsSync(goldenFile) || process.env.UPDATE_GOLDEN === '1') {
          mkdirSync(goldenDir, { recursive: true });
          writeFileSync(goldenFile, PNG.sync.write(actual));
          continue;
        }
        const golden = PNG.sync.read(readFileSync(goldenFile));
        expect([actual.width, actual.height]).toEqual([golden.width, golden.height]);
        const diff = pixelmatch(actual.data, golden.data, undefined, actual.width, actual.height, {
          threshold: 0.1,
        });
        const ratio = diff / (actual.width * actual.height);
        expect(ratio, `frame at ${t}s drifted from golden (${(ratio * 100).toFixed(2)}% pixels)`)
          .toBeLessThan(MAX_DIFF_RATIO);
      }
    } finally {
      await session.close();
    }
  });
});
