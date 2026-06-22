import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from './schema.js';
import { applyPreset, PRESET_NAMES, PRESETS } from './presets.js';
import { ConfigError } from './load.js';

const parse = (output: Record<string, unknown> = {}) =>
  demoConfigSchema.parse({
    output,
    frame: { type: 'phone' },
    scenes: [{ type: 'typing', duration: 3, text: 'hello' }],
  });

describe('applyPreset', () => {
  it('overrides every differing output field and lists the changes', () => {
    const { config, changes } = applyPreset(
      parse({ format: 'gif', width: 480, fps: 15, motionBlur: 'cinematic' }),
      'x-post',
    );
    expect(config.output).toMatchObject({ format: 'mp4', width: 1080, fps: 30, budget: '15MB', quality: 'high' });
    expect(config.output.motionBlur).toBe('cinematic');
    expect(changes).toEqual([
      'output.format: gif -> mp4',
      'output.width: 480 -> 1080',
      'output.fps: 15 -> 30',
      'output.budget: 5MB -> 15MB',
      'output.quality: standard -> high',
    ]);
  });

  it('never changes motionBlur when applying destination presets', () => {
    expect(applyPreset(parse({ motionBlur: 'off' }), 'product-hunt').config.output.motionBlur).toBe('off');
    expect(applyPreset(parse({ motionBlur: 'force' }), 'github-readme').config.output.motionBlur).toBe('force');
  });

  it('reports no changes when the config already matches', () => {
    const { changes } = applyPreset(
      parse({ format: 'webp', width: 640, fps: 15, budget: '4MB', quality: 'standard' }),
      'github-readme',
    );
    expect(changes).toEqual([]);
  });

  it('collapses format lists and reports them', () => {
    const { config, changes } = applyPreset(parse({ format: ['gif', 'mp4'] }), 'github-readme');
    expect(config.output.format).toBe('webp');
    expect(changes).toContain('output.format: gif+mp4 -> webp');
  });

  it('treats equivalent budgets as unchanged', () => {
    const { changes } = applyPreset(
      parse({ format: 'gif', width: 1200, fps: 12, budget: 3 * 1024 * 1024, quality: 'standard' }),
      'product-hunt',
    );
    expect(changes).toEqual([]);
  });

  it('does not mutate the input config', () => {
    const input = parse();
    applyPreset(input, 'x-post');
    expect(input.output.format).toBe('gif');
  });

  it('rejects unknown presets listing valid names', () => {
    expect(() => applyPreset(parse(), 'tiktok')).toThrow(ConfigError);
    expect(() => applyPreset(parse(), 'tiktok')).toThrow(/github-readme, x-post, linkedin, product-hunt/);
  });

  it('keeps preset values inside schema bounds', () => {
    for (const name of PRESET_NAMES) {
      const preset = PRESETS[name];
      const config = demoConfigSchema.parse({
        output: { ...preset },
        frame: { type: 'phone' },
        scenes: [{ type: 'typing', duration: 3, text: 'hello' }],
      });
      expect(config.output.width).toBe(preset.width);
    }
  });
});
