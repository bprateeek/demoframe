import { z } from 'zod';
import { DESTINATION_NAMES } from './destinations.js';

export const TEXT_LIMITS = {
  typingText: 220,
  stepLabel: 60,
  stepDetail: 120,
  cardTitle: 80,
  cardSubtitle: 100,
  checkLabel: 60,
  caption: 120,
  headerTitle: 40,
  headerDetail: 100,
  ctaLabel: 40,
  termCommand: 150,
  termLine: 100,
  chatMessage: 200,
  metricLabel: 40,
  codeTitle: 60,
  chartLabel: 12,
  blockName: 32,
  calloutText: 120,
} as const;

export const CODE_MAX_LINES = 24;
export const CODE_MAX_LINE_LENGTH = 100;

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'expected a hex color like "#3b82f6"');

const sizeBudget = z
  .union([
    z.number().int().positive(),
    z
      .string()
      .regex(/^\d+(?:\.\d+)?\s*(?:B|KB|MB)$/i, 'expected a size like "5MB", "800KB", or bytes'),
  ])
  .default('5MB');

export function budgetToBytes(budget: string | number): number {
  if (typeof budget === 'number') return budget;
  const m = budget.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB)$/i)!;
  const value = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  return Math.round(value * (unit === 'MB' ? 1024 * 1024 : unit === 'KB' ? 1024 : 1));
}

const formatValue = z.enum(['gif', 'webp', 'mp4', 'webm']);
const motionBlurValue = z.enum(['off', 'cinematic', 'force']);

const outputSchema = z
  .object({
    format: z.union([formatValue, z.array(formatValue).min(1)]).default('gif'),
    width: z.number().int().min(200).max(1200).default(480),
    fps: z.number().int().min(5).max(30).default(15),
    budget: sizeBudget,
    displayWidth: z.number().int().min(100).max(1200).optional(),
    quality: z.enum(['draft', 'standard', 'high']).default('standard'),
    motionBlur: motionBlurValue.default('off'),
  })
  .default({});

const cssColor = z
  .string()
  .regex(
    /^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgba?\([0-9.,\s%/]+\))$/,
    'expected hex like "#3b82f6" or rgb()/rgba()',
  );

const frameOutside = z.union([z.enum(['transparent', 'page']), hexColor]);

export const PALETTE_KEYS = [
  'page',
  'screen',
  'card',
  'text',
  'muted',
  'faint',
  'border',
  'success',
  'successBg',
  'info',
  'shadow',
] as const;

const paletteSchema = z
  .object(
    Object.fromEntries(PALETTE_KEYS.map((key) => [key, cssColor.optional()])) as Record<
      (typeof PALETTE_KEYS)[number],
      z.ZodOptional<typeof cssColor>
    >,
  )
  .strict();

export const THEME_PRESET_NAMES = ['github-dark', 'paper', 'midnight', 'candy'] as const;

const fontFile = z
  .string()
  .regex(/\.(woff2|ttf)$/i, 'expected a .woff2 or .ttf file path');

const fontValue = z.union([
  z.enum(['inter', 'system']),
  z.object({ sans: fontFile.optional(), mono: fontFile.optional() }).strict(),
]);

const themeMode = z.enum(['light', 'dark']);

const themeSchema = z
  .object({
    preset: z.enum(THEME_PRESET_NAMES).optional(),
    accent: hexColor.optional(),
    mode: themeMode.optional(),
    font: fontValue.default('inter'),
    logo: z
      .union([
        z.string().min(1),
        z
          .object({
            src: z.string().min(1),
            placement: z.enum(['header', 'corner']).default('header'),
          })
          .strict(),
      ])
      .optional(),
    background: hexColor.optional(),
    palette: paletteSchema.optional(),
  })
  .default({});

const frameBase = {
  width: z.number().int().min(320).max(1920).optional(),
  height: z.number().int().min(320).max(1920).optional(),
  outside: frameOutside.default('page'),
  shadow: z.boolean().default(true),
  margin: z.number().int().min(0).max(256).optional(),
};

const phoneFrame = z
  .object({
    type: z.literal('phone'),
    ...frameBase,
    title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
    subtitle: z.string().max(TEXT_LIMITS.headerDetail).optional(),
    statusBarTime: z.string().max(8).default('9:41'),
    deviceColor: hexColor.optional(),
  })
  .strict();

const browserFrame = z
  .object({
    type: z.literal('browser'),
    ...frameBase,
    url: z.string().max(80).optional(),
    title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
    chrome: z.enum(['full', 'thin']).default('full'),
  })
  .strict();

const terminalFrame = z
  .object({
    type: z.literal('terminal'),
    ...frameBase,
    title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
    prompt: z.string().max(16).default('$'),
  })
  .strict();

const desktopFrame = z
  .object({
    type: z.literal('desktop'),
    ...frameBase,
    title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
    subtitle: z.string().max(TEXT_LIMITS.headerDetail).optional(),
  })
  .strict();

const noneFrame = z
  .object({
    type: z.literal('none'),
    ...frameBase,
  })
  .strict();

const frameSchema = z.discriminatedUnion('type', [
  phoneFrame,
  browserFrame,
  terminalFrame,
  desktopFrame,
  noneFrame,
]);

export const FRAME_TYPE_NAMES = ['phone', 'browser', 'terminal', 'desktop', 'none'] as const;

const placementValue = z.enum(DESTINATION_NAMES);
const briefIntent = z.enum(['product', 'abstract', 'hybrid']);

const briefSchema = z
  .object({
    mode: z.enum(['user-confirmed', 'inferred']).optional(),
    intent: briefIntent.default('product'),
    audience: z.string().optional(),
    source: z.string().optional(),
    screenshotPolicy: z.enum(['reconstruct', 'simplify', 'raw-intentional']).optional(),
    placement: z.union([placementValue, z.array(placementValue).min(1)]).optional(),
    arc: z.string().optional(),
    climax: z.string().optional(),
    brand: z
      .object({
        accent: hexColor.optional(),
        frame: z.enum(FRAME_TYPE_NAMES).optional(),
        mode: themeMode.optional(),
        notes: z.string().optional(),
      })
      .strict()
      .optional(),
    product: z.string().optional(),
    repo: z.string().optional(),
    verbatimCopy: z.array(z.string()).optional(),
    assumptions: z.array(z.string().trim().min(1)).max(10).optional(),
  })
  .strict();

const sceneFrameOverride = z
  .object({
    title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
    subtitle: z.string().max(TEXT_LIMITS.headerDetail).optional(),
    url: z.string().max(80).optional(),
    chrome: z.enum(['full', 'thin']).optional(),
    prompt: z.string().max(16).optional(),
    statusBarTime: z.string().max(8).optional(),
  })
  .strict();

const cinematicComposition = z.literal('center-hero');
const cinematicMotion = z.literal('float-in');
const cinematicAmbient = z.literal('ember');

const cinematicSchema = z.union([
  z
    .object({
      composition: cinematicComposition,
      motion: cinematicMotion.optional(),
      ambient: cinematicAmbient.optional(),
    })
    .strict(),
  z
    .object({
      composition: cinematicComposition.optional(),
      motion: cinematicMotion,
      ambient: cinematicAmbient.optional(),
    })
    .strict(),
  z
    .object({
      composition: cinematicComposition.optional(),
      motion: cinematicMotion.optional(),
      ambient: cinematicAmbient,
    })
    .strict(),
]);

const sceneBase = {
  duration: z.number().positive().max(30),
  transition: z.enum(['cut', 'crossfade']).default('cut'),
  name: z.string().max(40).optional(),
  celebrate: z.boolean().default(false),
  frame: sceneFrameOverride.optional(),
  cinematic: cinematicSchema.optional(),
};

const typingScene = z.object({
  type: z.literal('typing'),
  ...sceneBase,
  text: z.string().min(1).max(TEXT_LIMITS.typingText),
  placeholder: z.string().max(60).optional(),
  send: z.boolean().default(false),
  tap: z.boolean().default(false),
});

const stepState = z.enum(['done', 'active', 'pending']);

const stepsScene = z.object({
  type: z.literal('steps'),
  ...sceneBase,
  header: z
    .object({
      title: z.string().max(TEXT_LIMITS.headerTitle),
      detail: z.string().max(TEXT_LIMITS.headerDetail).optional(),
    })
    .optional(),
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(TEXT_LIMITS.stepLabel),
        detail: z.string().max(TEXT_LIMITS.stepDetail).optional(),
        state: stepState.default('done'),
        link: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(6),
  tap: z.boolean().default(false),
});

const statusCardScene = z.object({
  type: z.literal('status-card'),
  ...sceneBase,
  title: z.string().min(1).max(TEXT_LIMITS.cardTitle),
  subtitle: z.string().max(TEXT_LIMITS.cardSubtitle).optional(),
  branch: z
    .object({
      from: z.string().max(60),
      into: z.string().max(40),
    })
    .optional(),
  checks: z.array(z.string().min(1).max(TEXT_LIMITS.checkLabel)).max(4).default([]),
  cta: z
    .object({
      label: z.string().min(1).max(TEXT_LIMITS.ctaLabel),
      style: z.enum(['success', 'primary', 'neutral']).default('primary'),
    })
    .optional(),
  caption: z.string().max(TEXT_LIMITS.caption).optional(),
  tap: z.boolean().default(false),
});

const screenshotScene = z.object({
  type: z.literal('screenshot'),
  ...sceneBase,
  src: z.string().min(1),
  fit: z.enum(['cover', 'contain']).default('contain'),
  pan: z.enum(['none', 'up', 'down', 'left', 'right', 'zoom-in', 'zoom-out']).default('none'),
  caption: z.string().max(TEXT_LIMITS.caption).optional(),
});

const holdScene = z.object({
  type: z.literal('hold'),
  ...sceneBase,
});

const termLineStyle = z.enum(['normal', 'dim', 'success', 'error', 'warn']);

const termLine = z.union([
  z.string().min(1).max(TEXT_LIMITS.termLine),
  z.object({
    text: z.string().min(1).max(TEXT_LIMITS.termLine),
    style: termLineStyle.default('normal'),
  }),
]);

const terminalPlaybackScene = z.object({
  type: z.literal('terminal-playback'),
  ...sceneBase,
  command: z.string().min(1).max(TEXT_LIMITS.termCommand),
  output: z.array(termLine).max(10).default([]),
  spinner: z.string().max(40).optional(),
  exit: z
    .object({
      status: z.enum(['success', 'error']),
      label: z.string().max(60).optional(),
    })
    .optional(),
  prompt: z.string().max(16).optional(),
});

export const CODE_LANGS = [
  'text',
  'bash',
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'json',
  'yaml',
  'python',
  'go',
  'rust',
  'html',
  'css',
  'sql',
  'markdown',
  'diff',
] as const;

const codeScene = z.object({
  type: z.literal('code'),
  ...sceneBase,
  lang: z.enum(CODE_LANGS).default('text'),
  title: z.string().max(TEXT_LIMITS.codeTitle).optional(),
  code: z.string().min(1).max(1500),
  added: z.array(z.number().int().min(1)).default([]),
  removed: z.array(z.number().int().min(1)).default([]),
  lineNumbers: z.boolean().default(false),
  reveal: z.enum(['lines', 'fade', 'none']).default('lines'),
});

const avatarSpec = z.union([
  z.string().min(1),
  z
    .object({
      initials: z.string().min(1).max(3),
      color: hexColor.optional(),
    })
    .strict(),
]);

const chatScene = z.object({
  type: z.literal('chat'),
  ...sceneBase,
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().min(1).max(TEXT_LIMITS.chatMessage),
      }),
    )
    .min(1)
    .max(6),
  typingIndicator: z.boolean().default(true),
  avatars: z
    .object({
      user: avatarSpec.optional(),
      assistant: avatarSpec.optional(),
    })
    .strict()
    .optional(),
});

const metricCardScene = z.object({
  type: z.literal('metric-card'),
  ...sceneBase,
  title: z.string().max(TEXT_LIMITS.cardTitle).optional(),
  metrics: z
    .array(
      z.object({
        label: z.string().min(1).max(TEXT_LIMITS.metricLabel),
        value: z.number().finite().min(-1e9).max(1e9),
        prefix: z.string().max(8).optional(),
        suffix: z.string().max(12).optional(),
        decimals: z.number().int().min(0).max(2).default(0),
      }),
    )
    .min(1)
    .max(4),
  chart: z
    .object({
      kind: z.enum(['bar', 'line']),
      series: z.array(z.number().finite().min(0)).min(2).max(16),
      labels: z.array(z.string().min(1).max(TEXT_LIMITS.chartLabel)).optional(),
      color: hexColor.optional(),
    })
    .optional(),
  caption: z.string().max(TEXT_LIMITS.caption).optional(),
});

const metricValue = z
  .object({
    value: z.number().finite().min(-1e9).max(1e9),
    prefix: z.string().max(8).optional(),
    suffix: z.string().max(12).optional(),
    decimals: z.number().int().min(0).max(2).default(0),
  })
  .strict();

const screenBlockBase = {
  name: z.string().min(1).max(TEXT_LIMITS.blockName).optional(),
};

const builtInIcon = z.enum([
  'check',
  'code',
  'share',
  'paperclip',
  'mic',
  'arrow-up',
  'spark',
  'user',
  'bolt',
]);

const screenAvatar = z
  .object({
    initials: z.string().min(1).max(3),
    color: hexColor.optional(),
  })
  .strict();

const screenChart = z
  .object({
    kind: z.enum(['bar', 'line', 'area']),
    series: z.array(z.number().finite().min(0)).min(2).max(16),
    labels: z.array(z.string().min(1).max(TEXT_LIMITS.chartLabel)).optional(),
    color: hexColor.optional(),
  })
  .strict();

const appHeaderBlock = z
  .object({
    block: z.literal('app-header'),
    ...screenBlockBase,
    title: z.string().min(1).max(TEXT_LIMITS.cardTitle),
    subtitle: z.string().max(TEXT_LIMITS.cardSubtitle).optional(),
    icon: builtInIcon.optional(),
  })
  .strict();

const statStripBlock = z
  .object({
    block: z.literal('stat-strip'),
    ...screenBlockBase,
    tiles: z
      .array(
        z
          .object({
            value: metricValue,
            label: z.string().min(1).max(TEXT_LIMITS.metricLabel),
            delta: z
              .object({
                value: z.number().finite().min(-1e6).max(1e6),
                dir: z.enum(['up', 'down']),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .min(2)
      .max(4),
  })
  .strict();

const chartCardBlock = z
  .object({
    block: z.literal('chart-card'),
    ...screenBlockBase,
    title: z.string().max(TEXT_LIMITS.cardTitle).optional(),
    chart: screenChart,
  })
  .strict();

const cardGridBlock = z
  .object({
    block: z.literal('card-grid'),
    ...screenBlockBase,
    cards: z
      .array(
        z
          .object({
            title: z.string().min(1).max(TEXT_LIMITS.cardTitle),
            value: z.string().max(40).optional(),
            desc: z.string().max(TEXT_LIMITS.cardSubtitle).optional(),
            badge: z.string().max(24).optional(),
            icon: builtInIcon.optional(),
          })
          .strict(),
      )
      .min(2)
      .max(6),
  })
  .strict();

const listBlock = z
  .object({
    block: z.literal('list'),
    ...screenBlockBase,
    rows: z
      .array(
        z
          .object({
            icon: builtInIcon.optional(),
            avatar: screenAvatar.optional(),
            label: z.string().min(1).max(TEXT_LIMITS.stepLabel),
            trailing: z.string().max(40).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict();

const progressBlock = z
  .object({
    block: z.literal('progress'),
    ...screenBlockBase,
    items: z
      .array(
        z
          .object({
            label: z.string().min(1).max(TEXT_LIMITS.stepLabel),
            value: z.number().finite().min(0).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(6),
  })
  .strict();

const heatmapBlock = z
  .object({
    block: z.literal('heatmap'),
    ...screenBlockBase,
    cols: z.number().int().min(1).max(26).default(7),
    values: z.array(z.number().int().min(0).max(4)).min(7).max(182),
  })
  .strict();

const calloutBlock = z
  .object({
    block: z.literal('callout'),
    ...screenBlockBase,
    variant: z.enum(['hero-stat', 'message']),
    value: metricValue.optional(),
    label: z.string().max(TEXT_LIMITS.metricLabel).optional(),
    text: z.string().max(TEXT_LIMITS.calloutText).optional(),
  })
  .strict();

const screenBlock = z.discriminatedUnion('block', [
  appHeaderBlock,
  statStripBlock,
  chartCardBlock,
  cardGridBlock,
  listBlock,
  progressBlock,
  heatmapBlock,
  calloutBlock,
]);

const screenScene = z.object({
  type: z.literal('screen'),
  ...sceneBase,
  motion: z.enum(['reveal', 'focus', 'scroll']).default('reveal'),
  focus: z.string().min(1).max(TEXT_LIMITS.blockName).optional(),
  blocks: z.array(screenBlock).min(1).max(8),
});

export const sceneSchema = z.discriminatedUnion('type', [
  typingScene,
  stepsScene,
  statusCardScene,
  screenshotScene,
  holdScene,
  terminalPlaybackScene,
  codeScene,
  chatScene,
  metricCardScene,
  screenScene,
]);

export const demoConfigSchema = z
  .object({
    title: z.string().max(120).optional(),
    output: outputSchema,
    theme: themeSchema,
    frame: frameSchema,
    brief: briefSchema.optional(),
    scenes: z.array(sceneSchema).min(1).max(12),
  })
  .superRefine((config, ctx) => {
    if (config.scenes[0]?.type === 'hold') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scenes', 0],
        message: 'a "hold" scene extends the previous scene, so it cannot come first',
      });
    }
    const total = config.scenes.reduce((sum, s) => sum + s.duration, 0);
    if (total > 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scenes'],
        message: `total duration is ${total.toFixed(1)}s; README demos should stay under 60s`,
      });
    }
    for (const [index, scene] of config.scenes.entries()) {
      if (scene.frame) {
        if (scene.type === 'hold') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'frame'],
            message: 'a "hold" scene extends the previous scene, so it cannot carry a frame override',
          });
        }
        if (config.frame.type === 'none') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'frame'],
            message: 'frame overrides are not supported when the global frame type is "none"',
          });
        }
        const allowedByFrame: Record<Frame['type'], ReadonlySet<string>> = {
          phone: new Set(['title', 'subtitle', 'statusBarTime']),
          browser: new Set(['title', 'url', 'chrome']),
          terminal: new Set(['title', 'prompt']),
          desktop: new Set(['title', 'subtitle']),
          none: new Set(),
        };
        const allowed = allowedByFrame[config.frame.type];
        for (const key of Object.keys(scene.frame)) {
          if (!allowed.has(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['scenes', index, 'frame', key],
              message: `${key} cannot override a ${config.frame.type} frame`,
            });
          }
        }
      }
      if (scene.cinematic) {
        if (scene.type === 'hold') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'cinematic'],
            message: 'hold.cinematic is not supported in v1; holds inherit the previous scene final state',
          });
        }
        if (
          scene.type === 'screenshot' &&
          config.brief?.screenshotPolicy !== 'raw-intentional'
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'cinematic'],
            message: 'screenshot.cinematic needs brief.screenshotPolicy: raw-intentional',
          });
        }
      }
      if (scene.type === 'code') {
        const lines = scene.code.split('\n');
        if (lines.length > CODE_MAX_LINES) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'code'],
            message: `code has ${lines.length} lines; the panel fits at most ${CODE_MAX_LINES}`,
          });
        }
        const long = lines.findIndex((l) => l.length > CODE_MAX_LINE_LENGTH);
        if (long !== -1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'code'],
            message: `line ${long + 1} is ${lines[long].length} chars; keep lines at or under ${CODE_MAX_LINE_LENGTH}`,
          });
        }
        for (const field of ['added', 'removed'] as const) {
          const bad = scene[field].find((n) => n > lines.length);
          if (bad !== undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['scenes', index, field],
              message: `line ${bad} is out of range; the code has ${lines.length} lines`,
            });
          }
        }
        const overlap = scene.added.find((n) => scene.removed.includes(n));
        if (overlap !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'added'],
            message: `line ${overlap} is marked both added and removed`,
          });
        }
      }
      if (scene.type === 'typing' && scene.tap) {
        if (!scene.send) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'tap'],
            message: 'typing.tap needs send: true so there is a send button to tap',
          });
        }
        if (config.frame.type === 'terminal') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'tap'],
            message: 'typing.tap is not supported in a terminal frame; no send button renders there',
          });
        }
      }
      if (scene.type === 'steps' && scene.tap) {
        const links = scene.items.filter((it) => it.link).length;
        if (links !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'tap'],
            message: `steps.tap needs exactly one item with link: true to tap; found ${links}`,
          });
        }
      }
      if (scene.type === 'status-card' && scene.tap && !scene.cta) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scenes', index, 'tap'],
          message: 'status-card.tap needs a cta to tap',
        });
      }
      if (scene.type === 'metric-card' && scene.chart?.labels) {
        if (scene.chart.labels.length !== scene.chart.series.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'chart', 'labels'],
            message: `labels has ${scene.chart.labels.length} entries but series has ${scene.chart.series.length}; they must match`,
          });
        }
      }
      if (scene.type === 'screen') {
        const names = scene.blocks.flatMap((block) => (block.name ? [block.name] : []));
        const duplicate = names.find((name, nameIndex) => names.indexOf(name) !== nameIndex);
        if (duplicate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'blocks'],
            message: `screen block name "${duplicate}" is used more than once`,
          });
        }
        if (scene.motion === 'focus') {
          if (!scene.focus) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['scenes', index, 'focus'],
              message: 'screen motion "focus" needs focus to name a block',
            });
          } else if (!names.includes(scene.focus)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['scenes', index, 'focus'],
              message: `focus "${scene.focus}" does not match a named block`,
            });
          }
        } else if (scene.focus) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'focus'],
            message: 'focus is only used when screen motion is "focus"',
          });
        }
        for (const [blockIndex, block] of scene.blocks.entries()) {
          if (block.block === 'chart-card' && block.chart.labels) {
            if (block.chart.labels.length !== block.chart.series.length) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['scenes', index, 'blocks', blockIndex, 'chart', 'labels'],
                message: `labels has ${block.chart.labels.length} entries but series has ${block.chart.series.length}; they must match`,
              });
            }
          }
          if (block.block === 'heatmap' && block.values.length !== block.cols * 7) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['scenes', index, 'blocks', blockIndex, 'values'],
              message: `heatmap values has ${block.values.length} cells but cols requires ${block.cols * 7}`,
            });
          }
          if (block.block === 'callout') {
            if (block.variant === 'hero-stat' && !block.value) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['scenes', index, 'blocks', blockIndex, 'value'],
                message: 'callout hero-stat needs value',
              });
            }
            if (block.variant === 'message' && !block.text) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['scenes', index, 'blocks', blockIndex, 'text'],
                message: 'callout message needs text',
              });
            }
          }
        }
      }
    }
  });

export type DemoConfig = z.infer<typeof demoConfigSchema>;
export type Brief = NonNullable<DemoConfig['brief']>;
export type BriefIntent = z.infer<typeof briefIntent>;
export type Frame = DemoConfig['frame'];
export type Scene = DemoConfig['scenes'][number];
export type SceneFrameOverride = NonNullable<Scene['frame']>;
export type SceneCinematic = NonNullable<Scene['cinematic']>;
export type Theme = DemoConfig['theme'];
export type Output = DemoConfig['output'];
export type TypingScene = z.infer<typeof typingScene>;
export type StepsScene = z.infer<typeof stepsScene>;
export type StatusCardScene = z.infer<typeof statusCardScene>;
export type ScreenshotScene = z.infer<typeof screenshotScene>;
export type DesktopFrame = z.infer<typeof desktopFrame>;
export type ThemePalette = Record<(typeof PALETTE_KEYS)[number], string>;
export type ThemePresetName = (typeof THEME_PRESET_NAMES)[number];
export type TerminalPlaybackScene = z.infer<typeof terminalPlaybackScene>;
export type CodeScene = z.infer<typeof codeScene>;
export type ChatScene = z.infer<typeof chatScene>;
export type AvatarSpec = z.infer<typeof avatarSpec>;
export type MetricCardScene = z.infer<typeof metricCardScene>;
export type MetricValue = z.infer<typeof metricValue>;
export type ScreenScene = z.infer<typeof screenScene>;
export type ScreenBlock = z.infer<typeof screenBlock>;
export type TermLineStyle = z.infer<typeof termLineStyle>;
export type CodeLang = (typeof CODE_LANGS)[number];
export type MotionBlur = z.infer<typeof motionBlurValue>;
export type FrameCaptureMode = 'directCapture' | 'blurredCapture';

export interface FrameCapturePlan {
  format: OutputFormat;
  motionBlur: MotionBlur;
  mode: FrameCaptureMode;
}

export interface NormalizedTermLine {
  text: string;
  style: TermLineStyle;
}

export function normalizeTermLines(output: TerminalPlaybackScene['output']): NormalizedTermLine[] {
  return output.map((line) =>
    typeof line === 'string' ? { text: line, style: 'normal' } : { text: line.text, style: line.style },
  );
}

export function hasCinematicFields(config: DemoConfig): boolean {
  return config.scenes.some((scene) => scene.cinematic !== undefined);
}

export interface ResolvedAmbient {
  type: 'ember';
  scope: 'timeline';
}

export function resolveAmbient(config: DemoConfig): ResolvedAmbient | undefined {
  return config.scenes.some((scene) => scene.cinematic?.ambient === 'ember')
    ? { type: 'ember', scope: 'timeline' }
    : undefined;
}

export type LogoPlacement = 'header' | 'corner';

export function normalizeLogo(
  logo: Theme['logo'],
): { src: string; placement: LogoPlacement } | undefined {
  if (logo === undefined) return undefined;
  return typeof logo === 'string'
    ? { src: logo, placement: 'header' }
    : { src: logo.src, placement: logo.placement };
}

export type OutputFormat = z.infer<typeof formatValue>;

export function outputFormats(output: Output): OutputFormat[] {
  const list = Array.isArray(output.format) ? output.format : [output.format];
  return [...new Set(list)];
}

export function resolveFrameCapture(output: Output, format: OutputFormat): FrameCapturePlan {
  if (output.motionBlur === 'off' || (output.motionBlur === 'cinematic' && format === 'gif')) {
    return { format, motionBlur: output.motionBlur, mode: 'directCapture' };
  }
  return { format, motionBlur: output.motionBlur, mode: 'blurredCapture' };
}

export const SCALE_BY_QUALITY = { draft: 1, standard: 2, high: 4 } as const;

export const FRAME_VIEWPORTS = {
  phone: { width: 480, height: 1040 },
  browser: { width: 960, height: 640 },
  terminal: { width: 820, height: 520 },
  desktop: { width: 1024, height: 640 },
  none: { width: 960, height: 640 },
} as const;

export const TRANSPARENT_GUTTER = 96;

export function frameViewport(frame: Frame): { width: number; height: number } {
  const d = FRAME_VIEWPORTS[frame.type];
  return { width: frame.width ?? d.width, height: frame.height ?? d.height };
}

export function isTransparentFrame(frame: Frame): boolean {
  return frame.outside === 'transparent';
}

export function captureViewport(frame: Frame): { width: number; height: number } {
  const viewport = frameViewport(frame);
  if (!isTransparentFrame(frame)) return viewport;
  return {
    width: viewport.width + TRANSPARENT_GUTTER * 2,
    height: viewport.height + TRANSPARENT_GUTTER * 2,
  };
}
