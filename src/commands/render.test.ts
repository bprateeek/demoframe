import { describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { demoConfigSchema, resolveFrameCapture } from '../config/schema.js';
import {
  renderInputKey,
  resolveAssetOutTargets,
  resolveReportCinematic,
  resolveReportMotionBlur,
  runRender,
  type PrimaryOutput,
} from './render.js';

function writeConfig(yaml: string): string {
  const dir = mkdtempSync(path.join(process.env.TMPDIR ?? tmpdir(), 'df-render-'));
  const file = path.join(dir, 'demo.yml');
  writeFileSync(file, yaml);
  return file;
}

describe('runRender guardrail', () => {
  it('refuses to render a frameless all-screenshot demo before touching Chromium', async () => {
    const file = writeConfig(`
brief:
  mode: user-confirmed
  audience: README visitors
  source: Raw screenshots used for a guardrail test
  screenshotPolicy: reconstruct
  placement: github-readme
  arc: Screenshot gallery
  climax: Rejection
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
      runRender(file, { out: path.join(path.dirname(file), 'dist'), keepFrames: false, for: 'x-post' }),
    ).rejects.toThrow(/transparent output is a policy error/);
  });

  it('refuses an incomplete brief before touching Chromium', async () => {
    const file = writeConfig(`
brief:
  mode: user-confirmed
  audience: "TODO: who is this for"
  source: "TODO: screenshots / app under demo"
frame: { type: phone }
scenes:
  - { type: typing, duration: 2, text: hi }
`);
    await expect(
      runRender(file, { out: path.join(path.dirname(file), 'dist'), keepFrames: false }),
    ).rejects.toThrow(/brief interview is not user-confirmed/);
  });

  it('emits a placement mismatch warning exactly once for multi-preset renders', async () => {
    const file = writeConfig(`
brief:
  mode: user-confirmed
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

  it('refuses forced GIF motion blur under strict warning policy before rendering', async () => {
    const file = writeConfig(`
brief:
  mode: user-confirmed
  audience: README visitors
  source: Synthetic flow
  screenshotPolicy: reconstruct
  placement: github-readme
  arc: Ask, work, result
  climax: Final card
output: { format: gif, motionBlur: force }
frame: { type: phone }
scenes:
  - { type: status-card, duration: 2, title: Done }
`);
    await expect(
      runRender(file, {
        out: path.join(path.dirname(file), 'dist'),
        keepFrames: false,
        strict: true,
      }),
    ).rejects.toThrow(/refusing to render under --strict/);
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

describe('resolveReportCinematic', () => {
  it('reports ember ambient as timeline-wide when any scene opts in', () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      scenes: [
        { type: 'typing', duration: 2, text: 'ship it' },
        { type: 'status-card', duration: 2, title: 'Ready', cinematic: { ambient: 'ember' } },
      ],
    });

    expect(resolveReportCinematic(config)).toEqual({
      ambient: { type: 'ember', scope: 'timeline' },
    });
  });

  it('omits cinematic report semantics when ambient is absent', () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      scenes: [{ type: 'typing', duration: 2, text: 'ship it' }],
    });

    expect(resolveReportCinematic(config)).toBeUndefined();
  });
});

describe('resolveReportMotionBlur', () => {
  it('records cinematic GIF skips and force GIF capture policy', () => {
    const cinematic = demoConfigSchema.parse({
      output: { format: ['gif', 'mp4'], motionBlur: 'cinematic' },
      frame: { type: 'browser' },
      scenes: [{ type: 'status-card', duration: 2, title: 'Done' }],
    });
    const forced = demoConfigSchema.parse({
      output: { format: 'gif', motionBlur: 'force' },
      frame: { type: 'browser' },
      scenes: [{ type: 'status-card', duration: 2, title: 'Done' }],
    });

    expect(resolveReportMotionBlur([{ config: cinematic }])).toEqual({
      requested: 'cinematic',
      outputs: [
        {
          format: 'gif',
          motionBlur: 'cinematic',
          captureMode: 'directCapture',
          policy: 'gif-cinematic-skip',
        },
        {
          format: 'mp4',
          motionBlur: 'cinematic',
          captureMode: 'blurredCapture',
          policy: 'cinematic',
        },
      ],
    });
    expect(resolveReportMotionBlur([{ preset: 'product-hunt', config: forced }])).toEqual({
      requested: 'force',
      outputs: [
        {
          preset: 'product-hunt',
          format: 'gif',
          motionBlur: 'force',
          captureMode: 'blurredCapture',
          policy: 'gif-force',
        },
      ],
    });
  });
});

describe('renderInputKey', () => {
  it('separates cache entries by requested format and effective capture mode', () => {
    const config = demoConfigSchema.parse({
      output: { format: ['gif', 'mp4'], motionBlur: 'cinematic' },
      frame: { type: 'phone' },
      scenes: [{ type: 'typing', duration: 3, text: 'hello' }],
    });

    const gifCapture = resolveFrameCapture(config.output, 'gif');
    const mp4Capture = resolveFrameCapture(config.output, 'mp4');
    expect(gifCapture.mode).toBe('directCapture');
    expect(mp4Capture.mode).toBe('blurredCapture');
    expect(renderInputKey(config, '/demo', 15, gifCapture)).not.toBe(
      renderInputKey(config, '/demo', 15, mp4Capture),
    );
  });

  it('separates off and future blur modes even when other render inputs match', () => {
    const base = {
      frame: { type: 'phone' },
      scenes: [{ type: 'typing', duration: 3, text: 'hello' }],
    } as const;
    const off = demoConfigSchema.parse({ ...base, output: { format: 'mp4' } });
    const forced = demoConfigSchema.parse({ ...base, output: { format: 'mp4', motionBlur: 'force' } });

    expect(renderInputKey(off, '/demo', 15, resolveFrameCapture(off.output, 'mp4'))).not.toBe(
      renderInputKey(forced, '/demo', 15, resolveFrameCapture(forced.output, 'mp4')),
    );
  });

  it('separates cinematic and forced GIF capture entries', () => {
    const base = {
      frame: { type: 'phone' },
      scenes: [{ type: 'status-card', duration: 3, title: 'Done' }],
    } as const;
    const cinematic = demoConfigSchema.parse({ ...base, output: { format: 'gif', motionBlur: 'cinematic' } });
    const forced = demoConfigSchema.parse({ ...base, output: { format: 'gif', motionBlur: 'force' } });

    expect(resolveFrameCapture(cinematic.output, 'gif').mode).toBe('directCapture');
    expect(resolveFrameCapture(forced.output, 'gif').mode).toBe('blurredCapture');
    expect(renderInputKey(cinematic, '/demo', 15, resolveFrameCapture(cinematic.output, 'gif'))).not.toBe(
      renderInputKey(forced, '/demo', 15, resolveFrameCapture(forced.output, 'gif')),
    );
  });
});
