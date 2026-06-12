import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fontCss, fontStacks } from './fonts.js';

const fixturesDir = fileURLToPath(new URL('../../test/fixtures', import.meta.url));

describe('fontCss', () => {
  it('always emits the builtin faces', () => {
    const css = fontCss('inter', '.');
    expect(css).toContain("font-family: 'Inter'");
    expect(css).toContain("font-family: 'JetBrains Mono'");
  });

  it('embeds a custom font file with the full weight range', () => {
    const css = fontCss({ sans: 'fake-font.woff2' }, fixturesDir);
    expect(css).toContain("font-family: 'DF Custom Sans'");
    expect(css).toContain('font-weight: 100 900');
    expect(css).toContain("format('woff2')");
    expect(css).toContain(Buffer.from('wOF2fakefontbytes').toString('base64'));
  });

  it('throws a pointed error for an unreadable file', () => {
    expect(() => fontCss({ mono: 'missing.ttf' }, fixturesDir)).toThrow(
      /theme\.font\.mono: cannot read .*missing\.ttf/,
    );
  });
});

describe('fontStacks', () => {
  it('keeps builtin stacks for the enum values', () => {
    expect(fontStacks('inter').sans).toContain("'Inter'");
    expect(fontStacks('system').sans).toContain('-apple-system');
    expect(fontStacks('system').mono).toContain("'JetBrains Mono'");
  });

  it('prepends custom families only for the provided slots', () => {
    const stacks = fontStacks({ sans: path.join(fixturesDir, 'fake-font.woff2') });
    expect(stacks.sans).toContain("'DF Custom Sans'");
    expect(stacks.sans).toContain("'Inter'");
    expect(stacks.mono).not.toContain('DF Custom Mono');
  });
});
