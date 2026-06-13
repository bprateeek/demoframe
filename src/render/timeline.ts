import { normalizeTermLines, type DemoConfig, type Scene } from '../config/schema.js';
import { chromeSignature, renderFrame } from './chrome.js';

export interface TimelineScene {
  index: number;
  type: Scene['type'];
  name?: string;
  start: number;
  end: number;
  duration: number;
  renderIndex: number;
  chromeLayer: number;
  transition: 'cut' | 'crossfade';
  data: Record<string, unknown>;
}

export interface Timeline {
  duration: number;
  fps: number;
  frameCount: number;
  fade: number;
  scenes: TimelineScene[];
}

function clientData(scene: Scene): Record<string, unknown> {
  switch (scene.type) {
    case 'typing':
      return { text: scene.text, send: scene.send };
    case 'steps':
      return { count: scene.items.length };
    case 'status-card':
      return { checks: scene.checks.length };
    case 'screenshot':
      return { pan: scene.pan };
    case 'terminal-playback':
      return {
        command: scene.command,
        lines: normalizeTermLines(scene.output).length,
        spinner: Boolean(scene.spinner),
        exit: Boolean(scene.exit),
      };
    case 'code':
      return { lines: scene.code.split('\n').length, reveal: scene.reveal };
    case 'chat':
      return {
        messages: scene.messages.map((m) => ({ role: m.role, length: m.text.length })),
        typingIndicator: scene.typingIndicator,
      };
    case 'metric-card':
      return {
        metrics: scene.metrics.map((m) => ({
          value: m.value,
          decimals: m.decimals,
          prefix: m.prefix ?? '',
          suffix: m.suffix ?? '',
        })),
        chart: scene.chart ? { kind: scene.chart.kind, count: scene.chart.series.length } : null,
      };
    case 'screen': {
      const focusIndex = scene.focus ? scene.blocks.findIndex((block) => block.name === scene.focus) : -1;
      return {
        motion: scene.motion,
        focusIndex: focusIndex >= 0 ? focusIndex : null,
        blocks: scene.blocks.map((block) => ({ block: block.block })),
      };
    }
    case 'hold':
      return {};
  }
}

export function resolveTimeline(config: DemoConfig, fpsOverride?: number): Timeline {
  const fps = fpsOverride ?? config.output.fps;
  let cursor = 0;
  const scenes: TimelineScene[] = config.scenes.map((scene, index) => {
    const start = cursor;
    cursor += scene.duration;
    return {
      index,
      type: scene.type,
      ...(scene.name ? { name: scene.name } : {}),
      start,
      end: cursor,
      duration: scene.duration,
      renderIndex: index,
      chromeLayer: 0,
      transition: scene.transition,
      data: {
        ...clientData(scene),
        ...(scene.celebrate ? { celebrate: true } : {}),
        ...('tap' in scene && scene.tap ? { tap: true } : {}),
      },
    };
  });
  for (const ts of scenes) {
    let r = ts.index;
    while (r > 0 && scenes[r].type === 'hold') r -= 1;
    ts.renderIndex = r;
  }
  const chromeLayers = new Map<string, number>();
  for (const ts of scenes) {
    const signature = chromeSignature(renderFrame(config, ts.renderIndex));
    let layer = chromeLayers.get(signature);
    if (layer === undefined) {
      layer = chromeLayers.size;
      chromeLayers.set(signature, layer);
    }
    ts.chromeLayer = layer;
  }
  const duration = cursor;
  return {
    duration,
    fps,
    frameCount: Math.max(1, Math.round(duration * fps)),
    fade: 0.45,
    scenes,
  };
}
