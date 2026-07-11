import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import { createRenderContext } from './context.js';

describe('RenderContext asset registry', () => {
  it('registers every explicit asset field with a stable semantic source path', () => {
    const config = demoConfigSchema.parse({
      frame: { type: 'browser' },
      theme: {
        logo: 'brand/logo.png',
        font: { sans: 'fonts/sans.woff2', mono: 'fonts/mono.ttf' },
      },
      scenes: [
        { type: 'screenshot', duration: 2, src: 'screens/hero.png' },
        {
          type: 'chat',
          duration: 2,
          messages: [{ role: 'assistant', text: 'Ready' }],
          avatars: { user: 'avatars/user.png', assistant: { initials: 'AI' } },
        },
      ],
    });
    const context = createRenderContext(config, '/repo', '/repo/demo.yml');

    expect(context.assets.entries().map((entry) => [entry.source, entry.kind])).toEqual([
      ['theme.logo', 'logo'],
      ['theme.font.sans', 'font'],
      ['theme.font.mono', 'font'],
      ['scenes[0].src', 'screenshot'],
      ['scenes[1].avatars.user', 'avatar'],
    ]);
    expect(context.assets.require('scenes[0].src').file).toBe('/repo/screens/hero.png');
    expect(() => context.assets.require('scenes[1].avatars.assistant')).toThrow(/not registered/);
  });
});
