import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import { resolveTimeline } from './timeline.js';

const config = demoConfigSchema.parse({
  frame: { type: 'phone' },
  scenes: [
    { type: 'typing', duration: 3, text: 'hello' },
    { type: 'steps', duration: 2, items: [{ label: 'one' }] },
    { type: 'hold', duration: 1.5 },
    { type: 'status-card', duration: 2.5, title: 'Done' },
  ],
});

describe('resolveTimeline', () => {
  it('lays out scene start/end times sequentially', () => {
    const timeline = resolveTimeline(config);
    expect(timeline.duration).toBe(9);
    expect(timeline.scenes.map((s) => [s.start, s.end])).toEqual([
      [0, 3],
      [3, 5],
      [5, 6.5],
      [6.5, 9],
    ]);
  });

  it('points hold scenes at the previous renderable scene', () => {
    const timeline = resolveTimeline(config);
    expect(timeline.scenes[2].renderIndex).toBe(1);
    expect(timeline.scenes[3].renderIndex).toBe(3);
  });

  it('computes frame count from fps and duration', () => {
    expect(resolveTimeline(config).frameCount).toBe(135);
    expect(resolveTimeline(config, 12).frameCount).toBe(108);
  });

  it('carries client data per scene type', () => {
    const timeline = resolveTimeline(config);
    expect(timeline.scenes[0].data).toEqual({ text: 'hello', send: false });
    expect(timeline.scenes[1].data).toEqual({ count: 1 });
  });
});
