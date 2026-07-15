import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import { buildDocument } from '../templates/document.js';
import { resolveShotGraph } from './shotGraph.js';

function directConfig() {
  return demoConfigSchema.parse({
    frame: { type: 'browser' },
    output: { fps: 12 },
    shots: [
      {
        id: 'hook',
        beatId: 'hook',
        duration: 2,
        objects: [
          {
            id: 'surface',
            slot: 'hero',
            kind: 'scene',
            scene: { type: 'screen', duration: 2, blocks: [{ block: 'callout', variant: 'message', text: 'Start' }] },
            carry: true,
          },
        ],
        camera: { target: 'surface', move: 'push', amount: 0.05 },
      },
      {
        id: 'payoff',
        beatId: 'payoff',
        duration: 2,
        objects: [
          {
            id: 'result',
            slot: 'supporting',
            kind: 'scene',
            scene: { type: 'status-card', duration: 2, title: 'Done' },
          },
        ],
        camera: { target: 'surface', move: 'pan', amount: 0.08 },
        transition: { type: 'shared-element', duration: 0.4 },
      },
    ],
  });
}

describe('resolved shot graph', () => {
  it('emits single-object metadata without routing legacy scenes through the compositor', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'phone' },
      output: { fps: 15 },
      scenes: [
        { type: 'typing', duration: 2, text: 'hello' },
        { type: 'hold', duration: 1 },
      ],
    });
    const graph = resolveShotGraph(config);
    expect(graph.source).toBe('legacy');
    expect(graph.renderPath).toBe('legacy');
    expect(graph.shots).toHaveLength(2);
    expect(graph.shots.every((shot) => shot.objects.length === 1)).toBe(true);
    expect(graph.shots[1].objects[0].carried).toBe(true);
    expect(graph.duration).toBe(3);

    const document = await buildDocument(config, process.cwd());
    expect(document.html).not.toContain('class="df-compositor"');
    expect(document.html).not.toContain('data-shot-layer=');
    expect(document.html).not.toContain('function seekCompositor');
  });

  it('resolves carry-over, camera targets, timings, and a stable hash deterministically', () => {
    const first = resolveShotGraph(directConfig());
    const second = resolveShotGraph(directConfig());
    expect(first).toEqual(second);
    expect(first.source).toBe('shots');
    expect(first.renderPath).toBe('compositor');
    expect(first.frameCount).toBe(48);
    expect(first.shots[1].objects.map((object) => object.id)).toEqual(['result', 'surface']);
    expect(first.shots[1].objects[1]).toMatchObject({ carried: true, carryFrom: 'hook' });
    expect(first.shots[1].camera?.target).toBe('surface');
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/);

    const changed = directConfig();
    changed.shots![0].duration = 2.1;
    expect(resolveShotGraph(changed).hash).not.toBe(first.hash);
  });

  it('builds a distinct compositor document with stable HTML', async () => {
    const config = directConfig();
    const first = await buildDocument(config, process.cwd());
    const second = await buildDocument(config, process.cwd());
    expect(first.html).toBe(second.html);
    expect(first.html).toContain('class="df-compositor"');
    expect(first.html).toContain('data-shot-layer="hook"');
    expect(first.html).toContain('data-shot-object="payoff:surface"');
    expect(first.html).toContain('shotGraph');
    expect(crypto.createHash('sha256').update(first.html).digest('hex')).toHaveLength(64);
  });
});
