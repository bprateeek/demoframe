import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCheck } from './commands/check.js';

const examplesRoot = fileURLToPath(new URL('../examples', import.meta.url));
const exampleConfigs = readdirSync(examplesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(examplesRoot, entry.name, 'demo.yml'));

describe('example configs', () => {
  it.each(exampleConfigs)('%s is strict-clean', async (file) => {
    const result = await runCheck(file);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
