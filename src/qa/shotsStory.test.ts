import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config/load.js';
import { demoConfigSchema } from '../config/schema.js';
import { runCheckLoaded } from '../commands/check.js';
import { validateStoryV2 } from './story.js';

describe('story v2 direct-shot binding', () => {
  it('binds declared beats, promise, identity, verbatim copy, and proof through shot objects', () => {
    const loaded = loadConfig('examples/shots-compositor/demo.yml');
    const story = validateStoryV2(loaded);
    expect(story.active).toBe(true);
    expect(story.errors).toEqual([]);
    expect(story.proofBindings).toMatchObject([{ evidence: 'release-proof', bound: true }]);
  });

  it('requires story v2 for direct shots even when the legacy brief gate is skipped', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      shots: [{
        id: 'hook', beatId: 'hook', duration: 2,
        objects: [{ id: 'hero', slot: 'hero', kind: 'scene', scene: { type: 'typing', duration: 2, text: 'hello' } }],
      }],
    });
    const loaded = {
      config,
      configPath: '/tmp/direct-shots.yml',
      baseDir: process.cwd(),
      provenance: { suppliedPaths: ['shots'], sourceHash: 'test' },
    };
    const checked = await runCheckLoaded(loaded, { skipBrief: true });
    expect(checked.errors.map((finding) => finding.code)).toContain('shots.storyV2Required');
  });
});
