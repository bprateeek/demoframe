import { z } from 'zod';
import { compileRecipe, RECIPE_NAMES, RECIPE_VARIANTS } from '../recipes/registry.js';
import { DESTINATION_NAMES } from './destinations.js';
import { MOTION_PRESET_NAMES } from '../templates/motion/presets.js';

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
export const PROFILE_NAMES = ['readme-loop', 'social-film', 'product-tour'] as const;
const profileSchema = z.enum(PROFILE_NAMES);

const storyProof = z
  .object({
    evidence: z.string().min(1).max(80),
    mode: z.enum(['exact', 'formatted', 'paraphrase']),
    display: z.string().min(1).max(160).optional(),
  })
  .strict();

const storyBeat = z
  .object({
    id: z.string().min(1).max(60),
    role: z.enum(['hook', 'build', 'payoff', 'outro']),
  })
  .strict();

const storyRecipe = z
  .object({
    name: z.enum(RECIPE_NAMES),
    recipeVersion: z.literal(1),
    variant: z.string().min(1).max(80),
  })
  .strict()
  .superRefine((recipe, ctx) => {
    if (!(RECIPE_VARIANTS[recipe.name] as readonly string[]).includes(recipe.variant)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['variant'],
        message: `${recipe.name} variant must be one of: ${RECIPE_VARIANTS[recipe.name].join(', ')}`,
      });
    }
  });

const storySchema = z
  .object({
    version: z.literal(2).optional(),
    promise: z.string().min(1).max(240).optional(),
    proof: z.array(storyProof).max(8).optional(),
    beats: z.array(storyBeat).min(1).max(12).optional(),
    visualMetaphor: z.string().min(1).max(160).optional(),
    recipe: storyRecipe.optional(),
  })
  .strict();

const appearanceEvidenceItem = z.union([
  z
    .object({
      field: z.string().min(1).max(120),
      evidence: z.string().min(1).max(80),
    })
    .strict(),
  z
    .object({
      field: z.string().min(1).max(120),
      noSource: z.string().min(8).max(300),
    })
    .strict(),
]);

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
    story: storySchema.optional(),
    appearanceEvidence: z.array(appearanceEvidenceItem).max(40).optional(),
  })
  .strict();

const contextConfigSchema = z
  .object({
    manifest: z.string().min(1).default('demoframe-context.yml'),
  })
  .strict();

const artDirectionSchema = z
  .object({
    typography: z
      .object({
        display: z.string().min(1).max(120).optional(),
        body: z.string().min(1).max(120).optional(),
      })
      .strict()
      .optional(),
    colors: z
      .object({
        primary: hexColor.optional(),
        secondary: hexColor.optional(),
        highlight: hexColor.optional(),
      })
      .strict()
      .optional(),
    shapeLanguage: z.string().min(1).max(160).optional(),
    motionPersonality: z.enum(['calm', 'crisp', 'elastic']).optional(),
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

export const CINEMATIC_COMPOSITION_NAMES = [
  'center-hero',
  'floating-stage',
  'macro-card',
  'path-journey',
  'orbit-object',
] as const;
const cinematicComposition = z.enum(CINEMATIC_COMPOSITION_NAMES);
const cinematicMotion = z.enum(MOTION_PRESET_NAMES);
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
  transition: z.enum(['cut', 'crossfade', 'push', 'dip-to-color']).default('cut'),
  name: z.string().max(40).optional(),
  beatId: z.string().min(1).max(60).optional(),
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
  session: z.enum(['continue', 'fresh']).default('continue'),
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

// A bare string keeps the accent-tinted badge; the object form picks a semantic
// tone so status words like "Degraded" stop rendering in the brand color.
const badgeValue = z.union([
  z.string().max(24),
  z
    .object({
      text: z.string().min(1).max(24),
      tone: z.enum(['neutral', 'success', 'warn', 'error']),
    })
    .strict(),
]);

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
            badge: badgeValue.optional(),
            icon: builtInIcon.optional(),
          })
          .strict(),
      )
      .min(2)
      .max(6),
  })
  .strict();

const heroObjectBlock = z
  .object({
    block: z.literal('hero-object'),
    ...screenBlockBase,
    kind: z.enum(['logo-chip', 'glow-card', 'code-chip']),
    title: z.string().min(1).max(TEXT_LIMITS.cardTitle),
    subtitle: z.string().max(TEXT_LIMITS.cardSubtitle).optional(),
    icon: builtInIcon.optional(),
    badge: badgeValue.optional(),
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
  heroObjectBlock,
  listBlock,
  progressBlock,
  heatmapBlock,
  calloutBlock,
]);

export const SCREEN_LAYOUT_NAMES = ['stack', 'hero', 'split'] as const;
const screenLayout = z.enum(SCREEN_LAYOUT_NAMES);

const screenScene = z.object({
  type: z.literal('screen'),
  ...sceneBase,
  motion: z.enum(['reveal', 'focus', 'scroll']).default('reveal'),
  layout: screenLayout.default('stack'),
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

export const SHOT_SLOT_NAMES = ['hero', 'supporting', 'background', 'foreground'] as const;
export const SHOT_OBJECT_MOTION_NAMES = ['none', 'fade', 'slide-up', 'slide-left', 'scale'] as const;
export const SHOT_EMPHASIS_NAMES = ['none', 'focus', 'pulse'] as const;
export const SHOT_TRANSITION_NAMES = ['cut', 'shared-element', 'masked-wipe', 'directional'] as const;
export const SHOT_PRIMITIVE_KINDS = ['kinetic-text', 'logo-lockup', 'product-surface', 'hero-metric', 'chart-path', 'image'] as const;

const shotObjectMotionSchema = z
  .object({
    type: z.enum(SHOT_OBJECT_MOTION_NAMES).default('none'),
    duration: z.number().min(0.1).max(3).default(0.45),
  })
  .strict()
  .default({});

const shotObjectEmphasisSchema = z
  .object({
    type: z.enum(SHOT_EMPHASIS_NAMES).default('none'),
    at: z.number().min(0).max(30).default(0),
    duration: z.number().min(0.1).max(6).default(0.8),
  })
  .strict()
  .default({});

const shotObjectBase = {
  id: z.string().min(1).max(60),
  slot: z.enum(SHOT_SLOT_NAMES),
  enter: shotObjectMotionSchema,
  emphasize: shotObjectEmphasisSchema,
  exit: shotObjectMotionSchema,
  carry: z.boolean().default(false),
};

const shotSceneObjectSchema = z.object({
  ...shotObjectBase,
  kind: z.literal('scene'),
  scene: sceneSchema,
}).strict();

const kineticTextObjectSchema = z.object({
  ...shotObjectBase,
  kind: z.literal('kinetic-text'),
  text: z.string().min(1).max(180),
  eyebrow: z.string().min(1).max(60).optional(),
  align: z.enum(['left', 'center']).default('left'),
  scale: z.enum(['headline', 'display']).default('display'),
}).strict();

const logoLockupObjectSchema = z.object({
  ...shotObjectBase,
  kind: z.literal('logo-lockup'),
  product: z.string().min(1).max(80),
  src: z.string().min(1).max(500),
  manifestRef: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  tagline: z.string().min(1).max(120).optional(),
  arrangement: z.enum(['mark-left', 'mark-top']).default('mark-left'),
}).strict();

const productSurfaceObjectSchema = z.object({
  ...shotObjectBase,
  kind: z.literal('product-surface'),
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(120).optional(),
  device: z.enum(['browser', 'phone', 'panel']).default('browser'),
  state: z.enum(['neutral', 'success', 'warn', 'error']).default('neutral'),
  rows: z.array(z.object({
    label: z.string().min(1).max(80),
    value: z.string().min(1).max(60).optional(),
    tone: z.enum(['neutral', 'success', 'warn', 'error']).default('neutral'),
  }).strict()).min(1).max(5),
}).strict();

const heroMetricObjectSchema = z.object({
  ...shotObjectBase,
  kind: z.literal('hero-metric'),
  label: z.string().min(1).max(TEXT_LIMITS.metricLabel),
  metric: metricValue,
  detail: z.string().min(1).max(TEXT_LIMITS.caption).optional(),
  tone: z.enum(['neutral', 'success', 'warn']).default('neutral'),
}).strict();

const chartPathObjectSchema = z.object({
  ...shotObjectBase,
  kind: z.literal('chart-path'),
  title: z.string().min(1).max(TEXT_LIMITS.cardTitle).optional(),
  series: z.array(z.number().finite()).min(2).max(16),
  labels: z.array(z.string().min(1).max(TEXT_LIMITS.chartLabel)).optional(),
  tone: z.enum(['neutral', 'success', 'warn']).default('neutral'),
}).strict();

const imageObjectSchema = z.object({
  ...shotObjectBase,
  kind: z.literal('image'),
  src: z.string().min(1).max(500),
  alt: z.string().min(1).max(160),
  fit: z.enum(['contain', 'cover']).default('contain'),
  mask: z.enum(['none', 'rounded', 'circle']).default('none'),
  tint: hexColor.optional(),
  parallax: z.number().min(0).max(0.15).default(0),
}).strict();

const shotObjectSchema = z.discriminatedUnion('kind', [
  shotSceneObjectSchema,
  kineticTextObjectSchema,
  logoLockupObjectSchema,
  productSurfaceObjectSchema,
  heroMetricObjectSchema,
  chartPathObjectSchema,
  imageObjectSchema,
]);

const shotTransitionSchema = z
  .object({
    type: z.enum(SHOT_TRANSITION_NAMES).default('cut'),
    duration: z.number().min(0.1).max(2).default(0.45),
    direction: z.enum(['left', 'right', 'up', 'down']).optional(),
  })
  .strict()
  .superRefine((transition, ctx) => {
    if (transition.type === 'directional' && !transition.direction) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['direction'],
        message: 'a directional transition needs direction: left|right|up|down',
      });
    }
    if (transition.type !== 'directional' && transition.direction) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['direction'],
        message: 'direction is only used by a directional transition',
      });
    }
  });

function validateEmbeddedSceneContent(
  scene: z.infer<typeof sceneSchema>,
  objectIndex: number,
  ctx: z.RefinementCtx,
): void {
  const prefix: Array<string | number> = ['objects', objectIndex, 'scene'];
  if (scene.type === 'code') {
    const lines = scene.code.split('\n');
    if (lines.length > CODE_MAX_LINES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...prefix, 'code'], message: `code has ${lines.length} lines; the panel fits at most ${CODE_MAX_LINES}` });
    }
    const long = lines.findIndex((line) => line.length > CODE_MAX_LINE_LENGTH);
    if (long !== -1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...prefix, 'code'], message: `line ${long + 1} is ${lines[long].length} chars; keep lines at or under ${CODE_MAX_LINE_LENGTH}` });
    }
    for (const field of ['added', 'removed'] as const) {
      const bad = scene[field].find((line) => line > lines.length);
      if (bad !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...prefix, field], message: `line ${bad} is out of range; the code has ${lines.length} lines` });
      }
    }
    const overlap = scene.added.find((line) => scene.removed.includes(line));
    if (overlap !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...prefix, 'added'], message: `line ${overlap} is marked both added and removed` });
    }
  }
  if (scene.type === 'metric-card' && scene.chart?.labels && scene.chart.labels.length !== scene.chart.series.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...prefix, 'chart', 'labels'], message: `labels has ${scene.chart.labels.length} entries but series has ${scene.chart.series.length}; they must match` });
  }
  if (scene.type !== 'screen') return;
  const names = scene.blocks.flatMap((block) => (block.name ? [block.name] : []));
  const duplicate = names.find((name, index) => names.indexOf(name) !== index);
  if (duplicate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...prefix, 'blocks'], message: `screen block name "${duplicate}" is used more than once` });
  }
  if (scene.motion === 'focus') {
    if (!scene.focus) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...prefix, 'focus'], message: 'screen motion "focus" needs focus to name a block' });
    } else if (!names.includes(scene.focus)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...prefix, 'focus'], message: `focus "${scene.focus}" does not match a named block` });
    }
  } else if (scene.focus) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...prefix, 'focus'], message: 'focus is only used when screen motion is "focus"' });
  }
  scene.blocks.forEach((block, blockIndex) => {
    const blockPrefix = [...prefix, 'blocks', blockIndex];
    if (block.block === 'chart-card' && block.chart.labels && block.chart.labels.length !== block.chart.series.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...blockPrefix, 'chart', 'labels'], message: `labels has ${block.chart.labels.length} entries but series has ${block.chart.series.length}; they must match` });
    }
    if (block.block === 'heatmap' && block.values.length !== block.cols * 7) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...blockPrefix, 'values'], message: `heatmap values has ${block.values.length} cells but cols requires ${block.cols * 7}` });
    }
    if (block.block === 'callout' && block.variant === 'hero-stat' && !block.value) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...blockPrefix, 'value'], message: 'callout hero-stat needs value' });
    }
    if (block.block === 'callout' && block.variant === 'message' && !block.text) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...blockPrefix, 'text'], message: 'callout message needs text' });
    }
  });
}

const shotSchema = z
  .object({
    id: z.string().min(1).max(60),
    beatId: z.string().min(1).max(60),
    duration: z.number().positive().max(30),
    objects: z.array(shotObjectSchema).min(1).max(8),
    camera: z
      .object({
        target: z.string().min(1).max(60),
        move: z.enum(['none', 'push', 'pan']).default('none'),
        amount: z.number().min(0).max(0.35).default(0.08),
      })
      .strict()
      .optional(),
    transition: shotTransitionSchema.default({}),
    ambient: z
      .object({
        type: z.enum(['none', 'ember']).default('none'),
        start: z.number().min(0).max(1).default(0),
        end: z.number().min(0).max(1).default(1),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((shot, ctx) => {
    const ids = shot.objects.map((object) => object.id);
    const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
    if (duplicate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['objects'],
        message: `shot object id "${duplicate}" is used more than once`,
      });
    }
    if (shot.ambient && shot.ambient.end <= shot.ambient.start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ambient', 'end'],
        message: 'ambient.end must be greater than ambient.start',
      });
    }
    for (const [objectIndex, object] of shot.objects.entries()) {
      if (object.kind !== 'scene') {
        if (object.kind === 'chart-path' && object.labels && object.labels.length !== object.series.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['objects', objectIndex, 'labels'],
            message: `labels has ${object.labels.length} entries but series has ${object.series.length}; they must match`,
          });
        }
        if (object.emphasize.type !== 'none' && object.emphasize.at + object.emphasize.duration > shot.duration) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['objects', objectIndex, 'emphasize'],
            message: 'object emphasis must finish within the shot duration',
          });
        }
        continue;
      }
      validateEmbeddedSceneContent(object.scene, objectIndex, ctx);
      if (object.scene.type === 'hold') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['objects', objectIndex, 'scene'],
          message: 'hold cannot be embedded as a shot object; use shot duration or carry instead',
        });
      }
      if (object.scene.frame) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['objects', objectIndex, 'scene', 'frame'],
          message: 'shot object scenes use the compositor frame and cannot override chrome',
        });
      }
      if (object.emphasize.type !== 'none' && object.emphasize.at + object.emphasize.duration > shot.duration) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['objects', objectIndex, 'emphasize'],
          message: 'object emphasis must finish within the shot duration',
        });
      }
    }
  });

export const demoConfigSchema = z
  .object({
    title: z.string().max(120).optional(),
    output: outputSchema,
    theme: themeSchema,
    frame: frameSchema,
    profile: profileSchema.optional(),
    context: contextConfigSchema.optional(),
    artDirection: artDirectionSchema.optional(),
    brief: briefSchema.optional(),
    cinematic: cinematicSchema.optional(),
    scenes: z.array(sceneSchema).min(1).max(12).optional(),
    shots: z.array(shotSchema).min(1).max(12).optional(),
  })
  .superRefine((config, ctx) => {
    const scenes = config.scenes ?? [];
    const shots = config.shots ?? [];
    const recipe = config.brief?.story?.recipe;
    const sourceCount = Number(scenes.length > 0) + Number(shots.length > 0) + Number(Boolean(recipe));
    if (sourceCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: recipe ? ['brief', 'story', 'recipe'] : scenes.length > 0 ? ['shots'] : ['scenes'],
        message: 'exactly one authoring source is required: provide scenes, shots, or brief.story.recipe, never more than one',
      });
    }
    if (recipe && !config.brief?.story?.proof?.[0]?.display) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['brief', 'story', 'proof', 0, 'display'],
        message: 'recipe compilation needs the first proof item to declare deterministic display copy',
      });
    }
    const shotIds = shots.map((shot) => shot.id);
    const duplicateShot = shotIds.find((id, index) => shotIds.indexOf(id) !== index);
    if (duplicateShot) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['shots'],
        message: `shot id "${duplicateShot}" is used more than once`,
      });
    }
    let carriedIds = new Set<string>();
    shots.forEach((shot, shotIndex) => {
      const explicit = new Map(shot.objects.map((object) => [object.id, object]));
      const activeIds = new Set([...carriedIds, ...explicit.keys()]);
      if (shot.camera && !activeIds.has(shot.camera.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shots', shotIndex, 'camera', 'target'],
          message: `camera target "${shot.camera.target}" does not match an object in this shot or a carried object`,
        });
      }
      if (shotIndex === 0 && shot.transition.type !== 'cut') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shots', shotIndex, 'transition'],
          message: 'the first shot has no previous shot to transition from; use transition.type: cut',
        });
      }
      shot.objects.forEach((object, objectIndex) => {
        if (
          object.kind === 'scene' &&
          object.scene.type === 'screenshot' &&
          object.scene.cinematic &&
          config.brief?.screenshotPolicy !== 'raw-intentional'
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['shots', shotIndex, 'objects', objectIndex, 'scene', 'cinematic'],
            message: 'screenshot.cinematic needs brief.screenshotPolicy: raw-intentional',
          });
        }
      });
      const nextCarried = new Set<string>();
      for (const id of activeIds) {
        const authored = explicit.get(id);
        if (authored ? authored.carry : carriedIds.has(id)) nextCarried.add(id);
      }
      carriedIds = nextCarried;
    });
    if (scenes[0]?.type === 'hold') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scenes', 0],
        message: 'a "hold" scene extends the previous scene, so it cannot come first',
      });
    }
    const total = (scenes.length > 0 ? scenes : shots).reduce((sum, item) => sum + item.duration, 0);
    if (total > 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: scenes.length > 0 ? ['scenes'] : ['shots'],
        message: `total duration is ${total.toFixed(1)}s; README demos should stay under 60s`,
      });
    }
    for (const [index, scene] of scenes.entries()) {
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
  })
  .transform((config) => {
    if (config.brief?.story?.recipe) {
      const compiled = compileRecipe(config);
      return {
        ...config,
        brief: {
          ...config.brief,
          story: { ...config.brief.story, beats: compiled.beats },
        },
        scenes: [],
        shots: z.array(shotSchema).min(1).max(12).parse(compiled.shots),
      };
    }
    return { ...config, scenes: config.scenes ?? [] };
  });

export type DemoConfig = z.infer<typeof demoConfigSchema>;
export type Brief = NonNullable<DemoConfig['brief']>;
export type BriefIntent = z.infer<typeof briefIntent>;
export type StoryV2 = NonNullable<Brief['story']>;
export type StoryBeat = NonNullable<StoryV2['beats']>[number];
export type StoryProof = NonNullable<StoryV2['proof']>[number];
export type ProfileName = (typeof PROFILE_NAMES)[number];
export type ArtDirection = NonNullable<DemoConfig['artDirection']>;
export type AppearanceEvidence = NonNullable<Brief['appearanceEvidence']>[number];
export type Frame = DemoConfig['frame'];
export type Scene = DemoConfig['scenes'][number];
export type Shot = NonNullable<DemoConfig['shots']>[number];
export type ShotObject = Shot['objects'][number];
export type ShotSlot = (typeof SHOT_SLOT_NAMES)[number];
export type ShotTransitionName = (typeof SHOT_TRANSITION_NAMES)[number];
export type StoryRecipe = NonNullable<StoryV2['recipe']>;
export type SceneFrameOverride = NonNullable<Scene['frame']>;
export type SceneCinematic = NonNullable<Scene['cinematic']>;
export type ConfigCinematic = NonNullable<DemoConfig['cinematic']>;
export type CinematicCompositionName = (typeof CINEMATIC_COMPOSITION_NAMES)[number];
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
export type ScreenLayoutName = (typeof SCREEN_LAYOUT_NAMES)[number];
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

// Terminal-playback scenes act like one terminal session by default: each scene's
// settled command/output stays on screen as history for the next scene. A scene
// with session: 'fresh', or any non-terminal scene in between, clears the session.
export function terminalSessionHistory(scenes: Scene[], index: number): TerminalPlaybackScene[] {
  const history: TerminalPlaybackScene[] = [];
  for (let i = 0; i < index; i++) {
    const scene = scenes[i];
    if (scene.type === 'hold') continue;
    if (scene.type !== 'terminal-playback' || scene.session === 'fresh') {
      history.length = 0;
      if (scene.type !== 'terminal-playback') continue;
    }
    history.push(scene);
  }
  const current = scenes[index];
  if (current?.type === 'terminal-playback' && current.session === 'fresh') return [];
  return history;
}

export function sceneSupportsCinematicDefault(scene: Pick<Scene, 'type'>): boolean {
  return scene.type !== 'hold' && scene.type !== 'screenshot';
}

export function resolveSceneCinematic(config: DemoConfig, scene: Scene): SceneCinematic | undefined {
  if (scene.cinematic) return scene.cinematic;
  return config.cinematic && sceneSupportsCinematicDefault(scene) ? config.cinematic : undefined;
}

export function hasCinematicFields(config: DemoConfig): boolean {
  return config.cinematic !== undefined ||
    config.scenes.some((scene) => scene.cinematic !== undefined) ||
    (config.shots ?? []).some((shot) => shot.objects.some((object) => object.kind === 'scene' && object.scene.cinematic !== undefined));
}

export interface ResolvedAmbient {
  type: 'ember';
  scope: 'timeline';
}

export function resolveAmbient(config: DemoConfig): ResolvedAmbient | undefined {
  return config.scenes.some((scene) => resolveSceneCinematic(config, scene)?.ambient === 'ember')
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

// Screen-pixel model of the terminal frame (frames/terminal.ts + scene CSS):
// 24px outer margin per side, ~42px chrome bar, 16px rail padding per side,
// 15px mono type at 1.7 line-height.
const TERMINAL_FIT = { chrome: 48 + 42 + 32, lineHeight: 25.5, slack: 12, minHeight: 320 };

// Terminal demos are usually a handful of lines inside a 520px-tall default frame;
// the dead space below reads unpolished and cold agents burn turns shrinking it.
// When the author did not pick a height and every scene lives in the terminal
// session, fit the frame to the largest settled session instead.
export function autoTerminalHeight(frame: Frame, scenes?: Scene[]): number | null {
  if (frame.type !== 'terminal' || frame.height !== undefined || !scenes?.length) return null;
  if (!scenes.every((s) => s.type === 'terminal-playback' || s.type === 'hold')) return null;
  let maxLines = 0;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (scene.type !== 'terminal-playback') continue;
    const session = [...terminalSessionHistory(scenes, i), scene];
    const lines = session.reduce(
      (sum, s) => sum + 1 + normalizeTermLines(s.output).length + (s.spinner || s.exit ? 1 : 0),
      1, // trailing next-prompt line
    );
    maxLines = Math.max(maxLines, lines);
  }
  if (maxLines === 0) return null;
  const fit = TERMINAL_FIT.chrome + Math.ceil(maxLines * TERMINAL_FIT.lineHeight) + TERMINAL_FIT.slack;
  return Math.min(FRAME_VIEWPORTS.terminal.height, Math.max(TERMINAL_FIT.minHeight, fit));
}

export function frameViewport(frame: Frame, scenes?: Scene[]): { width: number; height: number } {
  const d = FRAME_VIEWPORTS[frame.type];
  const height = frame.height ?? autoTerminalHeight(frame, scenes) ?? d.height;
  return { width: frame.width ?? d.width, height };
}

export function isTransparentFrame(frame: Frame): boolean {
  return frame.outside === 'transparent';
}

export function captureViewport(frame: Frame, scenes?: Scene[]): { width: number; height: number } {
  const viewport = frameViewport(frame, scenes);
  if (!isTransparentFrame(frame)) return viewport;
  return {
    width: viewport.width + TRANSPARENT_GUTTER * 2,
    height: viewport.height + TRANSPARENT_GUTTER * 2,
  };
}
