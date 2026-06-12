import { describe, expect, it } from 'vitest';
import {
  budgetToBytes,
  demoConfigSchema,
  frameViewport,
  normalizeLogo,
  normalizeTermLines,
  outputFormats,
} from './schema.js';

const minimal = {
  frame: { type: 'phone' },
  scenes: [{ type: 'typing', duration: 3, text: 'hello' }],
};

describe('demoConfigSchema', () => {
  it('applies defaults', () => {
    const config = demoConfigSchema.parse(minimal);
    expect(config.output.format).toBe('gif');
    expect(config.output.width).toBe(480);
    expect(config.output.fps).toBe(15);
    expect(config.theme.mode).toBeUndefined();
    expect(config.theme.font).toBe('inter');
    expect(config.scenes[0].transition).toBe('cut');
  });

  it('rejects a hold scene in first position', () => {
    const result = demoConfigSchema.safeParse({
      ...minimal,
      scenes: [{ type: 'hold', duration: 2 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects demos over 60 seconds', () => {
    const result = demoConfigSchema.safeParse({
      ...minimal,
      scenes: Array.from({ length: 4 }, () => ({ type: 'typing', duration: 20, text: 'x' })),
    });
    expect(result.success).toBe(false);
  });

  it('enforces scene text limits', () => {
    const result = demoConfigSchema.safeParse({
      ...minimal,
      scenes: [{ type: 'typing', duration: 3, text: 'x'.repeat(500) }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown frame types', () => {
    const result = demoConfigSchema.safeParse({ ...minimal, frame: { type: 'tablet' } });
    expect(result.success).toBe(false);
  });

  it('accepts a single format or a list, rejects the removed "both"', () => {
    expect(demoConfigSchema.parse({ ...minimal, output: { format: 'webp' } }).output.format).toBe('webp');
    expect(
      demoConfigSchema.parse({ ...minimal, output: { format: ['webp', 'mp4'] } }).output.format,
    ).toEqual(['webp', 'mp4']);
    expect(demoConfigSchema.safeParse({ ...minimal, output: { format: 'both' } }).success).toBe(false);
    expect(demoConfigSchema.safeParse({ ...minimal, output: { format: [] } }).success).toBe(false);
  });

  it('accepts webm alone and in lists', () => {
    expect(demoConfigSchema.parse({ ...minimal, output: { format: 'webm' } }).output.format).toBe('webm');
    expect(
      demoConfigSchema.parse({ ...minimal, output: { format: ['webm', 'mp4'] } }).output.format,
    ).toEqual(['webm', 'mp4']);
  });

  it('accepts a minimal terminal-playback scene with string and styled output lines', () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'terminal' },
      scenes: [
        {
          type: 'terminal-playback',
          duration: 6,
          command: 'npx demoframe render demo.yml',
          output: ['rendering 90 frames...', { text: 'done', style: 'success' }],
          spinner: 'Rendering',
          exit: { status: 'success', label: 'done in 4.2s' },
        },
      ],
    });
    const scene = config.scenes[0];
    if (scene.type !== 'terminal-playback') throw new Error('wrong type');
    expect(normalizeTermLines(scene.output)).toEqual([
      { text: 'rendering 90 frames...', style: 'normal' },
      { text: 'done', style: 'success' },
    ]);
  });

  it('rejects terminal-playback with too many output lines', () => {
    const result = demoConfigSchema.safeParse({
      frame: { type: 'terminal' },
      scenes: [
        {
          type: 'terminal-playback',
          duration: 6,
          command: 'ls',
          output: Array.from({ length: 11 }, () => 'line'),
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a code scene and applies defaults', () => {
    const config = demoConfigSchema.parse({
      ...minimal,
      scenes: [{ type: 'code', duration: 5, code: 'const x = 1;' }],
    });
    const scene = config.scenes[0];
    if (scene.type !== 'code') throw new Error('wrong type');
    expect(scene.lang).toBe('text');
    expect(scene.reveal).toBe('lines');
    expect(scene.added).toEqual([]);
  });

  it('rejects code with marks out of range or overlapping', () => {
    const base = { ...minimal };
    expect(
      demoConfigSchema.safeParse({
        ...base,
        scenes: [{ type: 'code', duration: 5, code: 'a\nb', added: [3] }],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        ...base,
        scenes: [{ type: 'code', duration: 5, code: 'a\nb', added: [1], removed: [1] }],
      }).success,
    ).toBe(false);
  });

  it('rejects code that is too tall or too wide', () => {
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [{ type: 'code', duration: 5, code: Array.from({ length: 25 }, () => 'x').join('\n') }],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [{ type: 'code', duration: 5, code: 'y'.repeat(101) }],
      }).success,
    ).toBe(false);
  });

  it('accepts a chat scene and rejects more than six messages', () => {
    const config = demoConfigSchema.parse({
      ...minimal,
      scenes: [
        {
          type: 'chat',
          duration: 7,
          messages: [
            { role: 'user', text: 'Can you fix the failing test?' },
            { role: 'assistant', text: 'Found it. All green.' },
          ],
        },
      ],
    });
    const scene = config.scenes[0];
    if (scene.type !== 'chat') throw new Error('wrong type');
    expect(scene.typingIndicator).toBe(true);
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [
          {
            type: 'chat',
            duration: 7,
            messages: Array.from({ length: 7 }, () => ({ role: 'user', text: 'hi' })),
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('accepts a metric-card scene and validates chart label count', () => {
    const config = demoConfigSchema.parse({
      ...minimal,
      scenes: [
        {
          type: 'metric-card',
          duration: 5,
          metrics: [{ label: 'Renders', value: 12840 }],
          chart: { kind: 'bar', series: [1, 2, 3], labels: ['a', 'b', 'c'] },
        },
      ],
    });
    const scene = config.scenes[0];
    if (scene.type !== 'metric-card') throw new Error('wrong type');
    expect(scene.metrics[0].decimals).toBe(0);
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [
          {
            type: 'metric-card',
            duration: 5,
            metrics: [{ label: 'Renders', value: 1 }],
            chart: { kind: 'bar', series: [1, 2, 3], labels: ['a'] },
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe('outputFormats', () => {
  it('normalizes to a unique list', () => {
    const single = demoConfigSchema.parse({ ...minimal, output: { format: 'gif' } });
    expect(outputFormats(single.output)).toEqual(['gif']);
    const list = demoConfigSchema.parse({ ...minimal, output: { format: ['webp', 'webp', 'mp4'] } });
    expect(outputFormats(list.output)).toEqual(['webp', 'mp4']);
  });
});

describe('budgetToBytes', () => {
  it('parses MB, KB, and raw bytes', () => {
    expect(budgetToBytes('5MB')).toBe(5 * 1024 * 1024);
    expect(budgetToBytes('800KB')).toBe(800 * 1024);
    expect(budgetToBytes(1234)).toBe(1234);
    expect(budgetToBytes('1.5MB')).toBe(Math.round(1.5 * 1024 * 1024));
  });
});

describe('frames (v0.4)', () => {
  it('accepts desktop and none frames with defaults', () => {
    const desktop = demoConfigSchema.parse({
      ...minimal,
      frame: { type: 'desktop', title: 'My App', subtitle: 'workspace' },
    });
    expect(desktop.frame.type).toBe('desktop');
    expect(frameViewport(desktop.frame)).toEqual({ width: 1024, height: 640 });
    const none = demoConfigSchema.parse({ ...minimal, frame: { type: 'none' } });
    expect(frameViewport(none.frame)).toEqual({ width: 960, height: 640 });
  });

  it('lets every frame override width and height within bounds', () => {
    const config = demoConfigSchema.parse({
      ...minimal,
      frame: { type: 'phone', width: 400, height: 900 },
    });
    expect(frameViewport(config.frame)).toEqual({ width: 400, height: 900 });
    expect(
      demoConfigSchema.safeParse({ ...minimal, frame: { type: 'none', width: 319 } }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({ ...minimal, frame: { type: 'browser', height: 1921 } }).success,
    ).toBe(false);
  });
});

describe('theme (v0.4)', () => {
  it('accepts palette overrides in hex and rgb()/rgba(), rejects named colors', () => {
    const config = demoConfigSchema.parse({
      ...minimal,
      theme: { palette: { page: '#fff', card: 'rgb(1, 2, 3)', shadow: 'rgba(0, 0, 0, 0.4)' } },
    });
    expect(config.theme.palette?.card).toBe('rgb(1, 2, 3)');
    expect(
      demoConfigSchema.safeParse({ ...minimal, theme: { palette: { page: 'red' } } }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({ ...minimal, theme: { palette: { tint: '#fff' } } }).success,
    ).toBe(false);
  });

  it('accepts known presets and rejects unknown ones', () => {
    const config = demoConfigSchema.parse({ ...minimal, theme: { preset: 'midnight' } });
    expect(config.theme.preset).toBe('midnight');
    expect(
      demoConfigSchema.safeParse({ ...minimal, theme: { preset: 'vaporwave' } }).success,
    ).toBe(false);
  });
});

describe('theme.font (v0.4)', () => {
  it('accepts the enum values and the file object form', () => {
    expect(demoConfigSchema.parse({ ...minimal, theme: { font: 'system' } }).theme.font).toBe('system');
    const config = demoConfigSchema.parse({
      ...minimal,
      theme: { font: { sans: 'brand.woff2', mono: 'brand-mono.ttf' } },
    });
    expect(config.theme.font).toEqual({ sans: 'brand.woff2', mono: 'brand-mono.ttf' });
  });

  it('rejects unsupported font file extensions', () => {
    expect(
      demoConfigSchema.safeParse({ ...minimal, theme: { font: { sans: 'brand.otf' } } }).success,
    ).toBe(false);
  });
});

describe('theme.logo (v0.4)', () => {
  it('accepts the string shorthand and the placement object', () => {
    expect(demoConfigSchema.parse({ ...minimal, theme: { logo: 'assets/logo.png' } }).theme.logo).toBe(
      'assets/logo.png',
    );
    const config = demoConfigSchema.parse({
      ...minimal,
      theme: { logo: { src: 'assets/logo.png', placement: 'corner' } },
    });
    expect(normalizeLogo(config.theme.logo)).toEqual({ src: 'assets/logo.png', placement: 'corner' });
    expect(normalizeLogo('assets/logo.png')).toEqual({ src: 'assets/logo.png', placement: 'header' });
  });

  it('rejects unknown placements', () => {
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        theme: { logo: { src: 'assets/logo.png', placement: 'footer' } },
      }).success,
    ).toBe(false);
  });
});
