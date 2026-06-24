import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import { buildDocument } from './document.js';

const baseDir = process.cwd();

describe('buildDocument overlay injection (v0.5)', () => {
  it('omits cursor and celebrate nodes when no scene opts in', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'phone' },
      scenes: [{ type: 'typing', duration: 3, text: 'hi' }],
    });
    const doc = await buildDocument(config, baseDir);
    expect(doc.html).not.toContain('class="df-cursor"');
    expect(doc.html).not.toContain('class="df-celebrate"');
    expect(doc.html).not.toContain('class="df-ambient');
  });

  it('injects ember ambience below scenes when any scene opts in', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      scenes: [
        { type: 'typing', duration: 2, text: 'build it', cinematic: { ambient: 'ember' } },
        { type: 'status-card', duration: 2, title: 'Ready', cta: { label: 'Open PR' }, tap: true },
      ],
    });
    const doc = await buildDocument(config, baseDir);
    const ambientIndex = doc.html.indexOf('class="df-ambient df-ambient-ember"');
    const scenesIndex = doc.html.indexOf('class="df-scenes"');
    const cursorIndex = doc.html.indexOf('class="df-cursor"');

    expect(ambientIndex).toBeGreaterThan(-1);
    expect(doc.html).toContain('data-ambient-scope="timeline"');
    expect(scenesIndex).toBeGreaterThan(ambientIndex);
    expect(cursorIndex).toBeGreaterThan(scenesIndex);
  });

  it('applies top-level cinematic defaults to rendered content scenes', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      cinematic: { composition: 'center-hero', ambient: 'ember' },
      scenes: [
        { type: 'typing', duration: 2, text: 'build it' },
        { type: 'screenshot', duration: 2, src: 'test/golden/hero_2.5.png' },
      ],
    });
    const doc = await buildDocument(config, baseDir);

    expect(doc.html).toContain('class="df-ambient df-ambient-ember"');
    expect(doc.html).toContain('df-composition-center-hero-typing');
    expect(doc.html).not.toContain('df-composition-center-hero-screenshot');
  });

  it('injects overlay nodes and anchors when a scene uses tap or celebrate', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'phone' },
      scenes: [
        { type: 'status-card', duration: 3, title: 'Done', cta: { label: 'Merge' }, tap: true },
        { type: 'hold', duration: 1, celebrate: true },
      ],
    });
    const doc = await buildDocument(config, baseDir);
    expect(doc.html).toContain('class="df-cursor"');
    expect(doc.html).toContain('df-celebrate-ring');
    expect(doc.html).toContain('data-tap-target');
    expect(doc.html).toContain('data-celebrate-anchor');
  });

  it('renders chat monogram avatars without binary assets', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'phone' },
      scenes: [
        {
          type: 'chat',
          duration: 5,
          messages: [{ role: 'assistant', text: 'hi' }],
          avatars: { assistant: { initials: 'CC', color: '#e2603a' } },
        },
      ],
    });
    const doc = await buildDocument(config, baseDir);
    expect(doc.html).toContain('df-avatar-mono');
    expect(doc.html).toContain('>CC</span>');
  });
});

describe('buildDocument scene motion wrappers', () => {
  it('renders every content scene through the shared inert motion shell', async () => {
    const scenes = [
      { type: 'typing', duration: 2, text: 'Ship the demo' },
      {
        type: 'steps',
        duration: 2,
        items: [
          { label: 'Plan', state: 'done' },
          { label: 'Render', state: 'active' },
        ],
      },
      { type: 'status-card', duration: 2, title: 'Ready', checks: ['Build passed'] },
      { type: 'screenshot', duration: 2, src: 'test/golden/hero_2.5.png' },
      { type: 'terminal-playback', duration: 2, command: 'npm test', output: ['passed'] },
      { type: 'code', duration: 2, code: 'const ready = true;' },
      { type: 'chat', duration: 2, messages: [{ role: 'assistant', text: 'Done.' }] },
      { type: 'metric-card', duration: 2, metrics: [{ label: 'Tests', value: 42 }] },
      {
        type: 'screen',
        duration: 2,
        blocks: [{ block: 'callout', variant: 'message', text: 'All systems go' }],
      },
    ];
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      scenes,
    });
    const doc = await buildDocument(config, baseDir);
    const shellMatches = Array.from(
      doc.html.matchAll(
        /<div class="df-scene" data-scene="(\d+)">\s*<div class="df-scene-motion">\s*<div class="df-rail-motion">\s*<div class="([^"]*)">/g,
      ),
    );

    expect(shellMatches).toHaveLength(scenes.length);
    expect(shellMatches.map((match) => Number(match[1]))).toEqual(scenes.map((_, index) => index));
    expect(shellMatches.map((match) => match[2].split(' '))).toEqual(
      scenes.map((scene) => (scene.type === 'screen' ? ['df-rail', 'df-screen-rail'] : ['df-rail'])),
    );
  });

  it('adds center-hero composition classes only for supported opted-in scenes', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      scenes: [
        { type: 'typing', duration: 2, text: 'Ship the demo', cinematic: { composition: 'center-hero' } },
        {
          type: 'steps',
          duration: 2,
          items: [{ label: 'Render', state: 'active' }],
          cinematic: { composition: 'center-hero' },
        },
        { type: 'status-card', duration: 2, title: 'Ready', cinematic: { composition: 'center-hero' } },
        {
          type: 'chat',
          duration: 2,
          messages: [{ role: 'assistant', text: 'Done.' }],
          cinematic: { composition: 'center-hero' },
        },
        { type: 'code', duration: 2, code: 'const ready = true;', cinematic: { composition: 'center-hero' } },
        {
          type: 'terminal-playback',
          duration: 2,
          command: 'npm test',
          output: ['passed'],
          cinematic: { composition: 'center-hero' },
        },
        {
          type: 'metric-card',
          duration: 2,
          metrics: [{ label: 'Tests', value: 42 }],
          cinematic: { composition: 'center-hero' },
        },
        {
          type: 'screen',
          duration: 2,
          blocks: [{ block: 'callout', variant: 'message', text: 'All systems go' }],
          cinematic: { composition: 'center-hero' },
        },
        {
          type: 'screen',
          duration: 2,
          motion: 'focus',
          focus: 'money',
          blocks: [{ name: 'money', block: 'callout', variant: 'message', text: 'Keep focus math stable' }],
          cinematic: { composition: 'center-hero' },
        },
      ],
    });
    const doc = await buildDocument(config, baseDir);

    expect(doc.html).toContain('df-composition-center-hero-typing');
    expect(doc.html).toContain('df-composition-center-hero-steps');
    expect(doc.html).toContain('df-composition-center-hero-status-card');
    expect(doc.html).toContain('df-composition-center-hero-chat');
    expect(doc.html).toContain('df-composition-center-hero-code');
    expect(doc.html).toContain('df-composition-center-hero-terminal-playback');
    expect(doc.html).toContain('df-composition-center-hero-metric-card');
    expect(doc.html).toContain('df-composition-center-hero-screen');
    expect(doc.html.match(/class="df-scene[^"]*df-composition-center-hero-screen/g)).toHaveLength(1);
    expect(doc.html).toContain('.df-composition-center-hero-status-card .df-rail-motion');
  });

  it('adds floating-stage composition classes and CSS for supported scenes', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      cinematic: { composition: 'floating-stage' },
      scenes: [
        { type: 'status-card', duration: 2, title: 'Ready' },
        {
          type: 'screen',
          duration: 2,
          blocks: [{ block: 'callout', variant: 'message', text: 'Floating stage' }],
        },
        {
          type: 'screen',
          duration: 2,
          motion: 'focus',
          focus: 'money',
          blocks: [{ name: 'money', block: 'callout', variant: 'message', text: 'Focus stays opt-in' }],
        },
      ],
    });
    const doc = await buildDocument(config, baseDir);

    expect(doc.html).toContain('df-composition-floating-stage-status-card');
    expect(doc.html).toContain('df-composition-floating-stage-screen');
    expect(doc.html.match(/class="df-scene[^"]*df-composition-floating-stage-screen/g)).toHaveLength(1);
    expect(doc.html).toContain('.df-composition-floating-stage-status-card .df-card-body');
  });

  it('adds macro-card composition classes and CSS for supported scenes', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      cinematic: { composition: 'macro-card' },
      scenes: [
        { type: 'metric-card', duration: 2, metrics: [{ label: 'Wins', value: 42 }] },
        { type: 'status-card', duration: 2, title: 'Ready', cta: { label: 'Ship it' } },
        {
          type: 'screen',
          duration: 2,
          blocks: [{ block: 'callout', variant: 'message', text: 'Macro card' }],
        },
      ],
    });
    const doc = await buildDocument(config, baseDir);

    expect(doc.html).toContain('df-composition-macro-card-metric-card');
    expect(doc.html).toContain('df-composition-macro-card-status-card');
    expect(doc.html).toContain('df-composition-macro-card-screen');
    expect(doc.html).toContain('.df-composition-macro-card-status-card .df-card-title');
    expect(doc.html).toContain('.df-composition-macro-card-metric-card .df-metric-value');
  });

  it('adds path-journey composition classes and path CSS for steps and screen scenes', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      cinematic: { composition: 'path-journey' },
      scenes: [
        {
          type: 'steps',
          duration: 2,
          items: [
            { label: 'Ask', state: 'done' },
            { label: 'Build', state: 'active' },
          ],
        },
        {
          type: 'screen',
          duration: 2,
          blocks: [
            { block: 'app-header', title: 'Journey', icon: 'spark' },
            { block: 'callout', variant: 'message', text: 'Path visible' },
          ],
        },
      ],
    });
    const doc = await buildDocument(config, baseDir);

    expect(doc.html).toContain('df-composition-path-journey-steps');
    expect(doc.html).toContain('df-composition-path-journey-screen');
    expect(doc.html).toContain('.df-composition-path-journey-steps .df-steps-list::before');
    expect(doc.html).toContain('.df-composition-path-journey-screen .df-screen-block::before');
  });

  it('adds orbit-object composition classes and orbit CSS for object scenes', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      cinematic: { composition: 'orbit-object' },
      scenes: [
        { type: 'metric-card', duration: 2, metrics: [{ label: 'Pulls', value: 12 }] },
        {
          type: 'screen',
          duration: 2,
          blocks: [{ block: 'callout', variant: 'message', text: 'Object centered' }],
        },
      ],
    });
    const doc = await buildDocument(config, baseDir);

    expect(doc.html).toContain('df-composition-orbit-object-metric-card');
    expect(doc.html).toContain('df-composition-orbit-object-screen');
    expect(doc.html).toContain('.df-composition-orbit-object .df-rail-motion::before');
    expect(doc.html).toContain('.df-composition-orbit-object .df-rail-motion::after');
    expect(doc.html).toContain('.df-composition-orbit-object-screen .df-screen-block');
  });
});

describe('buildDocument frame chrome layers (v0.7)', () => {
  it('renders thin browser chrome without the URL bar', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser', chrome: 'thin', title: 'Demo' },
      scenes: [{ type: 'typing', duration: 3, text: 'hi' }],
    });
    const doc = await buildDocument(config, baseDir);
    expect(doc.html).toContain('df-browser-bar-thin');
    expect(doc.html).not.toContain('class="df-urlbar"');
  });

  it('keeps one chrome layer when no scene overrides the frame', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser', url: 'https://example.test' },
      scenes: [
        { type: 'typing', duration: 2, text: 'hello' },
        { type: 'hold', duration: 1 },
      ],
    });
    const doc = await buildDocument(config, baseDir);
    expect(doc.timeline.scenes.map((s) => s.chromeLayer)).toEqual([0, 0]);
    expect(doc.html.match(/class="df-chrome-layer"/g)?.length).toBe(1);
  });

  it('lets a trailing hold inherit the overridden scene chrome', async () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser', url: 'https://app.test/home' },
      scenes: [
        { type: 'typing', duration: 2, text: 'hello' },
        {
          type: 'status-card',
          duration: 2,
          title: 'Done',
          frame: { url: 'https://github.com/acme/repo/pull/1' },
        },
        { type: 'hold', duration: 1 },
      ],
    });
    const doc = await buildDocument(config, baseDir);
    expect(doc.timeline.scenes.map((s) => s.chromeLayer)).toEqual([0, 1, 1]);
    expect(doc.html.match(/class="df-chrome-layer"/g)?.length).toBe(2);
    expect(doc.html).toContain('https://github.com/acme/repo/pull/1');
  });
});
