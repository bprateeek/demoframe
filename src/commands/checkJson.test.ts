import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigError } from '../config/load.js';
import { runCheck } from './check.js';
import { checkJsonDocument, checkJsonFailure } from './checkJson.js';

describe('check JSON contract', () => {
  it('emits a versioned coded finding stream and provenance', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'demoframe-check-json-'));
    const file = path.join(dir, 'demo.yml');
    writeFileSync(
      file,
      [
        'frame: { type: phone }',
        'brief:',
        '  mode: inferred',
        'scenes:',
        '  - { type: typing, duration: 2, text: hi }',
        '',
      ].join('\n'),
    );
    const result = await runCheck(file, { allowInferred: true });
    const json = checkJsonDocument(result, { destinations: ['github-readme'] });

    expect(json.schemaVersion).toBe(1);
    expect(json.command).toBe('check');
    expect(json.valid).toBe(true);
    expect(json.config?.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(json.config?.suppliedPaths).toContain('frame.type');
    expect(json.findings).toContainEqual(
      expect.objectContaining({ severity: 'notice', code: 'brief.unconfirmed' }),
    );
  });

  it('lets strict mode promote warning presence into invalid without changing severity', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'demoframe-check-json-strict-'));
    const file = path.join(dir, 'demo.yml');
    writeFileSync(
      file,
      'frame: { type: terminal }\nscenes:\n  - { type: chat, duration: 2, messages: [{ role: assistant, text: hi }] }\n',
    );
    const result = await runCheck(file, { allowInferred: true });
    const json = checkJsonDocument(result, { strict: true });

    expect(json.valid).toBe(false);
    expect(json.findings).toContainEqual(
      expect.objectContaining({ severity: 'warning', code: 'frame.chatTerminal' }),
    );
  });

  it('serializes config failures with a stable code', () => {
    const json = checkJsonFailure(new ConfigError('invalid config: demo.yml', ['frame.type: bad']), true);
    expect(json).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        valid: false,
        strict: true,
        findings: [expect.objectContaining({ severity: 'error', code: 'config.invalid' })],
      }),
    );
  });
});
