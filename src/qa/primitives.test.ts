import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config/load.js';
import { SHOT_PRIMITIVE_KINDS } from '../config/schema.js';
import { createRenderContext } from '../render/context.js';
import { buildDocument } from '../templates/document.js';
import { shotObjectTextLeaves } from './sceneText.js';
import { validateStoryV2 } from './story.js';

describe('P4 primitive registry', () => {
  it('registers every primitive with rendering, QA markers, text leaves, and assets', async () => {
    const loaded = loadConfig('examples/primitives/demo.yml');
    const objects = loaded.config.shots!.flatMap((shot) => shot.objects);
    expect(new Set(objects.filter((object) => object.kind !== 'scene').map((object) => object.kind)))
      .toEqual(new Set(SHOT_PRIMITIVE_KINDS));

    const leaves = objects.flatMap((object) => shotObjectTextLeaves(object));
    expect(leaves.map((leaf) => leaf.text)).toEqual(expect.arrayContaining([
      'See every service recover in one clear view.', 'Pulseboard', '99.99%', 'All services healthy',
    ]));

    const context = createRenderContext(loaded.config, loaded.baseDir, loaded.configPath);
    expect(context.assets.entries().map((entry) => entry.kind)).toEqual(expect.arrayContaining(['image', 'logo']));

    const document = await buildDocument(loaded.config, context);
    expect(crypto.createHash('sha256').update(document.html).digest('hex'))
      .toBe('6add2b73e61c7b817afd8aa97624d22e7be9fe735fff5cc260337df10ad3dc64');
    for (const kind of SHOT_PRIMITIVE_KINDS) expect(document.html).toContain(`data-primitive="${kind}"`);
    expect(document.html).toContain('data-qa-key="kinetic-copy"');
    expect(document.html).toContain('data-qa-key="surface-row-0"');
    expect(document.html).toContain('data-qa-key="hero-metric"');
    expect(document.html).toContain('data-qa-key="image-object"');
  });

  it('uses a manifest-backed lockup as identity and rejects the wrong asset reference', () => {
    const loaded = loadConfig('examples/primitives/demo.yml');
    expect(validateStoryV2(loaded).errors).toEqual([]);
    const lockup = loaded.config.shots![3].objects.find((object) => object.kind === 'logo-lockup');
    if (!lockup || lockup.kind !== 'logo-lockup') throw new Error('example lockup missing');
    lockup.manifestRef = 'recovery-promise';
    expect(validateStoryV2(loaded).errors.map((finding) => finding.code)).toContain('story.logoLockup.asset');
  });
});
