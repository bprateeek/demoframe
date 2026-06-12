import { describe, expect, it } from 'vitest';
import { scanForPrivateData } from './privacy.js';

describe('scanForPrivateData', () => {
  it('finds emails nested in objects', () => {
    const findings = scanForPrivateData({ scenes: [{ text: 'mail me at jo@example.com' }] });
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('email address');
    expect(findings[0].path).toBe('scenes[0].text');
  });

  it('finds credential-shaped tokens', () => {
    const ghp = scanForPrivateData(`ghp_${'a1B2'.repeat(9)}`);
    expect(ghp.some((f) => f.kind === 'credential-shaped token')).toBe(true);
    const aws = scanForPrivateData('key AKIAIOSFODNN7EXAMPLE here');
    expect(aws.some((f) => f.kind === 'credential-shaped token')).toBe(true);
  });

  it('finds URLs and private hosts', () => {
    expect(scanForPrivateData('see https://internal.corp/x')[0].kind).toBe('URL');
    expect(scanForPrivateData('connect to 192.168.1.10').some((f) => f.kind === 'private-looking host')).toBe(true);
  });

  it('passes clean demo copy', () => {
    expect(scanForPrivateData('Add a tiny release-notes helper with a basic test')).toHaveLength(0);
    expect(scanForPrivateData({ title: 'Merge pull request', caption: 'Awaiting human review' })).toHaveLength(0);
  });

  it('truncates long matches in excerpts', () => {
    const findings = scanForPrivateData(`ghp_${'a1B2c3D4'.repeat(10)}`);
    const token = findings.find((f) => f.kind === 'credential-shaped token');
    expect(token?.excerpt.length).toBeLessThan(40);
  });
});
