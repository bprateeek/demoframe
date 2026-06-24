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

  it('carries tap and celebrate flags into scene data (v0.5)', () => {
    const timeline = resolveTimeline(
      demoConfigSchema.parse({
        frame: { type: 'phone' },
        scenes: [
          { type: 'typing', duration: 3, text: 'hi', send: true, tap: true },
          { type: 'status-card', duration: 2.5, title: 'Done', cta: { label: 'Merge' } },
          { type: 'hold', duration: 1.2, celebrate: true },
        ],
      }),
    );
    expect(timeline.scenes[0].data.tap).toBe(true);
    expect(timeline.scenes[1].data.tap).toBeUndefined();
    expect(timeline.scenes[1].data.celebrate).toBeUndefined();
    expect(timeline.scenes[2].data.celebrate).toBe(true);
    expect(timeline.scenes[2].renderIndex).toBe(1);
  });

  it('carries scene cinematic data without applying runtime effects', () => {
    const timeline = resolveTimeline(
      demoConfigSchema.parse({
        frame: { type: 'phone' },
        scenes: [
          {
            type: 'typing',
            duration: 3,
            text: 'hi',
            cinematic: { composition: 'center-hero', motion: 'float-in' },
          },
          { type: 'steps', duration: 2, items: [{ label: 'done' }] },
        ],
      }),
    );
    expect(timeline.scenes[0].data).toEqual({
      text: 'hi',
      send: false,
      cinematic: { composition: 'center-hero', motion: 'float-in' },
    });
    expect(timeline.scenes[1].data).toEqual({ count: 1 });
  });

  it('resolves top-level cinematic defaults into scene data', () => {
    const timeline = resolveTimeline(
      demoConfigSchema.parse({
        frame: { type: 'phone' },
        cinematic: { composition: 'center-hero', motion: 'float-in' },
        scenes: [
          { type: 'typing', duration: 3, text: 'hi' },
          { type: 'screenshot', duration: 2, src: 'hero.png' },
          { type: 'hold', duration: 1 },
        ],
      }),
    );

    expect(timeline.scenes[0].data).toEqual({
      text: 'hi',
      send: false,
      cinematic: { composition: 'center-hero', motion: 'float-in' },
    });
    expect(timeline.scenes[1].data).toEqual({ pan: 'none' });
    expect(timeline.scenes[2].data).toEqual({});
  });

  it('carries client data for the v0.3 scene types', () => {
    const timeline = resolveTimeline(
      demoConfigSchema.parse({
        frame: { type: 'terminal' },
        scenes: [
          {
            type: 'terminal-playback',
            duration: 6,
            command: 'npm test',
            output: ['ok', { text: 'done', style: 'success' }],
            spinner: 'Running',
            exit: { status: 'success' },
          },
          { type: 'code', duration: 5, code: 'a\nb\nc', reveal: 'fade' },
          {
            type: 'chat',
            duration: 7,
            messages: [
              { role: 'user', text: 'hi' },
              { role: 'assistant', text: 'hello there' },
            ],
          },
          {
            type: 'metric-card',
            duration: 5,
            metrics: [{ label: 'Renders', value: 12840, suffix: 'x', decimals: 1 }],
            chart: { kind: 'bar', series: [1, 2, 3] },
          },
        ],
      }),
    );
    expect(timeline.scenes[0].data).toEqual({ command: 'npm test', lines: 2, spinner: true, exit: true });
    expect(timeline.scenes[1].data).toEqual({ lines: 3, reveal: 'fade' });
    expect(timeline.scenes[2].data).toEqual({
      messages: [
        { role: 'user', length: 2 },
        { role: 'assistant', length: 11 },
      ],
      typingIndicator: true,
    });
    expect(timeline.scenes[3].data).toEqual({
      metrics: [{ value: 12840, decimals: 1, prefix: '', suffix: 'x' }],
      chart: { kind: 'bar', count: 3 },
    });
  });
});
