import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildPreviewCliArgv, buildRenderCliArgv, collectPreviewFiles } from './mcpHelpers.js';

describe('MCP CLI helpers', () => {
  it('builds render argv with CLI parity flags', () => {
    expect(
      buildRenderCliArgv('/bin/demoframe', 'demo.yml', 'dist', {
        destinationPresets: 'github-readme,x-post',
        strict: true,
        allowRawScreenshots: true,
        assetOut: 'docs/demo.webp',
        autonomous: true,
        assumptions: ['No human available'],
        encoderProfile: 'modern',
      }),
    ).toEqual([
      '/bin/demoframe',
      'render',
      'demo.yml',
      '-o',
      'dist',
      '--for',
      'github-readme,x-post',
      '--strict',
      '--allow-raw-screenshots',
      '--asset-out',
      'docs/demo.webp',
      '--encoder-profile',
      'modern',
      '--autonomous',
      '--assumption',
      'No human available',
    ]);
  });

  it('builds preview argv with destination and autonomous flags', () => {
    expect(
      buildPreviewCliArgv('/bin/demoframe', 'demo.yml', 'dist/preview', {
        destinationPresets: 'linkedin',
        noDownload: true,
        autonomous: true,
        assumptions: ['Using inferred brand colors'],
      }),
    ).toEqual([
      '/bin/demoframe',
      'preview',
      'demo.yml',
      '-o',
      'dist/preview',
      '--for',
      'linkedin',
      '--no-download',
      '--autonomous',
      '--assumption',
      'Using inferred brand colors',
    ]);
  });

  it('collects preview files as sorted absolute paths', () => {
    const dir = mkdtempSync(path.join(process.env.TMPDIR ?? tmpdir(), 'df-mcp-preview-'));
    writeFileSync(path.join(dir, 'b.png'), '');
    writeFileSync(path.join(dir, 'a.png'), '');
    expect(collectPreviewFiles(dir)).toEqual([path.join(dir, 'a.png'), path.join(dir, 'b.png')]);
  });
});
