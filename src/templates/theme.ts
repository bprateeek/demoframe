import type { Theme, ThemePalette, ThemePresetName } from '../config/schema.js';
import { fontStacks } from './fonts.js';

export const PALETTES: Record<'light' | 'dark', ThemePalette> = {
  light: {
    page: '#eef0f4',
    screen: '#faf8f4',
    card: '#ffffff',
    text: '#1a2233',
    muted: '#6f7683',
    faint: '#9aa1ad',
    border: '#e6e3dc',
    success: '#1f9d55',
    successBg: '#e7f6ed',
    info: '#2563eb',
    shadow: 'rgba(26, 34, 51, 0.10)',
  },
  dark: {
    page: '#090c12',
    screen: '#0d1117',
    card: '#161b22',
    text: '#e6edf3',
    muted: '#9aa4b2',
    faint: '#6e7886',
    border: '#2d333c',
    success: '#3fb950',
    successBg: 'rgba(63, 185, 80, 0.15)',
    info: '#539bf5',
    shadow: 'rgba(0, 0, 0, 0.45)',
  },
};

export interface ThemePreset {
  accent: string;
  mode: 'light' | 'dark';
  palette: Partial<ThemePalette>;
}

export const THEME_PRESETS: Record<ThemePresetName, ThemePreset> = {
  'github-dark': {
    accent: '#3fb950',
    mode: 'dark',
    palette: {
      page: '#010409',
      screen: '#0d1117',
      card: '#161b22',
      text: '#e6edf3',
      muted: '#8b949e',
      faint: '#6e7681',
      border: '#30363d',
      info: '#58a6ff',
    },
  },
  paper: {
    accent: '#b45309',
    mode: 'light',
    palette: {
      page: '#f6f1e7',
      screen: '#fdfaf3',
      card: '#fffdf8',
      text: '#292524',
      muted: '#78716c',
      faint: '#a8a29e',
      border: '#e7ddc8',
      shadow: 'rgba(41, 37, 36, 0.08)',
    },
  },
  midnight: {
    accent: '#818cf8',
    mode: 'dark',
    palette: {
      page: '#050614',
      screen: '#0b0d1f',
      card: '#131631',
      text: '#e2e4f5',
      muted: '#9aa0c7',
      faint: '#6b719b',
      border: '#272c52',
      info: '#7dd3fc',
      shadow: 'rgba(0, 0, 0, 0.55)',
    },
  },
  candy: {
    accent: '#ec4899',
    mode: 'light',
    palette: {
      page: '#fdf2f8',
      screen: '#fff7fb',
      card: '#ffffff',
      text: '#3f2335',
      muted: '#9d6b8a',
      faint: '#c39bb1',
      border: '#fbcfe8',
      shadow: 'rgba(190, 24, 93, 0.10)',
    },
  },
};

export interface ResolvedTheme {
  accent: string;
  mode: 'light' | 'dark';
  palette: ThemePalette;
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  const preset = theme.preset ? THEME_PRESETS[theme.preset] : undefined;
  const mode = theme.mode ?? preset?.mode ?? 'light';
  const palette: ThemePalette = { ...PALETTES[mode], ...preset?.palette };
  if (theme.background && theme.palette?.page === undefined) palette.page = theme.background;
  Object.assign(palette, theme.palette);
  const accent = theme.accent ?? preset?.accent ?? '#e2603a';
  return { accent, mode, palette };
}

export function themeCss(theme: Theme): string {
  const { accent, palette: p } = resolveTheme(theme);
  const { sans, mono } = fontStacks(theme.font);
  return `:root {
  --df-accent: ${accent};
  --df-page: ${p.page};
  --df-screen: ${p.screen};
  --df-card: ${p.card};
  --df-text: ${p.text};
  --df-muted: ${p.muted};
  --df-faint: ${p.faint};
  --df-border: ${p.border};
  --df-success: ${p.success};
  --df-success-bg: ${p.successBg};
  --df-info: ${p.info};
  --df-shadow: ${p.shadow};
  --df-font-sans: ${sans};
  --df-font-mono: ${mono};
  --df-s1: 4px; --df-s2: 8px; --df-s3: 12px; --df-s4: 16px; --df-s5: 24px; --df-s6: 32px;
  --df-fs-xs: 12px; --df-fs-sm: 14px; --df-fs-base: 16px; --df-fs-lg: 18px;
  --df-fs-xl: 22px; --df-fs-2xl: 28px;
  --df-radius-sm: 8px; --df-radius: 14px; --df-radius-lg: 22px;
}`;
}
