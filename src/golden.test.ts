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
// Goldens are rendered on the Linux CI leg; other platforms rasterize fonts
// differently (observed ~1.1% on Windows), so they get a looser bound
const MAX_DIFF_RATIO = process.platform === 'linux' ? 0.01 : 0.02;

const EXAMPLES = [
  { dir: 'fieldwork-hero', prefix: 'hero', times: [2.5, 5.5, 11.0] },
  { dir: 'mobile-flow', prefix: 'mobileflow', times: [2.4, 4.4, 12.5] },
  { dir: 'terminal-playback', prefix: 'playback', times: [2.0, 5.5, 7.5] },
  { dir: 'code-reveal', prefix: 'code', times: [1.8, 4.6, 6.4] },
  { dir: 'chat', prefix: 'chat', times: [2.2, 5.6, 7.8] },
  { dir: 'metric-card', prefix: 'metric', times: [1.5, 4.2, 6.8] },
  { dir: 'desktop-app', prefix: 'desktop', times: [2.4, 6.2, 9.0] },
  { dir: 'frameless', prefix: 'frameless', times: [1.5, 4.6, 6.2] },
  { dir: 'expense-report', prefix: 'expense', times: [2.5, 4.6, 11.8] },
];

describe.skipIf(!chromiumInstalled())('golden frames', () => {
  for (const example of EXAMPLES) {
    it(`${example.dir} matches committed goldens within threshold`, { timeout: 120_000 }, async () => {
      const { config, baseDir } = loadConfig(path.join(root, 'examples', example.dir, 'demo.yml'));
      const doc = await buildDocument(config, baseDir);
      const session = await openRenderSession(doc, 'draft');
      try {
        for (const t of example.times) {
          await session.seek(t * 1000);
          const actual = PNG.sync.read(await session.screenshot());
          const goldenFile = path.join(goldenDir, `${example.prefix}_${t.toFixed(1)}.png`);
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
  }
});
