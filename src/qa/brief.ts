import type { DemoConfig } from '../config/schema.js';
import { resolveTimeline } from '../render/timeline.js';
import { resolveTheme } from '../templates/theme.js';

type Brief = NonNullable<DemoConfig['brief']>;

export const REQUIRED_BRIEF_FIELDS = ['audience', 'source', 'screenshotPolicy', 'placement'] as const;
export const RECOMMENDED_BRIEF_FIELDS = ['arc', 'climax'] as const;

export interface BriefSummary {
  present: boolean;
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
    requiredComplete: missingRequired.length === 0,
    recommendedComplete: missingRecommended.length === 0,
    missingRequired,
    missingRecommended,
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

export function briefWarnings(config: DemoConfig, opts: BriefWarningOptions = {}): string[] {
  const warnings: string[] = [];
  const brief = config.brief;
  const summary = briefSummary(config);
  if (!brief) {
    return [
      'brief: no brief: block; record the authoring interview (audience, source, screenshotPolicy, placement). See AGENTS.md.',
    ];
  }

  if (summary.missingRequired.length > 0) {
    warnings.push(`brief: unfilled required field(s): ${summary.missingRequired.join(', ')}`);
  }
  if (summary.missingRecommended.length > 0) {
    warnings.push(`brief: unfilled recommended field(s): ${summary.missingRecommended.join(', ')}`);
  }

  if (brief.screenshotPolicy) {
    const screenshotShare = screenshotRuntimeShare(config);
    const hasScreenshots = config.scenes.some((scene) => scene.type === 'screenshot');
    if (
      (brief.screenshotPolicy === 'reconstruct' || brief.screenshotPolicy === 'simplify') &&
      screenshotShare.share > 0.5
    ) {
      warnings.push(
        `brief: screenshotPolicy is ${brief.screenshotPolicy}, but screenshot scenes are ${Math.round(
          screenshotShare.share * 100,
        )}% of runtime`,
      );
    }
    if (brief.screenshotPolicy === 'raw-intentional' && !hasScreenshots) {
      warnings.push(
        'brief: screenshotPolicy is raw-intentional, but the config has no screenshot scenes',
      );
    }
  }

  const resolvedTheme = resolveTheme(config.theme);
  if (brief.brand?.accent && brief.brand.accent !== resolvedTheme.accent) {
    warnings.push(
      `brief: brand.accent ${brief.brand.accent} does not match resolved theme accent ${resolvedTheme.accent}`,
    );
  }
  if (brief.brand?.mode && brief.brand.mode !== resolvedTheme.mode) {
    warnings.push(
      `brief: brand.mode ${brief.brand.mode} does not match resolved theme mode ${resolvedTheme.mode}`,
    );
  }
  if (brief.brand?.frame && brief.brand.frame !== config.frame.type) {
    warnings.push(
      `brief: brand.frame ${brief.brand.frame} does not match config frame ${config.frame.type}`,
    );
  }

  const placements = normalizePlacements(brief.placement);
  const destinations = opts.forDestinations ?? [];
  if (
    placements.length > 0 &&
    destinations.length > 0 &&
    !placements.some((placement) => destinations.includes(placement))
  ) {
    warnings.push(
      `brief: placement ${placements.join(', ')} does not overlap --for target(s) ${destinations.join(', ')}`,
    );
  }

  return warnings;
}
