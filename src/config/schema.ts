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
} as const;

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

const outputSchema = z
  .object({
    format: z.enum(['gif', 'mp4', 'both']).default('gif'),
    width: z.number().int().min(200).max(1200).default(480),
    fps: z.number().int().min(5).max(30).default(15),
    budget: sizeBudget,
    displayWidth: z.number().int().min(100).max(1200).optional(),
    quality: z.enum(['draft', 'standard', 'high']).default('standard'),
  })
  .default({});

const themeSchema = z
  .object({
    accent: hexColor.default('#e2603a'),
    mode: z.enum(['light', 'dark']).default('light'),
    font: z.enum(['inter', 'system']).default('inter'),
    logo: z.string().optional(),
    background: hexColor.optional(),
  })
  .default({});

const phoneFrame = z.object({
  type: z.literal('phone'),
  title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
  subtitle: z.string().max(TEXT_LIMITS.headerDetail).optional(),
  statusBarTime: z.string().max(8).default('9:41'),
});

const browserFrame = z.object({
  type: z.literal('browser'),
  url: z.string().max(80).optional(),
  title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
});

const terminalFrame = z.object({
  type: z.literal('terminal'),
  title: z.string().max(TEXT_LIMITS.headerTitle).optional(),
  prompt: z.string().max(16).default('$'),
});

const frameSchema = z.discriminatedUnion('type', [phoneFrame, browserFrame, terminalFrame]);

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

export const sceneSchema = z.discriminatedUnion('type', [
  typingScene,
  stepsScene,
  statusCardScene,
  screenshotScene,
  holdScene,
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

export const SCALE_BY_QUALITY = { draft: 1, standard: 2, high: 4 } as const;

export const FRAME_VIEWPORTS = {
  phone: { width: 480, height: 1040 },
  browser: { width: 960, height: 640 },
  terminal: { width: 820, height: 520 },
} as const;
