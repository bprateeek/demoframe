import { describe, expect, it } from 'vitest';
import {
  budgetToBytes,
  demoConfigSchema,
  frameViewport,
  hasCinematicFields,
  normalizeLogo,
  normalizeTermLines,
  outputFormats,
  resolveFrameCapture,
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
    expect(config.output.motionBlur).toBe('off');
    expect(config.theme.mode).toBeUndefined();
    expect(config.theme.font).toBe('inter');
    expect(config.scenes[0].transition).toBe('cut');
  });

  it('accepts full and partial brief blocks while rejecting brief typos', () => {
    const full = demoConfigSchema.parse({
      ...minimal,
      brief: {
        mode: 'user-confirmed',
        audience: 'Maintainers evaluating the README demo',
        source: 'Synthetic story from product screenshots',
        screenshotPolicy: 'reconstruct',
        placement: ['github-readme', 'x-post'],
        arc: 'Ask, work, result',
        climax: 'Final green publish card',
        brand: { accent: '#e2603a', frame: 'phone', mode: 'light', notes: 'warm accent' },
        product: 'demoframe',
        repo: 'bprateeek/demoframe',
        verbatimCopy: ['Render demo'],
        assumptions: ['Confirmed by maintainer'],
      },
    });
    expect(full.brief?.placement).toEqual(['github-readme', 'x-post']);
    expect(full.brief?.assumptions).toEqual(['Confirmed by maintainer']);

    const partial = demoConfigSchema.parse({ ...minimal, brief: { audience: 'Agents' } });
    expect(partial.brief?.audience).toBe('Agents');
    const trimmed = demoConfigSchema.parse({ ...minimal, brief: { assumptions: ['  inferred accent  '] } });
    expect(trimmed.brief?.assumptions).toEqual(['inferred accent']);

    expect(
      demoConfigSchema.safeParse({ ...minimal, brief: { audience: 'Agents', audence: 'typo' } }).success,
    ).toBe(false);
  });

  it('validates brief enums and accepts a single placement', () => {
    expect(
      demoConfigSchema.parse({
        ...minimal,
        brief: { mode: 'inferred', screenshotPolicy: 'simplify', placement: 'product-hunt', brand: { frame: 'browser', mode: 'dark' } },
      }).brief?.placement,
    ).toBe('product-hunt');
    expect(demoConfigSchema.safeParse({ ...minimal, brief: { mode: 'confirmed' } }).success).toBe(false);
    expect(demoConfigSchema.safeParse({ ...minimal, brief: { screenshotPolicy: 'raw' } }).success).toBe(false);
    expect(demoConfigSchema.safeParse({ ...minimal, brief: { placement: 'website-hero' } }).success).toBe(false);
    expect(demoConfigSchema.safeParse({ ...minimal, brief: { brand: { frame: 'tablet' } } }).success).toBe(false);
    expect(demoConfigSchema.safeParse({ ...minimal, brief: { brand: { mode: 'sepia' } } }).success).toBe(false);
    expect(demoConfigSchema.safeParse({ ...minimal, brief: { assumptions: ['x'.repeat(1), '   '] } }).success).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        brief: { assumptions: Array.from({ length: 11 }, (_, i) => `assumption ${i}`) },
      }).success,
    ).toBe(false);
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

  it('accepts explicit motion blur modes and rejects unknown modes', () => {
    expect(demoConfigSchema.parse({ ...minimal, output: { motionBlur: 'cinematic' } }).output.motionBlur).toBe(
      'cinematic',
    );
    expect(demoConfigSchema.parse({ ...minimal, output: { motionBlur: 'force' } }).output.motionBlur).toBe('force');
    expect(demoConfigSchema.safeParse({ ...minimal, output: { motionBlur: 'always' } }).success).toBe(false);
  });

  it('accepts explicit non-empty scene cinematic blocks and detects them', () => {
    const without = demoConfigSchema.parse(minimal);
    expect(hasCinematicFields(without)).toBe(false);

    const config = demoConfigSchema.parse({
      ...minimal,
      scenes: [
        {
          type: 'typing',
          duration: 3,
          text: 'hello',
          cinematic: { composition: 'center-hero', motion: 'float-in', ambient: 'ember' },
        },
      ],
    });
    expect(config.scenes[0].cinematic).toEqual({
      composition: 'center-hero',
      motion: 'float-in',
      ambient: 'ember',
    });
    expect(hasCinematicFields(config)).toBe(true);
  });

  it('rejects empty or unknown cinematic blocks', () => {
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [{ type: 'typing', duration: 3, text: 'hi', cinematic: {} }],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [{ type: 'typing', duration: 3, text: 'hi', cinematic: { motion: 'zoom' } }],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [{ type: 'typing', duration: 3, text: 'hi', cinematic: { motion: 'float-in', blur: true } }],
      }).success,
    ).toBe(false);
  });

  it('rejects hold cinematic blocks and gates screenshot cinematic to raw-intentional briefs', () => {
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [
          { type: 'typing', duration: 3, text: 'hi' },
          { type: 'hold', duration: 1, cinematic: { motion: 'float-in' } },
        ],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [{ type: 'screenshot', duration: 3, src: 'a.png', cinematic: { ambient: 'ember' } }],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        brief: { screenshotPolicy: 'reconstruct' },
        scenes: [{ type: 'screenshot', duration: 3, src: 'a.png', cinematic: { ambient: 'ember' } }],
      }).success,
    ).toBe(false);

    const raw = demoConfigSchema.parse({
      ...minimal,
      brief: { screenshotPolicy: 'raw-intentional' },
      scenes: [{ type: 'screenshot', duration: 3, src: 'a.png', cinematic: { ambient: 'ember' } }],
    });
    expect(hasCinematicFields(raw)).toBe(true);
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

describe('resolveFrameCapture', () => {
  it('keeps the default and GIF path on direct capture', () => {
    const off = demoConfigSchema.parse({ ...minimal }).output;
    expect(resolveFrameCapture(off, 'mp4')).toEqual({
      format: 'mp4',
      motionBlur: 'off',
      mode: 'directCapture',
    });

    const cinematic = demoConfigSchema.parse({ ...minimal, output: { motionBlur: 'cinematic' } }).output;
    expect(resolveFrameCapture(cinematic, 'gif')).toEqual({
      format: 'gif',
      motionBlur: 'cinematic',
      mode: 'directCapture',
    });
  });

  it('routes blur-capable formats to the blurred capture branch', () => {
    const cinematic = demoConfigSchema.parse({ ...minimal, output: { motionBlur: 'cinematic' } }).output;
    expect(resolveFrameCapture(cinematic, 'mp4')).toEqual({
      format: 'mp4',
      motionBlur: 'cinematic',
      mode: 'blurredCapture',
    });

    const force = demoConfigSchema.parse({ ...minimal, output: { motionBlur: 'force' } }).output;
    expect(resolveFrameCapture(force, 'webp')).toEqual({
      format: 'webp',
      motionBlur: 'force',
      mode: 'blurredCapture',
    });
  });

  it('routes forced GIF motion blur to the blurred capture branch', () => {
    const force = demoConfigSchema.parse({ ...minimal, output: { motionBlur: 'force' } }).output;
    expect(resolveFrameCapture(force, 'gif')).toEqual({
      format: 'gif',
      motionBlur: 'force',
      mode: 'blurredCapture',
    });
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

  it('accepts transparent frame controls and phone device color', () => {
    const config = demoConfigSchema.parse({
      ...minimal,
      frame: {
        type: 'phone',
        outside: 'transparent',
        shadow: false,
        margin: 24,
        deviceColor: '#0f172a',
      },
    });
    expect(config.frame.outside).toBe('transparent');
    expect(config.frame.shadow).toBe(false);
    expect(config.frame.margin).toBe(24);
    if (config.frame.type !== 'phone') throw new Error('wrong frame');
    expect(config.frame.deviceColor).toBe('#0f172a');
    expect(demoConfigSchema.parse({ ...minimal, frame: { type: 'browser', outside: '#fff' } }).frame.outside).toBe(
      '#fff',
    );
    expect(demoConfigSchema.parse({ ...minimal, frame: { type: 'desktop', outside: 'page' } }).frame.outside).toBe(
      'page',
    );
  });

  it('rejects invalid outside values and frame typos under strict frame schemas', () => {
    expect(
      demoConfigSchema.safeParse({ ...minimal, frame: { type: 'phone', outside: 'blue' } }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({ ...minimal, frame: { type: 'browser', deviceColor: '#000' } }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({ ...minimal, frame: { type: 'terminal', shdaow: false } }).success,
    ).toBe(false);
  });
});

describe('frame overrides (v0.7)', () => {
  it('accepts valid per-scene browser overrides', () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser', url: 'https://app.test', chrome: 'thin' },
      scenes: [
        {
          type: 'typing',
          duration: 3,
          text: 'hello',
          frame: { url: 'https://github.com/acme/repo', chrome: 'full', title: 'GitHub' },
        },
      ],
    });
    const scene = config.scenes[0];
    expect(scene.frame).toEqual({
      url: 'https://github.com/acme/repo',
      chrome: 'full',
      title: 'GitHub',
    });
  });

  it('rejects overrides that do not belong to the global frame type', () => {
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'phone' },
        scenes: [{ type: 'typing', duration: 3, text: 'hi', frame: { url: 'https://app.test' } }],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'terminal' },
        scenes: [{ type: 'typing', duration: 3, text: 'hi', frame: { statusBarTime: '10:30' } }],
      }).success,
    ).toBe(false);
  });

  it('rejects global-only transparent controls in scene frame overrides', () => {
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'phone' },
        scenes: [{ type: 'typing', duration: 3, text: 'hi', frame: { outside: 'transparent' } }],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'phone' },
        scenes: [{ type: 'typing', duration: 3, text: 'hi', frame: { deviceColor: '#000' } }],
      }).success,
    ).toBe(false);
  });

  it('rejects frame overrides on none frames and hold scenes', () => {
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'none' },
        scenes: [{ type: 'typing', duration: 3, text: 'hi', frame: { title: 'Nope' } }],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'browser' },
        scenes: [
          { type: 'typing', duration: 3, text: 'hi' },
          { type: 'hold', duration: 1, frame: { url: 'https://app.test' } },
        ],
      }).success,
    ).toBe(false);
  });
});

describe('screen scenes (v0.8)', () => {
  it('accepts a dashboard-style screen with bounded blocks', () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'none' },
      scenes: [
        {
          type: 'screen',
          duration: 5,
          blocks: [
            { block: 'app-header', title: 'Grind50', subtitle: 'Today', icon: 'bolt' },
            {
              block: 'stat-strip',
              name: 'stats',
              tiles: [
                { label: 'Active', value: { value: 128 } },
                { label: 'Delta', value: { value: 18, suffix: '%' }, delta: { value: 4, dir: 'up' } },
              ],
            },
            { block: 'chart-card', name: 'chart', chart: { kind: 'area', series: [2, 4, 3] } },
            {
              block: 'card-grid',
              cards: [
                { title: 'Review', desc: '12 new cards', icon: 'check' },
                { title: 'Plan', value: '3 days' },
              ],
            },
          ],
        },
      ],
    });
    expect(config.scenes[0].type).toBe('screen');
  });

  it('requires focus to name a unique block only when motion is focus', () => {
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'none' },
        scenes: [
          {
            type: 'screen',
            duration: 5,
            motion: 'focus',
            focus: 'chart',
            blocks: [{ block: 'chart-card', name: 'chart', chart: { kind: 'bar', series: [1, 2] } }],
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'none' },
        scenes: [
          {
            type: 'screen',
            duration: 5,
            motion: 'reveal',
            focus: 'chart',
            blocks: [{ block: 'chart-card', name: 'chart', chart: { kind: 'bar', series: [1, 2] } }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'none' },
        scenes: [
          {
            type: 'screen',
            duration: 5,
            motion: 'focus',
            focus: 'missing',
            blocks: [{ block: 'chart-card', name: 'chart', chart: { kind: 'bar', series: [1, 2] } }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'none' },
        scenes: [
          {
            type: 'screen',
            duration: 5,
            motion: 'focus',
            focus: 'chart',
            blocks: [
              { block: 'chart-card', name: 'chart', chart: { kind: 'bar', series: [1, 2] } },
              { block: 'callout', name: 'chart', variant: 'message', text: 'Duplicate' },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('validates screen chart labels and heatmap dimensions', () => {
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'none' },
        scenes: [
          {
            type: 'screen',
            duration: 5,
            blocks: [{ block: 'chart-card', chart: { kind: 'line', series: [1, 2, 3], labels: ['a'] } }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'none' },
        scenes: [
          {
            type: 'screen',
            duration: 5,
            blocks: [{ block: 'heatmap', cols: 2, values: Array.from({ length: 14 }, () => 1) }],
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'none' },
        scenes: [
          {
            type: 'screen',
            duration: 5,
            blocks: [{ block: 'heatmap', cols: 2, values: Array.from({ length: 13 }, () => 1) }],
          },
        ],
      }).success,
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

describe('delight primitives (v0.5)', () => {
  it('defaults tap and celebrate to false', () => {
    const config = demoConfigSchema.parse({
      ...minimal,
      scenes: [{ type: 'typing', duration: 3, text: 'hi', send: true }],
    });
    const scene = config.scenes[0];
    if (scene.type !== 'typing') throw new Error('wrong type');
    expect(scene.tap).toBe(false);
    expect(scene.celebrate).toBe(false);
  });

  it('requires send:true and a non-terminal frame for typing.tap', () => {
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [{ type: 'typing', duration: 3, text: 'hi', tap: true }],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        frame: { type: 'terminal' },
        scenes: [{ type: 'typing', duration: 3, text: 'hi', send: true, tap: true }],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [{ type: 'typing', duration: 3, text: 'hi', send: true, tap: true }],
      }).success,
    ).toBe(true);
  });

  it('requires exactly one linked item for steps.tap', () => {
    const linkOne = { type: 'steps', duration: 3, tap: true, items: [{ label: 'a' }, { label: 'b', link: true }] };
    const linkNone = { type: 'steps', duration: 3, tap: true, items: [{ label: 'a' }] };
    const linkTwo = {
      type: 'steps',
      duration: 3,
      tap: true,
      items: [{ label: 'a', link: true }, { label: 'b', link: true }],
    };
    expect(demoConfigSchema.safeParse({ ...minimal, scenes: [linkOne] }).success).toBe(true);
    expect(demoConfigSchema.safeParse({ ...minimal, scenes: [linkNone] }).success).toBe(false);
    expect(demoConfigSchema.safeParse({ ...minimal, scenes: [linkTwo] }).success).toBe(false);
  });

  it('requires a cta for status-card.tap', () => {
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [{ type: 'status-card', duration: 3, title: 'Done', tap: true }],
      }).success,
    ).toBe(false);
    expect(
      demoConfigSchema.safeParse({
        ...minimal,
        scenes: [{ type: 'status-card', duration: 3, title: 'Done', tap: true, cta: { label: 'Merge' } }],
      }).success,
    ).toBe(true);
  });

  it('accepts chat avatars as image paths or monograms and validates the monogram', () => {
    const config = demoConfigSchema.parse({
      ...minimal,
      scenes: [
        {
          type: 'chat',
          duration: 5,
          messages: [{ role: 'assistant', text: 'hi' }],
          avatars: { assistant: { initials: 'CC', color: '#e2603a' }, user: 'me.png' },
        },
      ],
    });
    const scene = config.scenes[0];
    if (scene.type !== 'chat') throw new Error('wrong type');
    expect(scene.avatars?.user).toBe('me.png');
    const badInitials = {
      type: 'chat',
      duration: 5,
      messages: [{ role: 'user', text: 'x' }],
      avatars: { user: { initials: 'TOOLONG' } },
    };
    const badColor = {
      type: 'chat',
      duration: 5,
      messages: [{ role: 'user', text: 'x' }],
      avatars: { user: { initials: 'A', color: 'red' } },
    };
    expect(demoConfigSchema.safeParse({ ...minimal, scenes: [badInitials] }).success).toBe(false);
    expect(demoConfigSchema.safeParse({ ...minimal, scenes: [badColor] }).success).toBe(false);
  });

  it('allows celebrate on a trailing hold', () => {
    const config = demoConfigSchema.parse({
      ...minimal,
      scenes: [
        { type: 'status-card', duration: 3, title: 'Done', cta: { label: 'Merge' } },
        { type: 'hold', duration: 1.2, celebrate: true },
      ],
    });
    expect(config.scenes[1].celebrate).toBe(true);
  });
});
