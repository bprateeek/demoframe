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

describe.skipIf(!chromiumInstalled())('runtime 1.0.1 correctness', () => {
  it('shows a complete first command at t=0.2s after a non-terminal scene', { timeout: 30_000 }, async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'terminal', prompt: '$' },
      scenes: [
        { type: 'steps', duration: 1, items: [{ label: 'Ready', state: 'done' }] },
        { type: 'terminal-playback', duration: 4, command: 'npm test', output: ['passed'] },
      ],
    });
    const session = await openRenderSession(await buildDocument(config, baseDir), 'draft');

    try {
      await session.seek(1200);
      const command = await session.page.evaluate(() => {
        const scene = document.querySelector('[data-scene="1"]') as HTMLElement;
        return {
          prompt: scene.querySelector('.df-term-prompt')?.textContent,
          command: scene.querySelector('.df-play-typed')?.textContent,
        };
      });
      expect(command).toEqual({ prompt: '$', command: 'npm test' });
    } finally {
      await session.close();
    }
  });

  it('shows a complete command at t=0.2s after session: fresh', { timeout: 30_000 }, async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'terminal', prompt: '$' },
      scenes: [
        { type: 'terminal-playback', duration: 3, command: 'npm test', output: ['passed'] },
        { type: 'terminal-playback', duration: 3, command: 'npm run build', output: ['built'] },
        { type: 'terminal-playback', duration: 4, command: 'npm pack', session: 'fresh' },
      ],
    });
    const session = await openRenderSession(await buildDocument(config, baseDir), 'draft');

    try {
      await session.seek(6200);
      const command = await session.page.evaluate(
        () => document.querySelector('[data-scene="2"] .df-play-typed')?.textContent,
      );
      expect(command).toBe('npm pack');
    } finally {
      await session.close();
    }
  });

  it('anchors celebration to a result, clamps it, and hides the check when anchorless', { timeout: 30_000 }, async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'phone' },
      scenes: [
        { type: 'metric-card', duration: 2, metrics: [{ label: 'Tests', value: 254 }] },
        { type: 'hold', duration: 1, celebrate: true },
        { type: 'typing', duration: 2, text: 'No result anchor' },
        { type: 'hold', duration: 1, celebrate: true },
      ],
    });
    const session = await openRenderSession(await buildDocument(config, baseDir), 'draft');

    try {
      await session.seek(2200);
      const anchored = await session.page.evaluate(() => {
        const host = document.querySelector('.df-scenes') as HTMLElement;
        const burst = document.querySelector('.df-celebrate') as HTMLElement;
        const check = burst.querySelector('.df-celebrate-check') as HTMLElement;
        const match = burst.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        return {
          width: host.getBoundingClientRect().width,
          height: host.getBoundingClientRect().height,
          x: Number(match?.[1]),
          y: Number(match?.[2]),
          checkDisplay: check.style.display,
        };
      });
      expect(anchored.checkDisplay).toBe('flex');
      expect(anchored.x).toBeGreaterThanOrEqual(64);
      expect(anchored.x).toBeLessThanOrEqual(anchored.width - 64);
      expect(anchored.y).toBeGreaterThanOrEqual(64);
      expect(anchored.y).toBeLessThanOrEqual(anchored.height - 64);

      await session.seek(5200);
      const anchorlessDisplay = await session.page.evaluate(
        () => (document.querySelector('.df-celebrate-check') as HTMLElement).style.display,
      );
      expect(anchorlessDisplay).toBe('none');
    } finally {
      await session.close();
    }
  });
});
