import { ConfigError } from '../config/load.js';
import type { ProofBindingReport } from '../qa/story.js';
import type { CheckFinding, CheckResult } from './check.js';
import { resolveShotGraph } from '../render/shotGraph.js';
import { structuralSignature, type StructuralSignature } from '../qa/signature.js';
import { appearanceSignature, type AppearanceSignature } from '../qa/diversity.js';

export const CHECK_JSON_SCHEMA_VERSION = 1 as const;
export type CheckFindingSeverity = 'error' | 'warning' | 'notice';

export interface CheckJsonFinding extends CheckFinding {
  severity: CheckFindingSeverity;
}

export interface CheckJsonDocument {
  schemaVersion: typeof CHECK_JSON_SCHEMA_VERSION;
  command: 'check';
  valid: boolean;
  strict: boolean;
  destinations: string[];
  config?: {
    path: string;
    sourceHash: string;
    suppliedPaths: string[];
    authoringSource: 'legacy' | 'shots' | 'recipe';
    sceneCount: number;
    shotCount: number;
    durationS: number;
    fps: number;
    frame: string;
  };
  findings: CheckJsonFinding[];
  structuralSignature?: StructuralSignature;
  appearanceSignature?: AppearanceSignature;
  story?: {
    version: 2;
    profile?: string;
    profileSource?: string;
    proofBindings: ProofBindingReport[];
    appearanceDelta: NonNullable<CheckResult['story']>['appearanceDelta'];
    contextManifest?: { file: string; hash: string; entryIds: string[] };
  };
}

function withSeverity(items: CheckFinding[], severity: CheckFindingSeverity): CheckJsonFinding[] {
  return items.map((item) => ({ severity, ...item }));
}

export function checkJsonDocument(
  result: CheckResult,
  opts: { strict?: boolean; destinations?: string[] } = {},
): CheckJsonDocument {
  const strict = opts.strict ?? false;
  const graph = resolveShotGraph(result.loaded.config);
  const scenes = result.loaded.config.scenes;
  const findings = [
    ...withSeverity(result.errors, 'error'),
    ...withSeverity(result.warnings, 'warning'),
    ...withSeverity(result.notices, 'notice'),
  ];
  const story = result.story?.active
    ? {
        version: 2 as const,
        ...(result.story.profile ? { profile: result.story.profile } : {}),
        ...(result.story.profileSource ? { profileSource: result.story.profileSource } : {}),
        proofBindings: result.story.proofBindings,
        appearanceDelta: result.story.appearanceDelta,
        ...(result.story.context
          ? {
              contextManifest: {
                file: result.story.context.file,
                hash: result.story.context.hash,
                entryIds: [...result.story.context.entries.keys()],
              },
            }
          : {}),
      }
    : undefined;
  return {
    schemaVersion: CHECK_JSON_SCHEMA_VERSION,
    command: 'check',
    valid: result.errors.length === 0 && (!strict || result.warnings.length === 0),
    strict,
    destinations: opts.destinations ?? [],
    config: {
      path: result.loaded.configPath,
      sourceHash: result.loaded.provenance.sourceHash,
      suppliedPaths: result.loaded.provenance.suppliedPaths,
      authoringSource: graph.source,
      sceneCount: graph.source !== 'legacy'
        ? graph.shots.reduce((sum, shot) => sum + shot.objects.length, 0)
        : scenes.length,
      shotCount: graph.shots.length,
      durationS: graph.duration,
      fps: result.loaded.config.output.fps,
      frame: result.loaded.config.frame.type,
    },
    findings,
    structuralSignature: structuralSignature(result.loaded.config),
    appearanceSignature: appearanceSignature(result.loaded.config),
    ...(story ? { story } : {}),
  };
}

export function checkJsonFailure(error: unknown, strict = false, destinations: string[] = []): CheckJsonDocument {
  const configError = error instanceof ConfigError ? error : undefined;
  return {
    schemaVersion: CHECK_JSON_SCHEMA_VERSION,
    command: 'check',
    valid: false,
    strict,
    destinations,
    findings: [
      {
        severity: 'error',
        code: configError ? 'config.invalid' : 'check.failed',
        message: configError?.message ?? (error as Error).message,
        ...(configError?.issues.length ? { details: { issues: configError.issues } } : {}),
      },
    ],
  };
}
