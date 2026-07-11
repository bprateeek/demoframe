import path from 'node:path';
import type { LoadedConfig } from '../config/load.js';
import { resolveProfile, type ProfileResolution } from '../config/profiles.js';
import type { DemoConfig, ProfileName, StoryProof } from '../config/schema.js';
import { validateContextManifest, type ValidatedContextManifest } from '../context/load.js';
import type { ContextEntry, MetricContextEntry } from '../context/schema.js';
import { sceneFrame } from '../render/chrome.js';
import { isPlaceholder } from './brief.js';
import { sceneTextLeaves, shotObjectTextLeaves, type SceneTextLeaf } from './sceneText.js';
import { identityTokenSubsequence, nfcContains } from './textMatch.js';
import { validateAppearanceDelta, type AppearanceDeltaItem } from './appearance.js';

export interface StoryFinding {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ProofBindingReport {
  evidence: string;
  mode: StoryProof['mode'];
  display?: string;
  expected?: string;
  entryKind?: ContextEntry['kind'];
  bound: boolean;
  semanticEquivalenceClaimed: false;
}

export interface StoryValidationResult {
  active: boolean;
  profile?: ProfileName;
  profileSource?: ProfileResolution['source'];
  errors: StoryFinding[];
  warnings: StoryFinding[];
  notices: StoryFinding[];
  proofBindings: ProofBindingReport[];
  appearanceDelta: AppearanceDeltaItem[];
  context?: ValidatedContextManifest;
}

function finding(code: string, message: string, details?: Record<string, unknown>): StoryFinding {
  return details ? { code, message, details } : { code, message };
}

function formatNumber(value: number, decimals: number): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const trimmedFraction = fraction?.replace(/0+$/, '');
  return `${value < 0 ? '-' : ''}${grouped}${trimmedFraction ? `.${trimmedFraction}` : ''}`;
}

export function formatContextMetric(entry: MetricContextEntry): string {
  const decimals = entry.decimals;
  if (entry.formatter === 'duration-ms') {
    return entry.value >= 1000
      ? `${formatNumber(entry.value / 1000, decimals)} s`
      : `${formatNumber(entry.value, decimals)} ms`;
  }
  if (entry.formatter === 'bytes') {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = entry.value;
    let unit = 0;
    while (Math.abs(value) >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${formatNumber(value, decimals)} ${units[unit]}`;
  }
  if (entry.formatter === 'compact') {
    const scales: Array<[number, string]> = [
      [1e9, 'B'],
      [1e6, 'M'],
      [1e3, 'K'],
    ];
    const scale = scales.find(([threshold]) => Math.abs(entry.value) >= threshold);
    const number = scale ? formatNumber(entry.value / scale[0], decimals) + scale[1] : formatNumber(entry.value, decimals);
    return entry.unit ? `${number} ${entry.unit}` : number;
  }
  const number = formatNumber(entry.value, decimals);
  return entry.unit ? `${number} ${entry.unit}` : number;
}

function exactEntryText(entry: ContextEntry): string | undefined {
  switch (entry.kind) {
    case 'metric':
      return entry.unit ? `${entry.value} ${entry.unit}` : String(entry.value);
    case 'claim':
    case 'copy':
      return entry.text;
    case 'command':
      return entry.result ?? entry.command;
    case 'route':
      return entry.label;
    case 'vocab':
    case 'metaphor':
      return entry.text;
    case 'asset':
      return undefined;
  }
}

function renderedLeaves(config: DemoConfig): Array<SceneTextLeaf & { sceneIndex: number }> {
  if ((config.shots?.length ?? 0) > 0) {
    let sceneIndex = 0;
    return (config.shots ?? []).flatMap((shot, shotIndex) =>
      shot.objects.flatMap((object, objectIndex) => {
        const index = sceneIndex++;
        return shotObjectTextLeaves(object, shotIndex === 0 && objectIndex === 0 ? config.frame : undefined)
          .filter((leaf) => leaf.durable)
          .map((leaf) => ({ ...leaf, path: `shots[${shotIndex}].objects[${objectIndex}].${object.kind === 'scene' ? 'scene.' : ''}${leaf.path}`, sceneIndex: index }));
      }),
    );
  }
  return config.scenes.flatMap((scene, sceneIndex) =>
    sceneTextLeaves(scene, sceneFrame(config, sceneIndex))
      .filter((leaf) => leaf.durable)
      .map((leaf) => ({ ...leaf, sceneIndex })),
  );
}

function visibleExact(leaves: SceneTextLeaf[], display: string): boolean {
  return leaves.some((leaf) => nfcContains(leaf.text, display));
}

function pushBindingFinding(
  result: StoryValidationResult,
  config: DemoConfig,
  item: StoryFinding,
): void {
  if (config.brief?.mode === 'user-confirmed') {
    if (config.brief.screenshotPolicy === 'raw-intentional') result.warnings.push(item);
    else result.errors.push(item);
  } else {
    result.notices.push({
      ...item,
      code: `${item.code}.inferred`,
      message: `${item.message} (inferred brief; eval applies its own binding contract)`,
    });
  }
}

function validateBeatState(config: DemoConfig, profile: ProfileName | undefined, result: StoryValidationResult): void {
  const beats = config.brief?.story?.beats ?? [];
  if (beats.length === 0) {
    result.errors.push(finding('story.beats.required', 'brief.story.beats needs an ordered hook/build/payoff sequence'));
    return;
  }
  const roles = beats.map((beat) => beat.role);
  const hookIndexes = roles.flatMap((role, index) => (role === 'hook' ? [index] : []));
  const payoffIndexes = roles.flatMap((role, index) => (role === 'payoff' ? [index] : []));
  const buildIndexes = roles.flatMap((role, index) => (role === 'build' ? [index] : []));
  const outroIndexes = roles.flatMap((role, index) => (role === 'outro' ? [index] : []));
  if (hookIndexes.length !== 1 || hookIndexes[0] !== 0) {
    result.errors.push(finding('story.beat.hook', 'story beats need exactly one hook and it must be first', { roles }));
  }
  if (buildIndexes.length < 1) {
    result.errors.push(finding('story.beat.build', 'story beats need one or more build beats', { roles }));
  }
  if (payoffIndexes.length !== 1) {
    result.errors.push(finding('story.beat.payoff', 'story beats need exactly one payoff', { roles }));
  }
  const payoffIndex = payoffIndexes[0] ?? -1;
  if (outroIndexes.length > 1 || outroIndexes.some((index) => index < payoffIndex)) {
    result.errors.push(finding('story.beat.outro', 'outro is optional, occurs at most once, and must follow payoff', { roles }));
  }
  if (payoffIndex >= 0 && buildIndexes.some((index) => index > payoffIndex)) {
    result.errors.push(finding('story.beat.afterPayoff', 'build/content beats cannot occur after payoff', { roles }));
  }
  const ids = beats.map((beat) => beat.id);
  if (new Set(ids).size !== ids.length) {
    result.errors.push(finding('story.beat.duplicateId', 'story beat ids must be unique', { ids }));
  }
  beats.forEach((beat, index) => {
    if (isPlaceholder(beat.id)) {
      result.errors.push(finding('story.beat.placeholder', `story beat ${index} still has a placeholder id`, { index, id: beat.id }));
    }
  });

  const idToIndex = new Map(beats.map((beat, index) => [beat.id, index]));
  const used = new Set<string>();
  let previousBeatIndex = -1;
  const bindings = (config.shots?.length ?? 0) > 0
    ? (config.shots ?? []).map((shot, index) => ({ beatId: shot.beatId, at: `shots[${index}]`, index }))
    : config.scenes
        .map((scene, index) => ({ scene, beatId: scene.beatId, at: `scenes[${index}]`, index }))
        .filter((item) => item.scene.type !== 'hold');
  bindings.forEach((binding) => {
    if (!binding.beatId) {
      result.errors.push(finding('story.beat.sceneMissing', `${binding.at} needs beatId under story v2`, { sceneIndex: binding.index }));
      return;
    }
    const beatIndex = idToIndex.get(binding.beatId);
    if (beatIndex === undefined) {
      result.errors.push(
        finding('story.beat.unknown', `${binding.at}.beatId "${binding.beatId}" is not declared in brief.story.beats`, {
          sceneIndex: binding.index,
          beatId: binding.beatId,
        }),
      );
      return;
    }
    used.add(binding.beatId);
    if (beatIndex < previousBeatIndex) {
      result.errors.push(
        finding('story.beat.sceneOrder', `${binding.at} moves backward in the declared beat sequence`, {
          sceneIndex: binding.index,
          beatId: binding.beatId,
        }),
      );
    }
    previousBeatIndex = Math.max(previousBeatIndex, beatIndex);
  });
  for (const beat of beats) {
    if (!used.has(beat.id)) {
      result.errors.push(finding('story.beat.unbound', `story beat "${beat.id}" is not referenced by a content scene`, { beatId: beat.id }));
    }
  }

  if (profile === 'readme-loop' && (beats.length !== 3 || roles.join(',') !== 'hook,build,payoff')) {
    result.errors.push(
      finding('profile.readmeLoop.beats', 'readme-loop needs exactly three beats: hook, build, payoff', { roles }),
    );
  }
  if (profile === 'social-film' && roles.at(-1) !== 'outro') {
    result.errors.push(finding('profile.socialFilm.outro', 'social-film needs a branded outro/end-slate beat'));
  }
}

function validateProfileRules(config: DemoConfig, profile: ProfileName | undefined, result: StoryValidationResult): void {
  if (!profile) return;
  const duration = ((config.shots?.length ?? 0) > 0 ? config.shots ?? [] : config.scenes)
    .reduce((sum, item) => sum + item.duration, 0);
  const bounds: Record<ProfileName, [number, number]> = {
    'readme-loop': [8, 12],
    'social-film': [15, 30],
    'product-tour': [20, 45],
  };
  const [min, max] = bounds[profile];
  if (duration < min || duration > max) {
    result.errors.push(
      finding('profile.duration', `${profile} duration must be ${min}-${max}s; got ${duration.toFixed(1)}s`, {
        profile,
        duration,
        min,
        max,
      }),
    );
  }
  if (profile === 'social-film' && (config.frame.width ?? 0) && config.frame.width && config.frame.height) {
    const ratio = config.frame.width / config.frame.height;
    if (Math.abs(ratio - 16 / 9) > 0.08) {
      result.errors.push(finding('profile.socialFilm.aspect', 'social-film requires a 16:9 frame', { ratio }));
    }
  }
  const productSurfaceShots = (config.shots?.length ?? 0) > 0
    ? (config.shots ?? []).filter((shot) => shot.objects.some((object) =>
      object.kind === 'product-surface' || (object.kind === 'scene' && object.scene.type === 'screen'),
    )).length
    : config.scenes.filter((scene) => scene.type === 'screen').length;
  if (profile === 'product-tour' && productSurfaceShots < 2) {
    result.errors.push(
      finding(
        'profile.productTour.surface',
        'product-tour needs a persistent product surface; direct-scene configs require at least two screen scenes',
      ),
    );
  }
}

function validateProof(
  config: DemoConfig,
  context: ValidatedContextManifest | undefined,
  leaves: SceneTextLeaf[],
  result: StoryValidationResult,
): void {
  const proof = config.brief?.story?.proof ?? [];
  if (proof.length === 0) {
    result.errors.push(finding('story.proof.required', 'brief.story.proof needs at least one context-backed proof item'));
    return;
  }
  if (!context) {
    result.errors.push(
      finding('context.required', 'story proof references require context.manifest and demoframe-context.yml'),
    );
    return;
  }
  for (const item of proof) {
    const entry = context.entries.get(item.evidence);
    if (!entry) {
      result.errors.push(
        finding('story.proof.evidenceMissing', `proof evidence "${item.evidence}" is not present in the context manifest`, {
          evidence: item.evidence,
        }),
      );
      result.proofBindings.push({
        evidence: item.evidence,
        mode: item.mode,
        ...(item.display ? { display: item.display } : {}),
        bound: false,
        semanticEquivalenceClaimed: false,
      });
      continue;
    }
    let expected: string | undefined;
    if (item.mode === 'formatted') {
      if (entry.kind !== 'metric') {
        result.errors.push(
          finding('story.proof.formatterKind', `formatted proof "${item.evidence}" must reference a metric entry`, {
            evidence: item.evidence,
            kind: entry.kind,
          }),
        );
      } else {
        expected = formatContextMetric(entry);
        if (!item.display || item.display !== expected) {
          result.errors.push(
            finding('story.proof.formattedDisplay', `proof "${item.evidence}" display must equal formatter output "${expected}"`, {
              evidence: item.evidence,
              expected,
              display: item.display,
            }),
          );
        }
      }
    } else if (item.mode === 'exact') {
      expected = exactEntryText(entry);
      if (!expected) {
        result.errors.push(
          finding('story.proof.exactKind', `exact proof "${item.evidence}" does not reference text-bearing evidence`, {
            evidence: item.evidence,
            kind: entry.kind,
          }),
        );
      }
      if (item.display && expected && item.display !== expected) {
        result.errors.push(
          finding('story.proof.exactDisplay', `exact proof display must match manifest text "${expected}"`, {
            evidence: item.evidence,
            expected,
            display: item.display,
          }),
        );
      }
    } else {
      if (config.brief?.mode !== 'user-confirmed') {
        result.errors.push(
          finding(
            'story.proof.paraphraseConfirmedOnly',
            `paraphrase proof "${item.evidence}" is allowed only for mode: user-confirmed briefs`,
            { evidence: item.evidence },
          ),
        );
      }
      if (!item.display) {
        result.errors.push(
          finding('story.proof.paraphraseDisplay', `paraphrase proof "${item.evidence}" needs display copy`, {
            evidence: item.evidence,
          }),
        );
      }
      expected = item.display;
    }
    const display = item.mode === 'paraphrase' ? item.display : item.display ?? expected;
    const bound = Boolean(display && visibleExact(leaves, display));
    if (display && !bound) {
      pushBindingFinding(
        result,
        config,
        finding(
          'story.proof.unbound',
          `proof "${item.evidence}" expects durable rendered copy "${display}"`,
          { evidence: item.evidence, display, mode: item.mode },
        ),
      );
    }
    result.proofBindings.push({
      evidence: item.evidence,
      mode: item.mode,
      ...(display ? { display } : {}),
      ...(expected ? { expected } : {}),
      entryKind: entry.kind,
      bound,
      semanticEquivalenceClaimed: false,
    });
  }
}

function artDirectionNotices(loaded: LoadedConfig): StoryFinding[] {
  const paths = loaded.provenance.suppliedPaths.filter((path) => path.startsWith('artDirection.'));
  const leaves = paths.filter(
    (candidate) => !paths.some((other) => other !== candidate && (other.startsWith(`${candidate}.`) || other.startsWith(`${candidate}[`))),
  );
  return leaves.map((path) =>
    finding(
      'artDirection.declaredNotRendered',
      `${path} is declared as intent but is not rendered in P2; it is excluded from appearance-delta enforcement`,
      { path, effective: false },
    ),
  );
}

export function validateStoryV2(loaded: LoadedConfig, destinations: string[] = []): StoryValidationResult {
  const profile = resolveProfile(loaded.config, destinations);
  const result: StoryValidationResult = {
    active: profile.storyV2,
    profile: profile.profile,
    profileSource: profile.source,
    errors: [...profile.errors],
    warnings: [...profile.warnings],
    notices: artDirectionNotices(loaded),
    proofBindings: [],
    appearanceDelta: [],
  };

  const context = validateContextManifest(loaded);
  if (context) {
    result.context = context;
    result.errors.push(...context.errors);
    result.warnings.push(...context.warnings);
  }
  if (!profile.storyV2) {
    if ((loaded.config.shots?.length ?? 0) > 0) {
      result.active = true;
      result.errors.push(
        finding('shots.storyV2Required', 'direct shots require brief.story.version: 2 and an explicit profile'),
      );
    }
    return result;
  }

  const appearance = validateAppearanceDelta(loaded, context);
  result.appearanceDelta = appearance.items;
  result.errors.push(...appearance.errors);
  result.warnings.push(...appearance.warnings);
  result.notices.push(...appearance.notices);

  const story = loaded.config.brief?.story;
  if (!story?.promise || isPlaceholder(story.promise)) {
    result.errors.push(finding('story.promise.required', 'brief.story.promise needs confirmed, non-placeholder copy'));
  }
  validateBeatState(loaded.config, profile.profile, result);
  validateProfileRules(loaded.config, profile.profile, result);

  const leaves = renderedLeaves(loaded.config);
  if (story?.promise && !visibleExact(leaves, story.promise)) {
    pushBindingFinding(
      result,
      loaded.config,
      finding('story.promise.unbound', `story promise must appear as durable rendered copy: "${story.promise}"`, {
        promise: story.promise,
      }),
    );
  }
  const identity = loaded.config.brief?.product ?? loaded.config.brief?.repo;
  if (identity && !leaves.some((leaf) => identityTokenSubsequence(leaf.text, identity))) {
    pushBindingFinding(
      result,
      loaded.config,
      finding('story.identity.unbound', `product identity must appear in durable rendered copy: "${identity}"`, {
        identity,
      }),
    );
  }
  for (const [shotIndex, shot] of (loaded.config.shots ?? []).entries()) {
    for (const [objectIndex, object] of shot.objects.entries()) {
      if (object.kind !== 'logo-lockup') continue;
      const entry = context?.entries.get(object.manifestRef);
      const sameAsset = entry?.kind === 'asset' && context
        ? path.resolve(context.repoRoot, entry.path) === path.resolve(loaded.baseDir, object.src)
        : false;
      if (!entry || entry.kind !== 'asset' || entry.role !== 'logo' || !sameAsset) {
        result.errors.push(finding(
          'story.logoLockup.asset',
          `logo-lockup "${object.id}" must reference a logo asset manifest entry whose path matches "${object.src}"`,
          { shotIndex, objectIndex, manifestRef: object.manifestRef },
        ));
      }
    }
  }
  for (const copy of loaded.config.brief?.verbatimCopy ?? []) {
    if (!visibleExact(leaves, copy)) {
      pushBindingFinding(
        result,
        loaded.config,
        finding('story.verbatim.unbound', `verbatimCopy must appear exactly in durable rendered copy: "${copy}"`, {
          copy,
        }),
      );
    }
  }
  validateProof(loaded.config, context, leaves, result);
  return result;
}
