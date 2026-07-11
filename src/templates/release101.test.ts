import { describe, expect, it } from 'vitest';
import { terminalCss } from './frames/terminal.js';
import { metricCardCss } from './scenes/metricCard.js';
import { statusCardCss, statusCardHtml } from './scenes/statusCard.js';
import { terminalPlaybackCss } from './scenes/terminalPlayback.js';

describe('1.0.1 visual corrections', () => {
  it('uses one success role for checks and the success CTA without a placeholder avatar', () => {
    const html = statusCardHtml(
      {
        type: 'status-card',
        duration: 3,
        transition: 'cut',
        title: 'Ready',
        subtitle: 'demoframe',
        checks: ['Tests', 'Build', 'Package'],
        cta: { label: 'Publish', style: 'success' },
        tap: false,
        celebrate: false,
      },
      0,
    );

    expect(statusCardCss).toContain('.df-check-bubble {');
    expect(statusCardCss).toContain('background: var(--df-success)');
    expect(statusCardCss).toContain('.df-cta-success { background: var(--df-success); }');
    expect(statusCardCss).not.toContain('#22a04b');
    expect(html).not.toContain('df-card-avatar');
    expect(html.match(/class="df-check-bubble"/g)).toHaveLength(3);
  });

  it('maps terminal surfaces and semantic text to the resolved theme', () => {
    const css = [terminalCss, terminalPlaybackCss, statusCardCss, metricCardCss].join('\n');

    expect(css).toContain('background: var(--df-screen)');
    expect(css).toContain('background: var(--df-card)');
    expect(css).toContain('border-color: var(--df-border)');
    expect(css).toContain('color: var(--df-text)');
    expect(css).toContain('color: var(--df-muted)');
    expect(css).toContain('color: var(--df-success)');
    expect(css).not.toContain('#8d96a3');
    expect(css).not.toContain('#3fb950');
    expect(css).not.toContain('#d6dde6');
    expect(css).not.toContain('#1a2029');
    expect(css).not.toContain('#161b22');

    // Error and warning colors remain fixed accessible terminal roles; the
    // outer bezel edge remains dark across light and dark product themes.
    expect(terminalPlaybackCss).toContain('#f85149');
    expect(terminalPlaybackCss).toContain('#d29922');
    expect(terminalCss).toContain('border: 1px solid #262d38');
  });
});
