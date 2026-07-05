export const MOTION_SCENE_TYPES = [
  'typing',
  'steps',
  'status-card',
  'terminal-playback',
  'code',
  'chat',
  'metric-card',
  'screen',
  'screenshot',
] as const;

export type MotionSceneType = (typeof MOTION_SCENE_TYPES)[number];

export const MOTION_EASING_NAMES = ['linear', 'ease-out-cubic', 'ease-in-out-cubic'] as const;

export type MotionEasingName = (typeof MOTION_EASING_NAMES)[number];

export type MotionWindowName = 'entrance' | 'settle';

export interface MotionWindowPreset {
  start: number;
  end: number;
  easing: MotionEasingName;
}

export interface MotionWrapperState {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

export interface MotionWrapperTrack {
  from: MotionWrapperState;
  settle: MotionWrapperState;
  to: MotionWrapperState;
}

export interface MotionPreset {
  eligibleSceneTypes: readonly MotionSceneType[];
  windows: Partial<Record<MotionWindowName, MotionWindowPreset>>;
  peakSampleOffsets: readonly number[];
  easing: {
    primary: MotionEasingName;
    secondary?: MotionEasingName;
  };
  wrappers?: {
    scene?: MotionWrapperTrack;
    rail?: MotionWrapperTrack;
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
    wrappers: {
      scene: {
        from: { x: 0, y: 18, scale: 0.985, opacity: 0.94 },
        settle: { x: 0, y: -2, scale: 1.003, opacity: 1 },
        to: { x: 0, y: 0, scale: 1, opacity: 1 },
      },
      rail: {
        from: { x: 0, y: 6, scale: 1, opacity: 1 },
        settle: { x: 0, y: -1, scale: 1, opacity: 1 },
        to: { x: 0, y: 0, scale: 1, opacity: 1 },
      },
    },
  },
  rise: {
    eligibleSceneTypes: ['typing', 'steps', 'status-card', 'code', 'chat', 'metric-card', 'screen'],
    windows: {
      entrance: { start: 0, end: 0.36, easing: 'ease-out-cubic' },
      settle: { start: 0.36, end: 0.64, easing: 'ease-in-out-cubic' },
    },
    peakSampleOffsets: [0.15, 0.42, 0.64],
    easing: { primary: 'ease-out-cubic', secondary: 'ease-in-out-cubic' },
    wrappers: {
      scene: {
        from: { x: 0, y: 28, scale: 0.99, opacity: 0.9 },
        settle: { x: 0, y: -1, scale: 1.001, opacity: 1 },
        to: { x: 0, y: 0, scale: 1, opacity: 1 },
      },
      rail: {
        from: { x: 0, y: 10, scale: 1, opacity: 1 },
        settle: { x: 0, y: -1, scale: 1, opacity: 1 },
        to: { x: 0, y: 0, scale: 1, opacity: 1 },
      },
    },
  },
  drift: {
    // Slow ambient hold: a single full-duration window that never settles, so the
    // scene keeps easing toward its target for the whole shot.
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
      entrance: { start: 0, end: 1, easing: 'linear' },
    },
    peakSampleOffsets: [0.3, 0.85],
    easing: { primary: 'linear' },
    wrappers: {
      scene: {
        from: { x: 0, y: 0, scale: 1, opacity: 1 },
        settle: { x: 0, y: -6, scale: 1.006, opacity: 1 },
        to: { x: 0, y: -6, scale: 1.006, opacity: 1 },
      },
    },
  },
  settle: {
    // A crisper, springier cousin of float-in: a quick overshoot that snaps back.
    eligibleSceneTypes: ['typing', 'steps', 'status-card', 'code', 'chat', 'metric-card', 'screen'],
    windows: {
      entrance: { start: 0, end: 0.32, easing: 'ease-out-cubic' },
      settle: { start: 0.32, end: 0.6, easing: 'ease-in-out-cubic' },
    },
    peakSampleOffsets: [0.16, 0.32, 0.6],
    easing: { primary: 'ease-out-cubic', secondary: 'ease-in-out-cubic' },
    wrappers: {
      scene: {
        from: { x: 0, y: 14, scale: 0.992, opacity: 0.96 },
        settle: { x: 0, y: -3, scale: 1.005, opacity: 1 },
        to: { x: 0, y: 0, scale: 1, opacity: 1 },
      },
    },
  },
  'dolly-in': {
    // Hero reveal: a push-in that keeps creeping forward after the entrance lands.
    eligibleSceneTypes: ['status-card', 'metric-card', 'screen', 'screenshot'],
    windows: {
      entrance: { start: 0, end: 0.45, easing: 'ease-out-cubic' },
      settle: { start: 0.45, end: 1, easing: 'ease-in-out-cubic' },
    },
    peakSampleOffsets: [0.22, 0.45, 0.95],
    easing: { primary: 'ease-out-cubic', secondary: 'ease-in-out-cubic' },
    wrappers: {
      scene: {
        from: { x: 0, y: 10, scale: 0.96, opacity: 0.9 },
        settle: { x: 0, y: 0, scale: 1, opacity: 1 },
        to: { x: 0, y: 0, scale: 1.018, opacity: 1 },
      },
    },
  },
} as const satisfies Record<string, MotionPreset>;

export type MotionPresetName = keyof typeof MOTION_PRESET_REGISTRY;

export const MOTION_PRESET_NAMES = [
  'float-in',
  'rise',
  'drift',
  'settle',
  'dolly-in',
] as const satisfies readonly MotionPresetName[];

export function motionPreset(name: MotionPresetName): MotionPreset {
  return MOTION_PRESET_REGISTRY[name];
}

export function isMotionSceneEligible(sceneType: string, presetName: MotionPresetName): sceneType is MotionSceneType {
  if (sceneType === 'hold') return false;
  return (motionPreset(presetName).eligibleSceneTypes as readonly string[]).includes(sceneType);
}
