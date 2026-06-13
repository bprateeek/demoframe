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
