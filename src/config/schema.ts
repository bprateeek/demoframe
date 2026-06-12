import { z } from 'zod';

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

const outputSchema = z
  .object({
    format: z.union([formatValue, z.array(formatValue).min(1)]).default('gif'),
    width: z.number().int().min(200).max(1200).default(480),
    fps: z.number().int().min(5).max(30).default(15),
    budget: sizeBudget,
    displayWidth: z.number().int().min(100).max(1200).optional(),
    quality: z.enum(['draft', 'standard', 'high']).default('standard'),
  })
  .default({});

const cssColor = z
  .string()
  .regex(
    /^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgba?\([0-9.,\s%/]+\))$/,
    'expected hex like "#3b82f6" or rgb()/rgba()',
  );

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

const themeSchema = z
  .object({
    preset: z.enum(THEME_PRESET_NAMES).optional(),
    accent: hexColor.optional(),
    mode: z.enum(['light', 'dark']).optional(),
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
};

const phoneFrame = z.object({
  type: z.literal('phone'),
  ...frameBase,
  title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
  subtitle: z.string().max(TEXT_LIMITS.headerDetail).optional(),
  statusBarTime: z.string().max(8).default('9:41'),
});

const browserFrame = z.object({
  type: z.literal('browser'),
  ...frameBase,
  url: z.string().max(80).optional(),
  title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
});

const terminalFrame = z.object({
  type: z.literal('terminal'),
  ...frameBase,
  title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
  prompt: z.string().max(16).default('$'),
});

const desktopFrame = z.object({
  type: z.literal('desktop'),
  ...frameBase,
  title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
  subtitle: z.string().max(TEXT_LIMITS.headerDetail).optional(),
});

const noneFrame = z.object({
  type: z.literal('none'),
  ...frameBase,
});

const frameSchema = z.discriminatedUnion('type', [
  phoneFrame,
  browserFrame,
  terminalFrame,
  desktopFrame,
  noneFrame,
]);

const sceneBase = {
  duration: z.number().positive().max(30),
  transition: z.enum(['cut', 'crossfade']).default('cut'),
  name: z.string().max(40).optional(),
};

const typingScene = z.object({
  type: z.literal('typing'),
  ...sceneBase,
  text: z.string().min(1).max(TEXT_LIMITS.typingText),
  placeholder: z.string().max(60).optional(),
  send: z.boolean().default(false),
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
]);

export const demoConfigSchema = z
  .object({
    title: z.string().max(120).optional(),
    output: outputSchema,
    theme: themeSchema,
    frame: frameSchema,
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
      if (scene.type === 'metric-card' && scene.chart?.labels) {
        if (scene.chart.labels.length !== scene.chart.series.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', index, 'chart', 'labels'],
            message: `labels has ${scene.chart.labels.length} entries but series has ${scene.chart.series.length}; they must match`,
          });
        }
      }
    }
  });

export type DemoConfig = z.infer<typeof demoConfigSchema>;
export type Frame = DemoConfig['frame'];
export type Scene = DemoConfig['scenes'][number];
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
export type MetricCardScene = z.infer<typeof metricCardScene>;
export type TermLineStyle = z.infer<typeof termLineStyle>;
export type CodeLang = (typeof CODE_LANGS)[number];

export interface NormalizedTermLine {
  text: string;
  style: TermLineStyle;
}

export function normalizeTermLines(output: TerminalPlaybackScene['output']): NormalizedTermLine[] {
  return output.map((line) =>
    typeof line === 'string' ? { text: line, style: 'normal' } : { text: line.text, style: line.style },
  );
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

export const SCALE_BY_QUALITY = { draft: 1, standard: 2, high: 4 } as const;

export const FRAME_VIEWPORTS = {
  phone: { width: 480, height: 1040 },
  browser: { width: 960, height: 640 },
  terminal: { width: 820, height: 520 },
  desktop: { width: 1024, height: 640 },
  none: { width: 960, height: 640 },
} as const;

export function frameViewport(frame: Frame): { width: number; height: number } {
  const d = FRAME_VIEWPORTS[frame.type];
  return { width: frame.width ?? d.width, height: frame.height ?? d.height };
}
