import { describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import { PALETTES, THEME_PRESETS, resolveTheme, themeCss } from './theme.js';

function theme(input: Record<string, unknown>) {
  return demoConfigSchema.parse({
    frame: { type: 'phone' },
    scenes: [{ type: 'typing', duration: 3, text: 'hi' }],
    theme: input,
  }).theme;
}

describe('resolveTheme', () => {
  it('defaults to light mode and the stock accent', () => {
    const resolved = resolveTheme(theme({}));
    expect(resolved.mode).toBe('light');
    expect(resolved.accent).toBe('#e2603a');
    expect(resolved.palette).toEqual(PALETTES.light);
  });

  it('applies a preset alone', () => {
    const resolved = resolveTheme(theme({ preset: 'github-dark' }));
    expect(resolved.mode).toBe('dark');
    expect(resolved.accent).toBe('#3fb950');
    expect(resolved.palette.page).toBe('#010409');
    expect(resolved.palette.success).toBe(PALETTES.dark.success);
  });

  it('lets explicit mode and accent override the preset', () => {
    const resolved = resolveTheme(theme({ preset: 'github-dark', mode: 'light', accent: '#123456' }));
    expect(resolved.mode).toBe('light');
    expect(resolved.accent).toBe('#123456');
    expect(resolved.palette.page).toBe(THEME_PRESETS['github-dark'].palette.page);
  });

  it('lets palette overrides win over the preset', () => {
    const resolved = resolveTheme(theme({ preset: 'midnight', palette: { page: '#000000' } }));
    expect(resolved.palette.page).toBe('#000000');
    expect(resolved.palette.card).toBe(THEME_PRESETS.midnight.palette.card);
  });

  it('treats background as a page shorthand that loses to palette.page', () => {
    expect(resolveTheme(theme({ background: '#abcdef' })).palette.page).toBe('#abcdef');
    expect(
      resolveTheme(theme({ background: '#abcdef', palette: { page: '#fedcba' } })).palette.page,
    ).toBe('#fedcba');
  });
});

describe('themeCss', () => {
  it('emits resolved palette variables', () => {
    const css = themeCss(theme({ preset: 'candy' }));
    expect(css).toContain('--df-accent: #ec4899');
    expect(css).toContain('--df-page: #fdf2f8');
    expect(css).toContain('--df-success: #1f9d55');
  });
});
