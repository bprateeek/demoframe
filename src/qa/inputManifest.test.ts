import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config/load.js';
import { createInputManifest, stableStringify } from './inputManifest.js';

describe('input manifest', () => {
  it('stable-stringifies objects independent of key insertion order', () => {
    expect(stableStringify({ b: 2, a: { y: 2, x: 1 } })).toBe(stableStringify({ a: { x: 1, y: 2 }, b: 2 }));
  });

  it('records source/normalized hashes, runtime versions, font hashes, and settings', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'demoframe-input-manifest-'));
    const file = path.join(dir, 'demo.yml');
    writeFileSync(file, 'frame: { type: phone }\nscenes:\n  - { type: typing, duration: 2, text: hi }\n');
    const loaded = loadConfig(file);
    const manifest = createInputManifest(loaded, [{ config: loaded.config }], 'modern');

    expect(manifest.sourceConfigHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(manifest.normalizedConfigHashes[0].hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(manifest.fontHashes.length).toBeGreaterThanOrEqual(6);
    expect(manifest.packageVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.chromiumRevision).not.toBe('');
    expect(manifest.encoderVersions.ffmpeg).toContain('ffmpeg version');
    expect(manifest.outputAffectingSettings.encoderProfile).toBe('modern');
  });
});
