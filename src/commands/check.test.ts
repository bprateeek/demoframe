import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runCheck } from './check.js';

function writeConfig(yaml: string): string {
  const dir = mkdtempSync(path.join(process.env.TMPDIR ?? tmpdir(), 'df-check-'));
  const file = path.join(dir, 'demo.yml');
  writeFileSync(file, yaml);
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  );
  for (const asset of ['a.png', 'b.png']) {
    if (yaml.includes(asset)) writeFileSync(path.join(dir, asset), tinyPng);
  }
  return file;
}

describe('runCheck (v0.5 guardrails)', () => {
  it('errors when a frameless demo is all raw screenshots, counting a trailing hold', async () => {
    const file = writeConfig(`
frame: { type: none }
scenes:
  - { type: screenshot, duration: 2, src: a.png }
  - { type: screenshot, duration: 2, src: b.png }
  - { type: hold, duration: 4 }
`);
    const { errors, warnings } = await runCheck(file);
    expect(errors.some((e) => e.includes('screenshots pasted in a frame'))).toBe(true);
    expect(warnings.some((w) => w.includes('screenshots pasted in a frame'))).toBe(false);
  });

  it('demotes the frameless all-screenshot error to a warning with allowRawScreenshots', async () => {
    const file = writeConfig(`
frame: { type: none }
scenes:
  - { type: screenshot, duration: 2, src: a.png }
  - { type: screenshot, duration: 2, src: b.png }
  - { type: hold, duration: 4 }
`);
    const { errors, warnings } = await runCheck(file, { allowRawScreenshots: true });
    expect(errors.some((e) => e.includes('screenshots pasted in a frame'))).toBe(false);
    expect(warnings.some((w) => w.includes('screenshots pasted in a frame'))).toBe(true);
  });

  it('only warns when a frameless demo mixes a synthetic scene with dominant screenshots', async () => {
    const file = writeConfig(`
frame: { type: none }
scenes:
  - { type: typing, duration: 1, text: hi }
  - { type: screenshot, duration: 3, src: a.png }
  - { type: screenshot, duration: 3, src: b.png }
`);
    const { errors, warnings } = await runCheck(file);
    expect(errors).toHaveLength(0);
    expect(warnings.some((w) => w.includes('of the runtime'))).toBe(true);
  });

  it('only warns when screenshots dominate a framed demo', async () => {
    const file = writeConfig(`
frame: { type: browser }
scenes:
  - { type: screenshot, duration: 3, src: a.png }
  - { type: screenshot, duration: 3, src: b.png }
`);
    const { errors, warnings } = await runCheck(file);
    expect(errors).toHaveLength(0);
    expect(warnings.some((w) => w.includes('of the runtime'))).toBe(true);
  });

  it('does not flag a single screenshot among synthetic scenes', async () => {
    const file = writeConfig(`
frame: { type: phone }
scenes:
  - { type: typing, duration: 4, text: hi }
  - { type: screenshot, duration: 2, src: a.png }
  - { type: steps, duration: 4, items: [{ label: done }] }
`);
    const { errors, warnings } = await runCheck(file);
    expect(errors).toHaveLength(0);
    expect(warnings.some((w) => w.includes('of the runtime') || w.includes('pasted'))).toBe(false);
  });

  it('does not flag an all-screen frameless demo as pasted screenshots', async () => {
    const file = writeConfig(`
frame: { type: none }
scenes:
  - type: screen
    duration: 4
    blocks:
      - { block: app-header, title: Product }
      - block: stat-strip
        tiles:
          - { label: Active, value: { value: 128 } }
          - { label: Done, value: { value: 92, suffix: "%" } }
`);
    const { errors, warnings } = await runCheck(file);
    expect(errors).toHaveLength(0);
    expect(warnings.some((w) => w.includes('pasted'))).toBe(false);
  });

  it('warns when screen scenes render at draft quality', async () => {
    const file = writeConfig(`
output: { quality: draft, displayWidth: 560 }
frame: { type: none }
scenes:
  - type: screen
    duration: 4
    blocks:
      - { block: app-header, title: Product }
`);
    const { warnings } = await runCheck(file);
    expect(warnings.some((w) => w.includes('dense product UI'))).toBe(true);
  });

  it('errors about a missing avatar image', async () => {
    const file = writeConfig(`
frame: { type: phone }
scenes:
  - type: chat
    duration: 5
    avatars: { assistant: bot.png }
    messages: [{ role: assistant, text: hi }]
`);
    const { errors } = await runCheck(file);
    expect(errors.some((w) => w.includes('avatars.assistant') && w.includes('not found'))).toBe(true);
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

  it('warns when the README embed would make small text unreadable', async () => {
    const file = writeConfig(`
output: { width: 200 }
frame: { type: browser }
scenes:
  - { type: typing, duration: 3, text: hi }
`);
    const { warnings } = await runCheck(file);
    expect(warnings.some((w) => w.includes('small body text'))).toBe(true);
  });

  it('does not warn about README legibility for comfortable display sizes', async () => {
    const file = writeConfig(`
output: { width: 480, displayWidth: 280 }
frame: { type: phone }
scenes:
  - { type: typing, duration: 3, text: hi }
`);
    const { warnings } = await runCheck(file);
    expect(warnings.some((w) => w.includes('small body text'))).toBe(false);
  });
});
