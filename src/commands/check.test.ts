import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runCheck, type CheckFinding } from './check.js';

function hasMessage(findings: CheckFinding[], text: string): boolean {
  return findings.some((finding) => finding.message.includes(text));
}

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
    const { errors, warnings } = await runCheck(file, { skipBrief: true });
    expect(hasMessage(errors, 'screenshots pasted in a frame')).toBe(true);
    expect(hasMessage(warnings, 'screenshots pasted in a frame')).toBe(false);
  });

  it('demotes the frameless all-screenshot error to a warning with allowRawScreenshots', async () => {
    const file = writeConfig(`
frame: { type: none }
scenes:
  - { type: screenshot, duration: 2, src: a.png }
  - { type: screenshot, duration: 2, src: b.png }
  - { type: hold, duration: 4 }
`);
    const { errors, warnings } = await runCheck(file, { allowRawScreenshots: true, skipBrief: true });
    expect(hasMessage(errors, 'screenshots pasted in a frame')).toBe(false);
    expect(hasMessage(warnings, 'screenshots pasted in a frame')).toBe(true);
  });

  it('only warns when a frameless demo mixes a synthetic scene with dominant screenshots', async () => {
    const file = writeConfig(`
frame: { type: none }
scenes:
  - { type: typing, duration: 1, text: hi }
  - { type: screenshot, duration: 3, src: a.png }
  - { type: screenshot, duration: 3, src: b.png }
`);
    const { errors, warnings } = await runCheck(file, { skipBrief: true });
    expect(errors).toHaveLength(0);
    expect(hasMessage(warnings, 'of the runtime')).toBe(true);
  });

  it('only warns when screenshots dominate a framed demo', async () => {
    const file = writeConfig(`
frame: { type: browser }
scenes:
  - { type: screenshot, duration: 3, src: a.png }
  - { type: screenshot, duration: 3, src: b.png }
`);
    const { errors, warnings } = await runCheck(file, { skipBrief: true });
    expect(errors).toHaveLength(0);
    expect(hasMessage(warnings, 'of the runtime')).toBe(true);
  });

  it('does not flag a single screenshot among synthetic scenes', async () => {
    const file = writeConfig(`
frame: { type: phone }
scenes:
  - { type: typing, duration: 4, text: hi }
  - { type: screenshot, duration: 2, src: a.png }
  - { type: steps, duration: 4, items: [{ label: done }] }
`);
    const { errors, warnings } = await runCheck(file, { skipBrief: true });
    expect(errors).toHaveLength(0);
    expect(warnings.some((w) => w.message.includes('of the runtime') || w.message.includes('pasted'))).toBe(false);
  });

  it('errors when an abstract brief uses screenshot scenes without raw-intentional policy', async () => {
    const file = writeConfig(`
brief:
  intent: abstract
  product: DemoFlow
  screenshotPolicy: reconstruct
frame: { type: browser }
scenes:
  - { type: typing, duration: 4, text: DemoFlow launch }
  - { type: screenshot, duration: 2, src: a.png }
`);
    const { errors, warnings } = await runCheck(file, { skipBrief: true });
    expect(errors.find((finding) => finding.code === 'screenshot.abstractScene')?.details).toMatchObject({
      intent: 'abstract',
      screenshotPolicy: 'reconstruct',
      sceneIndexes: [1],
    });
    expect(hasMessage(warnings, 'of the runtime')).toBe(false);
  });

  it('allows abstract screenshot scenes when screenshotPolicy is raw-intentional', async () => {
    const file = writeConfig(`
brief:
  intent: abstract
  product: DemoFlow
  screenshotPolicy: raw-intentional
frame: { type: browser }
scenes:
  - { type: typing, duration: 4, text: DemoFlow launch }
  - { type: screenshot, duration: 2, src: a.png }
`);
    const { errors } = await runCheck(file, { skipBrief: true });
    expect(errors.map((finding) => finding.code)).not.toContain('screenshot.abstractScene');
    expect(errors.map((finding) => finding.code)).not.toContain('abstract.noPayload');
  });

  it('keeps the screenshot dominance warning for hybrid briefs', async () => {
    const file = writeConfig(`
brief:
  intent: hybrid
  screenshotPolicy: reconstruct
frame: { type: browser }
scenes:
  - { type: typing, duration: 1, text: hi }
  - { type: screenshot, duration: 3, src: a.png }
`);
    const { errors, warnings } = await runCheck(file, { skipBrief: true });
    expect(errors.map((finding) => finding.code)).not.toContain('screenshot.abstractScene');
    expect(hasMessage(warnings, 'of the runtime')).toBe(true);
  });

  it('errors when an abstract brief has no visible product payload', async () => {
    const file = writeConfig(`
brief:
  intent: abstract
  product: DemoFlow
  verbatimCopy: ["Launch approved"]
frame: { type: phone }
scenes:
  - { type: typing, duration: 3, text: Polished abstract motion }
`);
    const { errors } = await runCheck(file, { skipBrief: true });
    const finding = errors.find((item) => item.code === 'abstract.noPayload');
    expect(finding?.details).toMatchObject({ signalCount: 0, strongSignalCount: 0 });
  });

  it('accepts abstract briefs when product aliases appear in scene text', async () => {
    const file = writeConfig(`
brief:
  intent: abstract
  product: DemoFlow
frame: { type: phone }
scenes:
  - { type: typing, duration: 3, text: Demo Flow ships the launch card }
`);
    const { errors } = await runCheck(file, { skipBrief: true });
    expect(errors.map((finding) => finding.code)).not.toContain('abstract.noPayload');
  });

  it('does not match short product names inside unrelated words', async () => {
    const file = writeConfig(`
brief:
  intent: abstract
  product: AI
frame: { type: phone }
scenes:
  - { type: typing, duration: 3, text: Aiming higher with polished motion }
`);
    const { errors } = await runCheck(file, { skipBrief: true });
    expect(errors.map((finding) => finding.code)).toContain('abstract.noPayload');
  });

  it('accepts abstract briefs when verbatim copy appears in scene text', async () => {
    const file = writeConfig(`
brief:
  intent: abstract
  verbatimCopy: ["Launch approved"]
frame: { type: browser }
scenes:
  - { type: status-card, duration: 3, title: Launch approved, cta: { label: Open report } }
  - { type: hold, duration: 1 }
`);
    const { errors } = await runCheck(file, { skipBrief: true });
    expect(errors.map((finding) => finding.code)).not.toContain('abstract.noPayload');
  });

  it('accepts abstract briefs when metric or callout values are visible', async () => {
    const metric = writeConfig(`
brief: { intent: abstract }
frame: { type: phone }
scenes:
  - type: metric-card
    duration: 3
    metrics:
      - { label: Conversion, value: 98, suffix: "%" }
`);
    expect((await runCheck(metric, { skipBrief: true })).errors.map((finding) => finding.code)).not.toContain(
      'abstract.noPayload',
    );

    const callout = writeConfig(`
brief: { intent: abstract }
frame: { type: none }
scenes:
  - type: screen
    duration: 3
    blocks:
      - { block: callout, variant: hero-stat, value: { value: 1284, prefix: "$" }, label: Revenue }
`);
    expect((await runCheck(callout, { skipBrief: true })).errors.map((finding) => finding.code)).not.toContain(
      'abstract.noPayload',
    );
  });

  it('does not treat theme.logo alone as enough abstract payload', async () => {
    const file = writeConfig(`
brief:
  intent: abstract
theme: { logo: a.png }
frame: { type: phone }
scenes:
  - { type: typing, duration: 3, text: Polished abstract motion }
`);
    const { errors } = await runCheck(file, { skipBrief: true });
    const finding = errors.find((item) => item.code === 'abstract.noPayload');
    expect(finding?.details).toMatchObject({
      signalCount: 1,
      strongSignalCount: 0,
      signals: [{ source: 'theme.logo', strength: 'weak' }],
    });
  });

  it('fails check loading when a screenshot has cinematic without raw-intentional policy', async () => {
    const file = writeConfig(`
brief:
  screenshotPolicy: reconstruct
frame: { type: browser }
scenes:
  - { type: screenshot, duration: 3, src: a.png, cinematic: { motion: float-in } }
`);
    await expect(runCheck(file, { skipBrief: true })).rejects.toMatchObject({
      name: 'ConfigError',
      issues: expect.arrayContaining([
        expect.stringContaining('screenshot.cinematic needs brief.screenshotPolicy: raw-intentional'),
      ]),
    });
  });

  it('allows screenshot cinematic for raw-intentional briefs', async () => {
    const file = writeConfig(`
brief:
  screenshotPolicy: raw-intentional
frame: { type: browser }
scenes:
  - { type: screenshot, duration: 3, src: a.png, cinematic: { motion: float-in } }
`);
    const { errors } = await runCheck(file, { skipBrief: true });
    expect(errors).toHaveLength(0);
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
    const { errors, warnings } = await runCheck(file, { skipBrief: true });
    expect(errors).toHaveLength(0);
    expect(hasMessage(warnings, 'pasted')).toBe(false);
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
    const { warnings } = await runCheck(file, { skipBrief: true });
    expect(hasMessage(warnings, 'dense product UI')).toBe(true);
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
    const { errors } = await runCheck(file, { skipBrief: true });
    expect(errors.some((w) => w.message.includes('avatars.assistant') && w.message.includes('not found'))).toBe(true);
  });

  it('warns when celebrate is not on the final scene or a trailing hold', async () => {
    const file = writeConfig(`
frame: { type: phone }
scenes:
  - { type: status-card, duration: 3, title: Done, celebrate: true }
  - { type: steps, duration: 3, items: [{ label: more }] }
`);
    const { warnings } = await runCheck(file, { skipBrief: true });
    expect(hasMessage(warnings, 'celebrate fires before the end')).toBe(true);
  });

  it('accepts celebrate on a trailing hold without warning', async () => {
    const file = writeConfig(`
frame: { type: phone }
scenes:
  - { type: status-card, duration: 3, title: Done, cta: { label: Merge } }
  - { type: hold, duration: 1.2, celebrate: true }
`);
    const { warnings } = await runCheck(file, { skipBrief: true });
    expect(hasMessage(warnings, 'celebrate fires before the end')).toBe(false);
  });

  it('warns when the README embed would make small text unreadable', async () => {
    const file = writeConfig(`
output: { width: 200 }
frame: { type: browser }
scenes:
  - { type: typing, duration: 3, text: hi }
`);
    const { warnings } = await runCheck(file, { skipBrief: true });
    expect(hasMessage(warnings, 'small body text')).toBe(true);
  });

  it('does not warn about README legibility for comfortable display sizes', async () => {
    const file = writeConfig(`
output: { width: 480, displayWidth: 280 }
frame: { type: phone }
scenes:
  - { type: typing, duration: 3, text: hi }
`);
    const { warnings } = await runCheck(file, { skipBrief: true });
    expect(hasMessage(warnings, 'small body text')).toBe(false);
  });

  it('errors when transparent output targets mp4 or webm', async () => {
    const file = writeConfig(`
output: { format: [webp, mp4] }
frame: { type: phone, outside: transparent }
scenes:
  - { type: typing, duration: 3, text: hi }
`);
    const { errors } = await runCheck(file, { skipBrief: true });
    expect(hasMessage(errors, 'transparent output is a policy error for mp4/webm')).toBe(true);
  });

  it('checks destination-adjusted configs for --for targets', async () => {
    const file = writeConfig(`
output: { format: webp }
frame: { type: phone, outside: transparent }
scenes:
  - { type: typing, duration: 3, text: hi }
`);
    const { errors } = await runCheck(file, { forDestinations: ['x-post'], skipBrief: true });
    expect(errors.find((finding) => finding.code === 'transparent.mp4')?.message).toContain(
      'preset x-post: transparent output is a policy error',
    );
  });

  it('warns about transparent gif, frameless cutouts, and ignored margins', async () => {
    const transparentGif = writeConfig(`
output: { format: gif }
frame: { type: none, outside: transparent }
scenes:
  - type: screen
    duration: 3
    blocks:
      - { block: app-header, title: Product }
`);
    const gifResult = await runCheck(transparentGif, { skipBrief: true });
    expect(hasMessage(gifResult.warnings, 'transparent GIF uses hard 1-bit edges')).toBe(true);
    expect(hasMessage(gifResult.warnings, 'content edge becomes the cutout')).toBe(true);

    const ignoredMargin = writeConfig(`
frame: { type: phone, margin: 24 }
scenes:
  - { type: typing, duration: 3, text: hi }
`);
    const marginResult = await runCheck(ignoredMargin, { skipBrief: true });
    expect(hasMessage(marginResult.warnings, 'frame.margin only affects transparent cutouts')).toBe(
      true,
    );
  });

  it('notices when cinematic motion blur is skipped for GIF', async () => {
    const file = writeConfig(`
output: { format: gif, motionBlur: cinematic }
frame: { type: phone }
scenes:
  - { type: status-card, duration: 3, title: Done }
`);
    const { warnings, notices } = await runCheck(file, { skipBrief: true });
    expect(hasMessage(warnings, 'cinematic skips GIF motion blur')).toBe(false);
    expect(hasMessage(notices, 'cinematic skips GIF motion blur')).toBe(true);
    expect(notices.find((notice) => notice.code === 'motionBlur.gifSkipped')?.details).toMatchObject({
      format: 'gif',
      motionBlur: 'cinematic',
      captureMode: 'directCapture',
    });
  });

  it('warns when force applies motion blur to GIF', async () => {
    const file = writeConfig(`
output: { format: gif, motionBlur: force }
frame: { type: phone }
scenes:
  - { type: status-card, duration: 3, title: Done }
`);
    const { warnings, notices } = await runCheck(file, { skipBrief: true });
    expect(hasMessage(notices, 'force applies blurredCapture')).toBe(false);
    expect(hasMessage(warnings, 'force applies blurredCapture')).toBe(true);
    expect(warnings.find((warning) => warning.code === 'motionBlur.gifForced')?.details).toMatchObject({
      format: 'gif',
      motionBlur: 'force',
      captureMode: 'blurredCapture',
    });
  });

  it('fails an absent or inferred brief unless autonomous mode is explicit', async () => {
    const absent = writeConfig(`
frame: { type: phone }
scenes:
  - { type: typing, duration: 3, text: hi }
`);
    const absentResult = await runCheck(absent);
    expect(absentResult.errors.map((finding) => finding.code)).toContain('brief.unconfirmed');

    const inferred = writeConfig(`
brief:
  mode: inferred
  audience: README visitors
  source: Synthetic story
  screenshotPolicy: reconstruct
  placement: github-readme
  arc: Ask, work, result
  climax: Final card
frame: { type: phone }
scenes:
  - { type: typing, duration: 3, text: hi }
`);
    const inferredResult = await runCheck(inferred);
    expect(inferredResult.errors.map((finding) => finding.code)).toContain('brief.unconfirmed');

    const autonomous = await runCheck(inferred, { allowInferred: true });
    expect(autonomous.errors.map((finding) => finding.code)).not.toContain('brief.unconfirmed');
    expect(autonomous.notices.map((finding) => finding.code)).toContain('brief.unconfirmed');
  });

  it('autonomous mode demotes only brief completeness findings', async () => {
    const file = writeConfig(`
brief:
  mode: inferred
frame: { type: phone }
scenes:
  - type: chat
    duration: 5
    avatars: { assistant: bot.png }
    messages: [{ role: assistant, text: hi }]
`);
    const result = await runCheck(file, { allowInferred: true });
    expect(result.notices.map((finding) => finding.code)).toContain('brief.unconfirmed');
    expect(result.errors.map((finding) => finding.code)).toContain('asset.missing');
  });

  it('never downgrades an incomplete user-confirmed brief under autonomous mode', async () => {
    const file = writeConfig(`
brief:
  mode: user-confirmed
  audience: README visitors
frame: { type: phone }
scenes:
  - { type: typing, duration: 3, text: hi }
`);
    const result = await runCheck(file, { allowInferred: true });

    expect(result.errors.map((finding) => finding.code)).toContain('brief.incomplete');
    expect(result.notices.map((finding) => finding.code)).not.toContain('brief.incomplete');
  });
});
