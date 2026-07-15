import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';
import { runCheck } from '../commands/check.js';
import { sha256Digest } from '../context/load.js';
import { formatContextMetric } from './story.js';

function defaultConfig() {
  return {
    profile: 'readme-loop',
    context: { manifest: 'demoframe-context.yml' },
    output: { format: 'webp', width: 720, fps: 15, budget: '5MB' },
    theme: { accent: '#6d4aff', mode: 'light' },
    frame: { type: 'browser', width: 960, height: 540, title: 'Acme' },
    brief: {
      mode: 'user-confirmed',
      audience: 'README visitors',
      source: 'Repository README proof',
      screenshotPolicy: 'reconstruct',
      placement: 'github-readme',
      arc: 'Promise, build, proof',
      climax: '99.9% uptime',
      product: 'Acme',
      repo: 'acme/demo',
      verbatimCopy: ['Ready'],
      appearanceEvidence: [
        { field: 'theme.accent', noSource: 'User selected a synthetic benchmark accent.' },
      ],
      story: {
        version: 2,
        promise: 'Ship with proof',
        proof: [{ evidence: 'proof-copy', mode: 'exact' }],
        beats: [
          { id: 'hook', role: 'hook' },
          { id: 'build', role: 'build' },
          { id: 'payoff', role: 'payoff' },
        ],
      },
    },
    scenes: [
      { type: 'typing', duration: 3, text: 'Acme · Ship with proof', beatId: 'hook' },
      { type: 'steps', duration: 3, items: [{ label: 'Ready', state: 'done' }], beatId: 'build' },
      { type: 'status-card', duration: 3, title: '99.9% uptime', checks: ['Ready'], beatId: 'payoff' },
    ],
  } as any;
}

function fixture(config = defaultConfig(), sourceLine = '99.9% uptime') {
  const root = mkdtempSync(path.join(tmpdir(), 'demoframe-story-'));
  mkdirSync(path.join(root, '.git'));
  writeFileSync(path.join(root, 'README.md'), `# Acme\n${sourceLine}\n`);
  writeFileSync(
    path.join(root, 'demoframe-context.yml'),
    stringify({
      schemaVersion: 1,
      entries: [
        {
          id: 'proof-copy',
          kind: 'copy',
          text: sourceLine,
          source: { path: 'README.md', selector: { lines: [2, 2] }, digest: sha256Digest(sourceLine) },
        },
      ],
    }),
  );
  const file = path.join(root, 'demo.json');
  writeFileSync(file, JSON.stringify(config, null, 2));
  return file;
}

function narrativeCodes(result: Awaited<ReturnType<typeof runCheck>>) {
  return [...result.errors, ...result.warnings, ...result.notices]
    .map((finding) => finding.code)
    .filter((code) => code.startsWith('story.') || code.startsWith('profile.'));
}

describe('story-v2 profiles and binding', () => {
  it('never opts a legacy config into narrative rules through --for', async () => {
    const legacy = defaultConfig();
    delete legacy.profile;
    delete legacy.context;
    delete legacy.brief.story;
    legacy.scenes.forEach((scene: any) => delete scene.beatId);
    const result = await runCheck(fixture(legacy), {
      forDestinations: ['x-post'],
      skipBrief: true,
    });

    expect(result.story?.active).toBe(false);
    expect(narrativeCodes(result)).toEqual([]);
  });

  it('requires story v2 for explicit profiles', async () => {
    const config = defaultConfig();
    delete config.brief.story;
    const result = await runCheck(fixture(config), { skipBrief: true });
    expect(result.errors.map((finding) => finding.code)).toContain('profile.storyVersionRequired');
  });

  it('keeps an explicit profile while reporting destination compatibility', async () => {
    const result = await runCheck(fixture(), { forDestinations: ['x-post'] });
    expect(result.story?.profile).toBe('readme-loop');
    expect(result.story?.profileSource).toBe('explicit');
    expect(result.warnings.map((finding) => finding.code)).toContain('profile.destination.suboptimal');
  });

  it('reports explicit incompatible destinations without rewriting the story', async () => {
    const config = defaultConfig();
    config.profile = 'social-film';
    config.frame = { type: 'browser', width: 1200, height: 675, title: 'Acme' };
    config.brief.story.beats.push({ id: 'outro', role: 'outro' });
    config.scenes.forEach((scene: any) => (scene.duration = 4));
    config.scenes.push({ type: 'status-card', duration: 4, title: 'Acme', beatId: 'outro' });
    const result = await runCheck(fixture(config), { forDestinations: ['github-readme'] });

    expect(result.story?.profile).toBe('social-film');
    expect(result.errors.map((finding) => finding.code)).toContain('profile.destination.incompatible');
  });

  it('fails a mixed destination default set when profile is omitted', async () => {
    const config = defaultConfig();
    delete config.profile;
    const result = await runCheck(fixture(config), {
      forDestinations: ['github-readme', 'x-post'],
    });
    expect(result.errors.map((finding) => finding.code)).toContain('profile.destination.ambiguous');
  });

  it.each([
    {
      name: 'two payoffs',
      beats: [
        { id: 'hook', role: 'hook' },
        { id: 'build', role: 'build' },
        { id: 'payoff', role: 'payoff' },
        { id: 'payoff-2', role: 'payoff' },
      ],
      code: 'story.beat.payoff',
    },
    {
      name: 'build after payoff',
      beats: [
        { id: 'hook', role: 'hook' },
        { id: 'payoff', role: 'payoff' },
        { id: 'build', role: 'build' },
      ],
      code: 'story.beat.afterPayoff',
    },
    {
      name: 'missing hook',
      beats: [
        { id: 'build', role: 'build' },
        { id: 'payoff', role: 'payoff' },
      ],
      code: 'story.beat.hook',
    },
  ])('rejects $name', async ({ beats, code }) => {
    const config = defaultConfig();
    config.brief.story.beats = beats;
    if (beats.some((beat: any) => beat.id === 'payoff-2')) {
      config.scenes.push({ type: 'status-card', duration: 1, title: 'Done', beatId: 'payoff-2' });
    }
    const result = await runCheck(fixture(config));
    expect(result.errors.map((finding) => finding.code)).toContain(code);
  });

  it('accepts payoff followed by an outro for social-film', async () => {
    const config = defaultConfig();
    config.profile = 'social-film';
    config.frame = { type: 'browser', width: 1200, height: 675, title: 'Acme' };
    config.brief.placement = 'x-post';
    config.brief.story.beats = [
      { id: 'hook', role: 'hook' },
      { id: 'build', role: 'build' },
      { id: 'payoff', role: 'payoff' },
      { id: 'outro', role: 'outro' },
    ];
    config.scenes.forEach((scene: any) => (scene.duration = 4));
    config.scenes.push({ type: 'status-card', duration: 4, title: 'Acme', beatId: 'outro' });
    const result = await runCheck(fixture(config));
    expect(result.errors.filter((finding) => finding.code.startsWith('story.beat'))).toEqual([]);
    expect(result.errors.map((finding) => finding.code)).not.toContain('profile.socialFilm.outro');
  });

  it('names unbound promise/proof strings and evidence ids', async () => {
    const config = defaultConfig();
    config.brief.story.promise = 'A promise nobody renders';
    config.scenes[2].title = 'Different result';
    const result = await runCheck(fixture(config));
    const promise = result.errors.find((finding) => finding.code === 'story.promise.unbound');
    const proof = result.errors.find((finding) => finding.code === 'story.proof.unbound');

    expect(promise?.message).toContain('A promise nobody renders');
    expect(proof?.message).toContain('proof-copy');
    expect(proof?.message).toContain('99.9% uptime');
  });

  it('demotes confirmed raw-intentional text-presence misses to warnings', async () => {
    const config = defaultConfig();
    config.brief.screenshotPolicy = 'raw-intentional';
    config.brief.story.promise = 'Promise visible only in raw pixels';
    config.scenes[2].title = 'Different result';
    const result = await runCheck(fixture(config));

    expect(result.errors.map((finding) => finding.code)).not.toContain('story.promise.unbound');
    expect(result.errors.map((finding) => finding.code)).not.toContain('story.proof.unbound');
    expect(result.warnings.map((finding) => finding.code)).toContain('story.promise.unbound');
    expect(result.warnings.map((finding) => finding.code)).toContain('story.proof.unbound');
  });

  it('keeps unsupported art-direction fields as non-effective notices', async () => {
    const config = defaultConfig();
    config.artDirection = {
      typography: { display: 'editorial serif' },
      colors: { primary: '#6d4aff' },
      shapeLanguage: 'soft clipped corners',
      motionPersonality: 'crisp',
    };
    const result = await runCheck(fixture(config));
    const notices = result.notices.filter((finding) => finding.code === 'artDirection.declaredNotRendered');
    expect(notices.map((notice) => notice.details?.path)).toEqual([
      'artDirection.colors.primary',
      'artDirection.motionPersonality',
      'artDirection.shapeLanguage',
      'artDirection.typography.display',
    ]);
    expect(notices.every((notice) => notice.details?.effective === false)).toBe(true);
  });

  it('rejects placeholder noSource reasons instead of treating them as evidence', async () => {
    const config = defaultConfig();
    config.brief.appearanceEvidence = [{ field: 'theme.accent', noSource: 'TODO: explain this choice' }];
    const result = await runCheck(fixture(config));
    expect(result.errors.map((finding) => finding.code)).toContain('appearance.noSourcePlaceholder');
  });

  it('formats approved metric proof deterministically and forbids inferred paraphrase', async () => {
    expect(
      formatContextMetric({
        id: 'speed',
        kind: 'metric',
        label: 'Push to preview',
        value: 2.1,
        unit: 's',
        formatter: 'number',
        decimals: 2,
        source: {
          path: 'README.md',
          selector: { lines: [1, 1] },
          digest: `sha256:${'0'.repeat(64)}`,
        },
      }),
    ).toBe('2.1 s');

    const config = defaultConfig();
    config.brief.mode = 'inferred';
    config.brief.story.proof = [{ evidence: 'proof-copy', mode: 'paraphrase', display: '99.9% uptime' }];
    const result = await runCheck(fixture(config), { allowInferred: true });
    expect(result.errors.map((finding) => finding.code)).toContain('story.proof.paraphraseConfirmedOnly');
  });

  it('rejects a formatted proof display that differs from the approved formatter', async () => {
    const config = defaultConfig();
    config.brief.story.proof = [{ evidence: 'proof-copy', mode: 'formatted', display: '99.9 percent' }];
    const result = await runCheck(fixture(config));
    expect(result.errors.map((finding) => finding.code)).toContain('story.proof.formatterKind');
  });
});
