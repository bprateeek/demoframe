import type { DemoConfig } from '../config/schema.js';
import { resolveShotGraph } from '../render/shotGraph.js';

export interface StructuralSignature {
  recipe: string;
  recipeVersion: number;
  variant: string;
  beatSequence: string[];
  compositionFamily: string;
  motif: string;
  heroObject: string;
  motionPersonality: string;
  productSurfaceTreatment: string;
  supportingObjectArrangement: string;
}

function sceneMotif(config: DemoConfig): string {
  const types = config.scenes.filter((scene) => scene.type !== 'hold').map((scene) => scene.type);
  return [...new Set(types)].join('+') || 'none';
}

export function structuralSignature(config: DemoConfig): StructuralSignature {
  const graph = resolveShotGraph(config);
  if (graph.recipe) return graph.recipe;
  if (graph.source === 'legacy') {
    const hero = config.scenes.find((scene) => scene.type !== 'hold')?.type ?? 'none';
    return {
      recipe: 'none',
      recipeVersion: 0,
      variant: 'legacy-scenes',
      beatSequence: config.brief?.story?.beats?.map((beat) => beat.role) ?? [],
      compositionFamily: config.cinematic?.composition ?? `single-${config.frame.type}`,
      motif: sceneMotif(config),
      heroObject: hero,
      motionPersonality: config.artDirection?.motionPersonality ?? config.cinematic?.motion ?? 'standard',
      productSurfaceTreatment: config.scenes.some((scene) => scene.type === 'screen') ? `screen-${config.frame.type}` : 'none',
      supportingObjectArrangement: 'none',
    };
  }
  const authored = config.shots ?? [];
  const kinds = authored.flatMap((shot) => shot.objects.map((object) => object.kind));
  const hero = authored.flatMap((shot) => shot.objects).find((object) => object.slot === 'hero');
  const supportSlots = authored.flatMap((shot) => shot.objects.filter((object) => object.slot === 'supporting')).length;
  const hasProduct = kinds.includes('product-surface') || authored.some((shot) => shot.objects.some((object) => object.kind === 'scene' && object.scene.type === 'screen'));
  return {
    recipe: 'none',
    recipeVersion: 0,
    variant: 'direct-shots',
    beatSequence: config.brief?.story?.beats?.map((beat) => beat.role) ?? [],
    compositionFamily: supportSlots > 0 ? 'split-stage' : 'focus-stage',
    motif: [...new Set(kinds)].join('+') || 'none',
    heroObject: hero?.kind ?? 'none',
    motionPersonality: config.artDirection?.motionPersonality ?? 'standard',
    productSurfaceTreatment: hasProduct ? `semantic-${config.frame.type}` : 'none',
    supportingObjectArrangement: supportSlots > 0 ? 'supporting-slot' : 'none',
  };
}
