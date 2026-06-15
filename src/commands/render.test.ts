import { describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveAssetOutTargets, runRender, type PrimaryOutput } from './render.js';

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

  it('refuses preset-adjusted transparent mp4 renders before touching Chromium', async () => {
    const file = writeConfig(`
output: { format: webp }
frame: { type: phone, outside: transparent }
scenes:
  - { type: typing, duration: 2, text: hi }
`);
    await expect(
      runRender(file, { out: path.join(path.dirname(file), 'dist'), keepFrames: false, for: 'x-post' }),
    ).rejects.toThrow(/transparent output is a policy error/);
  });

  it('refuses an incomplete brief under --strict before touching Chromium', async () => {
    const file = writeConfig(`
brief:
  audience: "TODO: who is this for"
  source: "TODO: screenshots / app under demo"
frame: { type: phone }
scenes:
  - { type: typing, duration: 2, text: hi }
`);
    await expect(
      runRender(file, { out: path.join(path.dirname(file), 'dist'), keepFrames: false, strict: true }),
    ).rejects.toThrow(/refusing to render under --strict/);
  });

  it('emits a placement mismatch warning exactly once for multi-preset renders', async () => {
    const file = writeConfig(`
brief:
  audience: README visitors
  source: Synthetic flow from screenshots
  screenshotPolicy: reconstruct
  placement: github-readme
  arc: Ask, work, result
  climax: Final publish card
frame: { type: phone }
scenes:
  - { type: typing, duration: 2, text: hi }
`);
    const lines: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((...args) => {
      lines.push(args.join(' '));
    });
    try {
      await expect(
        runRender(file, {
          out: path.join(path.dirname(file), 'dist'),
          keepFrames: false,
          for: 'x-post,linkedin',
          strict: true,
        }),
      ).rejects.toThrow(/refusing to render under --strict/);
    } finally {
      log.mockRestore();
    }
    expect(lines.filter((line) => line.includes('brief: placement')).length).toBe(1);
  });
});

describe('resolveAssetOutTargets', () => {
  it('treats a single missing target as a file path', () => {
    const dir = mkdtempSync(path.join(process.env.TMPDIR ?? tmpdir(), 'df-asset-'));
    const outputs: PrimaryOutput[] = [{ file: path.join(dir, 'dist', 'demo.webp'), format: 'webp' }];
    expect(resolveAssetOutTargets(path.join(dir, 'docs', 'hero.webp'), outputs)).toEqual([
      { source: outputs[0].file, dest: path.join(dir, 'docs', 'hero.webp') },
    ]);
  });

  it('copies a single output into an existing directory', () => {
    const dir = mkdtempSync(path.join(process.env.TMPDIR ?? tmpdir(), 'df-asset-'));
    const assetDir = path.join(dir, 'docs');
    mkdirSync(assetDir);
    const outputs: PrimaryOutput[] = [{ file: path.join(dir, 'dist', 'demo.gif'), format: 'gif' }];
    expect(resolveAssetOutTargets(assetDir, outputs)).toEqual([
      { source: outputs[0].file, dest: path.join(assetDir, 'demo.gif') },
    ]);
  });

  it('requires a directory target for multiple outputs', () => {
    const dir = mkdtempSync(path.join(process.env.TMPDIR ?? tmpdir(), 'df-asset-'));
    const fileTarget = path.join(dir, 'hero.webp');
    writeFileSync(fileTarget, '');
    const outputs: PrimaryOutput[] = [
      { preset: 'github-readme', file: path.join(dir, 'demo.github-readme.webp'), format: 'webp' },
      { preset: 'product-hunt', file: path.join(dir, 'demo.product-hunt.gif'), format: 'gif' },
    ];
    expect(() => resolveAssetOutTargets(fileTarget, outputs)).toThrow(/must be a directory/);
    expect(resolveAssetOutTargets(path.join(dir, 'assets'), outputs)).toEqual([
      {
        source: outputs[0].file,
        dest: path.join(dir, 'assets', 'demo.github-readme.webp'),
      },
      {
        source: outputs[1].file,
        dest: path.join(dir, 'assets', 'demo.product-hunt.gif'),
      },
    ]);
  });
});
