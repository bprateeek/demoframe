import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runRender } from './render.js';

function writeConfig(yaml: string): string {
  const dir = mkdtempSync(path.join(process.env.TMPDIR ?? tmpdir(), 'df-render-'));
  const file = path.join(dir, 'demo.yml');
  writeFileSync(file, yaml);
  return file;
}

describe('runRender guardrail', () => {
  it('refuses to render a frameless all-screenshot demo before touching Chromium', async () => {
    const file = writeConfig(`
frame: { type: none }
scenes:
  - { type: screenshot, duration: 2, src: a.png }
  - { type: screenshot, duration: 2, src: b.png }
`);
    await expect(
      runRender(file, { out: path.join(path.dirname(file), 'dist'), keepFrames: false }),
    ).rejects.toThrow(/refusing to render/);
  });
});
