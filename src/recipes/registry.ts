export const RECIPE_NAMES = [
  'code-to-result',
  'problem-to-solution',
  'workflow-transformation',
  'metric-proof',
  'ui-focus-tour',
  'architecture-flow',
] as const;

export type RecipeName = (typeof RECIPE_NAMES)[number];

export const RECIPE_VARIANTS = {
  'code-to-result': ['evidence-split', 'focused-run'],
  'problem-to-solution': ['resolve-lane', 'state-pair'],
  'workflow-transformation': ['progress-rail', 'handoff-focus'],
  'metric-proof': ['proof-first', 'surface-first'],
  'ui-focus-tour': ['guided-panel', 'persistent-shell'],
  'architecture-flow': ['flow-split', 'system-focus'],
} as const satisfies Record<RecipeName, readonly [string, string]>;

export interface RecipeSelection {
  name: RecipeName;
  recipeVersion: 1;
  variant: string;
}

export interface RecipeSignature {
  recipe: RecipeName;
  recipeVersion: 1;
  variant: string;
  beatSequence: string[];
  compositionFamily: string;
  motif: string;
  heroObject: string;
  motionPersonality: string;
  productSurfaceTreatment: string;
  supportingObjectArrangement: string;
}

const PRIMARY_VARIANTS: ReadonlySet<string> = new Set(Object.values(RECIPE_VARIANTS).map((variants) => variants[0]));

const LABELS: Record<RecipeName, { build: string; pending: string; done: string; rows: string[] }> = {
  'code-to-result': { build: 'Verification run', pending: 'Running checks', done: 'Result verified', rows: ['Compile', 'Test', 'Package'] },
  'problem-to-solution': { build: 'Resolution workspace', pending: 'Issue isolated', done: 'Problem resolved', rows: ['Signal', 'Cause', 'Fix'] },
  'workflow-transformation': { build: 'Workflow progress', pending: 'Transformation active', done: 'Workflow complete', rows: ['Input', 'Transform', 'Deliver'] },
  'metric-proof': { build: 'Proof dashboard', pending: 'Measuring result', done: 'Proof confirmed', rows: ['Baseline', 'Change', 'Outcome'] },
  'ui-focus-tour': { build: 'Product tour', pending: 'Focused workflow', done: 'Flow complete', rows: ['Open', 'Act', 'Confirm'] },
  'architecture-flow': { build: 'System flow', pending: 'Tracing the path', done: 'Flow verified', rows: ['Source', 'Service', 'Result'] },
};

interface RecipeInput {
  profile?: 'readme-loop' | 'social-film' | 'product-tour';
  brief?: {
    product?: string;
    repo?: string;
    story?: {
      promise?: string;
      proof?: Array<{ display?: string }>;
      recipe?: RecipeSelection;
    };
  };
  artDirection?: { motionPersonality?: 'calm' | 'crisp' | 'elastic' };
}

export interface CompiledRecipe {
  beats: Array<{ id: string; role: 'hook' | 'build' | 'payoff' | 'outro' }>;
  shots: unknown[];
  signature: RecipeSignature;
}

function timing(profile: RecipeInput['profile']): number[] {
  if (profile === 'social-film') return [4, 5, 5, 4];
  if (profile === 'product-tour') return [5, 7, 6, 6];
  return [2.9, 3.5, 3.6];
}

function metricFromDisplay(display: string): { value: number; prefix?: string; suffix?: string; decimals: number } | undefined {
  const match = display.trim().match(/^([^\d+-]*)([-+]?\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!match) return undefined;
  const value = Number(match[2].replaceAll(',', ''));
  if (!Number.isFinite(value)) return undefined;
  return {
    value,
    ...(match[1] ? { prefix: match[1] } : {}),
    ...(match[3] ? { suffix: match[3] } : {}),
    decimals: match[2].split('.')[1]?.length ?? 0,
  };
}

function motionFor(input: RecipeInput, primary: boolean): { enter: string; transition: string } {
  const personality = input.artDirection?.motionPersonality ?? (primary ? 'crisp' : 'calm');
  if (personality === 'elastic') return { enter: 'scale', transition: 'shared-element' };
  if (personality === 'calm') return { enter: 'fade', transition: 'masked-wipe' };
  return { enter: 'slide-left', transition: 'directional' };
}

export function compileRecipe(input: RecipeInput): CompiledRecipe {
  const selection = input.brief?.story?.recipe;
  if (!selection) throw new Error('recipe selection is missing');
  const variants = RECIPE_VARIANTS[selection.name];
  if (!variants.includes(selection.variant as never)) throw new Error(`unsupported ${selection.name} variant: ${selection.variant}`);
  const primary = PRIMARY_VARIANTS.has(selection.variant);
  const product = input.brief?.product ?? input.brief?.repo ?? 'Product';
  const promise = input.brief?.story?.promise ?? 'See the result clearly';
  const proof = input.brief?.story?.proof?.[0]?.display ?? 'Result verified';
  const metric = metricFromDisplay(proof);
  const labels = LABELS[selection.name];
  const durations = timing(input.profile);
  const hasOutro = input.profile === 'social-film';
  const extraBuild = input.profile !== 'readme-loop';
  const beats: CompiledRecipe['beats'] = [
    { id: 'recipe-hook', role: 'hook' },
    { id: 'recipe-build', role: 'build' },
    { id: 'recipe-payoff', role: 'payoff' },
    ...(hasOutro ? [{ id: 'recipe-outro', role: 'outro' as const }] : []),
  ];
  const motion = motionFor(input, primary);
  const surface = (state: 'warn' | 'success', subtitle: string, carry: boolean) => ({
    id: 'recipe-surface', slot: primary ? 'hero' : 'supporting', kind: 'product-surface',
    title: product, subtitle, device: primary ? 'browser' : 'panel', state,
    rows: labels.rows.map((label, index) => ({ label, value: state === 'success' || index === 0 ? 'Ready' : 'Pending', tone: state === 'success' || index === 0 ? 'success' : 'warn' })),
    carry, enter: { type: motion.enter, duration: 0.45 },
  });
  const chart = (tone: 'warn' | 'success') => ({
    id: 'recipe-proof-path', slot: 'supporting', kind: 'chart-path', title: labels.build,
    series: tone === 'success' ? [9, 7, 5, 3, 2] : [2, 3, 6, 8, 9], tone,
    carry: tone === 'warn', enter: { type: 'fade', duration: 0.45 },
  });
  const hookObjects = primary
    ? [{ id: 'recipe-promise', slot: 'hero', kind: 'kinetic-text', eyebrow: product, text: promise, scale: 'headline', enter: { type: 'slide-up', duration: 0.45 } }]
    : [surface('warn', promise, false)];
  const buildObjects = primary
    ? [surface('warn', labels.pending, extraBuild), { ...chart('warn'), carry: extraBuild }]
    : [
        { id: 'recipe-build-copy', slot: 'hero', kind: 'kinetic-text', eyebrow: labels.build, text: labels.pending, scale: 'headline', enter: { type: motion.enter, duration: 0.45 } },
        surface('warn', labels.pending, extraBuild),
      ];
  const resolvedObjects = primary
    ? [surface('success', labels.done, false), chart('success')]
    : [
        { id: 'recipe-resolution', slot: 'hero', kind: 'kinetic-text', eyebrow: product, text: labels.done, scale: 'headline', enter: { type: 'fade', duration: 0.45 } },
        surface('success', labels.done, false),
      ];
  const payoffObject = metric && primary
    ? { id: 'recipe-proof', slot: 'hero', kind: 'hero-metric', label: labels.done, metric, tone: 'success', enter: { type: 'scale', duration: 0.45 } }
    : { id: 'recipe-proof', slot: 'hero', kind: 'kinetic-text', eyebrow: labels.done, text: proof, align: 'center', scale: 'display', enter: { type: 'fade', duration: 0.45 } };
  const shots: unknown[] = [
    { id: 'recipe-hook-shot', beatId: 'recipe-hook', duration: durations[0], objects: hookObjects, camera: { target: hookObjects[0].id, move: 'push', amount: 0.04 } },
    { id: 'recipe-build-shot', beatId: 'recipe-build', duration: durations[1], transition: motion.transition === 'directional' ? { type: 'directional', direction: 'left', duration: 0.45 } : { type: motion.transition, duration: 0.45 }, objects: buildObjects },
    ...(extraBuild ? [{ id: 'recipe-resolve-shot', beatId: 'recipe-build', duration: durations[2], transition: { type: 'shared-element', duration: 0.5 }, objects: resolvedObjects }] : []),
    { id: 'recipe-payoff-shot', beatId: 'recipe-payoff', duration: durations[extraBuild ? 3 : 2], transition: { type: 'masked-wipe', duration: 0.5 }, objects: [payoffObject] },
    ...(hasOutro ? [{ id: 'recipe-outro-shot', beatId: 'recipe-outro', duration: 4, transition: { type: 'cut' }, objects: [{ id: 'recipe-brand', slot: 'hero', kind: 'kinetic-text', eyebrow: product, text: proof, align: 'center', scale: 'headline', enter: { type: 'fade', duration: 0.45 } }] }] : []),
  ];
  const beatSequence = beats.map((beat) => beat.role);
  return {
    beats,
    shots,
    signature: {
      recipe: selection.name,
      recipeVersion: 1,
      variant: selection.variant,
      beatSequence,
      compositionFamily: primary ? 'split-evidence' : 'focus-stack',
      motif: primary ? 'proof-path' : 'state-rows',
      heroObject: primary ? 'product-surface' : 'kinetic-text',
      motionPersonality: input.artDirection?.motionPersonality ?? (primary ? 'crisp' : 'calm'),
      productSurfaceTreatment: primary ? 'browser-shell' : 'flat-panel',
      supportingObjectArrangement: primary ? 'right-proof' : 'lower-state',
    },
  };
}
