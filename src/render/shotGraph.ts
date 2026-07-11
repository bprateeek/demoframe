import crypto from 'node:crypto';
import type { DemoConfig, Scene, Shot, ShotObject, ShotSlot } from '../config/schema.js';
import { compileRecipe, type RecipeSignature } from '../recipes/registry.js';

export type ShotGraphSource = 'legacy' | 'shots' | 'recipe';

export interface ResolvedShotObject {
  key: string;
  id: string;
  slot: ShotSlot;
  kind: ShotObject['kind'];
  scene?: Scene;
  primitive?: Exclude<ShotObject, { kind: 'scene' }>;
  sceneIndex: number;
  assetPrefix: string;
  sourceShotId: string;
  carried: boolean;
  carryFrom?: string;
  carry: boolean;
  enter: ShotObject['enter'];
  emphasize: ShotObject['emphasize'];
  exit: ShotObject['exit'];
}

export interface ResolvedShot {
  index: number;
  id: string;
  beatId: string;
  start: number;
  end: number;
  duration: number;
  objects: ResolvedShotObject[];
  camera?: Shot['camera'];
  transition: Shot['transition'];
  ambient?: Shot['ambient'];
}

export interface ResolvedShotGraph {
  schemaVersion: 1;
  source: ShotGraphSource;
  renderPath: 'legacy' | 'compositor';
  duration: number;
  fps: number;
  frameCount: number;
  shots: ResolvedShot[];
  recipe?: RecipeSignature;
  loop?: { type: 'crossfade'; duration: number };
  hash: string;
}

const inertMotion = { type: 'none' as const, duration: 0.45 };
const inertEmphasis = { type: 'none' as const, at: 0, duration: 0.8 };
const cutTransition = { type: 'cut' as const, duration: 0.45 };

function graphHash(graph: Omit<ResolvedShotGraph, 'hash'>): string {
  return crypto.createHash('sha256').update(JSON.stringify(graph)).digest('hex');
}

function finishGraph(graph: Omit<ResolvedShotGraph, 'hash'>): ResolvedShotGraph {
  return { ...graph, hash: graphHash(graph) };
}

function legacyGraph(config: DemoConfig, fps: number): ResolvedShotGraph {
  let cursor = 0;
  let lastScene: Scene | undefined;
  let lastSceneIndex = 0;
  const shots = config.scenes.map((scene, index): ResolvedShot => {
    const start = cursor;
    cursor += scene.duration;
    const isHold = scene.type === 'hold';
    const rendered = isHold && lastScene ? lastScene : scene;
    const renderedIndex = isHold ? lastSceneIndex : index;
    if (!isHold) {
      lastScene = scene;
      lastSceneIndex = index;
    }
    const objectId = `legacy-object-${renderedIndex + 1}`;
    return {
      index,
      id: `legacy-shot-${index + 1}`,
      beatId: scene.beatId ?? `legacy-beat-${index + 1}`,
      start,
      end: cursor,
      duration: scene.duration,
      objects: [
        {
          key: `legacy-shot-${index + 1}:${objectId}`,
          id: objectId,
          slot: 'hero',
        kind: 'scene',
        scene: rendered,
          sceneIndex: renderedIndex,
          assetPrefix: `scenes[${renderedIndex}]`,
          sourceShotId: `legacy-shot-${renderedIndex + 1}`,
          carried: isHold,
          ...(isHold ? { carryFrom: `legacy-shot-${renderedIndex + 1}` } : {}),
          carry: isHold,
          enter: inertMotion,
          emphasize: inertEmphasis,
          exit: inertMotion,
        },
      ],
      transition: cutTransition,
    };
  });
  const graph = {
    schemaVersion: 1 as const,
    source: 'legacy' as const,
    renderPath: 'legacy' as const,
    duration: cursor,
    fps,
    frameCount: Math.max(1, Math.round(cursor * fps)),
    shots,
  };
  return finishGraph(graph);
}

function directGraph(config: DemoConfig, fps: number, source: 'shots' | 'recipe'): ResolvedShotGraph {
  const authored = config.shots ?? [];
  let cursor = 0;
  let sceneIndex = 0;
  let carried = new Map<string, ResolvedShotObject>();
  const shots = authored.map((shot, index): ResolvedShot => {
    const start = cursor;
    cursor += shot.duration;
    const explicitIds = new Set(shot.objects.map((object) => object.id));
    const objects: ResolvedShotObject[] = [];

    for (const [objectIndex, object] of shot.objects.entries()) {
      const previous = carried.get(object.id);
      objects.push({
        key: `${shot.id}:${object.id}`,
        id: object.id,
        slot: object.slot,
        kind: object.kind,
        ...(object.kind === 'scene'
          ? { scene: { ...object.scene, duration: shot.duration } }
          : { primitive: object }),
        sceneIndex: sceneIndex++,
        assetPrefix: `shots[${index}].objects[${objectIndex}]${object.kind === 'scene' ? '.scene' : ''}`,
        sourceShotId: shot.id,
        carried: Boolean(previous),
        ...(previous ? { carryFrom: previous.sourceShotId } : {}),
        carry: object.carry,
        enter: object.enter,
        emphasize: object.emphasize,
        exit: object.exit,
      });
    }
    for (const previous of carried.values()) {
      if (explicitIds.has(previous.id)) continue;
      objects.push({
        ...previous,
        key: `${shot.id}:${previous.id}`,
        sceneIndex: sceneIndex++,
        carried: true,
        carryFrom: previous.sourceShotId,
      });
    }

    carried = new Map(objects.filter((object) => object.carry).map((object) => [object.id, object]));
    return {
      index,
      id: shot.id,
      beatId: shot.beatId,
      start,
      end: cursor,
      duration: shot.duration,
      objects,
      ...(shot.camera ? { camera: shot.camera } : {}),
      transition: shot.transition,
      ...(shot.ambient ? { ambient: shot.ambient } : {}),
    };
  });
  const graph = {
    schemaVersion: 1 as const,
    source,
    renderPath: 'compositor' as const,
    duration: cursor,
    fps,
    frameCount: Math.max(1, Math.round(cursor * fps)),
    shots,
    ...(source === 'recipe' ? { recipe: compileRecipe(config).signature } : {}),
    ...(config.profile === 'readme-loop' ? { loop: { type: 'crossfade' as const, duration: 0.45 } } : {}),
  };
  return finishGraph(graph);
}

export function authoringSource(config: DemoConfig): ShotGraphSource {
  if (config.brief?.story?.recipe) return 'recipe';
  return (config.shots?.length ?? 0) > 0 ? 'shots' : 'legacy';
}

export function resolveShotGraph(config: DemoConfig, fpsOverride?: number): ResolvedShotGraph {
  const fps = fpsOverride ?? config.output.fps;
  const source = authoringSource(config);
  return source === 'legacy' ? legacyGraph(config, fps) : directGraph(config, fps, source);
}
