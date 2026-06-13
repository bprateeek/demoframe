import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runCheck } from './check.js';

function writeConfig(yaml: string): string {
  const dir = mkdtempSync(path.join(process.env.TMPDIR ?? tmpdir(), 'df-check-'));
  const file = path.join(dir, 'demo.yml');
  writeFileSync(file, yaml);
  return file;
}

describe('runCheck (v0.5 guardrails)', () => {
  it('warns when screenshots dominate the runtime, counting a trailing hold', async () => {
    const file = writeConfig(`
frame: { type: none }
scenes:
  - { type: screenshot, duration: 2, src: a.png }
  - { type: screenshot, duration: 2, src: b.png }
  - { type: hold, duration: 4 }
`);
    const { warnings } = await runCheck(file);
    expect(warnings.some((w) => w.includes('screenshots pasted in a frame'))).toBe(true);
  });

  it('does not flag a single screenshot among synthetic scenes', async () => {
    const file = writeConfig(`
frame: { type: phone }
scenes:
  - { type: typing, duration: 4, text: hi }
  - { type: screenshot, duration: 2, src: a.png }
  - { type: steps, duration: 4, items: [{ label: done }] }
`);
    const { warnings } = await runCheck(file);
    expect(warnings.some((w) => w.includes('of the runtime') || w.includes('pasted'))).toBe(false);
  });

  it('warns about a missing avatar image', async () => {
    const file = writeConfig(`
frame: { type: phone }
scenes:
  - type: chat
    duration: 5
    avatars: { assistant: bot.png }
    messages: [{ role: assistant, text: hi }]
`);
    const { warnings } = await runCheck(file);
    expect(warnings.some((w) => w.includes('avatars.assistant') && w.includes('not found'))).toBe(true);
  });

  it('warns when celebrate is not on the final scene or a trailing hold', async () => {
    const file = writeConfig(`
frame: { type: phone }
scenes:
  - { type: status-card, duration: 3, title: Done, celebrate: true }
  - { type: steps, duration: 3, items: [{ label: more }] }
`);
    const { warnings } = await runCheck(file);
    expect(warnings.some((w) => w.includes('celebrate fires before the end'))).toBe(true);
  });

  it('accepts celebrate on a trailing hold without warning', async () => {
    const file = writeConfig(`
frame: { type: phone }
scenes:
  - { type: status-card, duration: 3, title: Done, cta: { label: Merge } }
  - { type: hold, duration: 1.2, celebrate: true }
`);
    const { warnings } = await runCheck(file);
    expect(warnings.some((w) => w.includes('celebrate fires before the end'))).toBe(false);
  });
});
