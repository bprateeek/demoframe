import type { DemoConfig, Frame, SceneFrameOverride } from '../config/schema.js';

export function mergeFrame(frame: Frame, override: SceneFrameOverride | undefined): Frame {
  if (!override) return frame;
  return { ...frame, ...override } as Frame;
}

export function sceneFrame(config: DemoConfig, sceneIndex: number): Frame {
  return mergeFrame(config.frame, config.scenes[sceneIndex]?.frame);
}

export function renderFrame(config: DemoConfig, renderIndex: number): Frame {
  return sceneFrame(config, renderIndex);
}

export function chromeSignature(frame: Frame): string {
  switch (frame.type) {
    case 'phone':
      return JSON.stringify({
        type: frame.type,
        title: frame.title ?? '',
        subtitle: frame.subtitle ?? '',
        statusBarTime: frame.statusBarTime,
      });
    case 'browser':
      return JSON.stringify({
        type: frame.type,
        title: frame.title ?? '',
        url: frame.url ?? '',
        chrome: frame.chrome,
      });
    case 'terminal':
      return JSON.stringify({
        type: frame.type,
        title: frame.title ?? '',
      });
    case 'desktop':
      return JSON.stringify({
        type: frame.type,
        title: frame.title ?? '',
        subtitle: frame.subtitle ?? '',
      });
    case 'none':
      return JSON.stringify({ type: frame.type });
  }
}

