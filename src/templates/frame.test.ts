import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import { frameCss } from './frame.js';

describe('frameCss', () => {
  it('emits device color, shadow suppression, and transparent none surface overrides', () => {
    const phone = demoConfigSchema.parse({
      frame: { type: 'phone', deviceColor: '#123456', shadow: false },
      scenes: [{ type: 'typing', duration: 1, text: 'hi' }],
    });
    const phoneCss = frameCss(phone.frame);
    expect(phoneCss).toContain('--df-device: #123456');
    expect(phoneCss).toContain('body.df-frame-shadow-off .df-device-terminal');

    const none = demoConfigSchema.parse({
      frame: { type: 'none', outside: 'transparent' },
      scenes: [{ type: 'typing', duration: 1, text: 'hi' }],
    });
    const noneCss = frameCss(none.frame);
    expect(noneCss).toContain('body.df-outside-transparent { background: transparent; }');
    expect(noneCss).toContain('body.df-outside-transparent.df-frame-none .df-none .df-safe');
    expect(noneCss).toContain('background: var(--df-screen)');

    const matte = demoConfigSchema.parse({
      frame: { type: 'none', outside: '#ffffff' },
      scenes: [{ type: 'typing', duration: 1, text: 'hi' }],
    });
    expect(frameCss(matte.frame)).toContain('body.df-frame-none { background: #ffffff; }');
  });
});
