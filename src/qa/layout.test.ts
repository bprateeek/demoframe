import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import { chromiumInstalled } from '../env/browser.js';
import { openRenderSession } from '../render/browser.js';
import { buildDocument } from '../templates/document.js';
import { measureLayout } from './layout.js';

describe.skipIf(!chromiumInstalled())('measureLayout motion wrappers', () => {
  it('treats scene and rail motion wrapper transforms as layout-inert', { timeout: 60_000 }, async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      scenes: [
        {
          type: 'status-card',
          duration: 2,
          title: 'Ready for review',
          checks: ['Build passed'],
          cta: { label: 'Merge pull request', style: 'success' },
        },
      ],
    });
    const doc = await buildDocument(config, process.cwd());
    const shiftedDoc = {
      ...doc,
      html: doc.html
        .replace('--df-scene-motion-opacity: 1;', '--df-scene-motion-opacity: 1;\n  --df-scene-motion-x: 900px;')
        .replace('--df-rail-motion-opacity: 1;', '--df-rail-motion-opacity: 1;\n  --df-rail-motion-y: 900px;'),
    };
    const session = await openRenderSession(shiftedDoc, 'draft');
    try {
      await expect(measureLayout(session, doc.timeline)).resolves.toEqual([]);
    } finally {
      await session.close();
    }
  });
});
