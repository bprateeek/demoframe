import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runPreview } from './preview.js';

function writeConfig(yaml: string): string {
  const dir = mkdtempSync(path.join(process.env.TMPDIR ?? tmpdir(), 'df-preview-'));
  const file = path.join(dir, 'demo.yml');
  writeFileSync(file, yaml);
  return file;
}

describe('runPreview', () => {
  it('refuses preset-adjusted policy errors before opening Chromium', async () => {
    const file = writeConfig(`
brief:
  mode: user-confirmed
  audience: README visitors
  source: Synthetic transparent demo
  screenshotPolicy: reconstruct
  placement: github-readme
  arc: Ask, work, result
  climax: Final card
output: { format: webp }
frame: { type: phone, outside: transparent }
scenes:
  - { type: typing, duration: 2, text: hi }
`);
    await expect(
      runPreview(file, { out: path.join(path.dirname(file), 'preview'), for: 'x-post' }),
    ).rejects.toThrow(/transparent output is a policy error/);
  });
});
