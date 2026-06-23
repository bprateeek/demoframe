import type { BriefIntent, DemoConfig } from '../config/schema.js';
import { resolveTimeline } from '../render/timeline.js';
import { resolveTheme } from '../templates/theme.js';

type Brief = NonNullable<DemoConfig['brief']>;

export const REQUIRED_BRIEF_FIELDS = ['audience', 'source', 'screenshotPolicy', 'placement'] as const;
export const RECOMMENDED_BRIEF_FIELDS = ['arc', 'climax'] as const;
export const INTERVIEW_QUESTIONS = [
  'Narrative arc: the ask, the work, the result.',
  'Climax / money shot: which single moment to land and hold on.',
  'Destination: readme, x-post, linkedin, or product-hunt.',
  'Brand: accent color, frame type (phone/browser/terminal/desktop), light or dark.',
  'Product and repo names.',
  'Copy to feature verbatim (exact button labels, titles).',
  'Screenshot extraction: what to preserve, and what to simplify or remove.',
] as const;

export interface BriefFinding {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface BriefSummary {
  present: boolean;
  mode?: Brief['mode'];
  intent: BriefIntent;
  confirmed: boolean;
  requiredComplete: boolean;
  recommendedComplete: boolean;
  missingRequired: string[];
  missingRecommended: string[];
}

export interface ScreenshotRuntimeShare {
  shotDuration: number;
  totalDuration: number;
  share: number;
}

export interface BriefWarningOptions {
  forDestinations?: string[];
}

export interface ResolvedAssumptions {
  assumptions: string[];
  notices: BriefFinding[];
}

export function isPlaceholder(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^TODO\b/i.test(trimmed) || /^<[^>]+>$/.test(trimmed);
}

function filledText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0 && !isPlaceholder(value);
}

export function normalizePlacements(placement: Brief['placement']): string[] {
  if (placement === undefined) return [];
  return [...new Set(Array.isArray(placement) ? placement : [placement])];
}

export function briefSummary(config: DemoConfig): BriefSummary {
  const brief = config.brief;
  if (!brief) {
    return {
      present: false,
      intent: 'product',
      confirmed: false,
      requiredComplete: false,
      recommendedComplete: false,
      missingRequired: [...REQUIRED_BRIEF_FIELDS],
      missingRecommended: [...RECOMMENDED_BRIEF_FIELDS],
    };
  }

  const missingRequired = REQUIRED_BRIEF_FIELDS.filter((field) => {
    if (field === 'placement') return normalizePlacements(brief.placement).length === 0;
    if (field === 'screenshotPolicy') return brief.screenshotPolicy === undefined;
    return !filledText(brief[field]);
  });
  const missingRecommended = RECOMMENDED_BRIEF_FIELDS.filter((field) => !filledText(brief[field]));

  return {
    present: true,
    mode: brief.mode,
    intent: brief.intent ?? 'product',
    confirmed:
      brief.mode === 'user-confirmed' &&
      missingRequired.length === 0 &&
      missingRecommended.length === 0,
    requiredComplete: missingRequired.length === 0,
    recommendedComplete: missingRecommended.length === 0,
    missingRequired,
    missingRecommended,
  };
}

export function briefGateFinding(config: DemoConfig): BriefFinding | undefined {
  const summary = briefSummary(config);
  if (summary.confirmed) return undefined;

  const details = {
    mode: summary.mode,
    missingRequired: summary.missingRequired,
    missingRecommended: summary.missingRecommended,
    questions: INTERVIEW_QUESTIONS,
  };
  if (summary.mode === 'user-confirmed') {
    const missing = [...summary.missingRequired, ...summary.missingRecommended];
    return {
      code: 'brief.incomplete',
      message:
        `brief: user-confirmed interview is incomplete; fill ${missing.join(', ') || 'the missing brief fields'} ` +
        'before rendering, or pass --autonomous to label the output as inferred.',
      details,
    };
  }

  return {
    code: 'brief.unconfirmed',
    message:
      'brief: interview not confirmed. Ask the 7 interview questions, fill brief.mode: user-confirmed ' +
      'with audience/source/screenshotPolicy/placement/arc/climax, or pass --autonomous to label the output as inferred.',
    details,
  };
}

export function screenshotRuntimeShare(config: DemoConfig): ScreenshotRuntimeShare {
  const timeline = resolveTimeline(config);
  const shotDuration = timeline.scenes.reduce(
    (sum, scene) =>
      sum + (config.scenes[scene.renderIndex].type === 'screenshot' ? scene.duration : 0),
    0,
  );
  return {
    shotDuration,
    totalDuration: timeline.duration,
    share: timeline.duration > 0 ? shotDuration / timeline.duration : 0,
  };
}

export function briefWarnings(config: DemoConfig, opts: BriefWarningOptions = {}): BriefFinding[] {
  const warnings: BriefFinding[] = [];
  const brief = config.brief;
  if (!brief) {
    return [];
  }

  if (brief.screenshotPolicy) {
    const screenshotShare = screenshotRuntimeShare(config);
    const hasScreenshots = config.scenes.some((scene) => scene.type === 'screenshot');
    if (
      (brief.screenshotPolicy === 'reconstruct' || brief.screenshotPolicy === 'simplify') &&
      screenshotShare.share > 0.5
    ) {
      warnings.push(
        {
          code: 'brief.screenshotPolicyRuntime',
          message: `brief: screenshotPolicy is ${brief.screenshotPolicy}, but screenshot scenes are ${Math.round(
            screenshotShare.share * 100,
          )}% of runtime`,
        },
      );
    }
    if (brief.screenshotPolicy === 'raw-intentional' && !hasScreenshots) {
      warnings.push({
        code: 'brief.screenshotPolicyNoScreenshots',
        message: 'brief: screenshotPolicy is raw-intentional, but the config has no screenshot scenes',
      });
    }
  }

  const resolvedTheme = resolveTheme(config.theme);
  if (brief.brand?.accent && brief.brand.accent !== resolvedTheme.accent) {
    warnings.push({
      code: 'brief.brandAccent',
      message: `brief: brand.accent ${brief.brand.accent} does not match resolved theme accent ${resolvedTheme.accent}`,
    });
  }
  if (brief.brand?.mode && brief.brand.mode !== resolvedTheme.mode) {
    warnings.push({
      code: 'brief.brandMode',
      message: `brief: brand.mode ${brief.brand.mode} does not match resolved theme mode ${resolvedTheme.mode}`,
    });
  }
  if (brief.brand?.frame && brief.brand.frame !== config.frame.type) {
    warnings.push({
      code: 'brief.brandFrame',
      message: `brief: brand.frame ${brief.brand.frame} does not match config frame ${config.frame.type}`,
    });
  }

  const placements = normalizePlacements(brief.placement);
  const destinations = opts.forDestinations ?? [];
  if (
    placements.length > 0 &&
    destinations.length > 0 &&
    !placements.some((placement) => destinations.includes(placement))
  ) {
    warnings.push({
      code: 'brief.placementMismatch',
      message: `brief: placement ${placements.join(', ')} does not overlap --for target(s) ${destinations.join(', ')}`,
    });
  }

  return warnings;
}

export function resolveInferredAssumptions(
  config: DemoConfig,
  suppliedAssumptions: string[] = [],
): ResolvedAssumptions {
  const raw =
    suppliedAssumptions.length > 0
      ? suppliedAssumptions
      : config.brief?.assumptions ?? [];
  const normalized = raw.map((item) => item.trim()).filter(Boolean);
  const notices: BriefFinding[] = [];
  let assumptions = normalized;
  if (assumptions.length > 10) {
    assumptions = assumptions.slice(0, 10);
    notices.push({
      code: 'brief.assumptionsTruncated',
      message: 'brief: inferred assumptions list exceeded 10 entries; only the first 10 were recorded',
    });
  }
  if (assumptions.length === 0) {
    notices.push({
      code: 'brief.assumptionsMissing',
      message: 'brief: inferred render has no recorded assumptions; pass --assumption or set brief.assumptions',
    });
  }
  return { assumptions, notices };
}
