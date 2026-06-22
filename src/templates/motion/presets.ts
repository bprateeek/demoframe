import type { Scene } from '../../config/schema.js';

export type MotionSceneType = Exclude<Scene['type'], 'hold'>;

export const MOTION_EASING_NAMES = ['linear', 'ease-out-cubic', 'ease-in-out-cubic'] as const;

export type MotionEasingName = (typeof MOTION_EASING_NAMES)[number];

export type MotionWindowName = 'entrance' | 'settle';

export interface MotionWindowPreset {
  start: number;
  end: number;
  easing: MotionEasingName;
}

export interface MotionPreset {
  eligibleSceneTypes: readonly MotionSceneType[];
  windows: Partial<Record<MotionWindowName, MotionWindowPreset>>;
  peakSampleOffsets: readonly number[];
  easing: {
    primary: MotionEasingName;
    secondary?: MotionEasingName;
  };
}

export const MOTION_PRESET_REGISTRY = {
  'float-in': {
    eligibleSceneTypes: [
      'typing',
      'steps',
      'status-card',
      'terminal-playback',
      'code',
      'chat',
      'metric-card',
      'screen',
    ],
    windows: {
      entrance: { start: 0, end: 0.42, easing: 'ease-out-cubic' },
      settle: { start: 0.42, end: 0.72, easing: 'ease-in-out-cubic' },
    },
    peakSampleOffsets: [0.18, 0.42, 0.72],
    easing: { primary: 'ease-out-cubic', secondary: 'ease-in-out-cubic' },
  },
  rise: {
    eligibleSceneTypes: ['typing', 'steps', 'status-card', 'code', 'chat', 'metric-card', 'screen'],
    windows: {
      entrance: { start: 0, end: 0.36, easing: 'ease-out-cubic' },
      settle: { start: 0.36, end: 0.64, easing: 'ease-in-out-cubic' },
    },
    peakSampleOffsets: [0.15, 0.42, 0.64],
    easing: { primary: 'ease-out-cubic', secondary: 'ease-in-out-cubic' },
  },
} as const satisfies Record<string, MotionPreset>;

export type MotionPresetName = keyof typeof MOTION_PRESET_REGISTRY;

export const MOTION_PRESET_NAMES = Object.keys(MOTION_PRESET_REGISTRY) as MotionPresetName[];

export function motionPreset(name: MotionPresetName): MotionPreset {
  return MOTION_PRESET_REGISTRY[name];
}

export function isMotionSceneEligible(sceneType: Scene['type'], presetName: MotionPresetName): sceneType is MotionSceneType {
  if (sceneType === 'hold') return false;
  return motionPreset(presetName).eligibleSceneTypes.includes(sceneType);
}
