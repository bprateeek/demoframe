import { describe, expect, it } from 'vitest';
import { chromiumInstalled } from '../env/browser.js';
import { openRenderSession } from '../render/browser.js';
import { demoConfigSchema } from '../config/schema.js';
import { buildDocument } from './document.js';

const baseDir = process.cwd();

describe.skipIf(!chromiumInstalled())('runtime cinematic motion', () => {
  it('applies float-in only through motion wrapper CSS variables', { timeout: 30_000 }, async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      scenes: [
        {
          type: 'steps',
          duration: 3,
          cinematic: { motion: 'float-in' },
          items: [{ label: 'Verify wrapper motion', state: 'active' }],
        },
      ],
    });
    const doc = await buildDocument(config, baseDir);
    const session = await openRenderSession(doc, 'draft');

    try {
      await session.seek(1200);
      const active = await session.page.evaluate(() => {
        const root = document.querySelector('[data-scene="0"]') as HTMLElement;
        const sceneMotion = root.querySelector('.df-scene-motion') as HTMLElement;
        const railMotion = root.querySelector('.df-rail-motion') as HTMLElement;
        const step = root.querySelector('[data-step="0"]') as HTMLElement;
        return {
          sceneY: sceneMotion.style.getPropertyValue('--df-scene-motion-y'),
          sceneScale: sceneMotion.style.getPropertyValue('--df-scene-motion-scale'),
          railY: railMotion.style.getPropertyValue('--df-rail-motion-y'),
          sceneTransform: sceneMotion.style.transform,
          railTransform: railMotion.style.transform,
          stepTransform: step.style.transform,
        };
      });

      expect(active.sceneY).not.toBe('0.000px');
      expect(active.sceneScale).not.toBe('1.0000');
      expect(active.railY).not.toBe('0.000px');
      expect(active.sceneTransform).toBe('');
      expect(active.railTransform).toBe('');
      expect(active.stepTransform).toContain('translateY(');

      await session.seek(2900);
      const settled = await session.page.evaluate(() => {
        const root = document.querySelector('[data-scene="0"]') as HTMLElement;
        const sceneMotion = root.querySelector('.df-scene-motion') as HTMLElement;
        const railMotion = root.querySelector('.df-rail-motion') as HTMLElement;
        return {
          sceneY: sceneMotion.style.getPropertyValue('--df-scene-motion-y'),
          sceneScale: sceneMotion.style.getPropertyValue('--df-scene-motion-scale'),
          railY: railMotion.style.getPropertyValue('--df-rail-motion-y'),
        };
      });

      expect(settled).toEqual({
        sceneY: '0.000px',
        sceneScale: '1.0000',
        railY: '0.000px',
      });
    } finally {
      await session.close();
    }
  });

  it('keeps wrapper variables at identity without cinematic motion', { timeout: 30_000 }, async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      scenes: [{ type: 'typing', duration: 3, text: 'No cinematic fields' }],
    });
    const doc = await buildDocument(config, baseDir);
    const session = await openRenderSession(doc, 'draft');

    try {
      await session.seek(1200);
      const vars = await session.page.evaluate(() => {
        const root = document.querySelector('[data-scene="0"]') as HTMLElement;
        const sceneMotion = root.querySelector('.df-scene-motion') as HTMLElement;
        const railMotion = root.querySelector('.df-rail-motion') as HTMLElement;
        return {
          sceneX: sceneMotion.style.getPropertyValue('--df-scene-motion-x'),
          sceneY: sceneMotion.style.getPropertyValue('--df-scene-motion-y'),
          sceneScale: sceneMotion.style.getPropertyValue('--df-scene-motion-scale'),
          sceneOpacity: sceneMotion.style.getPropertyValue('--df-scene-motion-opacity'),
          railX: railMotion.style.getPropertyValue('--df-rail-motion-x'),
          railY: railMotion.style.getPropertyValue('--df-rail-motion-y'),
          railScale: railMotion.style.getPropertyValue('--df-rail-motion-scale'),
          railOpacity: railMotion.style.getPropertyValue('--df-rail-motion-opacity'),
        };
      });

      expect(vars).toEqual({
        sceneX: '0.000px',
        sceneY: '0.000px',
        sceneScale: '1.0000',
        sceneOpacity: '1.0000',
        railX: '0.000px',
        railY: '0.000px',
        railScale: '1.0000',
        railOpacity: '1.0000',
      });
    } finally {
      await session.close();
    }
  });
});
