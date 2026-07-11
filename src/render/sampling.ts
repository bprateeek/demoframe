import type { Timeline, TimelineScene } from './timeline.js';
import {
  MOTION_PRESET_NAMES,
  motionPreset,
  isMotionSceneEligible,
  type MotionEasingName,
  type MotionPresetName,
  type MotionWindowName,
} from '../templates/motion/presets.js';


export interface TimelineMotionWindow {
  sceneIndex: number;
  sceneType: TimelineScene['type'];
  // Absent for transition windows, which are not tied to a motion preset.
  preset?: MotionPresetName;
  // 'transition' names a scene-pair window (push/dip); it is deliberately not a
  // MotionWindowName so presets cannot declare one via preset.windows.
  window: MotionWindowName | 'transition';
  start: number;
  end: number;
  easing: MotionEasingName;
}

function clampTimelineTime(timeline: Timeline, time: number): number {
  return Math.max(0, Math.min(timeline.duration, time));
}

function roundTimelineTime(timeline: Timeline, time: number): number {
  return Number(clampTimelineTime(timeline, time).toFixed(3));
}

function uniqueRoundedTimes(times: number[]): number[] {
  return [...new Set(times.map((t) => Math.max(0, t).toFixed(3)))].map(Number);
}

export function previewSampleTimes(timeline: Timeline): number[] {
  const times: number[] = [];
  for (const ts of timeline.scenes) {
    times.push(ts.start + ts.duration * 0.15, ts.start + ts.duration * 0.5, ts.start + ts.duration * 0.9);
    if (ts.data.celebrate) times.push(ts.start + Math.min(0.2, ts.duration * 0.25));
    if (ts.index > 0 && (ts.transition === 'push' || ts.transition === 'dip-to-color')) {
      times.push(ts.start + Math.min(timeline.fade, ts.duration / 2) / 2);
    }
  }
  times.push(Math.max(0, timeline.duration - 0.05));
  return uniqueRoundedTimes(times.map((t) => clampTimelineTime(timeline, t)));
}

function presetNames(name: MotionPresetName | undefined): readonly MotionPresetName[] {
  return name ? [name] : MOTION_PRESET_NAMES;
}

function sceneCinematicMotion(scene: TimelineScene): MotionPresetName | undefined {
  const cinematic = scene.data.cinematic;
  if (!cinematic || typeof cinematic !== 'object') return undefined;
  const motion = (cinematic as { motion?: unknown }).motion;
  return typeof motion === 'string' && MOTION_PRESET_NAMES.includes(motion as MotionPresetName)
    ? (motion as MotionPresetName)
    : undefined;
}

export function motionPeakTimes(timeline: Timeline, presetName?: MotionPresetName): number[] {
  const times: number[] = [];
  for (const scene of timeline.scenes) {
    for (const name of presetNames(presetName)) {
      if (!isMotionSceneEligible(scene.type, name)) continue;
      for (const offset of motionPreset(name).peakSampleOffsets) {
        times.push(scene.start + scene.duration * offset);
      }
    }
  }
  return uniqueRoundedTimes(times.map((t) => clampTimelineTime(timeline, t)));
}

export function timelineMotionWindows(timeline: Timeline, presetName?: MotionPresetName): TimelineMotionWindow[] {
  const windows: TimelineMotionWindow[] = [];
  for (const scene of timeline.scenes) {
    for (const name of presetNames(presetName)) {
      if (!isMotionSceneEligible(scene.type, name)) continue;
      const preset = motionPreset(name);
      for (const [window, spec] of Object.entries(preset.windows) as Array<
        [MotionWindowName, NonNullable<(typeof preset.windows)[MotionWindowName]>]
      >) {
        windows.push({
          sceneIndex: scene.index,
          sceneType: scene.type,
          preset: name,
          window,
          start: roundTimelineTime(timeline, scene.start + scene.duration * spec.start),
          end: roundTimelineTime(timeline, scene.start + scene.duration * spec.end),
          easing: spec.easing,
        });
      }
    }
  }
  return windows;
}

export function timelineTransitionWindows(timeline: Timeline): TimelineMotionWindow[] {
  const windows: TimelineMotionWindow[] = [];
  for (const scene of timeline.scenes) {
    if (scene.index === 0) continue;
    if (scene.transition !== 'push' && scene.transition !== 'dip-to-color') continue;
    const fade = Math.min(timeline.fade, scene.duration / 2);
    windows.push({
      sceneIndex: scene.index,
      sceneType: scene.type,
      window: 'transition',
      start: roundTimelineTime(timeline, scene.start),
      end: roundTimelineTime(timeline, scene.start + fade),
      easing: 'ease-in-out-cubic',
    });
  }
  return windows;
}

export function timelineCinematicMotionWindows(timeline: Timeline): TimelineMotionWindow[] {
  const windows: TimelineMotionWindow[] = [];
  for (const scene of timeline.scenes) {
    const name = sceneCinematicMotion(scene);
    if (!name || !isMotionSceneEligible(scene.type, name)) continue;
    windows.push(...timelineMotionWindows(timeline, name).filter((window) => window.sceneIndex === scene.index));
  }
  return windows;
}
