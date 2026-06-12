import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { demoConfigSchema } from '../config/schema.js';
import { listTemplates, runInit } from './init.js';

const templatesRoot = fileURLToPath(new URL('../../templates', import.meta.url));
const templateNames = readdirSync(templatesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe('template gallery', () => {
  it.each(templateNames)('%s has a valid template.yml and meta.yml', (name) => {
    const config = parseYaml(readFileSync(path.join(templatesRoot, name, 'template.yml'), 'utf8'));
    const parsed = demoConfigSchema.safeParse(config);
    expect(parsed.success, JSON.stringify(parsed.success ? '' : parsed.error.issues)).toBe(true);

    const meta = parseYaml(readFileSync(path.join(templatesRoot, name, 'meta.yml'), 'utf8'));
    expect(meta.name).toBe(name);
    expect(typeof meta.description).toBe('string');
    expect(Array.isArray(meta.frames)).toBe(true);
    expect(Array.isArray(meta.scenes)).toBe(true);
    expect(meta.demoframeVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has a starter for every classic frame type', () => {
    for (const frame of ['phone', 'browser', 'terminal']) {
      expect(templateNames).toContain(`starter-${frame}`);
    }
  });

  it('lists every template with metadata', () => {
    const metas = listTemplates();
    expect(metas.map((m) => m.name).sort()).toEqual([...templateNames].sort());
  });
});

describe('runInit', () => {
  const tempDirs: string[] = [];
  const makeTemp = () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'demoframe-init-'));
    tempDirs.push(dir);
    return dir;
  };

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('writes demo.yml from the named template and creates assets/', async () => {
    const dir = makeTemp();
    await runInit(dir, { template: 'cli-release' });
    const written = readFileSync(path.join(dir, 'demo.yml'), 'utf8');
    const original = readFileSync(path.join(templatesRoot, 'cli-release', 'template.yml'), 'utf8');
    expect(written).toBe(original);
    expect(existsSync(path.join(dir, 'assets'))).toBe(true);
  });

  it('maps --frame onto the starter templates', async () => {
    const dir = makeTemp();
    await runInit(dir, { frame: 'terminal' });
    const written = readFileSync(path.join(dir, 'demo.yml'), 'utf8');
    expect(written).toContain('type: terminal');
  });

  it('refuses to overwrite an existing demo.yml', async () => {
    const dir = makeTemp();
    await runInit(dir, {});
    await expect(runInit(dir, {})).rejects.toThrow(/refusing to overwrite/);
  });

  it('rejects unknown templates and lists the gallery', async () => {
    const dir = makeTemp();
    await expect(runInit(dir, { template: 'nope' })).rejects.toThrow(
      /unknown template "nope"; available: .*starter-phone/,
    );
  });
});
