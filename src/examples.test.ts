import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { runCheck } from './commands/check.js';

const examplesRoot = fileURLToPath(new URL('../examples', import.meta.url));
const exampleConfigs = readdirSync(examplesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const directory = path.join(examplesRoot, entry.name);
    const conventional = path.join(directory, 'demo.yml');
    if (existsSync(conventional)) return [conventional];
    return readdirSync(directory)
      .filter((file) => /\.ya?ml$/i.test(file) && !file.startsWith('demoframe-context'))
      .map((file) => path.join(directory, file));
  });

describe('example configs', () => {
  it.each(exampleConfigs)('%s is strict-clean', async (file) => {
    const raw = parse(readFileSync(file, 'utf8')) as { brief?: { mode?: string } };
    const result = await runCheck(file, { allowInferred: raw.brief?.mode === 'inferred' });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
