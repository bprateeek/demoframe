import { describe, expect, it } from 'vitest';
import { demoConfigSchema, type DemoConfig } from '../config/schema.js';
import {
  briefGateFinding,
  briefSummary,
  briefWarnings,
  isPlaceholder,
  normalizePlacements,
  resolveInferredAssumptions,
  screenshotRuntimeShare,
} from './brief.js';

function parse(config: Record<string, unknown> = {}): DemoConfig {
  return demoConfigSchema.parse({
    frame: { type: 'phone' },
    scenes: [{ type: 'typing', duration: 3, text: 'hello' }],
    ...config,
  });
}

const filledBrief = {
  mode: 'user-confirmed',
  audience: 'README visitors',
  source: 'Product screenshots used as reference',
  screenshotPolicy: 'reconstruct',
  placement: 'github-readme',
  arc: 'Ask, automate, publish',
  climax: 'Green publish card',
} as const;

describe('brief QA helpers', () => {
  it('summarizes an absent brief with populated missing lists', () => {
    const summary = briefSummary(parse());
    expect(summary).toEqual({
      present: false,
      confirmed: false,
      requiredComplete: false,
      recommendedComplete: false,
      missingRequired: ['audience', 'source', 'screenshotPolicy', 'placement'],
      missingRecommended: ['arc', 'climax'],
    });
    expect(briefWarnings(parse())).toEqual([]);
    expect(briefGateFinding(parse())?.code).toBe('brief.unconfirmed');
  });

  it('treats TODO and angle-bracket placeholders as unfilled', () => {
    expect(isPlaceholder('TODO: who is this for')).toBe(true);
    expect(isPlaceholder('<target audience>')).toBe(true);
    expect(isPlaceholder('Maintainers')).toBe(false);

    const gate = briefGateFinding(
      parse({
        brief: {
          mode: 'user-confirmed',
          audience: '<target audience>',
          source: 'TODO: screenshots / app under demo',
        },
      }),
    );
    expect(gate?.code).toBe('brief.incomplete');
    expect(gate?.details?.missingRequired).toEqual(['audience', 'source', 'screenshotPolicy', 'placement']);
  });

  it('tracks required and recommended completeness independently', () => {
    const partial = briefSummary(parse({ brief: { ...filledBrief, arc: undefined, climax: undefined } }));
    expect(partial.requiredComplete).toBe(true);
    expect(partial.recommendedComplete).toBe(false);
    expect(partial.confirmed).toBe(false);
    expect(partial.missingRecommended).toEqual(['arc', 'climax']);

    const full = briefSummary(parse({ brief: filledBrief }));
    expect(full.requiredComplete).toBe(true);
    expect(full.recommendedComplete).toBe(true);
    expect(full.mode).toBe('user-confirmed');
    expect(full.confirmed).toBe(true);
    expect(briefWarnings(parse({ brief: filledBrief }))).toEqual([]);
  });

  it('normalizes placements and calculates screenshot runtime share', () => {
    expect(normalizePlacements('github-readme')).toEqual(['github-readme']);
    expect(normalizePlacements(['x-post', 'x-post', 'linkedin'])).toEqual(['x-post', 'linkedin']);
    const config = parse({
      scenes: [
        { type: 'typing', duration: 1, text: 'hi' },
        { type: 'screenshot', duration: 2, src: 'a.png' },
        { type: 'hold', duration: 2 },
      ],
    });
    expect(screenshotRuntimeShare(config)).toMatchObject({ shotDuration: 4, totalDuration: 5, share: 0.8 });
  });

  it('warns when screenshot policy contradicts scene content', () => {
    const dominantScreenshots = parse({
      brief: filledBrief,
      scenes: [
        { type: 'typing', duration: 1, text: 'hi' },
        { type: 'screenshot', duration: 3, src: 'a.png' },
      ],
    });
    expect(briefWarnings(dominantScreenshots).some((warning) => warning.message.includes('screenshotPolicy is reconstruct'))).toBe(
      true,
    );

    const noScreenshots = parse({
      brief: { ...filledBrief, screenshotPolicy: 'raw-intentional' },
    });
    expect(briefWarnings(noScreenshots).some((warning) => warning.message.includes('raw-intentional'))).toBe(true);
  });

  it('warns on brand mismatches and placement/preset mismatch', () => {
    const config = parse({
      theme: { preset: 'github-dark' },
      frame: { type: 'browser' },
      brief: {
        ...filledBrief,
        placement: ['github-readme'],
        brand: { accent: '#e2603a', mode: 'light', frame: 'phone' },
      },
    });
    const warnings = briefWarnings(config, { forDestinations: ['x-post', 'linkedin'] });
    expect(warnings.some((warning) => warning.message.includes('brand.accent'))).toBe(true);
    expect(warnings.some((warning) => warning.message.includes('brand.mode'))).toBe(true);
    expect(warnings.some((warning) => warning.message.includes('brand.frame'))).toBe(true);
    expect(warnings.some((warning) => warning.message.includes('does not overlap'))).toBe(true);
    expect(briefWarnings(config, { forDestinations: ['x-post', 'github-readme'] }).some((warning) => warning.message.includes('does not overlap'))).toBe(false);
  });

  it('resolves inferred assumptions from supplied values before YAML and caps at 10', () => {
    const config = parse({
      brief: { mode: 'inferred', assumptions: ['yaml assumption'] },
    });
    expect(resolveInferredAssumptions(config).assumptions).toEqual(['yaml assumption']);
    expect(resolveInferredAssumptions(config, [' supplied ', '']).assumptions).toEqual(['supplied']);

    const many = resolveInferredAssumptions(config, Array.from({ length: 12 }, (_, i) => `a${i}`));
    expect(many.assumptions).toHaveLength(10);
    expect(many.notices.map((notice) => notice.code)).toContain('brief.assumptionsTruncated');

    const missing = resolveInferredAssumptions(parse({ brief: { mode: 'inferred' } }));
    expect(missing.notices.map((notice) => notice.code)).toContain('brief.assumptionsMissing');
  });
});
