import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config/load.js';
import { chromiumInstalled } from './env/browser.js';
import { openRenderSession } from './render/browser.js';
import { buildDocument } from './templates/document.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineDir = path.join(root, 'test', 'legacy-exact');
const update = process.env.UPDATE_LEGACY_BASELINE === '1';
const linuxVerification = process.platform === 'linux';

const FIXTURES = [
  { name: 'terminal', file: 'legacy-exact-terminal.yml', times: [0.2, 2.2, 3.2, 5.5, 7.5, 10.5, 12.8] },
  { name: 'browser', file: 'legacy-exact-browser.yml', times: [1.5, 4, 6.5, 9, 11.5, 14, 16.5, 18.5] },
];

describe.skipIf(!chromiumInstalled() || (!linuxVerification && !update))('1.0.1 legacy threshold-0 frames', () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.name} legacy scenes are pixel exact`, { timeout: 120_000 }, async () => {
      const loaded = loadConfig(path.join(root, 'test', 'fixtures', fixture.file));
      const document = await buildDocument(loaded.config, loaded.baseDir);
      const session = await openRenderSession(document, 'draft');
      try {
        for (const time of fixture.times) {
          await session.seek(time * 1000);
          const actual = PNG.sync.read(await session.screenshot());
          const file = path.join(baselineDir, `${fixture.name}_${time.toFixed(1)}.png`);
          if (update) {
            mkdirSync(baselineDir, { recursive: true });
            writeFileSync(file, PNG.sync.write(actual));
            continue;
          }
          expect(existsSync(file), `missing 1.0.1 Linux baseline ${file}`).toBe(true);
          const expected = PNG.sync.read(readFileSync(file));
          expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
          const diff = pixelmatch(actual.data, expected.data, undefined, actual.width, actual.height, { threshold: 0 });
          expect(diff, `${fixture.name} at ${time}s changed from the 1.0.1 baseline`).toBe(0);
        }
      } finally {
        await session.close();
      }
    });
  }
});
