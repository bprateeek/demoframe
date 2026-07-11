import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig, suppliedDotPaths, wasSupplied } from './load.js';

describe('config provenance', () => {
  it('records user-supplied paths before schema defaults and ignores empty objects', () => {
    expect(
      suppliedDotPaths({
        theme: {},
        output: { fps: 12 },
        frame: { type: 'phone' },
        scenes: [{ type: 'typing', duration: 2, text: 'hi', cinematic: {} }],
      }),
    ).toEqual([
      'frame',
      'frame.type',
      'output',
      'output.fps',
      'scenes',
      'scenes[0]',
      'scenes[0].duration',
      'scenes[0].text',
      'scenes[0].type',
    ]);
  });

  it('keeps supplied false, zero, empty string, and non-empty arrays as provenance', () => {
    expect(suppliedDotPaths({ a: false, b: 0, c: '', d: ['x'], e: [] })).toEqual([
      'a',
      'b',
      'c',
      'd',
      'd[0]',
    ]);
  });

  it('attaches a stable source hash and distinguishes supplied values from defaults', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'demoframe-provenance-'));
    const file = path.join(dir, 'demo.yml');
    writeFileSync(file, 'frame: { type: phone }\nscenes:\n  - { type: typing, duration: 2, text: hi }\n');
    const loaded = loadConfig(file);

    expect(loaded.provenance.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(wasSupplied(loaded, 'frame.type')).toBe(true);
    expect(wasSupplied(loaded, 'frame.statusBarTime')).toBe(false);
    expect(wasSupplied(loaded, 'output.fps')).toBe(false);
  });
});
