import { describe, expect, it } from 'vitest';
import { sanitizeSvg } from './sanitizeSvg.js';

describe('sanitizeSvg', () => {
  it('strips scripts, handlers, remote references, foreignObject, and embedded assets', () => {
    const hostile = `<svg xmlns="http://www.w3.org/2000/svg" onload="steal()">
      <script>alert(1)</script>
      <foreignObject><div>unsafe</div></foreignObject>
      <image href="data:image/png;base64,AAAA" />
      <a href="https://example.com/x"><path fill="url(https://example.com/p.svg#x)" d="M0 0h1v1z" /></a>
      <use href="#safe" onclick="steal()" />
    </svg>`;
    const safe = sanitizeSvg(hostile);
    expect(safe).not.toMatch(/script|foreignObject|<image|onload|onclick|https:|data:/i);
    expect(safe).toContain('href="#safe"');
    expect(safe).toContain('<svg');
  });
});
