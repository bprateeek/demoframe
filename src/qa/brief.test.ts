import { describe, expect, it } from 'vitest';
import { demoConfigSchema, type DemoConfig } from '../config/schema.js';
import {
  briefSummary,
  briefWarnings,
  isPlaceholder,
  normalizePlacements,
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
      requiredComplete: false,
      recommendedComplete: false,
      missingRequired: ['audience', 'source', 'screenshotPolicy', 'placement'],
      missingRecommended: ['arc', 'climax'],
    });
    expect(briefWarnings(parse())).toEqual([
      expect.stringContaining('brief: no brief: block'),
    ]);
  });

  it('treats TODO and angle-bracket placeholders as unfilled', () => {
    expect(isPlaceholder('TODO: who is this for')).toBe(true);
    expect(isPlaceholder('<target audience>')).toBe(true);
    expect(isPlaceholder('Maintainers')).toBe(false);

    const warnings = briefWarnings(
      parse({
        brief: {
          audience: '<target audience>',
          source: 'TODO: screenshots / app under demo',
        },
      }),
    );
    const required = warnings.find((warning) => warning.includes('unfilled required'));
    expect(required).toContain('audience');
    expect(required).toContain('source');
    expect(required).toContain('screenshotPolicy');
    expect(required).toContain('placement');
  });

  it('tracks required and recommended completeness independently', () => {
    const partial = briefSummary(parse({ brief: { ...filledBrief, arc: undefined, climax: undefined } }));
    expect(partial.requiredComplete).toBe(true);
    expect(partial.recommendedComplete).toBe(false);
    expect(partial.missingRecommended).toEqual(['arc', 'climax']);

    const full = briefSummary(parse({ brief: filledBrief }));
    expect(full.requiredComplete).toBe(true);
    expect(full.recommendedComplete).toBe(true);
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
    expect(briefWarnings(dominantScreenshots).some((warning) => warning.includes('screenshotPolicy is reconstruct'))).toBe(
      true,
    );

    const noScreenshots = parse({
      brief: { ...filledBrief, screenshotPolicy: 'raw-intentional' },
    });
    expect(briefWarnings(noScreenshots).some((warning) => warning.includes('raw-intentional'))).toBe(true);
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
    expect(warnings.some((warning) => warning.includes('brand.accent'))).toBe(true);
    expect(warnings.some((warning) => warning.includes('brand.mode'))).toBe(true);
    expect(warnings.some((warning) => warning.includes('brand.frame'))).toBe(true);
    expect(warnings.some((warning) => warning.includes('does not overlap'))).toBe(true);
    expect(briefWarnings(config, { forDestinations: ['x-post', 'github-readme'] }).some((warning) => warning.includes('does not overlap'))).toBe(false);
  });
});
