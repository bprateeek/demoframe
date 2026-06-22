import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import {
  MOTION_EASING_NAMES,
  MOTION_PRESET_NAMES,
  MOTION_PRESET_REGISTRY,
  type MotionPresetName,
} from '../templates/motion/presets.js';
import { motionPeakTimes, previewSampleTimes, timelineMotionWindows } from './sampling.js';
import { resolveTimeline } from './timeline.js';

describe('previewSampleTimes', () => {
  it('preserves regular scene, tap, celebrate, and final preview samples', () => {
    const timeline = resolveTimeline(
      demoConfigSchema.parse({
        frame: { type: 'phone' },
        scenes: [
          { type: 'typing', duration: 4, text: 'hello', send: true, tap: true },
          { type: 'steps', duration: 2, items: [{ label: 'one' }] },
          { type: 'hold', duration: 1, celebrate: true },
        ],
      }),
    );

    expect(previewSampleTimes(timeline)).toEqual([
      0.6,
      2,
      3.6,
      3.76,
      4.3,
      5,
      5.8,
      6.15,
      6.5,
      6.9,
      6.2,
      6.95,
    ]);
  });
});

describe('motion preset sampling', () => {
  it('keeps the scoped preset names in one registry', () => {
    expect(MOTION_PRESET_NAMES).toEqual(['float-in', 'rise']);
  });

  it('keeps registry offsets and windows inside normalized timeline bounds', () => {
    for (const preset of Object.values(MOTION_PRESET_REGISTRY)) {
      for (const offset of preset.peakSampleOffsets) {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(1);
      }
      for (const window of Object.values(preset.windows)) {
        expect(window.start).toBeGreaterThanOrEqual(0);
        expect(window.end).toBeLessThanOrEqual(1);
        expect(window.start).toBeLessThanOrEqual(window.end);
        expect(MOTION_EASING_NAMES).toContain(window.easing);
      }
    }
  });

  it('derives peak times from registry offsets', () => {
    const timeline = resolveTimeline(
      demoConfigSchema.parse({
        frame: { type: 'browser' },
        scenes: [{ type: 'typing', duration: 10, text: 'Launch' }],
      }),
    );
    const presetName: MotionPresetName = 'float-in';

    expect(motionPeakTimes(timeline, presetName)).toEqual(
      MOTION_PRESET_REGISTRY[presetName].peakSampleOffsets.map((offset) => Number((offset * 10).toFixed(3))),
    );
  });

  it('samples all eligible presets by default and de-dupes overlapping peaks', () => {
    const timeline = resolveTimeline(
      demoConfigSchema.parse({
        frame: { type: 'browser' },
        scenes: [{ type: 'typing', duration: 10, text: 'Launch' }],
      }),
    );

    expect(motionPeakTimes(timeline)).toEqual([1.8, 4.2, 7.2, 1.5, 6.4]);
  });

  it('filters ineligible scenes out of preset-derived samples and windows', () => {
    const timeline = resolveTimeline(
      demoConfigSchema.parse({
        frame: { type: 'browser' },
        scenes: [{ type: 'screenshot', duration: 5, src: 'test/golden/hero_2.5.png' }],
      }),
    );

    expect(motionPeakTimes(timeline, 'rise')).toEqual([]);
    expect(timelineMotionWindows(timeline, 'rise')).toEqual([]);
  });

  it('derives timeline windows from registry windows', () => {
    const timeline = resolveTimeline(
      demoConfigSchema.parse({
        frame: { type: 'browser' },
        scenes: [
          { type: 'typing', duration: 5, text: 'Launch' },
          { type: 'screenshot', duration: 5, src: 'test/golden/hero_2.5.png' },
        ],
      }),
    );

    expect(timelineMotionWindows(timeline, 'rise')).toEqual([
      {
        sceneIndex: 0,
        sceneType: 'typing',
        preset: 'rise',
        window: 'entrance',
        start: 0,
        end: 1.8,
        easing: 'ease-out-cubic',
      },
      {
        sceneIndex: 0,
        sceneType: 'typing',
        preset: 'rise',
        window: 'settle',
        start: 1.8,
        end: 3.2,
        easing: 'ease-in-out-cubic',
      },
    ]);
  });
});
