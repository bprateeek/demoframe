import type { Theme } from '../config/schema.js';

const PALETTES = {
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
} as const;

export function themeCss(theme: Theme): string {
  const p = PALETTES[theme.mode];
  const sans =
    theme.font === 'inter'
      ? "'Inter', -apple-system, 'Segoe UI', sans-serif"
      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  return `:root {
  --df-accent: ${theme.accent};
  --df-page: ${theme.background ?? p.page};
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
  --df-device: #18243a;
  --df-font-sans: ${sans};
  --df-font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  --df-s1: 4px; --df-s2: 8px; --df-s3: 12px; --df-s4: 16px; --df-s5: 24px; --df-s6: 32px;
  --df-fs-xs: 12px; --df-fs-sm: 14px; --df-fs-base: 16px; --df-fs-lg: 18px;
  --df-fs-xl: 22px; --df-fs-2xl: 28px;
  --df-radius-sm: 8px; --df-radius: 14px; --df-radius-lg: 22px;
}`;
}
