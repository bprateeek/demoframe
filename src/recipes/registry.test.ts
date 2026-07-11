import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config/load.js';
import { demoConfigSchema } from '../config/schema.js';
import { resolveShotGraph } from '../render/shotGraph.js';
import { RECIPE_NAMES, RECIPE_VARIANTS } from './registry.js';

function recipeConfig(name: (typeof RECIPE_NAMES)[number], variant: string) {
  return {
    profile: 'readme-loop',
    frame: { type: 'browser' },
    brief: {
      product: 'Example',
      story: {
        version: 2,
        promise: 'Make the result obvious',
        proof: [{ evidence: 'proof', mode: 'exact', display: '42%' }],
        recipe: { name, recipeVersion: 1, variant },
      },
    },
  };
}

describe('recipe compiler', () => {
  it('compiles every versioned named variant into validated deterministic shots', () => {
    for (const name of RECIPE_NAMES) {
      for (const variant of RECIPE_VARIANTS[name]) {
        const first = demoConfigSchema.parse(recipeConfig(name, variant));
        const second = demoConfigSchema.parse(recipeConfig(name, variant));
        expect(first.scenes).toEqual([]);
        expect(first.shots).toEqual(second.shots);
        expect(first.brief?.story?.beats?.map((beat) => beat.role)).toEqual(['hook', 'build', 'payoff']);
        const graph = resolveShotGraph(first);
        expect(graph.source).toBe('recipe');
        expect(graph.renderPath).toBe('compositor');
        expect(graph.recipe).toMatchObject({ recipe: name, recipeVersion: 1, variant });
      }
    }
  });

  it('rejects arbitrary variants and mixed authoring sources', () => {
    expect(demoConfigSchema.safeParse(recipeConfig('metric-proof', 'random-layout')).success).toBe(false);
    expect(demoConfigSchema.safeParse({
      ...recipeConfig('metric-proof', 'proof-first'),
      shots: [{ id: 'manual', beatId: 'build', duration: 2, objects: [{ id: 'copy', slot: 'hero', kind: 'kinetic-text', text: 'manual' }] }],
    }).success).toBe(false);
  });

  it('makes same-recipe explicit variants differ in at least two structural dimensions', () => {
    const proofFirst = resolveShotGraph(loadConfig('examples/recipes/metric-proof.yml').config).recipe!;
    const surfaceFirst = resolveShotGraph(loadConfig('examples/recipes/metric-proof-surface-first.yml').config).recipe!;
    expect(proofFirst.recipe).toBe(surfaceFirst.recipe);
    expect(proofFirst.recipeVersion).toBe(surfaceFirst.recipeVersion);
    expect(proofFirst.beatSequence).toEqual(surfaceFirst.beatSequence);
    const dimensions = [
      'compositionFamily', 'motif', 'heroObject', 'motionPersonality',
      'productSurfaceTreatment', 'supportingObjectArrangement',
    ] as const;
    expect(dimensions.filter((dimension) => proofFirst[dimension] !== surfaceFirst[dimension]).length).toBeGreaterThanOrEqual(2);
  });
});
